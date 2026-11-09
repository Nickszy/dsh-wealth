// 老虎 remote MCP adapter tests. Synthetic MCP/OAuth transport, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listTigerAccounts, fetchTigerSnapshot, fetchTigerHistory, startTigerDeviceAuth, pollTigerDeviceToken, refreshTigerToken, registerTigerAuthCodeClient, createTigerPkce, buildTigerAuthorizeUrl, exchangeTigerCode } from './tiger-mcp.mjs'

const SECRETS = { accessToken: 'tok', refreshToken: 'refresh', clientId: 'client-1' }

function mcpDeps(handlers) {
  const calls = []
  return {
    calls, timeoutMs: 5000,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url, headers: init.headers, body })
      const reply = payload => ({ ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'application/json' : null }, text: async () => JSON.stringify(payload) })
      if (body.method === 'initialize') return reply({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'tigermcp', version: '1' } } })
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      if (body.method === 'tools/call') {
        const handler = handlers[body.params?.name]
        if (!handler) return reply({ jsonrpc: '2.0', id: body.id, result: { isError: true, content: [{ type: 'text', text: 'unknown' }] } })
        return reply({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(await handler(body.params?.arguments || {})) }] } })
      }
      return reply({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'unsupported' } })
    },
  }
}

test('老虎 accounts discovery maps authorized account rows', async () => {
  const deps = mcpDeps({ get_accounts: () => ({ accounts: [{ account: '205801234', account_type: 'GLOBAL', broker: 'TBHK' }, { account: '998877', account_type: 'STANDARD' }] }) })
  const result = await listTigerAccounts({}, SECRETS, undefined, deps)
  assert.deepEqual(result.accounts.map(a => a.id), ['205801234', '998877'])
  assert.equal(result.accounts[0].broker, 'TBHK')
  const call = deps.calls.find(c => c.body.params?.name === 'get_accounts')
  assert.equal(call.headers.authorization, 'Bearer tok')
})

test('老虎 snapshot maps prime_assets segments, positions and totals; skips derivatives', async () => {
  // 真实返回（2026-11-09 实测）：segments 按类别/币种拆分，现金允许为负（融资负债）。
  const deps = mcpDeps({
    get_assets: () => ({
      account: '5018786', account_type: 'REAL', route: 'prime_assets',
      segments: [
        { category: 'S', currency: 'USD', net_liquidation: 1065.8, cash_balance: -161.13, cash_available_for_trade: 591.18, gross_position_value: 1227.14, unrealized_pnl: -1035.84 },
        { category: 'C', currency: 'USD', net_liquidation: 0, cash_balance: 0, gross_position_value: 0, unrealized_pnl: 0 },
        { category: 'F', currency: 'USD', net_liquidation: 0.2, cash_balance: 0, gross_position_value: 0.2, unrealized_pnl: 0.01 },
      ],
    }),
    get_positions: (args) => args.sec_type === 'STK'
      ? { positions: [
          { symbol: 'CHA', name: 'Chagee Holdings', sec_type: 'STK', market: 'US', quantity: 2, average_cost: 28, latest_price: 12.45, market_value: 24.9, currency: 'USD' },
          { symbol: '00700', name: '腾讯控股', sec_type: 'STK', market: 'HK', quantity: 100, average_cost: 350, latest_price: 365, currency: 'HKD' },
          { symbol: 'AAPL  260117C00200000', sec_type: 'OPT', quantity: 1, average_cost: 2, latest_price: 3, currency: 'USD' },
        ] }
      : { positions: [] },
  })
  const snapshot = await fetchTigerSnapshot({ brokerAccountId: '5018786' }, SECRETS, undefined, deps)
  const symbols = snapshot.holdings.map(h => h.symbol)
  assert.ok(symbols.includes('CHA'))
  assert.ok(symbols.includes('00700'))
  assert.ok(!symbols.includes('CASH:USD'), '负现金（融资负债）不能作为持仓行')
  assert.ok(snapshot.warnings.some(w => w.startsWith('TIGER_MARGIN_CASH:USD')), '融资负债要明示')
  assert.ok(!symbols.some(s => s.startsWith('AAPL ')), 'option rows skipped')
  const apple = snapshot.holdings.find(h => h.symbol === 'CHA')
  assert.deepEqual([apple.avgCost, apple.manualPrice], [28, 12.45])
  assert.equal(snapshot.sourceTotals.totalAsset, 1066)
  assert.equal(snapshot.sourceTotals.cash, -161.13)
  assert.equal(snapshot.sourceTotals.holdingProfit, -1035.83)
  assert.equal(snapshot.complete, true)
})

test('老虎 history pages through orders and maps filled buy/sell flows', async () => {
  const deps = mcpDeps({
    get_orders: (args) => args.page_token === 'p2'
      ? { orders: [
          { order_id: 'O2', symbol: '00700', sec_type: 'STK', market: 'HK', side: 'SELL', status: 'FILLED', filled_quantity: 50, avg_fill_price: 370, created_time: '2026-11-06T09:30:00+08:00', currency: 'HKD', commission: 3 },
          { order_id: 'O3', symbol: 'AAPL', sec_type: 'STK', market: 'US', side: 'BUY', status: 'CANCELLED', quantity: 5, created_time: '2026-11-06T10:00:00+08:00', currency: 'USD' },
        ], next_page_token: null }
      : { orders: [
          { order_id: 'O1', symbol: 'AAPL', sec_type: 'STK', market: 'US', side: 'BUY', status: 'FILLED', filled_quantity: 5, avg_fill_price: 180, created_time: 1794113400000, currency: 'USD', commission: 1 },
        ], next_page_token: 'p2' },
  })
  const result = await fetchTigerHistory({ brokerAccountId: 'A1' }, SECRETS, { from: '2026-11-01', to: '2026-11-07' }, undefined, deps)
  assert.equal(result.rows.length, 2, '撤单不产生流水')
  const buy = result.rows.find(r => r.symbol === 'AAPL')
  assert.equal(buy.kind, 'buy')
  assert.ok(buy.cashAmount < 0)
  assert.equal(buy.fee, 1)
  const sell = result.rows.find(r => r.symbol === '00700')
  assert.equal(sell.kind, 'sell')
  assert.equal(sell.date, '2026-11-06')
  assert.equal(sell.market, 'HK')
  assert.ok(sell.cashAmount > 0)
})

test('老虎 OAuth device flow: register, pending, slow_down, ready and refresh', async () => {
  let stage = 0
  const requests = []
  const deps = {
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const path = new URL(url).pathname
      const body = init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))
      requests.push({ path, body })
      if (path === '/oauth2/register') return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ client_id: 'cli-xyz' }) }
      if (path === '/oauth2/device_authorization') return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ device_code: 'dev-1', user_code: 'ABCD-1234', verification_uri: 'https://auth.example/activate', verification_uri_complete: 'https://auth.example/activate?code=ABCD-1234', interval: 5, expires_in: 600 }) }
      if (path === '/oauth2/token') {
        stage++
        if (stage === 1) return { ok: false, status: 400, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ error: 'authorization_pending' }) }
        if (stage === 2) return { ok: false, status: 400, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ error: 'slow_down' }) }
        return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600, scope: 'api.account:read api.trade:read' }) }
      }
      throw new Error('unexpected ' + path)
    },
  }
  const device = await startTigerDeviceAuth({ deps })
  assert.equal(device.clientId, 'cli-xyz')
  assert.equal(device.userCode, 'ABCD-1234')
  assert.ok(device.verificationUri.includes('activate'))
  const deviceRequest = requests.find(r => r.path === '/oauth2/device_authorization')
  // 网关按完整 scope 集校验 token，缺行情/基础/资讯会 401（docs.itigerup.com/docs/remote-mcp）。
  assert.equal(deviceRequest.body.scope, 'api.basic:read api.quote:read api.news:read api.account:read api.trade:read')
  assert.equal((await pollTigerDeviceToken(device, { deps })).status, 'pending')
  const slow = await pollTigerDeviceToken(device, { deps })
  assert.equal(slow.status, 'slow_down')
  assert.equal(slow.interval, 10)
  const ready = await pollTigerDeviceToken(device, { deps })
  assert.equal(ready.status, 'ready')
  assert.equal(ready.token.accessToken, 'at-1')
  const refreshed = await refreshTigerToken({ refreshToken: 'rt-1', clientId: 'cli-xyz', deps })
  assert.equal(refreshed.accessToken, 'at-1')
  // RFC 8707: device authorization and both token grants carry the MCP resource indicator.
  for (const request of requests) {
    if (request.path === '/oauth2/register') continue
    assert.equal(request.body.resource, 'https://mcp.tigerfintech.com/mcp', request.path + ' must bind the resource')
  }
  assert.equal(requests.filter(r => r.path === '/oauth2/token').length, 4)
})

test('authorization-code flow registers loopback client and exchanges code with PKCE', async () => {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))
    requests.push({ url: String(url), body })
    if (String(url).endsWith('/oauth2/register')) return { ok: true, status: 201, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ client_id: 'cli-ac' }) }
    if (String(url).endsWith('/oauth2/token')) return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ access_token: 'at-ac', refresh_token: 'rt-ac', expires_in: 3600 }) }
    throw new Error('unexpected ' + url)
  }
  const registered = await registerTigerAuthCodeClient({ redirectUri: 'http://127.0.0.1:17410/callback', deps: { fetch: fetchImpl } })
  assert.equal(registered.clientId, 'cli-ac')
  assert.deepEqual(requests[0].body.redirect_uris, ['http://127.0.0.1:17410/callback'])
  assert.ok(requests[0].body.grant_types.includes('authorization_code'))

  const pkce = createTigerPkce()
  const authorizeUrl = new URL(buildTigerAuthorizeUrl({ clientId: 'cli-ac', redirectUri: 'http://127.0.0.1:17410/callback', challenge: pkce.challenge, state: 'st' }))
  assert.equal(authorizeUrl.searchParams.get('response_type'), 'code')
  assert.equal(authorizeUrl.searchParams.get('redirect_uri'), 'http://127.0.0.1:17410/callback')
  assert.equal(authorizeUrl.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(authorizeUrl.searchParams.get('resource'), 'https://mcp.tigerfintech.com/mcp')
  assert.equal(authorizeUrl.searchParams.get('scope'), 'api.basic:read api.quote:read api.news:read api.account:read api.trade:read')

  const token = await exchangeTigerCode({ code: 'ac1', clientId: 'cli-ac', redirectUri: 'http://127.0.0.1:17410/callback', verifier: pkce.verifier, deps: { fetch: fetchImpl } })
  assert.equal(token.accessToken, 'at-ac')
  assert.equal(token.refreshToken, 'rt-ac')
  const exchange = requests.find(r => r.body.grant_type === 'authorization_code')
  assert.equal(exchange.body.code, 'ac1')
  assert.equal(exchange.body.code_verifier, pkce.verifier)
  assert.equal(exchange.body.resource, 'https://mcp.tigerfintech.com/mcp')
})
