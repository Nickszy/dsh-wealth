import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pricesByInstrument, buildPerformance, computePerformance } from './performance.mjs'
import { reconstructTimeline } from './timeline.mjs'

const ledger = () => ({
  version: 1, baseCurrency: 'CNY', fx: { CNY: 1 },
  accounts: [{ id: 'A', name: 'A', currency: 'CNY' }],
  instruments: [
    { id: 'I1', symbol: '510300', market: 'CN', assetClass: 'etf', currency: 'CNY' },
    { id: 'CASH', symbol: 'CASH:CNY', market: 'CASH', assetClass: 'cash', currency: 'CNY' },
  ],
  holdings: [
    { id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 60, avgCost: 10, manualPrice: 12, currency: 'CNY' },
    { id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 480, currency: 'CNY' },
  ],
  historyEvents: [
    { id: 'E3', accountId: 'A', kind: 'deposit', date: '2026-01-04', cashAmount: 1000, currency: 'CNY' },
    { id: 'E1', accountId: 'A', kind: 'buy', date: '2026-01-05', symbol: '510300', market: 'CN', qty: 100, price: 10, cashAmount: -1000, currency: 'CNY' },
    { id: 'E2', accountId: 'A', kind: 'sell', date: '2026-02-02', symbol: '510300', market: 'CN', qty: 40, price: 12, cashAmount: 480, currency: 'CNY' },
  ],
  trades: [], snapshots: [],
})

const klineRows = [['2026-01-05', 10], ['2026-02-02', 12], ['2026-02-03', 11]]

test('buildPerformance values each day from reconstructed positions and historical closes', () => {
  const db = ledger()
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  const prices = pricesByInstrument(db.instruments, new Map([['em:1.510300', klineRows]]))
  const result = buildPerformance(db, timeline, { prices, fx: db.fx, days: 730, today: '2026-02-04' })
  assert.deepEqual(result.series.map(s => [s.date, s.totalValueBase]), [
    ['2026-01-04', 1000],
    ['2026-01-05', 1000],
    ['2026-02-02', 1200],
    ['2026-02-03', 1140],
  ])
  const m = result.metrics
  assert.deepEqual([m.startValue, m.endValue, m.change, m.changePct], [1000, 1140, 140, 14])
  assert.equal(m.maxDrawdown.value, -5)
  assert.deepEqual([m.bestDay.date, m.worstDay.date], ['2026-02-02', '2026-02-03'])
  assert.deepEqual(result.warnings, [])
})

test('buildPerformance falls back to a flat price with an explicit warning', () => {
  const db = ledger()
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  const result = buildPerformance(db, timeline, { prices: new Map(), fx: db.fx, days: 730, today: '2026-02-04' })
  assert.ok(result.warnings.includes('PERF_FLAT_PRICE:510300'))
  // 平推价 = 手填现价 12：01-05 起 100×12=1200；无行情时日期只来自流水状态。
  assert.deepEqual(result.series.map(s => s.totalValueBase), [1000, 1200, 1200])
  assert.equal(result.metrics.change, 200)
})

test('buildPerformance repairs negative cash as inferred deposits and flags the estimate', () => {
  const db = ledger()
  // 出金超过当时可用现金，之后才补入金：中段现金为负，说明银行侧转账缺失。
  db.historyEvents = [
    { id: 'D0', accountId: 'A', kind: 'deposit', date: '2026-01-04', cashAmount: 2000, currency: 'CNY' },
    { id: 'S1', accountId: 'A', kind: 'buy', date: '2026-01-05', symbol: '510300', market: 'CN', qty: 100, price: 10, cashAmount: -1000, currency: 'CNY' },
    { id: 'W1', accountId: 'A', kind: 'withdrawal', date: '2026-01-06', cashAmount: -3000, currency: 'CNY' },
    { id: 'D2', accountId: 'A', kind: 'deposit', date: '2026-02-03', cashAmount: 2000, currency: 'CNY' },
  ]
  db.holdings = [{ id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 100, avgCost: 10, manualPrice: 11, currency: 'CNY' }]
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  assert.ok(timeline.warnings.some(w => w.startsWith('TIMELINE_NEGATIVE_CASH')))
  const prices = pricesByInstrument(db.instruments, new Map([['em:1.510300', [['2026-01-05', 10], ['2026-02-03', 12]]]]))
  const result = buildPerformance(db, timeline, { prices, fx: db.fx, days: 730, today: '2026-02-04' })
  assert.equal(result.metrics.cashEstimated, true)
  assert.ok(result.warnings.some(w => w.startsWith('PERF_CASH_ESTIMATED')))
  // 负现金修复为 0（视为推定入金），卖出不会造成净值假摔。
  assert.deepEqual(result.series.map(s => [s.date, s.totalValueBase, s.cash]), [
    ['2026-01-04', 2000, 2000],
    ['2026-01-05', 2000, 1000],
    ['2026-01-06', 1000, 0],
    ['2026-02-03', 1200, 0],
  ])
})

test('buildPerformance skips instruments it cannot price at all', () => {
  const db = ledger()
  db.instruments.push({ id: 'OPT', symbol: 'NIO250117C6000', market: 'US', assetClass: 'other', currency: 'USD' })
  db.historyEvents.push({ id: 'O1', accountId: 'A', kind: 'buy', date: '2026-01-06', symbol: 'NIO250117C6000', market: 'US', qty: 1, price: 100, cashAmount: 0, currency: 'USD' })
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  const prices = pricesByInstrument(db.instruments, new Map([['em:1.510300', [['2026-01-05', 10], ['2026-02-03', 12]]]]))
  const result = buildPerformance(db, timeline, { prices, fx: { CNY: 1, USD: 7 }, days: 730, today: '2026-02-04' })
  assert.ok(result.warnings.some(w => w.startsWith('PERF_NO_PRICE:NIO250117C6000')))
  // 期权无法定价：不计入证券市值（也不按 0 计入）；02-02 沿用最近收盘价 10。
  assert.deepEqual(result.series.map(s => s.totalValueBase), [1000, 1000, 1000, 1080, 1200])
})

test('unresolved history symbols become synthetic instruments instead of being dropped', () => {
  const db = ledger()
  db.historyEvents.push({ id: 'S2', accountId: 'A', kind: 'buy', date: '2026-01-06', symbol: '512710', market: 'CN', qty: 100, price: 1, cashAmount: -100, currency: 'CNY' })
  db.historyEvents.push({ id: 'S3', accountId: 'A', kind: 'sell', date: '2026-01-10', symbol: '512710', market: 'CN', qty: 100, price: 1.1, cashAmount: 110, currency: 'CNY' })
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  assert.ok(timeline.warnings.some(w => w.startsWith('TIMELINE_SYNTHETIC_INSTRUMENTS:1')))
  const synth = timeline.syntheticInstruments.find(i => i.symbol === '512710')
  assert.deepEqual([synth.market, synth.assetClass, synth.currency], ['CN', 'etf', 'CNY'])
  const held = timeline.states.find(s => s.date === '2026-01-06')
  assert.equal(held.positions['SYM:CN:512710'], 100)
  assert.equal(timeline.states.at(-1).positions['SYM:CN:512710'], 0)
})

test('buildPerformance reports missing history and caps the window', () => {
  const empty = ledger()
  empty.historyEvents = []; empty.trades = []
  const none = buildPerformance(empty, reconstructTimeline(empty, { accountId: 'A' }), { prices: new Map(), fx: empty.fx })
  assert.deepEqual(none.warnings, ['PERF_NO_FLOW_HISTORY'])
  assert.deepEqual(none.series, [])

  const db = ledger()
  const timeline = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-02-04T00:00:00Z') })
  const prices = pricesByInstrument(db.instruments, new Map([['em:1.510300', klineRows]]))
  const capped = buildPerformance(db, timeline, { prices, fx: db.fx, days: 7, today: '2026-02-04' })
  assert.equal(capped.from >= '2026-01-28' || capped.from === timeline.from, true)
})

test('computePerformance orchestrates timeline, kline fetch and metrics end to end', async () => {
  const db = ledger()
  const dir = mkdtempSync(join(tmpdir(), 'dsh-perf-'))
  const cachePath = join(dir, 'klines.json')
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ data: { klines: klineRows.map(([d, p]) => d + ',' + p) } }) })
  const result = await computePerformance(db, { accountIds: ['A'], days: 730, fetch: fetchImpl, cachePath, now: () => Date.parse('2026-02-04T00:00:00Z') })
  assert.equal(result.metrics.endValue, 1140)
  assert.equal(result.klines.fetched, 1)
  assert.equal(result.accountIds[0], 'A')
  const again = await computePerformance(db, { accountIds: ['A'], days: 730, fetch: fetchImpl, cachePath, now: () => Date.parse('2026-02-04T00:00:00Z') })
  assert.equal(again.klines.fetched, 0)
  assert.equal(again.klines.cached, 1)
  rmSync(dir, { recursive: true, force: true })
})
