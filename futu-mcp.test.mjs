// Futu official MCP adapter tests. All fixtures are synthetic; no network access.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFutuMcp, createFutuPkce, registerFutuClient, buildFutuAuthorizeUrl, exchangeFutuCode, fetchFutuMcpSnapshot, fetchFutuMcpHistory, listFutuMcpAccounts, FUTU_MCP_DEFAULT_ENDPOINT, quoteBigInts, classifyFutuCashLog } from './futu-mcp.mjs'
import { assertSnapshotContract, assertNoCrossCurrencySum } from './snapshot-contract.mjs'

test('real Futu shapes: uint64 account ids keep precision and English cash log names classify', () => {
  const parsed = JSON.parse(quoteBigInts('{"accounts":[{"account_id":281756479859749122,"enable_market":[1,2]}]}'))
  assert.equal(parsed.accounts[0].account_id, '281756479859749122')
  assert.deepEqual(parsed.accounts[0].enable_market, [1, 2])
  assert.equal(classifyFutuCashLog('Cash Dividend', 496.65), 'dividend')
  assert.equal(classifyFutuCashLog('Corporate Action Service Fee', -30), 'fee')
  assert.equal(classifyFutuCashLog('Bank Transfer Withdrawals', -4000), 'withdrawal')
  assert.equal(classifyFutuCashLog('Money Transfers', 4000), 'deposit')
  assert.equal(classifyFutuCashLog('Fund Subscription', -8.22), 'buy')
  assert.equal(classifyFutuCashLog('Fund Redemption', 7368.35), 'sell')
  assert.equal(classifyFutuCashLog('Margin/Debit Interest', -8.22), 'interest')
  assert.equal(classifyFutuCashLog('IPO Subscription', -51514.34), 'other')
})

const TOKEN = 'test-futu-token'
const SECRET = { mcpToken: TOKEN }

function sseBody(id, result) {
  return 'event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n\n'
}

/** Builds a fetch mock over synthetic MCP tool payloads; records request headers/bodies. */
function mcpDeps(tools, options = {}) {
  const calls = []
  return {
    calls,
    timeoutMs: 5000,
    fetch: async (url, init) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) })
      const body = JSON.parse(init.body)
      if (options.failStatus) return { ok: false, status: options.failStatus, headers: { get: () => null }, text: async () => 'denied' }
      if (body.method === 'initialize') {
        const result = { serverInfo: { name: 'futu-mcp', version: '1.0.0' }, protocolVersion: '2025-11-25' }
        return { ok: true, status: 200, headers: { get: h => h === 'mcp-session-id' ? 'sess-1' : (h === 'content-type' ? 'text/event-stream' : null) }, text: async () => sseBody(body.id, result) }
      }
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      if (body.method === 'tools/call') {
        const name = body.params?.name
        const handler = tools[name]
        if (!handler) return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'text/event-stream' : null }, text: async () => sseBody(body.id, { isError: true, content: [{ type: 'text', text: 'unknown tool ' + name }] }) }
        const value = await handler(body.params?.arguments || {}, calls.length)
        return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'text/event-stream' : null }, text: async () => sseBody(body.id, { content: [{ type: 'text', text: JSON.stringify(value) }] }) }
      }
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' }
    },
  }
}

const AUTHORIZED = { accounts: [
  { acc_id: 123456, security_firm: 'FUTU HK', acc_type: 'margin', enable_market: ['1', '2'], account_card_number: 'CARD-1' },
  { acc_id: 789012, security_firm: 'FUTU SG', acc_type: 'cash', enable_market: ['6'] },
] }
const POSITIONS = { positions: [
  { position_side: 'LONG', code: 'HK.00700', stock_name: '腾讯控股', qty: '100', can_sell_qty: '100', currency: 'HKD', nominal_price: '380.2', cost_price: '350.5', market_val: '38020', security_type: 'STOCK' },
  { position_side: 'LONG', code: 'US.AAPL', stock_name: 'Apple', qty: '10', currency: 'USD', nominal_price: '185.4', cost_price: '180', security_type: 'STOCK' },
] }
const FUNDS = (currency) => ({ currency, cash: currency === 'HKD' ? '4500.25' : '120', total_assets: currency === 'HKD' ? '42520.25' : '1900', available_funds: currency === 'HKD' ? '4500.25' : '120', frozen_cash: '0' })

function snapshotDeps(extra = {}) {
  return mcpDeps({
    account_authorized_trd_accs: () => AUTHORIZED,
    account_positions: () => POSITIONS,
    account_funds: args => FUNDS(args.currency),
    ...extra,
  })
}

const US_MICROS = (dateIso) => String(Date.parse(dateIso) * 1000)

test('Futu MCP client initializes over SSE, keeps session id and sends Bearer token', async () => {
  const deps = snapshotDeps()
  const mcp = createFutuMcp({ secrets: SECRET, deps })
  try {
    const accs = await mcp.call('account_authorized_trd_accs', {})
    assert.equal(accs.accounts[0].acc_id, 123456)
    const init = deps.calls[0]
    assert.equal(init.body.method, 'initialize')
    assert.equal(init.headers.authorization, 'Bearer ' + TOKEN)
    assert.equal(init.url, FUTU_MCP_DEFAULT_ENDPOINT + '/mcp')
    const toolCall = deps.calls[2]
    assert.equal(toolCall.headers['mcp-session-id'], 'sess-1')
    assert.equal(toolCall.body.params.name, 'account_authorized_trd_accs')
  } finally { await mcp.dispose() }
})

test('Futu MCP client rejects missing token, /agent endpoint and 401 with re-auth hint', async () => {
  assert.throws(() => createFutuMcp({ secrets: {}, deps: mcpDeps({}) }), /mcpToken/)
  assert.throws(() => createFutuMcp({ secrets: SECRET, endpoint: 'https://mcp.futunn.com/agent', deps: mcpDeps({}) }), /agent/)
  await assert.rejects(() => createFutuMcp({ secrets: SECRET, deps: mcpDeps({}, { failStatus: 401 }) }).call('account_positions', {}), /浏览器授权/)
  await assert.rejects(() => createFutuMcp({ secrets: SECRET, deps: mcpDeps({}, { failStatus: 403 }) }).call('account_positions', {}), /trade:read/)
})

test('snapshot maps positions and per-currency cash; mixed currencies omit summed totals', async () => {
  const deps = snapshotDeps()
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  // 2 stocks + 2 cash rows (HKD + USD)
  assert.equal(raw.holdings.length, 4)
  const tencent = raw.holdings.find(h => h.symbol === 'HK.00700')
  assert.deepEqual([tencent.market, tencent.currency, tencent.qty, tencent.avgCost, tencent.manualPrice, tencent.assetClass], ['HK', 'HKD', 100, 350.5, 380.2, 'stock'])
  const cashHkd = raw.holdings.find(h => h.symbol === 'CASH:HKD')
  assert.deepEqual([cashHkd.market, cashHkd.assetClass, cashHkd.currency, cashHkd.qty], ['CASH', 'cash', 'HKD', 4500.25])
  assert.equal(raw.sourceTotals, undefined) // mixed currencies → totals omitted entirely
  assertNoCrossCurrencySum(raw, ['cash', 'netAssets'])
  const snapshot = assertSnapshotContract(raw, { complete: true, warning: /FUTU_MCP_MIXED_CURRENCY_TOTALS/ })
  assert.deepEqual(snapshot.coverage, { stock: 'full', fund: 'full', cash: 'full' })
})

test('single-currency account emits netAssets and cash totals', async () => {
  const deps = snapshotDeps({ account_positions: () => ({ positions: [POSITIONS.positions[0]] }) })
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  const snapshot = assertSnapshotContract(raw, { complete: true })
  assert.equal(snapshot.sourceTotals.netAssets, 42520.25)
  assert.equal(snapshot.sourceTotals.cash, 4500.25)
  assert.equal(snapshot.warnings.length, 0)
})

test('position without cost price is imported with avgCost null and keeps complete coverage', async () => {
  const deps = snapshotDeps({ account_positions: () => ({ positions: [
    { position_side: 'LONG', code: 'HK.00700', qty: '100', currency: 'HKD', nominal_price: '380.2', cost_price: '350.5', security_type: 'STOCK' },
    { position_side: 'LONG', code: 'US.AAPL', qty: '10', currency: 'USD', nominal_price: '185.4', security_type: 'STOCK' },
  ] }) })
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  const aapl = raw.holdings.find(h => h.symbol === 'US.AAPL')
  assert.equal(aapl.avgCost, null)
  assert.ok(!raw.warnings.some(w => /FUTU_MCP_COST_UNAVAILABLE/.test(w)))
  assertSnapshotContract(raw, { complete: true })
})

test('position with missing qty degrades only the affected segment', async () => {
  const deps = snapshotDeps({ account_positions: () => ({ positions: [
    ...POSITIONS.positions,
    { position_side: 'LONG', code: 'US.TSLA', qty: null, currency: 'USD', cost_price: '200', security_type: 'STOCK' },
  ] }) })
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  const snapshot = assertSnapshotContract(raw, { complete: false, warning: /FUTU_MCP_MISSING_QTY:US\.TSLA/ })
  assert.deepEqual(snapshot.coverage, { stock: 'partial', fund: 'full', cash: 'full' })
})

test('funds call failure marks the cash segment failed', async () => {
  const deps = snapshotDeps({ account_funds: () => { throw new Error('funds down') } })
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  assert.equal(raw.holdings.filter(h => h.assetClass === 'stock').length, 2)
  const snapshot = assertSnapshotContract(raw, { complete: false, warning: /FUTU_MCP_FUNDS_UNAVAILABLE:HKD/ })
  assert.deepEqual(snapshot.coverage, { stock: 'full', fund: 'full', cash: 'failed' })
})

test('missing market prices warn but coverage stays complete', async () => {
  const deps = snapshotDeps({ account_positions: () => ({ positions: POSITIONS.positions.map(p => ({ ...p, nominal_price: null })) }) })
  const raw = await fetchFutuMcpSnapshot({ transport: 'mcp', brokerAccountId: '123456' }, SECRET, undefined, deps)
  assert.ok(raw.holdings.filter(h => h.assetClass === 'stock').every(h => h.manualPrice === null))
  assertSnapshotContract(raw, { complete: true, warning: /PRICE_UNAVAILABLE/ })
})

test('snapshot rejects derivatives, shorts and duplicate positions', async () => {
  await assert.rejects(() => fetchFutuMcpSnapshot({ brokerAccountId: '1' }, SECRET, undefined, snapshotDeps({ account_positions: () => ({ positions: [{ position_side: 'LONG', code: 'US.TSLA', qty: '1', currency: 'USD', security_type: 'OPTION' }] }) })), /期权|衍生品/)
  await assert.rejects(() => fetchFutuMcpSnapshot({ brokerAccountId: '1' }, SECRET, undefined, snapshotDeps({ account_positions: () => ({ positions: [{ position_side: 'SHORT', code: 'US.TSLA', qty: '1', currency: 'USD', security_type: 'STOCK' }] }) })), /空头/)
  await assert.rejects(() => fetchFutuMcpSnapshot({ brokerAccountId: '1' }, SECRET, undefined, snapshotDeps({ account_positions: () => ({ positions: [
    { position_side: 'LONG', code: 'HK.00700', qty: '1', currency: 'HKD', security_type: 'STOCK' },
    { position_side: 'LONG', code: 'HK.00700', qty: '2', currency: 'HKD', security_type: 'STOCK' },
  ] }) })), /重复持仓/)
})

test('account discovery lists authorized accounts with names', async () => {
  const deps = snapshotDeps()
  const { accounts } = await listFutuMcpAccounts({ transport: 'mcp' }, SECRET, undefined, deps)
  assert.equal(accounts.length, 2)
  assert.equal(accounts[0].id, '123456')
  assert.match(accounts[0].name, /FUTU HK/)
  await assert.rejects(() => listFutuMcpAccounts({ transport: 'mcp' }, SECRET, undefined, mcpDeps({ account_authorized_trd_accs: () => ({ accounts: [] }) })), /已授权的交易账户/)
})

test('history merges fills across markets with signed cash-flow mapping', async () => {
  const from = '2026-01-01', to = '2026-11-07'
  const deps = mcpDeps({
    account_authorized_trd_accs: () => AUTHORIZED,
    account_fills_history: args => {
      assert.ok(args.acc_id === '123456' || args.acc_id === 123456)
      assert.ok(args.start && args.end) // microsecond window present
      if (args.trd_market === 'HK') return { order_fills: [
        { trd_side: 'BUY', deal_id: 'F1', order_id: 'O1', code: 'HK.00700', stock_name: '腾讯控股', qty: '10', price: '360', create_time: US_MICROS('2026-01-05T03:05:00Z'), status: 'OK' },
        { trd_side: 'SELL_SHORT', deal_id: 'F2', code: 'HK.00700', qty: '1', price: '360', create_time: US_MICROS('2026-01-05T03:06:00Z'), status: 'OK' },
        { trd_side: 'BUY', deal_id: 'F3', code: 'HK.00700', qty: '1', price: '360', create_time: US_MICROS('2026-01-05T03:07:00Z'), status: 'CANCELLED' },
      ], page_flag: '', completed: true }
      return { order_fills: [
        { trd_side: 'SELL', deal_id: 'F4', code: 'US.AAPL', qty: '2', price: '190', create_time: US_MICROS('2026-01-06T15:30:00Z'), status: 'OK' },
      ], page_flag: '', completed: true }
    },
    account_cash_logs: () => ({ cash_logs: [
      { transaction_name: '银行转入', created_time: '01/02/2026 09:00:00', cash_change: '10000.00', balance: '10000.00' },
      { transaction_name: '股息收取', created_time: '01/15/2026 10:00:00', cash_change: '120.50', balance: '10120.50' },
      { transaction_name: '卖出成交', created_time: '01/16/2026 10:00:00', cash_change: '-3800.00', balance: '6320.50', symbol: 'HK.00700' },
      { transaction_name: '平台费', created_time: '02/01/2026 10:00:00', cash_change: '-5', balance: '6315.50' },
    ], page_flag: '', completed: true }),
  })
  const result = await fetchFutuMcpHistory({ transport: 'mcp', brokerAccountId: '123456', currency: 'HKD' }, SECRET, { from, to }, undefined, deps)
  assert.equal(result.errors.length, 0)
  assert.equal(result.coverage.complete, false)
  assert.match(result.coverage.note, /富途/)
  const buy = result.rows.find(r => r.externalId === 'F1')
  assert.deepEqual([buy.kind, buy.market, buy.currency, buy.qty, buy.price, buy.date], ['buy', 'HK', 'HKD', 10, 360, '2026-01-05'])
  // SELL_SHORT and CANCELLED rows are skipped with warnings
  assert.ok(!result.rows.some(r => ['F2', 'F3'].includes(r.externalId)))
  assert.ok(result.warnings.some(w => /FUTU_MCP_UNKNOWN_SIDE/.test(w.message)))
  assert.ok(result.warnings.some(w => /FUTU_MCP_INACTIVE_FILL/.test(w.message)))
  const usSell = result.rows.find(r => r.externalId === 'F4')
  assert.deepEqual([usSell.kind, usSell.market, usSell.currency], ['sell', 'US', 'USD'])
  // cash logs: deposit +, dividend +, fee −; trade principal skipped
  const deposit = result.rows.find(r => r.kind === 'deposit')
  assert.equal(deposit.cashAmount, 10000)
  const dividend = result.rows.find(r => r.kind === 'dividend')
  assert.equal(dividend.cashAmount, 120.5)
  const fee = result.rows.find(r => r.kind === 'fee')
  assert.equal(fee.cashAmount, -5)
  assert.ok(!result.rows.some(r => r.kind === 'sell' && r.cashAmount === -3800)) // principal skipped
  assert.ok(!result.rows.some(r => /卖出成交/.test(r.note || '')))
})

test('history rejects reversed ranges and assumed currency warns for cash logs without symbol', async () => {
  await assert.rejects(() => fetchFutuMcpHistory({ transport: 'mcp', brokerAccountId: '1' }, SECRET, { from: '2026-11-07', to: '2026-01-01' }, undefined, mcpDeps({})), /开始日期不能晚于/)
  const deps = mcpDeps({
    account_authorized_trd_accs: () => ({ accounts: [{ acc_id: 1, security_firm: 'FUTU HK', acc_type: 'cash', enable_market: ['1'] }] }),
    account_fills_history: () => ({ order_fills: [], page_flag: '', completed: true }),
    account_cash_logs: () => ({ cash_logs: [{ transaction_name: '银行转入', created_time: '01/02/2026 09:00:00', cash_change: '500' }], page_flag: '', completed: true }),
  })
  const result = await fetchFutuMcpHistory({ transport: 'mcp', brokerAccountId: '1' }, SECRET, { from: '2026-01-01', to: '2026-01-31' }, undefined, deps)
  const deposit = result.rows.find(r => r.kind === 'deposit')
  assert.equal(deposit.currency, 'HKD') // fallback from single covered market
})

test('OAuth helpers: PKCE, dynamic registration and code exchange', async () => {
  const pkce = createFutuPkce()
  assert.ok(pkce.verifier.length >= 43)
  assert.equal(pkce.method, 'S256')
  const registerCalls = []
  const registerDeps = { fetch: async (url, init) => { registerCalls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 201, json: async () => ({ client_id: 'client-123', registration_access_token: 'rat', scope: 'quote:read trade:read' }) } } }
  const reg = await registerFutuClient({ redirectUri: 'http://127.0.0.1:53777/callback', deps: registerDeps })
  assert.equal(reg.clientId, 'client-123')
  assert.equal(registerCalls[0].url, 'https://webapi.futunn.com/oauth2/register')
  assert.deepEqual(registerCalls[0].body.redirect_uris, ['http://127.0.0.1:53777/callback'])
  assert.equal(registerCalls[0].body.token_endpoint_auth_method, 'none')
  const url = buildFutuAuthorizeUrl({ clientId: reg.clientId, redirectUri: 'http://127.0.0.1:53777/callback', challenge: pkce.challenge, state: 'st1' })
  assert.match(url, /^https:\/\/webapi\.futunn\.com\/oauth2\/authorize\/confirm\?/)
  assert.match(url, /code_challenge_method=S256/)
  assert.match(url, /scope=quote%3Aread\+trade%3Aread/)
  const tokenCalls = []
  const tokenDeps = { fetch: async (url, init) => { tokenCalls.push({ url, body: init.body }); return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 7200, token_type: 'Bearer', scope: 'quote:read trade:read' }) } } }
  const token = await exchangeFutuCode({ code: 'auth-code', clientId: reg.clientId, redirectUri: 'http://127.0.0.1:53777/callback', verifier: pkce.verifier, deps: tokenDeps })
  assert.equal(token.accessToken, 'at-1')
  assert.equal(token.refreshToken, 'rt-1')
  assert.equal(tokenCalls[0].url, 'https://webapi.futunn.com/oauth2/token')
  assert.match(tokenCalls[0].body, /grant_type=authorization_code/)
  assert.match(tokenCalls[0].body, /code_verifier=/)
})
