import test from 'node:test'
import assert from 'node:assert/strict'
import { createHistoryService } from './history.mjs'

const row = (patch = {}) => ({ date: '2026-01-05', time: '09:30:01', kind: 'buy', originalType: '买入', symbol: '000001', name: '示例', market: 'CN', currency: 'CNY', qty: 100, price: 10, grossAmount: null, cashAmount: -1005, fee: 5, externalId: 'v1', ...patch })
const ledger = () => ({ version: 1, baseCurrency: 'CNY', fx: { CNY: 1 }, accounts: [{ id: 'A', name: '同花顺', currency: 'CNY' }, { id: 'M', name: '手动', currency: 'CNY' }], instruments: [], holdings: [{ id: 'H', accountId: 'A', instrumentId: 'I', qty: 1, avgCost: 1, currency: 'CNY' }], trades: [], historyEvents: [], historyBatches: [], snapshots: [], updatedAt: null })

function harness(rows, { connector = 'ths', transport = 'native' } = {}) {
  let db = ledger(), writes = 0
  const calls = []
  const service = createHistoryService({
    load: () => structuredClone(db), save: s => { db = structuredClone(s); writes++ },
    sources: () => [{ id: 'S1', accountId: 'A', connector, transport }],
    readSourceHistory: async (accountId, range) => { calls.push({ accountId, ...range }); return { rows: typeof rows === 'function' ? rows() : rows, errors: [], warnings: [], coverage: { note: '测试来源' } } },
    now: () => Date.parse('2026-11-07T08:00:00Z'),
  })
  return { service, calls, get db() { return db }, get writes() { return writes } }
}

test('one-click history sync reads from the earliest date to today, archives new rows and keeps holdings', async () => {
  const h = harness([row(), row({ externalId: 'v2', kind: 'dividend', symbol: '000001', qty: null, price: null, cashAmount: 30, fee: null }), row({ externalId: 'v3', kind: 'security_in', originalType: '送股', qty: 200, price: null, cashAmount: 0, fee: null })])
  const r = await h.service.syncAccount('A')
  assert.deepEqual(h.calls[0], { accountId: 'A', from: '2000-01-01', to: '2026-11-07' })
  assert.equal(r.imported, 3); assert.equal(r.duplicates, 0)
  assert.equal(h.db.historyEvents.length, 3); assert.equal(h.db.holdings.length, 1)
  assert.equal(h.db.historySync.A.lastTo, '2026-11-07')
  assert.equal(h.db.historyBatches[0].method, 'auto')
})

test('repeat sync is incremental (30-day lookback) and idempotent; full=true rereads from the beginning', async () => {
  const h = harness([row({ date: '2026-11-01' })])
  await h.service.syncAccount('A')
  const again = await h.service.syncAccount('A')
  assert.equal(h.calls[1].from, '2026-10-08')
  assert.equal(again.imported, 0); assert.equal(again.duplicates, 1)
  assert.equal(h.db.historyEvents.length, 1); assert.equal(h.db.historyBatches.length, 1)
  await h.service.syncAccount('A', { full: true })
  assert.equal(h.calls[2].from, '2000-01-01')
})

test('invalid rows are skipped and reported instead of blocking the whole sync', async () => {
  const h = harness([row(), row({ externalId: 'bad', kind: 'buy', price: null })])
  const r = await h.service.syncAccount('A')
  assert.equal(r.imported, 1); assert.equal(r.skipped, 1)
  assert.ok(r.warnings.some(w => /已跳过/.test(w)))
})

test('manual or file-only accounts are skipped without network calls; concurrent calls share one run', async () => {
  const h = harness([row()], { connector: 'ib', transport: 'native' })
  const r = await h.service.syncAccount('A')
  assert.equal(r.skipped, true); assert.equal(h.calls.length, 0); assert.equal(h.writes, 0)
  const m = await h.service.syncAccount('M')
  assert.equal(m.skipped, true)
  const t = harness([row()])
  const [a, b] = await Promise.all([t.service.syncAccount('A'), t.service.syncAccount('A')])
  assert.equal(t.calls.length, 1); assert.equal(a, b)
})
