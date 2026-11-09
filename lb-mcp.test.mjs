// Longbridge MCP adapter tests. All fixtures are synthetic; no network access.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLongbridgeMcp, exchangeLongbridgeMcpCode, fetchLongbridgeMcpSnapshot, fetchLongbridgeMcpHistory, listLongbridgeMcpAccounts } from './lb-mcp.mjs'
import { assertSnapshotContract, assertNoCrossCurrencySum } from './snapshot-contract.mjs'

const TOKEN = 'tok_test_123'
const SECRET = { mcpToken: TOKEN }

function sseBody(id, result) {
  return 'event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n\n'
}
function sseError(id, message) {
  return 'event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message } }) + '\n\n'
}

/** Builds a fetch mock over synthetic MCP tool payloads; records request headers/bodies. */
function mcpDeps(tools, options = {}) {
  const calls = []
  let sessionId = null
  return {
    calls,
    timeoutMs: 5000,
    fetch: async (url, init) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) })
      const body = JSON.parse(init.body)
      const headers = { 'content-type': options.sse === false ? 'application/json' : 'text/event-stream' }
      if (options.failStatus) return { ok: false, status: options.failStatus, headers: { get: () => null }, text: async () => 'denied' }
      if (body.method === 'initialize') {
        sessionId = 'sess-1'
        const result = { serverInfo: { name: 'longbridge-mcp', version: '0.16.1' }, protocolVersion: '2025-11-25' }
        return { ok: true, status: 200, headers: { get: h => h === 'mcp-session-id' ? sessionId : (h === 'content-type' ? 'text/event-stream' : null) }, text: async () => sseBody(body.id, result) }
      }
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      if (body.method === 'tools/call') {
        const name = body.params?.name
        if (name === 'authenticate') {
          const token = options.authenticateToken ?? TOKEN
          return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'text/event-stream' : null }, text: async () => sseBody(body.id, { content: [{ type: 'text', text: JSON.stringify({ token }) }] }) }
        }
        const handler = tools[name]
        if (!handler) return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'text/event-stream' : null }, text: async () => sseBody(body.id, { isError: true, content: [{ type: 'text', text: 'unknown tool ' + name }] }) }
        const value = await handler(body.params?.arguments || {}, calls.length)
        return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'text/event-stream' : null }, text: async () => sseBody(body.id, { content: [{ type: 'text', text: JSON.stringify(value) }] }) }
      }
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' }
    },
  }
}

const STOCK_POSITIONS = [{ account_channel: 'main', stock_info: [
  { symbol: '700.HK', symbol_name: '腾讯控股', quantity: '100', available_quantity: '100', currency: 'HKD', cost_price: '350.5', market: 2 },
  { symbol: 'AAPL.US', symbol_name: 'Apple', quantity: '10', available_quantity: '10', currency: 'USD', cost_price: '180', market: 1 },
] }]
const FUND_POSITIONS = [{ account_channel: 'main', fund_info: [
  { counter_id: 'UT/FD/HK0000384492', symbol_name: '基金A', currency: 'HKD', holding_units: '1000', current_net_asset_value: '1.23', cost_net_asset_value: '1.10' },
] }]
const BALANCE = [{ currency: 'HKD', total_cash: '5000.25', net_assets: '7000.25', cash_infos: [{ currency: 'HKD', available_cash: '4500', withdraw_cash: '500', frozen_cash: '0.25', settling_cash: '0' }] }]

function snapshotDeps(extra = {}) {
  return mcpDeps({
    stock_positions: () => STOCK_POSITIONS,
    fund_positions: () => FUND_POSITIONS,
    account_balance: () => BALANCE,
    quote: () => [{ symbol: '700.HK', last_done: '380.2' }, { symbol: 'AAPL.US', last_done: '185.4' }],
    ...extra,
  })
}

test('MCP client initializes over SSE, keeps session id and unwraps tool JSON', async () => {
  const deps = snapshotDeps()
  const mcp = createLongbridgeMcp({ secrets: SECRET, deps })
  try {
    const balance = await mcp.call('account_balance', {})
    assert.equal(balance[0].total_cash, '5000.25')
    const init = deps.calls[0]
    assert.equal(init.body.method, 'initialize')
    assert.equal(init.headers.authorization, 'Bearer ' + TOKEN)
    const toolCall = deps.calls[2]
    assert.equal(toolCall.headers['mcp-session-id'], 'sess-1')
    assert.equal(toolCall.body.params.name, 'account_balance')
  } finally { await mcp.dispose() }
})

test('MCP client rejects missing token, /agent endpoint and 401 with re-auth hint', async () => {
  assert.throws(() => createLongbridgeMcp({ secrets: {}, deps: mcpDeps({}) }), /mcpToken/)
  assert.throws(() => createLongbridgeMcp({ secrets: SECRET, endpoint: 'https://mcp.longbridge.com/agent', deps: mcpDeps({}) }), /agent/)
  await assert.rejects(() => createLongbridgeMcp({ secrets: SECRET, deps: mcpDeps({}, { failStatus: 401 }) }).call('now', {}), /重新生成授权码/)
})

test('agent code exchange returns token from /agent authenticate', async () => {
  const calls = []
  const deps = { timeoutMs: 5000, fetch: async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) })
    const body = JSON.parse(init.body)
    if (body.method === 'initialize') return { ok: true, status: 200, headers: { get: h => h === 'mcp-session-id' ? 'agent-sess' : 'text/event-stream' }, text: async () => sseBody(body.id, { serverInfo: { name: 'longbridge-mcp', version: '0.16.1' } }) }
    if (body.method === 'tools/call' && body.params?.name === 'authenticate') {
      assert.equal(body.params.arguments.code, 'one-time-code')
      return { ok: true, status: 200, headers: { get: () => 'text/event-stream' }, text: async () => sseBody(body.id, { content: [{ type: 'text', text: JSON.stringify({ token: 'exchanged-token' }) }] }) }
    }
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' }
  } }
  const { token } = await exchangeLongbridgeMcpCode('one-time-code', { deps })
  assert.equal(token, 'exchanged-token')
  assert.equal(calls[0].url, 'https://mcp.longbridge.com/agent')
  await assert.rejects(() => exchangeLongbridgeMcpCode('', { deps: mcpDeps({}) }), /授权码/)
})

test('snapshot maps stocks, funds and cash with quote prices and channel filter', async () => {
  const deps = snapshotDeps()
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  const snapshot = assertSnapshotContract(raw, { complete: true })
  assert.equal(raw.holdings.length, 4) // 2 stocks + 1 fund + 1 cash (HKD)
  const tencent = raw.holdings.find(h => h.symbol === '700.HK')
  assert.deepEqual([tencent.market, tencent.currency, tencent.qty, tencent.avgCost, tencent.manualPrice], ['HK', 'HKD', 100, 350.5, 380.2])
  const fund = raw.holdings.find(h => h.assetClass === 'fund')
  assert.deepEqual([fund.symbol, fund.market, fund.currency, fund.qty, fund.avgCost, fund.manualPrice], ['HK0000384492', 'FUND', 'HKD', 1000, 1.1, 1.23])
  const cash = raw.holdings.find(h => h.assetClass === 'cash')
  assert.equal(cash.qty, 4500.25) // available + frozen + settling, withdraw is a subset
  assert.equal(snapshot.sourceTotals.netAssets, 7000.25)
  assert.equal(snapshot.sourceTotals.cash, 5000.25)
  assert.equal(snapshot.warnings.length, 0)
  assert.deepEqual(snapshot.coverage, { stock: 'full', fund: 'full', cash: 'full' })
})

test('snapshot tolerates missing quotes with a warning but keeps complete coverage', async () => {
  const deps = snapshotDeps({ quote: () => { throw new Error('quote denied') } })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.equal(raw.holdings.find(h => h.symbol === '700.HK').manualPrice, null)
  assertSnapshotContract(raw, { complete: true, warning: /PRICE_UNAVAILABLE/ })
})

test('position without cost price is imported with avgCost null and keeps complete coverage', async () => {
  const deps = snapshotDeps({ stock_positions: () => [{ account_channel: 'main', stock_info: [
    { symbol: '700.HK', quantity: '100', currency: 'HKD', cost_price: '350.5' },
    { symbol: 'AAPL.US', quantity: '10', currency: 'USD' },
  ] }] })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.equal(raw.holdings.find(h => h.symbol === 'AAPL.US').avgCost, null)
  assert.ok(!raw.warnings.some(w => /LB_MCP_COST_UNAVAILABLE/.test(w)))
  assertSnapshotContract(raw, { complete: true })
})

test('missing fund cost is imported with avgCost null too', async () => {
  const deps = snapshotDeps({ fund_positions: () => [{ account_channel: 'main', fund_info: [
    { counter_id: 'UT/FD/HK0000384492', currency: 'HKD', holding_units: '1000', current_net_asset_value: '1.23' },
  ] }] })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.equal(raw.holdings.find(h => h.assetClass === 'fund').avgCost, null)
  assertSnapshotContract(raw, { complete: true })
})

test('positions call failure marks only the stock segment failed', async () => {
  const deps = snapshotDeps({ stock_positions: () => { throw new Error('positions down') } })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.ok(!raw.holdings.some(h => h.assetClass === 'stock'))
  const snapshot = assertSnapshotContract(raw, { complete: false, warning: /LB_MCP_POSITIONS_UNAVAILABLE/ })
  assert.deepEqual(snapshot.coverage, { stock: 'failed', fund: 'full', cash: 'full' })
})

test('fund/balance call failures mark their own segments failed', async () => {
  const deps = snapshotDeps({
    fund_positions: () => { throw new Error('funds down') },
    account_balance: () => { throw new Error('balance down') },
  })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  const snapshot = assertSnapshotContract(raw, { complete: false, warning: /LB_MCP_FUND_POSITIONS_UNAVAILABLE/ })
  assert.deepEqual(snapshot.coverage, { stock: 'full', fund: 'failed', cash: 'failed' })
  assert.ok(snapshot.warnings.some(w => /LB_MCP_BALANCE_UNAVAILABLE/.test(w)))
})

test('row skipped within a successful call marks that segment partial', async () => {
  const deps = snapshotDeps({ stock_positions: () => [{ account_channel: 'main', stock_info: 'not-an-array' }] })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  const snapshot = assertSnapshotContract(raw, { complete: false, warning: /THS_LB_MCP_STOCK_ROW/ })
  assert.deepEqual(snapshot.coverage, { stock: 'partial', fund: 'full', cash: 'full' })
})

test('multi-currency balance omits adapter-summed totals', async () => {
  const deps = snapshotDeps({ account_balance: () => [...BALANCE,
    { currency: 'USD', total_cash: '120', net_assets: '1900', cash_infos: [{ currency: 'USD', available_cash: '120', frozen_cash: '0', settling_cash: '0' }] },
  ] })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.equal(raw.sourceTotals, undefined)
  assertNoCrossCurrencySum(raw, ['cash', 'netAssets'])
  assertSnapshotContract(raw, { complete: true, warning: /LB_MCP_MIXED_CURRENCY_TOTALS/ })
})

test('snapshot rejects derivatives and duplicate holdings', async () => {
  await assert.rejects(() => fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, snapshotDeps({
    stock_positions: () => [{ account_channel: 'main', stock_info: [{ symbol: 'APL241115C00150000.US', quantity: '1', currency: 'USD' }] }],
  })), /期权|衍生品/)
  await assert.rejects(() => fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, snapshotDeps({
    stock_positions: () => [{ account_channel: 'main', stock_info: [{ symbol: '700.HK', quantity: '1', currency: 'HKD' }, { symbol: '700.HK', quantity: '2', currency: 'HKD' }] }],
  })), /重复持仓/)
})

test('account discovery returns the single main account', async () => {
  const deps = snapshotDeps()
  const result = await listLongbridgeMcpAccounts({ transport: 'mcp' }, SECRET, undefined, deps)
  assert.deepEqual(result.accounts, [{ id: 'main', name: '长桥账户 · MCP', currency: null }])
})

test('history merges executions and cash flow with kinds, signs and weak ids', async () => {
  const deps = mcpDeps({
    history_executions: () => [
      { order_id: 'o1', trade_id: 't1', symbol: '700.HK', side: 'Buy', quantity: '10', price: '360', trade_done_at: '2026-11-03T08:31:00+08:00' },
      { order_id: 'o2', trade_id: 't2', symbol: 'AAPL.US', side: 'Sell', quantity: '2', price: '182.5', trade_done_at: '2026-11-04T15:30:00+08:00' },
    ],
    cash_flow: () => [
      { transaction_flow_name: '股票交收', direction: 'Out', business_type: 'STOCK_BUY', balance: '3600', currency: 'HKD', business_time: '2026-11-03T08:31:10+08:00' },
      { transaction_flow_name: '派息', direction: 'In', business_type: 'DIVIDEND', balance: '120.5', currency: 'USD', business_time: '2026-11-05T10:00:00+08:00', symbol: 'AAPL.US' },
      { transaction_flow_name: '出金', direction: 'Out', business_type: 'WITHDRAWAL', balance: '1000', currency: 'HKD', business_time: '2026-11-06T09:00:00+08:00' },
    ],
  })
  const result = await fetchLongbridgeMcpHistory({ transport: 'mcp' }, SECRET, { from: '2026-11-01', to: '2026-11-07' }, undefined, deps)
  const buy = result.rows.find(r => r.externalId === 't1')
  assert.deepEqual([buy.kind, buy.market, buy.currency, buy.qty, buy.price], ['buy', 'HK', 'HKD', 10, 360])
  const dividend = result.rows.find(r => r.kind === 'dividend')
  assert.equal(dividend.cashAmount, 120.5)
  const withdrawal = result.rows.find(r => r.kind === 'withdrawal')
  assert.equal(withdrawal.cashAmount, -1000)
  const buyFlow = result.rows.find(r => r.originalType === 'STOCK_BUY')
  assert.equal(buyFlow.cashAmount, -3600) // other kind, direction out
  assert.ok(result.rows.every(r => r.externalId || r.note)) // weak dedup handled downstream
  assert.equal(result.coverage.complete, false)
  assert.match(result.coverage.note, /长桥/)
})

test('history assumes currency from market with warning and rejects bad ranges', async () => {
  const deps = mcpDeps({ history_executions: () => [{ order_id: 'o1', trade_id: 't1', symbol: '0700.HK', side: 'buy', quantity: '1', price: '1', trade_done_at: '2026-11-03T08:31:00Z' }], cash_flow: () => [] })
  const result = await fetchLongbridgeMcpHistory({ transport: 'mcp' }, SECRET, { from: '2026-11-01', to: '2026-11-07' }, undefined, deps)
  assert.equal(result.rows[0].currency, 'HKD')
  assert.ok(result.warnings.some(w => /CURRENCY_ASSUMED_FROM_MARKET/.test(w.message)))
  await assert.rejects(() => fetchLongbridgeMcpHistory({ transport: 'mcp' }, SECRET, { from: '2026-11-07', to: '2026-11-01' }, undefined, mcpDeps({})), /开始日期不能晚于/)
})

test('zero-quantity position is a closed position, not missing data, and keeps coverage', async () => {
  const deps = snapshotDeps({ stock_positions: () => [{ account_channel: 'main', stock_info: [
    { symbol: '700.HK', quantity: '100', currency: 'HKD', cost_price: '350.5' },
    { symbol: 'AAPL.US', quantity: '0', currency: 'USD', cost_price: '180' },
  ] }] })
  const raw = await fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps)
  assert.ok(!raw.holdings.some(h => h.symbol === 'AAPL.US'))
  assertSnapshotContract(raw, { complete: true })
})

test('auth failure on a positions call is rethrown for re-auth instead of degrading to partial', async () => {
  const deps = snapshotDeps({ stock_positions: () => { throw new Error('HTTP 401 unauthorized') } })
  await assert.rejects(fetchLongbridgeMcpSnapshot({ transport: 'mcp', brokerAccountId: 'main' }, SECRET, undefined, deps), /401/)
})
