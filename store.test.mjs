import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolate all persistence tests from the user's real ledger before importing the store.
const directory = mkdtempSync(join(tmpdir(), 'dsh-ledger-test-'))
process.env.DSH_PORTFOLIO_DIR = directory
const { applyOp, summarize, load, save, DATA_FILE } = await import('./store.mjs')
test.after(() => rmSync(directory, { recursive: true, force: true }))

function fixture() {
  return { version: 1, baseCurrency: 'CNY', fx: { CNY: 1, USD: 8, HKD: 1, EUR: 10 }, accounts: [{ id: 'a', name: 'Broker', currency: 'USD' }, { id: 'empty', name: 'Empty', currency: 'CNY' }], instruments: [], holdings: [], trades: [], snapshots: [] }
}
function holding(db, extra = {}) {
  return applyOp(db, 'holding.upsert', { accountId: 'a', symbol: 'TEST', market: 'US', qty: 10, avgCost: 2, manualPrice: 3, ...extra }).holding
}
function trade(db, extra = {}) {
  return { accountId: 'a', symbol: 'TEST', market: 'US', side: 'buy', qty: 2, price: 5, date: '2026-11-06', ...extra }
}
function bad(db, op, payload) {
  assert.throws(() => applyOp(db, op, payload), (e) => e.code === 'bad-request')
}

test('base.set rebases every known FX including old base, preserving relative valuations', () => {
  const db = fixture()
  holding(db)
  const before = summarize(db).totalValueBase
  const result = applyOp(db, 'base.set', { currency: 'usd' })
  assert.deepEqual(result.fx, { CNY: 0.125, USD: 1, HKD: 0.125, EUR: 1.25 })
  assert.equal(summarize(db).totalValueBase, before / 8)
  applyOp(db, 'base.set', { currency: 'CNY' })
  assert.deepEqual(db.fx, fixture().fx)
})

test('base.set rejects missing/invalid FX without changing base or rates', () => {
  for (const target of ['', 'JPY', 'EUR']) {
    const db = fixture()
    if (target === 'EUR') db.fx.HKD = 0
    const before = structuredClone(db)
    bad(db, 'base.set', { currency: target })
    assert.deepEqual(db, before)
  }
  const db = fixture()
  bad(db, 'fx.set', { currency: 'CNY', rate: 2 })
  bad(db, 'fx.set', { rate: 2 })
})

test('summary excludes missing FX, includes empty accounts, and warns about cost-based estimates', () => {
  const db = fixture()
  holding(db, { symbol: 'FUND', assetClass: 'fund', manualPrice: null })
  const missing = holding(db, { symbol: 'JPYF', currency: 'JPY', assetClass: 'bond' })
  const summary = summarize(db)
  assert.equal(summary.totalValueBase, 160)
  assert.equal(summary.excludedCount, 1)
  assert.deepEqual(summary.excludedHoldings[0], { holdingId: missing.id, accountId: 'a', instrumentId: missing.instrumentId, currency: 'JPY', reason: 'missing-fx' })
  assert.ok(summary.warnings.some((w) => w.code === 'cost-estimate-price'))
  assert.equal(summary.accounts.find((a) => a.accountId === 'empty').valueBase, 0)
  assert.equal(summary.accounts.find((a) => a.accountId === 'a').excludedHoldings, 1)
  assert.equal(summary.assetClasses[0].assetClass, 'fund')
  assert.equal(summary.currencies[0].currency, 'USD')
  assert.equal(summary.assetClasses[0].weight, 1)
})

test('summary distributions reconcile to unrounded totals and use fractional weights', () => {
  const db = fixture()
  holding(db, { assetClass: 'etf' })
  holding(db, { symbol: 'BOND', assetClass: 'bond', currency: 'CNY', qty: 10, manualPrice: 8 })
  const summary = summarize(db)
  assert.equal(summary.totalValueBase, 320)
  assert.equal(summary.totalCostBase, 180)
  assert.equal(summary.totalPnlBase, 140)
  assert.equal(summary.assetClasses.find((a) => a.assetClass === 'etf').weight, 0.75)
  assert.equal(summary.currencies.find((c) => c.currency === 'CNY').valueBase, 80)
})

test('holding and price validation rejects invalid, negative, blank, nonfinite and boolean inputs', () => {
  for (const value of [-1, '', ' ', 'abc', Infinity, NaN, true, [], null]) {
    bad(fixture(), 'holding.upsert', { accountId: 'a', symbol: 'TEST', qty: value })
  }
  for (const value of ['', ' ', 'abc', Infinity, NaN, true, [], null]) {
    bad(fixture(), 'holding.upsert', { accountId: 'a', symbol: 'TEST', avgCost: value })
  }
  const db = fixture()
  const h = holding(db)
  for (const value of [-1, '', 'oops', Infinity, false]) bad(db, 'price.set', { holdingId: h.id, price: value })
  applyOp(db, 'price.set', { holdingId: h.id, price: 0 })
  assert.equal(summarize(db).totalValueBase, 0)
  applyOp(db, 'price.set', { holdingId: h.id, price: null })
  assert.equal(db.holdings[0].manualPrice, null)
})

test('trade validates side, positive quantity, price, fee and date before recording', () => {
  for (const extra of [{ side: 'SELL' }, { side: null }, { qty: 0 }, { qty: -1 }, { qty: '' }, { qty: Infinity }, { price: -1 }, { price: true }, { fee: -1 }, { date: '2026-02-30' }]) {
    const db = fixture()
    bad(db, 'trade.add', trade(db, extra))
    assert.equal(db.trades.length, 0)
    assert.equal(db.holdings.length, 0)
  }
})

test('trade prevents oversells and currency mismatch, supports exact close and weighted average buys', () => {
  const db = fixture()
  holding(db)
  const before = structuredClone(db)
  bad(db, 'trade.add', trade(db, { side: 'sell', qty: 11 }))
  bad(db, 'trade.add', trade(db, { currency: 'CNY' }))
  assert.deepEqual(db, before)
  applyOp(db, 'trade.add', trade(db, { qty: 10, price: 4 }))
  assert.equal(db.holdings[0].qty, 20)
  assert.equal(db.holdings[0].avgCost, 3)
  applyOp(db, 'trade.add', trade(db, { side: 'sell', qty: 20 }))
  assert.equal(db.holdings[0].qty, 0)
  assert.equal(db.holdings[0].avgCost, 0)
})

test('snapshot plus historical trades does not double count; source/external IDs and fingerprints are idempotent', () => {
  const db = fixture()
  holding(db)
  const rows = [trade(db, { side: 'sell', qty: 100, externalId: '42' }), trade(db, { price: '7', qty: '3' })]
  const payload = { rows, applyHoldings: false, source: 'broker-csv' }
  const result = applyOp(db, 'import.trades', payload)
  assert.equal(result.imported, 2)
  assert.equal(result.skipped, 0)
  assert.equal(db.holdings[0].qty, 10)
  assert.equal(db.trades[0].appliedToHoldings, false)
  assert.equal(db.trades[0].source, 'broker-csv')
  const again = applyOp(db, 'import.trades', { ...payload, rows: [{ ...rows[0], price: 999 }, { ...rows[1], price: 7, qty: 3, note: 'changed note' }] })
  assert.equal(again.imported, 0)
  assert.equal(again.skipped, 2)
  assert.equal(db.trades.length, 2)
  assert.equal(applyOp(db, 'import.trades', { rows: [rows[0]], applyHoldings: false, source: 'other-broker' }).imported, 1)
})

test('default imports apply holdings once and failed batches commit no partial state', () => {
  const db = fixture()
  const rows = [trade(db)]
  applyOp(db, 'import.trades', { rows })
  applyOp(db, 'import.trades', { rows })
  assert.equal(db.holdings[0].qty, 2)
  const before = structuredClone(db)
  bad(db, 'import.trades', { rows: [trade(db, { price: 9 }), trade(db, { side: 'sell', qty: 99 })] })
  assert.deepEqual(db, before)
  bad(db, 'import.holdings', { rows: [{ accountId: 'a', symbol: 'NEW', qty: 1 }, { accountId: 'a', symbol: 'BAD', qty: -1 }] })
  assert.deepEqual(db, before)
  bad(db, 'import.trades', { rows: [], applyHoldings: 'false' })
})

test('instrument metadata editing supports fund, etf, cash, bond and crypto', () => {
  const db = fixture()
  const h = holding(db)
  for (const cls of ['fund', 'etf', 'cash', 'bond', 'crypto']) {
    const { instrument } = applyOp(db, 'instrument.upsert', { id: h.instrumentId, name: 'Edited', assetClass: cls, market: 'us', currency: 'USD', note: 'metadata' })
    assert.equal(instrument.assetClass, cls)
    assert.equal(instrument.name, 'Edited')
    assert.equal(instrument.market, 'US')
    assert.equal(db.instruments.length, 1)
  }
  bad(db, 'instrument.upsert', { id: h.instrumentId, assetClass: 'not-supported' })
})

test('save persists daily currency-explicit snapshots; same-day saves upsert per currency and preserve history', () => {
  const db = fixture()
  holding(db)
  db.snapshots.push({ date: '2020-01-01', baseCurrency: 'CNY', totalValueBase: 123 })
  save(db)
  save(db)
  assert.equal(db.snapshots.length, 2)
  assert.equal(load().snapshots.at(-1).totalValueBase, 240)
  applyOp(db, 'base.set', { currency: 'USD' })
  save(db)
  const persisted = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  assert.equal(persisted.snapshots.length, 3)
  assert.equal(persisted.snapshots.at(-1).baseCurrency, 'USD')
  assert.equal(persisted.snapshots.at(-1).totalValueBase, 30)
  assert.equal(summarize(load()).history[0].baseCurrency, 'CNY')
  assert.equal(summarize(load()).history[0].totalValueBase, 123)
})

test('invalid legacy valuations are excluded with finite totals, including arithmetic overflow', () => {
  const db = fixture()
  const h = holding(db)
  h.manualPrice = Infinity
  assert.equal(summarize(db).excludedHoldings[0].reason, 'invalid-valuation')
  h.manualPrice = 1e308
  h.qty = 10
  assert.equal(summarize(db).totalValueBase, 0)
  h.manualPrice = 1e305
  h.qty = 1
  assert.ok(Number.isFinite(summarize(db).totalValueBase))
  const before = structuredClone(db)
  bad(db, 'trade.add', trade(db, { qty: 1e308, price: 100 }))
  assert.deepEqual(db, before)
})

test('instrument metadata rejection does not partially edit an existing instrument', () => {
  const db = fixture()
  const h = holding(db)
  const before = structuredClone(db)
  bad(db, 'instrument.upsert', { id: h.instrumentId, name: 'Partial change', currency: '' })
  assert.deepEqual(db, before)
  holding(db, { symbol: 'SECOND' })
  const beforeCollision = structuredClone(db)
  bad(db, 'instrument.upsert', { id: h.instrumentId, symbol: 'SECOND' })
  assert.deepEqual(db, beforeCollision)
})

test('historical import deduplication survives save/load', () => {
  const db = fixture()
  const request = { rows: [trade(db, { externalId: 'persistent' }), trade(db, { price: 6 })], source: 'statement', applyHoldings: false }
  applyOp(db, 'import.trades', request)
  save(db)
  const restored = load()
  const repeated = applyOp(restored, 'import.trades', request)
  assert.equal(repeated.skipped, 2)
  assert.equal(restored.trades.length, 2)
  assert.equal(restored.holdings.length, 0)
})

test('load does not inject default FX rates into an existing sparse ledger', () => {
  const db = fixture()
  db.fx = { CNY: 1 }
  save(db)
  assert.deepEqual(load().fx, { CNY: 1 })
})

test('instruments carry sector/style classification and the summary aggregates by them', () => {
  const db = fixture()
  holding(db, { symbol: 'MAOTAI', manualPrice: 3 })
  applyOp(db, 'instrument.upsert', { instrument: { symbol: 'MAOTAI', market: 'US', sector: '白酒', style: '价值' } })
  holding(db, { symbol: 'TECH', manualPrice: 3 })
  applyOp(db, 'instrument.upsert', { instrument: { symbol: 'TECH', market: 'US', sector: '半导体', style: 'growth' } })
  const summary = summarize(db)
  assert.deepEqual(summary.sectors.map((x) => [x.sector, x.valueBase]).sort(), [['半导体', 240], ['白酒', 240]])
  assert.deepEqual(summary.styles.map((x) => [x.style, x.valueBase]).sort(), [['growth', 240], ['value', 240]])
  bad(db, 'instrument.upsert', { instrument: { symbol: 'MAOTAI', market: 'US', style: '动量' } })
  bad(db, 'instrument.upsert', { instrument: { symbol: 'MAOTAI', market: 'US', sector: 'x'.repeat(25) } })
  // 未分类持仓归入「未分类」
  holding(db, { symbol: 'PLAIN', manualPrice: 3 })
  const unclassified = summarize(db)
  assert.equal(unclassified.sectors.find((x) => x.sector === '未分类').valueBase, 240)
})

test('historyEvent.add archives account flows without touching positions and dedupes by externalId', () => {
  const db = fixture()
  const first = applyOp(db, 'historyEvent.add', { accountId: 'a', kind: 'deposit', date: '2026-11-07', cashAmount: 10000, note: '转入', externalId: 'X-1' })
  assert.equal(first.event.archiveOnly, true)
  assert.equal(first.event.source, 'model')
  assert.ok(first.event.batchId)
  assert.equal(db.historyEvents.length, 1)
  assert.equal(db.holdings.length, 0)
  const repeated = applyOp(db, 'historyEvent.add', { accountId: 'a', kind: 'deposit', date: '2026-11-07', cashAmount: 10000, externalId: 'X-1' })
  assert.equal(repeated.duplicate, true)
  assert.equal(db.historyEvents.length, 1)
  bad(db, 'historyEvent.add', { accountId: 'a', kind: 'buy', date: '2026-11-07', cashAmount: 1 })
  bad(db, 'historyEvent.add', { accountId: 'a', kind: 'deposit', date: '2026-13-40', cashAmount: 1 })
  assert.throws(() => applyOp(db, 'historyEvent.add', { accountId: 'missing', kind: 'deposit', date: '2026-11-07', cashAmount: 1 }), (e) => e.code === 'not-found')
  bad(db, 'historyEvent.add', { accountId: 'a', kind: 'dividend', date: '2026-11-07', cashAmount: 'many' })
  save(db)
  const restored = load()
  assert.equal(restored.historyEvents.length, 1)
  assert.equal(restored.historyBatches[0].method, 'model')
  assert.ok(Array.isArray(restored.snapshots[0].sectors))
})

test('negative diluted avgCost is valid, valued, and survives later trades and save/load', () => {
  const db = fixture()
  applyOp(db, 'holding.upsert', { accountId: 'a', symbol: 'DILUTED', market: 'US', qty: 10, avgCost: -2, manualPrice: 3 })
  const summary = summarize(db)
  assert.equal(summary.excludedCount, 0)
  assert.equal(summary.totalValueBase, 240)
  assert.equal(summary.totalCostBase, -160)
  assert.equal(summary.totalPnlBase, 400)
  // 分红稀释后的负成本在后续成交中仍可用（加权平均）
  applyOp(db, 'trade.add', trade(db, { symbol: 'DILUTED', qty: 10, price: 4 }))
  assert.equal(db.holdings[0].avgCost, 1)
  save(db)
  const restored = load()
  const summaryAfter = summarize(restored)
  assert.equal(summaryAfter.excludedCount, 0)
  assert.ok(restored.holdings.some((h) => h.avgCost === 1))
  // 非有限成本仍然拒绝估值
  const broken = fixture()
  const h = applyOp(broken, 'holding.upsert', { accountId: 'a', symbol: 'BROKEN', market: 'US', qty: 10, avgCost: 2, manualPrice: 3 }).holding
  h.avgCost = Infinity
  assert.equal(summarize(broken).excludedHoldings[0].reason, 'invalid-valuation')
})

test('history events carry validated life-bill categories and can be recategorized', () => {
  const db = fixture()
  const { event } = applyOp(db, 'historyEvent.add', { accountId: 'a', kind: 'withdrawal', date: '2026-11-03', cashAmount: -86, category: 'food', note: '午餐' })
  assert.equal(event.category, 'food')
  bad(db, 'historyEvent.add', { accountId: 'a', kind: 'withdrawal', date: '2026-11-03', cashAmount: -1, category: 'grocery' })
  const updated = applyOp(db, 'historyEvent.update', { id: event.id, category: 'transport' })
  assert.equal(updated.event.category, 'transport')
  assert.equal(db.historyEvents[0].category, 'transport')
  applyOp(db, 'historyEvent.update', { id: event.id, note: '地铁' })
  assert.equal(db.historyEvents[0].note, '地铁')
  assert.equal(db.historyEvents[0].category, 'transport')
  applyOp(db, 'historyEvent.update', { id: event.id, category: null })
  assert.equal(db.historyEvents[0].category, undefined)
  assert.throws(() => applyOp(db, 'historyEvent.update', { id: 'missing', category: 'food' }), (e) => e.code === 'not-found')
  bad(db, 'historyEvent.update', { id: event.id, category: 'grocery' })
  save(db)
  assert.equal(load().historyEvents.length, 1)
})

test('quotePrice fills valuation below manualPrice and suppresses cost-estimate warnings', () => {
  const db = fixture()
  const h = holding(db, { symbol: 'QQQ', manualPrice: null })
  applyOp(db, 'holding.upsert', { holding: { id: h.id, accountId: 'a', instrumentId: h.instrumentId, quotePrice: 5, quoteAt: '2026-11-07T15:00:03Z', quoteSource: 'tencent' } })
  const summary = summarize(db)
  assert.equal(summary.totalValueBase, 400)
  assert.ok(!summary.warnings.some(w => w.code === 'cost-estimate-price'))
  bad(db, 'holding.upsert', { holding: { id: h.id, accountId: 'a', instrumentId: h.instrumentId, quoteAt: 'not-a-date' } })
  applyOp(db, 'price.set', { holdingId: h.id, price: 9 })
  assert.equal(summarize(db).totalValueBase, 720)
  // 手填价清除后回落到行情价
  applyOp(db, 'price.set', { holdingId: h.id, price: null })
  assert.equal(summarize(db).totalValueBase, 400)
  // 显式清除行情价回落到成本估值并恢复告警
  applyOp(db, 'holding.upsert', { holding: { id: h.id, accountId: 'a', instrumentId: h.instrumentId, quotePrice: null } })
  const afterClear = summarize(db)
  assert.equal(afterClear.totalValueBase, 160)
  assert.ok(afterClear.warnings.some(w => w.code === 'cost-estimate-price'))
})
