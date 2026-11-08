import test from 'node:test'
import assert from 'node:assert/strict'
import { positionEvents, reconstructTimeline, mergeTimelines, inferredTransfers } from './timeline.mjs'

const ledger = () => ({
  version: 1, baseCurrency: 'CNY', fx: { CNY: 1 },
  accounts: [{ id: 'A', name: 'A', currency: 'CNY' }, { id: 'B', name: 'B', currency: 'CNY' }],
  instruments: [
    { id: 'I1', symbol: '510300', market: 'CN', assetClass: 'etf', currency: 'CNY' },
    { id: 'I2', symbol: '600519', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'CASH', symbol: 'CASH:CNY', market: 'CASH', assetClass: 'cash', currency: 'CNY' },
  ],
  holdings: [
    { id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 60, avgCost: 10, manualPrice: 12, currency: 'CNY' },
    { id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 480, currency: 'CNY' },
    { id: 'H3', accountId: 'B', instrumentId: 'I2', qty: 10, avgCost: 100, manualPrice: 110, currency: 'CNY' },
  ],
  historyEvents: [
    { id: 'E1', accountId: 'A', kind: 'buy', date: '2026-01-05', symbol: '510300', market: 'CN', qty: 100, price: 10, cashAmount: -1000, currency: 'CNY' },
    { id: 'E2', accountId: 'A', kind: 'sell', date: '2026-02-02', symbol: '510300', market: 'CN', qty: 40, price: 12, cashAmount: 480, currency: 'CNY' },
    { id: 'E3', accountId: 'A', kind: 'deposit', date: '2026-01-04', cashAmount: 1000, currency: 'CNY' },
  ],
  trades: [
    { id: 'T1', accountId: 'A', instrumentId: 'I1', side: 'buy', qty: 100, price: 10, date: '2026-01-05', currency: 'CNY' },
    { id: 'T2', accountId: 'B', instrumentId: 'I2', side: 'buy', qty: 10, price: 100, date: '2026-05-06', currency: 'CNY', fee: 5 },
  ],
  snapshots: [],
})

test('positionEvents resolves instruments by symbol and dedupes imported trades', () => {
  const db = ledger()
  const { events, warnings } = positionEvents(db)
  assert.equal(events.length, 3)
  assert.deepEqual(events.map(e => [e.date, e.side, e.qty, e.instrumentId]), [
    ['2026-01-05', 'buy', 100, 'I1'],
    ['2026-05-06', 'buy', 10, 'I2'],
    ['2026-02-02', 'sell', 40, 'I1'],
  ].sort((a, b) => a[0].localeCompare(b[0])))
  assert.ok(warnings.includes('TIMELINE_DEDUPED_TRADES:1'))
  const trade = events.find(e => e.source === 'trade')
  assert.equal(trade.cashAmount, -1005)
})

test('reconstructTimeline reverses flows to the start state and replays each day', () => {
  const t = reconstructTimeline(ledger(), { accountId: 'A', today: new Date('2026-11-08T00:00:00Z') })
  assert.deepEqual(t.start.positions, { I1: 0 })
  assert.deepEqual(t.start.cash, { CNY: 0 })
  assert.deepEqual(t.states.map(s => s.date), ['2026-01-04', '2026-01-05', '2026-02-02'])
  assert.deepEqual(t.states[0].cash, { CNY: 1000 })
  assert.deepEqual([t.states[1].positions.I1, t.states[1].cash.CNY], [100, 0])
  assert.deepEqual([t.states[2].positions.I1, t.states[2].cash.CNY], [60, 480])
  assert.equal(t.coverage.events, 2)
  assert.ok(!t.warnings.some(w => w.startsWith('TIMELINE_ENDPOINT_MISMATCH')))
})

test('reconstructTimeline flags untracked holdings and negative cash honestly', () => {
  // 先出金、后来才入金：中间现金为负，说明银行侧记录缺失。
  const db = ledger()
  db.historyEvents = [
    { id: 'W1', accountId: 'A', kind: 'withdrawal', date: '2026-01-05', cashAmount: -1000, currency: 'CNY' },
    { id: 'D1', accountId: 'A', kind: 'deposit', date: '2026-03-01', cashAmount: 1000, currency: 'CNY' },
  ]
  db.trades = []
  db.holdings = [{ id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 0, currency: 'CNY' }]
  const t = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-11-08T00:00:00Z') })
  assert.ok(t.warnings.some(w => w.startsWith('TIMELINE_NEGATIVE_CASH')))
  const locked = ledger()
  locked.historyEvents = []
  locked.trades = []
  const t2 = reconstructTimeline(locked, { accountId: 'A' })
  assert.ok(t2.warnings.some(w => w.startsWith('TIMELINE_NO_TRADE_HISTORY:1')))
})

test('inferredTransfers estimates unrecorded deposits from negative cash gaps', () => {
  const db = ledger()
  db.holdings = [{ id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 0, currency: 'CNY' }]
  db.trades = []
  db.historyEvents = [
    { id: 'W1', accountId: 'A', kind: 'withdrawal', date: '2026-01-05', cashAmount: -2000, currency: 'CNY' },
    { id: 'D1', accountId: 'A', kind: 'deposit', date: '2026-03-01', cashAmount: 2000, currency: 'CNY' },
  ]
  const inf = inferredTransfers(db, { accountIds: ['A'] })
  // 1 月出金时现金缺口 2000：这笔钱只能来自未记录的外部转入（下限估计）。
  assert.equal(inf.total, 2000)
  assert.deepEqual(inf.byMonth, [{ month: '2026-01', amount: 2000 }])
  assert.match(inf.note, /银证转账/)
})

test('inferredTransfers reports zero when recorded flows explain all cash', () => {
  const db = ledger()
  db.holdings = [{ id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 1000, currency: 'CNY' }]
  db.trades = []
  db.historyEvents = [
    { id: 'D1', accountId: 'A', kind: 'deposit', date: '2026-01-05', cashAmount: 2000, currency: 'CNY' },
    { id: 'W1', accountId: 'A', kind: 'withdrawal', date: '2026-02-05', cashAmount: -1000, currency: 'CNY' },
  ]
  const inf = inferredTransfers(db, { accountIds: ['A'] })
  assert.equal(inf.total, 0)
  assert.deepEqual(inf.byMonth, [])
})

test('mergeTimelines aligns dates and sums positions and cash across accounts', () => {
  const db = ledger()
  const a = reconstructTimeline(db, { accountId: 'A', today: new Date('2026-11-08T00:00:00Z') })
  const b = reconstructTimeline(db, { accountId: 'B', today: new Date('2026-11-08T00:00:00Z') })
  const merged = mergeTimelines([a, b])
  assert.deepEqual(merged.states.map(s => s.date), ['2026-01-04', '2026-01-05', '2026-02-02', '2026-05-06'])
  const last = merged.states[merged.states.length - 1]
  assert.equal(last.positions.I1, 60)
  assert.equal(last.positions.I2, 10)
  // B 账户没有现金持仓，买入在其自身账本内被逆推成 1005 的起始现金、终态回到 0。
  assert.equal(last.cash.CNY, 480)
  assert.equal(merged.events.length, 3)
})
