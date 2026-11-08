// 老虎 remote MCP adapter tests. Synthetic MCP/OAuth transport, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listTigerAccounts, fetchTigerSnapshot, fetchTigerHistory, startTigerDeviceAuth, pollTigerDeviceToken, refreshTigerToken } from './tiger-mcp.mjs'

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

test('老虎 snapshot maps positions, cash and totals; skips derivatives', async () => {
  const deps = mcpDeps({
    get_assets: () => ({ account: 'A1', net_liquidation: '15250.5', currency: 'USD', cash: [{ currency: 'USD', cash: '500.5' }, { currency: 'HKD', cash: '1000' }] }),
    get_positions: (args) => args.sec_type === 'STK'
      ? { positions: [
          { symbol: 'AAPL', name: 'Apple', sec_type: 'STK', market: 'US', position: '10', average_cost: '180', market_price: '185.5', currency: 'USD' },
          { symbol: '00700', name: '腾讯控股', sec_type: 'STK', market: 'HK', position: '100', average_cost: '350', market_price: '365', currency: 'HKD' },
          { symbol: 'AAPL  260117C00200000', sec_type: 'OPT', position: '1', average_cost: '2', market_price: '3', currency: 'USD' },
        ] }
      : { positions: [{ symbol: '519674', name: '银河成长', sec_type: 'FUND', position: '250', average_cost: '1.8', market_price: '2', currency: 'CNY' }] },
  })
  const snapshot = await fetchTigerSnapshot({ brokerAccountId: 'A1' }, SECRETS, undefined, deps)
  const symbols = snapshot.holdings.map(h => h.symbol)
  assert.ok(symbols.includes('AAPL'))
  assert.ok(symbols.includes('00700'))
  assert.ok(symbols.includes('519674'))
  assert.ok(symbols.includes('CASH:USD'))
  assert.ok(symbols.includes('CASH:HKD'))
  assert.ok(!symbols.some(s => s.startsWith('AAPL ')), 'option rows skipped')
  const apple = snapshot.holdings.find(h => h.symbol === 'AAPL')
  assert.deepEqual([apple.market, apple.currency, apple.avgCost, apple.manualPrice], ['US', 'USD', 180, 185.5])
  const fund = snapshot.holdings.find(h => h.symbol === '519674')
  assert.deepEqual([fund.market, fund.assetClass], ['FUND', 'fund'])
  assert.equal(snapshot.sourceTotals.totalAsset, 15250.5)
  assert.equal(snapshot.sourceTotals.cash, 1500.5)
  assert.equal(snapshot.complete, true)
})

test('老虎 history pages through transactions and maps buy/sell flows', async () => {
  const deps = mcpDeps({
    get_transactions: (args) => args.page_token === 'p2'
      ? { transactions: [{ id: 'T2', symbol: '00700', sec_type: 'STK', market: 'HK', action: 'SELL', filled_quantity: '50', filled_price: '370', trade_time: '2026-11-06T09:30:00+08:00', currency: 'HKD', commission: '3' }], next_page_token: null }
      : { transactions: [{ id: 'T1', symbol: 'AAPL', sec_type: 'STK', market: 'US', action: 'BUY', filled_quantity: '5', filled_price: '180', trade_time: 1794113400000, currency: 'USD', commission: '1' }], next_page_token: 'p2' },
  })
  const result = await fetchTigerHistory({ brokerAccountId: 'A1' }, SECRETS, { from: '2026-11-01', to: '2026-11-07' }, undefined, deps)
  assert.equal(result.rows.length, 2)
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

test('老虎 OAuth device flow: register, pending, ready and refresh', async () => {
  let stage = 0
  const deps = {
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const path = new URL(url).pathname
      const text = init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))
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
  assert.equal((await pollTigerDeviceToken(device, { deps })).status, 'pending')
  const slow = await pollTigerDeviceToken(device, { deps })
  assert.equal(slow.status, 'slow_down')
  assert.equal(slow.interval, 10)
  const ready = await pollTigerDeviceToken(device, { deps })
  assert.equal(ready.status, 'ready')
  assert.equal(ready.token.accessToken, 'at-1')
  const refreshed = await refreshTigerToken({ refreshToken: 'rt-1', clientId: 'cli-xyz', deps })
  assert.equal(refreshed.accessToken, 'at-1')
})
