import test from 'node:test'
import assert from 'node:assert/strict'
import { billSummary } from './bills.mjs'

const ledger = () => ({
  baseCurrency: 'CNY', fx: { CNY: 1, HKD: 0.92 },
  budgets: [
    { id: 'B1', category: 'food', monthly: 100 },
    { id: 'B2', category: 'housing', monthly: 2000 },
  ],
  historyEvents: [
    { id: '1', kind: 'withdrawal', date: '2026-11-03', cashAmount: -86, currency: 'CNY', category: 'food', note: '午餐' },
    { id: '2', kind: 'withdrawal', date: '2026-11-05', cashAmount: -3000, currency: 'CNY', category: 'housing', note: '房租' },
    { id: '3', kind: 'deposit', date: '2026-11-01', cashAmount: 12000, currency: 'CNY', category: 'other', note: '报销' },
    { id: '4', kind: 'withdrawal', date: '2026-10-20', cashAmount: -100, currency: 'HKD', category: 'transport', note: '八达通' },
    { id: '5', kind: 'withdrawal', date: '2026-11-06', cashAmount: -50, currency: 'JPY', category: 'food', note: '缺汇率' },
    { id: '6', kind: 'deposit', date: '2026-11-07', cashAmount: 500, currency: 'CNY', note: '未归类' },
    { id: '7', kind: 'dividend', date: '2026-11-07', cashAmount: 30, currency: 'CNY', category: 'food', note: '红包' },
    { id: '8', kind: 'withdrawal', date: '2024-01-09', cashAmount: -999, currency: 'CNY', category: 'shopping', note: '窗口外' },
  ],
})

test('billSummary aggregates months and categories in base currency', () => {
  const summary = billSummary(ledger(), { today: '2026-11-08' })
  assert.equal(summary.baseCurrency, 'CNY')
  assert.equal(summary.window.months, 12)
  assert.deepEqual([summary.window.from, summary.window.to], ['2025-12', '2026-11'])
  const nov = summary.months.find((m) => m.month === '2026-11')
  assert.deepEqual([nov.out, nov.in, nov.net, nov.count], [3086, 12030, 8944, 4])
  const oct = summary.months.find((m) => m.month === '2026-10')
  assert.deepEqual([oct.out, oct.in, oct.count], [92, 0, 1])
  assert.deepEqual([summary.totals.out, summary.totals.in, summary.totals.net, summary.totals.count], [3178, 12030, 8852, 5])
  const food = summary.categories.find((c) => c.category === 'food')
  assert.deepEqual([food.out, food.in, food.count], [86, 30, 2])
  assert.equal(summary.categories[0].category, 'housing')
  // 本月预算执行：住房 3000/2000 超支，餐饮 86/100 未超。
  assert.equal(summary.currentMonth, '2026-11')
  assert.deepEqual(summary.budgetStatus.map((b) => [b.category, b.spent, b.monthly, b.over]), [
    ['housing', 3000, 2000, true],
    ['food', 86, 100, false],
  ])
  assert.equal(summary.budgetStatus[1].remaining, 14)
  assert.ok(summary.warnings.includes('BILLS_MISSING_FX:1'))
  assert.ok(summary.warnings.includes('BILLS_UNCATEGORIZED:1'))
})

test('billSummary keeps out-of-window and unclassified rows out of totals', () => {
  const summary = billSummary(ledger(), { today: '2026-11-08', months: 1 })
  assert.equal(summary.window.months, 1)
  assert.deepEqual([summary.window.from, summary.window.to], ['2026-11', '2026-11'])
  assert.equal(summary.totals.out, 3086)
  assert.equal(summary.months.length, 1)
  assert.ok(!summary.categories.some((c) => c.category === 'transport'))
})

test('billSummary with no classified bills is empty but well formed', () => {
  const db = ledger()
  db.historyEvents = db.historyEvents.filter((e) => !e.category)
  const summary = billSummary(db, { today: '2026-11-08' })
  assert.deepEqual(summary.categories, [])
  assert.deepEqual(summary.totals, { out: 0, in: 0, net: 0, count: 0 })
  assert.equal(summary.uncategorized, 1)
})
