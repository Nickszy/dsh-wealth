// 腾讯自选股 westock-mcp 适配层测试：合成 OAuth / MCP 传输，不联网。
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerWestockClient, createWestockPkce, buildWestockAuthorizeUrl, exchangeWestockCode, refreshWestockToken, westockCode, parseWestockKline, westockCallbackCode, fetchWestockSeries, WESTOCK_MCP_ENDPOINT } from './westock-mcp.mjs'
import { createWestockLogin } from './westock-login.mjs'

const jsonReply = (payload, status = 200) => ({ ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => payload })
const mcpReply = (payload) => ({ ok: true, status: 200, headers: { get: (h) => h === 'content-type' ? 'application/json' : null }, text: async () => JSON.stringify(payload) })

test('westockCode maps CN/HK/US symbols and excludes OTC funds', () => {
  assert.equal(westockCode({ kind: 'eastmoney', market: 'CN', symbol: '600519', assetClass: 'stock' }), 'sh600519')
  assert.equal(westockCode({ kind: 'eastmoney', market: 'CN', symbol: '000651', assetClass: 'stock' }), 'sz000651')
  assert.equal(westockCode({ kind: 'eastmoney', market: 'CN', symbol: '300750', assetClass: 'stock' }), 'sz300750')
  assert.equal(westockCode({ kind: 'eastmoney', market: 'CN', symbol: '510300', assetClass: 'etf' }), 'sh510300')
  assert.equal(westockCode({ kind: 'eastmoney', market: 'HK', symbol: '700', assetClass: 'stock' }), 'hk00700')
  assert.equal(westockCode({ kind: 'eastmoney', market: 'US', symbol: 'aapl', assetClass: 'stock' }), 'usAAPL')
  assert.equal(westockCode({ kind: 'fund', market: 'CN', symbol: '001257', assetClass: 'fund' }), null)
  assert.equal(westockCode(null), null)
})

test('kline parser reads the documented nodes shape with string fields', () => {
  const payload = {
    ok: true,
    data: {
      code: 'sh600519', name: '贵州茅台',
      nodes: [
        { date: '2026-03-06', open: '1680.00', last: '1690.00', high: '1695.00', low: '1675.00', volume: '125000' },
        { date: '2026-03-05', open: '1680.00', last: '1679.00', high: '1695.00', low: '1675.00' },
        { date: '2026/3/4', last: '1670.00' },
        { date: 'bad', last: '10' },
        { date: '2026-03-03', last: '-1' },
      ],
    },
  }
  assert.deepEqual(parseWestockKline(payload), [['2026-03-04', 1670], ['2026-03-05', 1679], ['2026-03-06', 1690]])
  // 变体字段名（closePrice / items）也能解析
  assert.deepEqual(parseWestockKline({ data: { items: [{ day: '2026-01-05', closePrice: '10.5' }] } }), [['2026-01-05', 10.5]])
  assert.deepEqual(parseWestockKline({ ok: false }), [])
  assert.deepEqual(parseWestockKline(null), [])
})

test('OAuth: register uses the loopback callback, exchange/refresh bind the MCP resource', async () => {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))
    requests.push({ url: String(url), headers: init.headers, body })
    if (url.endsWith('/oauth/register')) return jsonReply({ client_id: 'wb_dyn_x', redirect_uris: ['http://127.0.0.1:18963/callback'], error: null })
    if (url.endsWith('/oauth/token')) return jsonReply({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 7200 })
    throw new Error('unexpected ' + url)
  }
  const registered = await registerWestockClient({ redirectUri: 'http://127.0.0.1:18963/callback', fetch: fetchImpl })
  assert.equal(registered.clientId, 'wb_dyn_x')
  const register = requests[0]
  assert.equal(register.headers['content-type'], 'application/json')
  assert.deepEqual(register.body.redirect_uris, ['http://127.0.0.1:18963/callback'])
  assert.deepEqual(register.body.grant_types, ['authorization_code', 'refresh_token'])
  assert.equal(register.body.token_endpoint_auth_method, 'none')

  const pkce = createWestockPkce()
  assert.ok(pkce.codeVerifier.length >= 43)
  const authorizeUrl = new URL(buildWestockAuthorizeUrl({ clientId: 'wb_dyn_x', redirectUri: 'http://127.0.0.1:18963/callback', state: 's1', codeChallenge: pkce.codeChallenge }))
  assert.equal(authorizeUrl.searchParams.get('client_id'), 'wb_dyn_x')
  assert.equal(authorizeUrl.searchParams.get('redirect_uri'), 'http://127.0.0.1:18963/callback')
  assert.equal(authorizeUrl.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(authorizeUrl.searchParams.get('resource'), WESTOCK_MCP_ENDPOINT)
  assert.equal(authorizeUrl.searchParams.get('scope'), 'read write')
  assert.equal(authorizeUrl.searchParams.get('connector_authorize_url'), 'http://127.0.0.1:18963/callback', '微信回跳分支靠它拿到回调地址')

  const token = await exchangeWestockCode({ code: 'abc', clientId: 'wb_dyn_x', redirectUri: 'http://127.0.0.1:18963/callback', codeVerifier: pkce.codeVerifier }, { fetch: fetchImpl })
  assert.equal(token.accessToken, 'at-1')
  assert.ok(token.expiresAt > Date.now())
  const exchange = requests.find(r => r.url.endsWith('/oauth/token'))
  assert.equal(exchange.body.grant_type, 'authorization_code')
  assert.equal(exchange.body.code, 'abc')
  assert.equal(exchange.body.code_verifier, pkce.codeVerifier)
  assert.equal(exchange.body.redirect_uri, 'http://127.0.0.1:18963/callback')
  assert.equal(exchange.body.resource, WESTOCK_MCP_ENDPOINT)

  const refreshed = await refreshWestockToken({ refreshToken: 'rt-1', clientId: 'wb_dyn_x' }, { fetch: fetchImpl })
  assert.equal(refreshed.accessToken, 'at-1')
  assert.equal(refreshed.refreshToken, 'rt-1', '续期未发新 refresh token 时保留旧的')
  const refresh = requests.filter(r => r.body.grant_type === 'refresh_token')[0]
  assert.equal(refresh.body.refresh_token, 'rt-1')
  assert.equal(refresh.body.resource, WESTOCK_MCP_ENDPOINT)
})

test('OAuth errors surface the platform message', async () => {
  const fetchImpl = async () => jsonReply({ client_id: '', error: { error: 'invalid_redirect_uri', error_description: 'redirect_uri must be workbuddy://…' } }, 400)
  await assert.rejects(() => registerWestockClient({ redirectUri: 'http://127.0.0.1:18963/callback', fetch: fetchImpl }), /workbuddy/)
})

test('registration rejects a non-loopback redirect before calling the network', async () => {
  await assert.rejects(() => registerWestockClient({ redirectUri: 'workbuddy://workbuddy/mcp/oauth/callback', fetch: async () => { throw new Error('should not fetch') } }), /127\.0\.0\.1/)
})

test('loopback login exchanges the code delivered to 127.0.0.1', async () => {
  const fetchImpl = async (url, init) => {
    const body = init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))
    if (String(url).endsWith('/oauth/register')) return jsonReply({ client_id: 'cid-1' })
    if (String(url).endsWith('/oauth/token')) {
      assert.equal(body.grant_type, 'authorization_code')
      assert.equal(body.code, 'from-browser')
      assert.match(body.redirect_uri, /^http:\/\/127\.0\.0\.1:\d+\/callback$/)
      assert.equal(body.resource, WESTOCK_MCP_ENDPOINT)
      return jsonReply({ access_token: 'at-live', refresh_token: 'rt-live', expires_in: 3600 })
    }
    throw new Error('unexpected ' + url)
  }
  let saved = null
  const login = createWestockLogin({ onToken: (token) => { saved = token }, deps: { fetch: fetchImpl }, openBrowser: () => {} })
  try {
    const started = await login.start()
    assert.equal(started.status, 'waiting')
    const authorize = new URL(started.authorizeUrl)
    const redirect = authorize.searchParams.get('redirect_uri')
    assert.equal(authorize.searchParams.get('connector_authorize_url'), redirect)
    const callback = await fetch(redirect + '?code=from-browser&state=' + authorize.searchParams.get('state'))
    assert.equal(callback.status, 200)
    for (let i = 0; i < 50 && !saved; i++) await new Promise(r => setTimeout(r, 20))
    assert.equal(saved.accessToken, 'at-live')
    assert.equal(saved.clientId, 'cid-1')
    assert.equal(login.status().status, 'ready')
  } finally { await login.dispose() }
})

test('callback paste accepts workbuddy:// URLs and raw code params', () => {
  assert.deepEqual(
    westockCallbackCode('workbuddy://workbuddy/mcp/connector:dsh-wealth/oauth/callback?code=abc123&state=st9'),
    { code: 'abc123', state: 'st9' })
  assert.deepEqual(westockCallbackCode('?code=zz&state=yy'), { code: 'zz', state: 'yy' })
  assert.deepEqual(westockCallbackCode(''), { code: '', state: '' })
})

test('fetchWestockSeries opens an MCP session with the bearer and calls data_kline', async () => {
  const calls = []
  const deps = {
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url: String(url), headers: init.headers, body })
      if (body.method === 'initialize') return mcpReply({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'westock', version: '1' } } })
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      if (body.method === 'tools/call') {
        assert.equal(body.params.name, 'data_kline')
        assert.deepEqual(body.params.arguments, { code: 'sh600519', period: 'day', fq: 'qfq', start: '2026-01-01', end: '2026-11-08', limit: 5000 })
        const result = { ok: true, data: { code: 'sh600519', nodes: [{ date: '2026-11-06', last: '1453' }, { date: '2026-11-05', last: '1440' }] } }
        return mcpReply({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } })
      }
      return mcpReply({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'unsupported' } })
    },
  }
  const target = { kind: 'eastmoney', market: 'CN', symbol: '600519', assetClass: 'stock' }
  const rows = await fetchWestockSeries(target, { from: '2026-01-01', to: '2026-11-08', accessToken: 'tok', deps })
  assert.deepEqual(rows, [['2026-11-05', 1440], ['2026-11-06', 1453]])
  const init = calls[0]
  assert.equal(init.headers.authorization, 'Bearer tok')
  assert.equal(new URL(init.url).href, WESTOCK_MCP_ENDPOINT)
  // 未覆盖标的直接空序列，不发请求
  const skipped = await fetchWestockSeries({ kind: 'fund', market: 'CN', symbol: '001257', assetClass: 'fund' }, { accessToken: 'tok', deps })
  assert.deepEqual(skipped, [])
  assert.equal(calls.length, 3)
})
