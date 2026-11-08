import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directory = mkdtempSync(join(tmpdir(), 'dsh-digest-test-'))
process.env.DSH_PORTFOLIO_DIR = directory
const { buildDigest } = await import('./digest.mjs')
test.after(() => rmSync(directory, { recursive: true, force: true }))

const ledger = () => ({
  version: 1, baseCurrency: 'CNY', fx: { CNY: 1 },
  accounts: [
    { id: 'A', name: '券商', currency: 'CNY', type: 'broker' },
    { id: 'C', name: '信用卡', currency: 'CNY', type: 'credit' },
  ],
  instruments: [
    { id: 'I1', symbol: '510300', market: 'CN', assetClass: 'etf', currency: 'CNY' },
    { id: 'CASH', symbol: 'CASH:CNY', market: 'CASH', assetClass: 'cash', currency: 'CNY' },
  ],
  holdings: [
    { id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 100, avgCost: 10, manualPrice: 12, currency: 'CNY' },
    { id: 'H2', accountId: 'A', instrumentId: 'CASH', qty: 5000, avgCost: 1, manualPrice: 1, currency: 'CNY' },
    { id: 'H3', accountId: 'C', instrumentId: 'CASH', qty: 800, avgCost: 1, manualPrice: 1, currency: 'CNY' },
  ],
  historyEvents: [
    ...['2026-08-12', '2026-09-12', '2026-10-12'].map((d, i) => ({ id: 'R' + i, accountId: 'A', kind: 'withdrawal', date: d, cashAmount: -2000, currency: 'CNY', note: '房租', category: 'housing' })),
    { id: 'F1', accountId: 'A', kind: 'withdrawal', date: '2026-11-04', cashAmount: -86, currency: 'CNY', note: '美团', category: 'food' },
    { id: 'U1', accountId: 'A', kind: 'deposit', date: '2026-11-05', cashAmount: 300, currency: 'CNY', note: '未归类' },
  ],
  trades: [], historyBatches: [],
  snapshots: [
    { date: '2026-11-05', baseCurrency: 'CNY', totalValueBase: 6000 },
    { date: '2026-11-06', baseCurrency: 'CNY', totalValueBase: 6200 },
  ],
})

test('digest summarises net worth, snapshot change, upcoming bills and quality', () => {
  const digest = buildDigest(ledger(), { today: new Date('2026-11-08T00:00:00Z'), horizonDays: 7 })
  // 资产 6,200（持仓 1,200 + 现金 5,000），负债 800 → 净资产 5,400。
  assert.equal(digest.netWorth, 5400)
  assert.equal(digest.snapshotChange, 200)
  const rent = digest.upcoming.find((u) => u.label === '房租')
  // 月租间隔 31/30 天，中位 30.5 天：10-12 之后的下一次为 11-11。
  assert.deepEqual([rent.date, rent.amountBase], ['2026-11-11', -2000])
  // 本月（11 月）只有 11-04 的美团一笔已发生生活支出；房租下次在 11-12。
  assert.equal(digest.bills.out, 86)
  assert.equal(digest.bills.count, 1)
  assert.equal(digest.quality.uncategorized, 1)
  assert.match(digest.text, /净资产 5,400\.00 CNY/)
  assert.match(digest.text, /7 天内预计支出 2,000\.00 CNY/)
  assert.match(digest.text, /本月生活账单支出 86\.00/)
  assert.match(digest.text, /1 笔生活流水未归类/)
})

test('digest is honest when there is nothing to report', () => {
  const db = ledger()
  db.historyEvents = []
  db.snapshots = []
  db.accounts = [{ id: 'A', name: '券商', currency: 'CNY' }]
  db.holdings = [{ id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 100, avgCost: 10, manualPrice: 12, currency: 'CNY' }]
  const digest = buildDigest(db, { today: new Date('2026-11-08T00:00:00Z') })
  assert.equal(digest.snapshotChange, null)
  assert.deepEqual(digest.upcoming, [])
  assert.equal(digest.bills.count, 0)
  assert.match(digest.text, /尚无对比快照/)
  assert.match(digest.text, /没有识别到周期性支出/)
})
