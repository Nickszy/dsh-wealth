import test from 'node:test'
import assert from 'node:assert/strict'
import { modelInfo, chatTurn, applyChatOps } from './chat.mjs'

function ledger() {
  return {
    version: 1, baseCurrency: 'CNY', fx: { CNY: 1 }, updatedAt: '2026-11-06T10:00:00.000Z',
    accounts: [{ id: 'ACC_1', name: 'Main', currency: 'CNY' }],
    instruments: [{ id: 'INS_1', symbol: '600000', name: 'Example', market: 'CN', assetClass: 'stock', currency: 'CNY' }],
    holdings: [{ id: 'POS_1', accountId: 'ACC_1', instrumentId: 'INS_1', qty: 10, avgCost: 5, manualPrice: null, currency: 'CNY' }],
    trades: [], snapshots: [],
  }
}
function mockModel(output, { finish, throws } = {}) {
  const captured = {}
  const ctx = { get(name) {
    if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'configured-provider', model: 'configured-model' }) }
    if (name === 'llm') return { async prepareCall(config, signal) {
      captured.config = config; captured.signal = signal
      return { config: { temperature: 0 }, async *stream(request) {
        captured.request = request
        if (throws) throw throws
        const text = typeof output === 'string' ? output : JSON.stringify(output)
        yield { type: 'reasoning-delta', text: 'ignored reasoning' }
        yield { type: 'text-delta', text: text.slice(0, 12) }
        yield { type: 'text-delta', text: text.slice(12) }
        if (finish) yield { type: 'finish', reason: finish }
      } }
    } }
  } }
  return { ctx, captured }
}
const badRequest = (error) => error.code === 'bad-request'

test('model selection comes from the configured DSH model; missing services are unavailable', () => {
  assert.deepEqual(modelInfo(mockModel({}).ctx), { provider: 'configured-provider', model: 'configured-model', label: 'configured-model' })
  assert.equal(modelInfo({ get: () => undefined }), null)
  assert.equal(modelInfo({ get() { throw new Error('unavailable') } }), null)
})

test('read Q&A streams JSON, grounds all ledger rows and summary, and never mutates the ledger', async () => {
  const db = ledger(); db.trades.push({ id: 'TRD_LAST', source: 'statement' })
  db.snapshots.push({ date: '2026-11-05', totalValueBase: 50 })
  const before = structuredClone(db)
  const { ctx, captured } = mockModel({ reply: 'Recorded cost is 50 CNY; no current quote is available.', ops: [] })
  const result = await chatTurn(ctx, { message: 'What do I own?', history: [{ role: 'user', text: 'Earlier question' }] }, db)
  assert.deepEqual(result, { reply: 'Recorded cost is 50 CNY; no current quote is available.', ops: [], model: 'configured-model', revision: db.updatedAt })
  assert.deepEqual(db, before)
  assert.equal(captured.config.provider, 'configured-provider')
  assert.equal(captured.config.model, 'configured-model')
  assert.ok(captured.signal instanceof AbortSignal)
  assert.equal(captured.request.signal, captured.signal)
  assert.equal(captured.request.temperature, 0)
  assert.equal(captured.request.messages[0].source.kind, 'dsh-wealth')
  const prompt = captured.request.messages[0].content[0].text
  assert.ok(prompt.includes(JSON.stringify(db)))
  assert.ok(prompt.includes('summary'))
  assert.ok(prompt.includes('Earlier question'))
})

test('natural language edit proposals are validated without writes and apply returns a separate clone', async () => {
  const db = ledger(); const before = structuredClone(db)
  const { ctx } = mockModel({ reply: 'Proposed manual price: 8.', ops: [{ op: 'price.set', holdingId: 'POS_1', price: 8 }] })
  const proposal = await chatTurn(ctx, { message: 'Set its manual price to 8' }, db)
  assert.deepEqual(db, before)
  const applied = applyChatOps(db, proposal)
  assert.equal(applied.ledger.holdings[0].manualPrice, 8)
  assert.equal(applied.result.applied, 1)
  assert.equal(applied.result.results.length, 1)
  assert.equal(applied.ledger.updatedAt, db.updatedAt)
  assert.deepEqual(db, before)
})

test('stale and absent revisions reject before any edit', () => {
  const db = ledger(); const before = structuredClone(db)
  for (const revision of ['outdated', undefined]) {
    assert.throws(() => applyChatOps(db, { revision, ops: [{ op: 'base.set', currency: 'USD' }] }), badRequest)
  }
  assert.deepEqual(db, before)
  assert.throws(() => applyChatOps({ ...db, updatedAt: null }, { ops: [] }), badRequest)
  assert.equal(applyChatOps({ ...db, updatedAt: null }, { revision: null, ops: [] }).result.applied, 0)
})

test('unsupported operations and malformed model JSON fail closed', async () => {
  for (const output of [
    { reply: 'Remove', ops: [{ op: 'account.remove', id: 'ACC_1' }] },
    { reply: 'Oops', ops: [{ op: 'state' }] },
    { reply: 'Oops', ops: [{ op: 'price.set', holdingId: 'POS_1', price: -1 }] },
    { reply: 'Oops', ops: [{ op: 'import.holdings', rows: 'invalid' }] },
    { reply: 'Oops', ops: [null] },
    { reply: 'Oops', ops: Array.from({ length: 51 }, () => ({ op: 'base.set', currency: 'CNY' })) },
    { reply: 7, ops: [] }, { reply: 'Oops' }, 'not JSON',
  ]) {
    const db = ledger(); const before = structuredClone(db)
    await assert.rejects(chatTurn(mockModel(output).ctx, { message: 'Edit' }, db), badRequest)
    assert.deepEqual(db, before)
  }
})

test('a later invalid operation leaves the original ledger intact, including imports with partial failure', () => {
  const db = ledger(); const before = structuredClone(db)
  const batches = [
    [{ op: 'price.set', holdingId: 'POS_1', price: 8 }, { op: 'holding.upsert', accountId: 'missing', instrumentId: 'INS_1', qty: 20 }],
    [{ op: 'import.holdings', rows: [{ accountId: 'ACC_1', instrumentId: 'INS_1', qty: 20 }, { accountId: 'missing', instrumentId: 'INS_1', qty: 1 }] }],
  ]
  for (const ops of batches) {
    assert.throws(() => applyChatOps(db, { revision: db.updatedAt, ops }), badRequest)
    assert.deepEqual(db, before)
  }
})

test('pasted historical trade imports default to not changing holdings and retain provenance', async () => {
  const db = ledger(); const before = structuredClone(db)
  const rows = [
    { accountId: 'ACC_1', instrumentId: 'INS_1', side: 'buy', qty: 2, price: 4, currency: 'CNY', date: '2026-11-01' },
    { accountId: 'ACC_1', instrumentId: 'INS_1', side: 'sell', qty: 100, price: 4, currency: 'CNY', date: '2026-11-02', source: 'broker statement' },
  ]
  const { ctx } = mockModel({ reply: 'Import historical statement.', ops: [{ op: 'import.trades', rows }] })
  const proposal = await chatTurn(ctx, { message: 'Import this historical statement' }, db)
  assert.equal(proposal.ops[0].applyHoldings, false)
  assert.equal(proposal.ops[0].rows[0].source, 'model')
  assert.equal(proposal.ops[0].rows[1].source, 'broker statement')
  const { ledger: updated } = applyChatOps(db, proposal)
  assert.equal(updated.trades.length, 2)
  assert.ok(updated.trades.every(t => t.appliedToHoldings === false))
  assert.deepEqual(updated.holdings, before.holdings)
  assert.deepEqual(db, before)
})

test('explicit live trade records can apply to holdings; source defaults to model', () => {
  const db = ledger()
  const { ledger: updated } = applyChatOps(db, { revision: db.updatedAt, ops: [{ op: 'trade.add', accountId: 'ACC_1', instrumentId: 'INS_1', side: 'buy', qty: 2, price: 4, date: '2026-11-01' }] })
  assert.equal(updated.holdings[0].qty, 12)
  assert.equal(updated.trades[0].source, 'model')
})

test('the assistant can archive flows, classify instruments and delete behind explicit confirmation', () => {
  const db = ledger()
  const { ledger: updated, result } = applyChatOps(db, {
    revision: db.updatedAt,
    ops: [
      { op: 'historyEvent.add', accountId: 'ACC_1', kind: 'deposit', date: '2026-11-07', cashAmount: 5000, note: '工资转入' },
      { op: 'historyEvent.add', accountId: 'ACC_1', kind: 'deposit', date: '2026-11-07', cashAmount: 5000, externalId: 'S-1' },
      { op: 'historyEvent.add', accountId: 'ACC_1', kind: 'deposit', date: '2026-11-07', cashAmount: 1, externalId: 'S-1' },
      { op: 'instrument.upsert', instrumentId: 'INS_1', sector: '银行', style: '价值' },
    ],
  })
  assert.equal(updated.historyEvents.length, 2)
  assert.ok(updated.historyEvents.every(e => e.archiveOnly))
  assert.equal(updated.holdings[0].qty, 10)
  assert.equal(result.results[2].duplicate, true)
  assert.equal(updated.instruments[0].sector, '银行')
  assert.equal(updated.instruments[0].style, 'value')
  const { ledger: removed } = applyChatOps(db, { revision: db.updatedAt, ops: [{ op: 'account.remove', id: 'ACC_1', confirm: true }] })
  assert.equal(removed.accounts.length, 0)
  assert.equal(removed.holdings.length, 0)
  assert.equal((removed.historyEvents || []).length, 0)
  // 删除类操作没有 confirm 会被拒之门外（另见 unsupported 操作测试）
  assert.throws(() => applyChatOps(db, { revision: db.updatedAt, ops: [{ op: 'account.remove', id: 'ACC_1', confirm: 'yes' }] }), badRequest)
  assert.throws(() => applyChatOps(db, { revision: db.updatedAt, ops: [{ op: 'instrument.upsert', instrumentId: 'INS_1', style: '动量' }] }), badRequest)
})

test('no model, failed streams and invalid input fail without fabricated answers or mutations', async () => {
  const db = ledger(); const before = structuredClone(db)
  await assert.rejects(chatTurn({ get: () => undefined }, { message: 'hello' }, db), badRequest)
  await assert.rejects(chatTurn(mockModel({ reply: 'x', ops: [] }, { finish: { kind: 'error', failure: { message: 'model unavailable' } } }).ctx, { message: 'hello' }, db), /model unavailable/)
  await assert.rejects(chatTurn(mockModel({ reply: 'x', ops: [] }, { finish: { kind: 'aborted' } }).ctx, { message: 'hello' }, db), /aborted/i)
  await assert.rejects(chatTurn(mockModel({}, { throws: new Error('network failed') }).ctx, { message: 'hello' }, db), /network failed/)
  await assert.rejects(chatTurn(mockModel({}).ctx, { message: ' ' }, db), badRequest)
  await assert.rejects(chatTurn(mockModel({}).ctx, { message: 'hello', history: {} }, db), badRequest)
  assert.deepEqual(db, before)
})
