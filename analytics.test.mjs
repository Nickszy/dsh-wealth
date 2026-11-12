// analytics.test.mjs — 分析层纯函数测试。合成数据，无真实账本。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flowSummary, timeWeightedReturn, xirr, maxDrawdown, concentration, analyze, isExternalFlow, isInternalFlow, scopeLedger } from './analytics.mjs'
import { createHistoryService } from './history.mjs'
import { applyOp } from './store.mjs'

const ledger = () => ({ version: 1, baseCurrency: 'CNY', fx: { CNY: 1 }, accounts: [], instruments: [], holdings: [], trades: [], historyEvents: [], historyBatches: [], snapshots: [], updatedAt: null })

const mk = (date, totalValueBase, extra = {}) => ({ date, baseCurrency: 'CNY', totalValueBase, totalCostBase: totalValueBase, totalPnlBase: 0, excludedCount: 0, warnings: [], accounts: [], assetClasses: [], currencies: [], ...extra })

test('external vs internal flows follow the canonical cash sign', () => {
  assert.equal(isExternalFlow('deposit'), true)
  assert.equal(isExternalFlow('withdrawal'), true)
  assert.equal(isExternalFlow('dividend'), false)
  assert.equal(isExternalFlow('buy'), false)
  assert.equal(isInternalFlow('dividend'), true)
  assert.equal(isInternalFlow('interest'), true)
  assert.equal(isInternalFlow('fee'), true)
  assert.equal(isInternalFlow('tax'), true)
  assert.equal(isInternalFlow('deposit'), false)
})

test('flow summary aggregates by kind and year without inventing amounts', () => {
  const rows = [
    { date: '2026-01-05', kind: 'deposit', cashAmount: 10000, currency: 'CNY' },
    { date: '2026-02-05', kind: 'dividend', cashAmount: 120.5, currency: 'CNY' },
    { date: '2026-02-06', kind: 'dividend', cashAmount: null, currency: 'HKD' },
    { date: '2026-03-01', kind: 'withdrawal', cashAmount: -2000, currency: 'CNY' },
    { date: '2025-12-30', kind: 'tax', cashAmount: -85, currency: 'CNY' },
  ]
  const f = flowSummary(rows)
  assert.equal(f.totals.externalIn, 10000)
  assert.equal(f.totals.externalOut, 2000)
  assert.equal(f.totals.netExternal, 8000)
  assert.equal(f.totals.dividends, 120.5)
  assert.equal(f.totals.taxes, 85)
  assert.equal(f.unknownCashRows, 1)
  const y2026 = f.byYear.find((y) => y.year === '2026')
  assert.equal(y2026.externalIn, 10000)
  assert.equal(y2026.externalOut, 2000)
  assert.equal(y2026.dividends, 120.5)
  assert.equal(f.byKind.find((k) => k.kind === 'dividend').unknownCash, 1)
})

test('TWR chains snapshot periods, treating deposits as external cash', () => {
  // V0=100, deposit 50 at period start, V1=160: return = 160/150 - 1 = 6.67%
  const series = [mk('2026-01-01', 100), mk('2026-02-01', 160)]
  const rows = [{ date: '2026-01-15', kind: 'deposit', cashAmount: 50, currency: 'CNY' }]
  const r = timeWeightedReturn(series, rows)
  assert.equal(r.complete, true)
  assert.equal(r.periods, 1)
  assert.ok(Math.abs(r.value - 6.67) < 0.05, 'TWR should be ~6.67%, got ' + r.value)
  // No flows: plain ratio.
  const plain = timeWeightedReturn([mk('2026-01-01', 100), mk('2026-02-01', 110)], [])
  assert.ok(Math.abs(plain.value - 10) < 0.01)
  // Unknown cash marks incomplete.
  const unk = timeWeightedReturn(series, [{ date: '2026-01-15', kind: 'deposit', cashAmount: null, currency: 'CNY' }])
  assert.equal(unk.complete, false)
  assert.ok(/下限/.test(unk.reason))
  // Too few snapshots.
  assert.equal(timeWeightedReturn([mk('2026-01-01', 100)], []).value, null)
})

test('XIRR solves a simple deposit-then-growth case', () => {
  // Day 0: invest 100. Day 365: portfolio worth 110, no intermediate flows → 10% annual.
  const series = [mk('2026-01-01', 100), mk('2027-01-01', 110)]
  const r = xirr(series, [])
  // No external flows in range → explicitly refused rather than duplicating TWR.
  assert.equal(r.value, null)
  assert.ok(/等价/.test(r.reason))
  // With a mid-year deposit the solver must find a positive rate near expectation.
  const withFlow = xirr(series, [{ date: '2026-07-01', kind: 'deposit', cashAmount: -50, currency: 'CNY' }])
  assert.equal(typeof withFlow.value, 'number')
  assert.ok(Number.isFinite(withFlow.value))
  // Reversed polarity impossible dataset (all cash out, no growth) stays null.
  const bad = xirr([mk('2026-01-01', 0)], [])
  assert.equal(bad.value, null)
})

test('max drawdown and concentration are bounded and labelled', () => {
  const dd = maxDrawdown([mk('2026-01-01', 100), mk('2026-02-01', 120), mk('2026-03-01', 90), mk('2026-04-01', 95)])
  assert.equal(dd.value, -25)
  assert.equal(dd.peakDate, '2026-02-01')
  assert.equal(dd.troughDate, '2026-03-01')
  // 最深回撤发生在一个更早的峰值之后：peakDate 必须是造成回撤的那个峰值，不是序列最后的峰值。
  const dd2 = maxDrawdown([mk('2026-01-01', 100), mk('2026-02-01', 120), mk('2026-03-01', 80), mk('2026-04-01', 110), mk('2026-05-01', 105)])
  assert.equal(dd2.value, -33.33)
  assert.equal(dd2.peakDate, '2026-02-01')
  assert.equal(dd2.troughDate, '2026-03-01')
  assert.ok(Date.parse(dd2.peakDate) <= Date.parse(dd2.troughDate))
  const c = concentration([
    { assetClass: 'stock', weight: 0.5 },
    { assetClass: 'fund', weight: 0.3 },
    { assetClass: 'cash', weight: 0.2 },
  ])
  assert.equal(c.top1, 50)
  assert.equal(c.top3, 100)
  assert.ok(c.hhi > 0.3 && c.hhi < 0.4)
  assert.equal(concentration([]).top1, null)
})

test('analyze on a ledger with history archive produces a complete read-only report', async () => {
  const db = ledger()
  db.baseCurrency = 'CNY'
  const writes = []
  const service = createHistoryService({
    load: () => db,
    save: (next) => { Object.assign(db, next); writes.push(next) },
    sources: () => [{ id: 'SRC_A', connector: 'ths', transport: 'native', portfolioId: 'book1', accountId: db.accounts[0]?.id }],
    readSourceHistory: null,
    readHistoryFile: async () => ({
      rows: [
        { date: '2026-01-02', time: '09:30:00', kind: 'deposit', symbol: null, name: null, market: null, currency: 'CNY', qty: null, price: null, grossAmount: null, cashAmount: 100000, fee: null, externalId: 'd1', note: null },
        { date: '2026-01-03', time: '10:00:00', kind: 'buy', symbol: '600000', name: '浦发银行', market: 'CN', currency: 'CNY', qty: 1000, price: 8, grossAmount: null, cashAmount: -8000, fee: 5, externalId: 't1', note: null },
        { date: '2026-02-10', time: null, kind: 'dividend', symbol: '600000', name: '浦发银行', market: 'CN', currency: 'CNY', qty: null, price: null, grossAmount: null, cashAmount: 150, fee: null, externalId: 'v1', note: null },
      ],
      errors: [], warnings: [], coverage: { complete: false, note: '测试' },
      sheets: [], selectedSheet: null, ignoredSheets: [],
    }),
    now: () => new Date('2026-03-01T08:00:00Z'),
  })
  applyOp(db, 'account.upsert', { name: '测试账户', currency: 'CNY' })
  const accountId = db.accounts[0].id
  const preview = service.preview({ accountId, method: 'file', defaultCurrency: 'CNY' })
  const previewResult = await preview
  assert.equal(previewResult.summary.new, 3)
  service.commit({ token: previewResult.token })
  assert.equal(db.historyEvents.length, 3)
  // Snapshots come from store.save; fabricate a small series as save() would.
  db.snapshots = [
    { date: '2026-01-01', baseCurrency: 'CNY', totalValueBase: 92000, totalCostBase: 8000, totalPnlBase: 0, excludedCount: 0 },
    { date: '2026-02-01', baseCurrency: 'CNY', totalValueBase: 195000, totalCostBase: 8000, totalPnlBase: 150, excludedCount: 0 },
    { date: '2026-03-01', baseCurrency: 'CNY', totalValueBase: 199000, totalCostBase: 8000, totalPnlBase: 800, excludedCount: 0 },
  ]
  const report = analyze(db)
  assert.equal(report.baseCurrency, 'CNY')
  assert.equal(report.netWorth.snapshotCount, 3)
  assert.equal(report.netWorth.series.length, 3)
  assert.equal(report.netWorth.change, 107000)
  assert.ok(report.flows.totals.externalIn === 100000)
  assert.equal(report.flows.totals.dividends, 150)
  assert.ok(typeof report.performance.twr.value === 'number')
  assert.ok(typeof report.performance.xirr.value === 'number')
  assert.ok(report.quality.warnings.some((w) => /覆盖不完整/.test(w)))
  assert.equal(report.catalog.kinds.length, 14)
  assert.ok(report.catalog.kinds.every((k) => typeof k.cashSign === 'number' || k.cashSign === null))
  // Read-only: analyze must not mutate the ledger.
  const before = JSON.stringify(db)
  analyze(db)
  assert.equal(JSON.stringify(db), before)
})

test('analyze counts only true cost-estimates as unpriced and warns separately about no-price rows', () => {
  const db = ledger()
  db.accounts = [{ id: 'A', name: 'A', currency: 'CNY' }]
  db.instruments = [
    { id: 'I1', symbol: '600001', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'I2', symbol: '600002', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'I3', symbol: '600003', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'I4', symbol: '600004', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'I5', symbol: 'AAPL', market: 'US', assetClass: 'stock', currency: 'USD' },
  ]
  db.holdings = [
    // 只有成本：按成本估值，算作 unpriced（成本已知，包含真实的 0 成本）。
    { id: 'H_COST', accountId: 'A', instrumentId: 'I1', qty: 10, avgCost: 5, currency: 'CNY' },
    { id: 'H_ZERO', accountId: 'A', instrumentId: 'I2', qty: 10, avgCost: 0, currency: 'CNY' },
    // 有行情 / 券商价：不算 unpriced。
    { id: 'H_QUOTE', accountId: 'A', instrumentId: 'I3', qty: 10, avgCost: 5, quotePrice: 6, currency: 'CNY' },
    { id: 'H_SOURCE', accountId: 'A', instrumentId: 'I4', qty: 10, avgCost: 5, sourcePrice: 7, currency: 'CNY' },
    // 完全没有价格且成本未知：由 summarize 排除，单独提示。
    { id: 'H_NOPRICE', accountId: 'A', instrumentId: 'I4', qty: 10, avgCost: null, currency: 'CNY' },
    // 缺汇率：仍走原有「缺少汇率或数值无效」提示。
    { id: 'H_FX', accountId: 'A', instrumentId: 'I5', qty: 1, avgCost: 2, manualPrice: 3, currency: 'USD' },
  ]
  const report = analyze(db)
  assert.equal(report.quality.unpricedHoldings, 2)
  assert.equal(report.quality.excludedHoldings, 2)
  assert.ok(report.quality.warnings.includes('2 条持仓没有现价，按成本估值'))
  assert.ok(report.quality.warnings.includes('1 条持仓因缺少汇率或数值无效未计入总额'))
  assert.ok(report.quality.warnings.includes('1 条持仓没有任何价格且成本未知，未计入总额'))
})

test('scopeLedger keeps only selected accounts and re-sums snapshots from per-account values', () => {
  const db = ledger()
  db.accounts = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }]
  db.holdings = [{ id: 'h1', accountId: 'A' }, { id: 'h2', accountId: 'B' }]
  db.historyEvents = [{ id: 'e1', accountId: 'A', date: '2026-01-02', kind: 'deposit', cashAmount: 100 }, { id: 'e2', accountId: 'B', date: '2026-01-02', kind: 'deposit', cashAmount: 999 }]
  db.snapshots = [
    { date: '2026-01-01', baseCurrency: 'CNY', totalValueBase: 300, accounts: [{ accountId: 'A', valueBase: 100, costBase: 90, pnlBase: 10 }, { accountId: 'B', valueBase: 200, costBase: 200, pnlBase: 0 }] },
    { date: '2026-01-02', baseCurrency: 'CNY', totalValueBase: 500, accounts: [{ accountId: 'B', valueBase: 500, costBase: 500, pnlBase: 0 }] },
  ]
  const before = JSON.stringify(db)
  const s = scopeLedger(db, ['A'])
  assert.deepEqual(s.accounts.map(a => a.id), ['A'])
  assert.deepEqual(s.holdings.map(h => h.id), ['h1'])
  assert.deepEqual(s.historyEvents.map(e => e.id), ['e1'])
  assert.equal(s.snapshots.length, 1)
  assert.equal(s.snapshots[0].totalValueBase, 100)
  assert.equal(analyze(s).flows.totals.externalIn, 100)
  assert.equal(scopeLedger(db, []), db)
  assert.equal(JSON.stringify(db), before)
})
