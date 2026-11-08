import test from 'node:test'
import assert from 'node:assert/strict'
import { detectCadence, forecastFlows, forecast } from './forecast.mjs'

const TODAY = new Date('2026-11-08T00:00:00Z')
const ledger = (events = [], trades = [], fx = { CNY: 1, HKD: 0.92 }) => ({
  version: 1, baseCurrency: 'CNY', fx,
  accounts: [{ id: 'A', name: '测试账户', currency: 'CNY' }],
  instruments: [{ id: 'I1', symbol: '510300', market: 'CN', assetClass: 'etf', currency: 'CNY', name: '沪深300ETF' }],
  holdings: [], trades, historyEvents: events, snapshots: [],
})
const flow = (date, cashAmount, note, extra = {}) => ({ id: 'E_' + date + note, accountId: 'A', kind: 'withdrawal', date, cashAmount, currency: 'CNY', note, source: 'model' })

test('detectCadence recognises the four supported rhythms and rejects drift or thin evidence', () => {
  assert.equal(detectCadence(['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01']).key, 'monthly')
  assert.equal(detectCadence(['2026-01-31', '2026-03-01', '2026-04-01']).key, 'monthly')
  assert.equal(detectCadence(['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22']).key, 'weekly')
  assert.equal(detectCadence(['2025-11-01', '2026-02-01', '2026-05-01', '2026-08-01']).key, 'quarterly')
  assert.equal(detectCadence(['2022-11-01', '2023-11-01', '2024-11-01', '2025-11-01']).key, 'annual')
  assert.equal(detectCadence(['2026-01-01', '2026-03-01', '2026-05-01']), null)
  assert.equal(detectCadence(['2026-01-01', '2026-01-15', '2026-03-01']), null)
  assert.equal(detectCadence(['2026-01-01']), null)
  assert.equal(detectCadence([]), null)
})

test('forecastFlows normalises events and trades, dropping directionless or amountless rows', () => {
  const db = ledger([
    { id: 'E1', accountId: 'A', kind: 'deposit', date: '2026-11-01', cashAmount: 10000, currency: 'CNY', note: '工资' },
    { id: 'E2', accountId: 'A', kind: 'security_in', date: '2026-11-01', cashAmount: 0, currency: 'CNY' },
    { id: 'E3', accountId: 'A', kind: 'dividend', date: '2026-11-02', cashAmount: null, currency: 'CNY' },
    { id: 'E4', accountId: 'A', kind: 'other', date: 'bad-date', cashAmount: 5, currency: 'CNY' },
  ], [{ id: 'T1', accountId: 'A', instrumentId: 'I1', side: 'buy', qty: 1000, price: 1, date: '2026-10-09', currency: 'CNY' }])
  const rows = forecastFlows(db)
  assert.deepEqual(rows.map(r => [r.kind, r.amount, r.label]), [
    ['deposit', 10000, '工资'],
    ['buy', -1000, '沪深300ETF 510300'],
  ])
})

test('forecast projects recurring outflows and inflows over the horizon with due dates', () => {
  const events = [
    ...['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'].map(d => flow(d, -1000, '基金定投')),
    ...['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'].map(d => flow(d, -2500, '房租')),
    ...['2026-09-01', '2026-10-01', '2026-11-01'].map(d => ({ ...flow(d, 10000, '工资'), kind: 'deposit' })),
  ]
  const result = forecast(ledger(events), { today: TODAY, days: 30 })
  assert.equal(result.baseCurrency, 'CNY')
  const byLabel = Object.fromEntries(result.series.map(s => [s.label, s]))
  const aip = byLabel['基金定投']
  assert.equal(aip.cadence, 'monthly')
  assert.equal(aip.occurrences, 6)
  assert.equal(aip.medianAmount, -1000)
  assert.equal(aip.inflow, false)
  assert.equal(aip.nextDue, '2026-12-02')
  assert.equal(aip.dueInHorizon, 1)
  assert.equal(aip.dueAmountBase, -1000)
  const rent = byLabel['房租']
  assert.equal(rent.cadence, 'weekly')
  assert.equal(rent.nextDue, '2026-11-09')
  assert.equal(rent.dueInHorizon, 5)
  assert.equal(rent.dueAmountBase, -12500)
  const salary = byLabel['工资']
  assert.equal(salary.inflow, true)
  assert.equal(salary.dueAmountBase, 10000)
  assert.equal(result.projection.outBase, 13500)
  assert.equal(result.projection.inBase, 10000)
  assert.equal(result.projection.netBase, -3500)
  assert.equal(result.projection.count, 7)
  assert.deepEqual(result.warnings, [])
})

test('forecast skips series without evidence and reports why, never inventing a cycle', () => {
  const events = [
    flow('2026-01-01', -100, '不规律'), flow('2026-01-15', -100, '不规律'), flow('2026-03-01', -100, '不规律'),
    flow('2026-01-02', -80, '方向混乱'), flow('2026-02-02', 80, '方向混乱'), flow('2026-03-02', -80, '方向混乱'),
    flow('2026-01-03', -60, '次数不足'), flow('2026-02-03', -60, '次数不足'),
    { ...flow('2026-01-04', -50, '缺汇率'), currency: 'HKD' }, { ...flow('2026-02-04', -50, '缺汇率'), currency: 'HKD' }, { ...flow('2026-03-04', -50, '缺汇率'), currency: 'HKD' },
  ]
  const result = forecast(ledger(events, [], { CNY: 1 }), { today: TODAY, days: 30 })
  assert.deepEqual(result.series, [])
  assert.deepEqual(result.projection, { outBase: 0, inBase: 0, netBase: 0, count: 0 })
  assert.ok(result.warnings.includes('FORECAST_SKIPPED:no-cadence:1'))
  assert.ok(result.warnings.includes('FORECAST_SKIPPED:mixed-sign:1'))
  assert.ok(result.warnings.includes('FORECAST_SKIPPED:missing-fx:1'))
})

test('forecast derives monthly trades as outflows and honours fx conversion', () => {
  const trades = ['2026-08-09', '2026-09-09', '2026-10-09', '2026-11-09'].filter(d => d < '2026-11-08').map((date, i) => ({ id: 'T' + i, accountId: 'A', instrumentId: 'I1', side: 'buy', qty: 1000, price: 1, date, currency: 'CNY' }))
  const events = ['2026-08-01', '2026-09-01', '2026-10-01'].map(d => ({ ...flow(d, -100, '港股账户扣款'), currency: 'HKD' }))
  const result = forecast(ledger(events, trades, { CNY: 1, HKD: 0.92 }), { today: TODAY, days: 30 })
  const trade = result.series.find(s => s.kind === 'buy')
  assert.equal(trade.cadence, 'monthly')
  assert.equal(trade.dueAmountBase, -1000)
  const hkd = result.series.find(s => s.label === '港股账户扣款')
  assert.equal(hkd.currency, 'HKD')
  assert.equal(hkd.medianAmountBase, -92)
  assert.equal(result.projection.outBase, 1092)
})
