// 且慢 / 盈米 MCP adapter tests. All fixtures synthetic; transport is faked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  listQiemanAccounts, fetchQiemanSnapshot, fetchQiemanHistory, qiemanMcpFingerprintPart,
  registerQiemanClient, createQiemanPkce, buildQiemanAuthorizeUrl, exchangeQiemanCode, refreshQiemanToken,
  QIEMAN_OAUTH_SCOPES,
} from './qieman-mcp.mjs'
import { createHash } from 'node:crypto'

const SECRETS = { apiKey: 'qm-key-1' }

function jsonDeps(tools, handlers) {
  const calls = []
  return {
    calls, timeoutMs: 5000,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url, headers: init.headers, body })
      const reply = payload => ({ ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'application/json' : (h === 'mcp-session-id' ? 'sess-q' : null) }, text: async () => JSON.stringify(payload) })
      if (body.method === 'initialize') return reply({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'qieman', version: '1' } } })
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      if (body.method === 'tools/list') return reply({ jsonrpc: '2.0', id: body.id, result: { tools: tools.map(name => ({ name })) } })
      if (body.method === 'tools/call') {
        const handler = handlers[body.params?.name]
        if (!handler) return reply({ jsonrpc: '2.0', id: body.id, result: { isError: true, content: [{ type: 'text', text: 'unknown tool' }] } })
        const value = await handler(body.params?.arguments || {})
        return reply({ jsonrpc: '2.0', id: body.id, result: { structuredContent: value } })
      }
      return reply({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'unsupported' } })
    },
  }
}

// Real M4 shape observed live on 2026-11-08 (盈米 GetUserM4FundDetail).
const FUND_DETAIL = {
  fundAssetGroupList: [
    { fundCode: '000001', fundName: '华夏成长', fundAssetInvestType: 'STOCK', staticShare: 1234.56, staticShareAsset: 2000.00, holdingProfit: 200.00, accumulatedProfit: 300, latestDailyProfit: 2.21, holdingAssetCount: 2 },
    { fundCode: '110011', fundName: '易方达中小盘', fundAssetInvestType: 'STOCK', staticShare: 100, staticShareAsset: 150.5, holdingProfit: 10.5, accumulatedProfit: 10.5, latestDailyProfit: 1, holdingAssetCount: 1 },
    { fundCode: '512880', fundName: '证券ETF', staticShare: 0, staticShareAsset: 0, holdingProfit: 0, latestDailyProfit: 0 },
  ],
}
const ASSET_TREE = { totalAsset: 2150.5, accounts: [{ nodeType: 'account', nodeId: 'uma_1', accountName: '总账户', totalAsset: 2150.5, strategies: [] }] }

test('且慢 tool names resolve case-insensitively and holdings map with derived cost', async () => {
  const deps = jsonDeps(
    ['get_user_accounts_and_products', 'get_user_m4_fund_detail', 'get_user_asset_tree'],
    {
      get_user_accounts_and_products: () => ({ accounts: [{ id: 'A1', name: '总账户' }] }),
      get_user_m4_fund_detail: () => FUND_DETAIL,
      get_user_asset_tree: () => ASSET_TREE,
    },
  )
  const accounts = await listQiemanAccounts({ mcpEndpoint: 'https://mcp.test' }, SECRETS, undefined, deps)
  assert.equal(accounts.accounts[0].id, 'main')
  assert.equal(accounts.accounts[0].currency, 'CNY')

  const snapshot = await fetchQiemanSnapshot({ mcpEndpoint: 'https://mcp.test', brokerAccountId: 'main' }, SECRETS, undefined, deps)
  assert.equal(snapshot.holdings.length, 2) // zero-share row skipped
  const first = snapshot.holdings.find(h => h.symbol === '000001')
  assert.equal(first.market, 'FUND')
  assert.equal(first.assetClass, 'fund')
  assert.equal(first.qty, 1234.56)
  assert.ok(Math.abs(first.manualPrice - 2000 / 1234.56) < 1e-9)
  assert.ok(Math.abs(first.avgCost - (2000 - 200) / 1234.56) < 1e-9)
  const second = snapshot.holdings.find(h => h.symbol === '110011')
  assert.ok(Math.abs(second.manualPrice - 150.5 / 100) < 1e-9)
  assert.equal(snapshot.sourceTotals.totalAsset, 2150.5)
  assert.equal(snapshot.sourceTotals.dayProfit, 3.21)
  assert.ok(snapshot.sourceTotals.holdingProfit > 0)
  const toolCall = deps.calls.find(c => c.body.params?.name === 'get_user_m4_fund_detail')
  assert.ok(toolCall, 'fund detail tool called')
})

test('且慢 falls back to asset tree when fund detail has no rows', async () => {
  const deps = jsonDeps(
    ['GetUserM4FundDetail', 'GetUserAssetTree'],
    {
      GetUserM4FundDetail: () => ({ result: { fundList: [] } }),
      GetUserAssetTree: () => ({ nodes: [{ name: '长钱', amount: '500', children: [{ fundCode: '519674', fundName: '银河成长', holdShare: '250', holdAmount: '500', holdProfit: '50', nav: '2' }] }] }),
    },
  )
  const snapshot = await fetchQiemanSnapshot({}, SECRETS, undefined, deps)
  assert.equal(snapshot.holdings.length, 1)
  assert.equal(snapshot.holdings[0].symbol, '519674')
  assert.equal(snapshot.holdings[0].avgCost, 1.8)
  assert.equal(snapshot.sourceTotals.totalAsset, 500)
})

test('且慢 sub-account reads funds from the asset tree by account name', async () => {
  const catalog = { data: {
    rootAccount: { serviceAccountId: 'SA0ROOT', assetName: '总账户' },
    subAccounts: [
      { serviceAccountId: 'SA0AAA', accountName: '我的长期投资', accountType: 'SUB_ACCOUNT' },
      { serviceAccountId: 'SA0BBB', accountName: '买房钱', accountType: 'SUB_ACCOUNT' },
    ],
  } }
  const tree = { totalAsset: 96099.66, accounts: [
    { nodeId: 'uma_1', accountName: '我的长期投资', totalAsset: 29801.66, strategies: [
      { strategyName: '长赢', funds: [
        { fundCode: '000051', fundName: '华夏沪深300ETF联接A', totalAsset: 285.02, totalShare: 181.98 },
        { fundCode: '000071', fundName: '华夏恒生ETF联接A', totalAsset: 1932.69, totalShare: 1339.45 },
      ] },
    ] },
    { nodeId: 'uma_2', accountName: '买房钱', totalAsset: 20000, strategies: [{ funds: [{ fundCode: '999999', fundName: '其他', totalAsset: 20000, totalShare: 10000 }] }] },
  ] }
  const deps = jsonDeps(
    ['GetUserAccountsAndProducts', 'GetUserM4FundDetail', 'GetUserAssetTree'],
    { GetUserAccountsAndProducts: () => catalog, GetUserM4FundDetail: () => FUND_DETAIL, GetUserAssetTree: () => tree },
  )
  const accounts = await listQiemanAccounts({}, SECRETS, undefined, deps)
  assert.deepEqual(accounts.accounts.map(a => [a.id, a.name]), [['main', '总账户'], ['SA0AAA', '我的长期投资'], ['SA0BBB', '买房钱']])

  const snapshot = await fetchQiemanSnapshot({ brokerAccountId: 'SA0AAA' }, SECRETS, undefined, deps)
  assert.deepEqual(snapshot.holdings.map(h => h.symbol).sort(), ['000051', '000071'])
  assert.deepEqual(snapshot.holdings.map(h => h.qty).sort((a, b) => a - b), [181.98, 1339.45])
  assert.equal(snapshot.sourceTotals.totalAsset, 29801.66)
  assert.ok(snapshot.warnings.some(w => /子账户视图不含成本/.test(w)))
  assert.equal(snapshot.complete, true)
})

test('且慢 fails clearly without holdings tools or API key', async () => {
  const deps = jsonDeps(['search_fund'], {})
  await assert.rejects(() => fetchQiemanSnapshot({}, SECRETS, undefined, deps), /持仓读取工具/)
  await assert.rejects(() => listQiemanAccounts({}, {}, undefined, jsonDeps(['get_user_accounts_and_products'], {})), /API Key|Bearer/)
  await assert.rejects(() => fetchQiemanHistory(), /账单文件/)
})

test('且慢 OAuth: registration, PKCE authorize URL, code exchange and refresh', async () => {
  const calls = []
  const deps = {
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const path = new URL(url).pathname
      calls.push({ path, body: init.body })
      if (path === '/oauth/register') return { ok: true, status: 201, json: async () => ({ client_id: 'dcr_x', scope: QIEMAN_OAUTH_SCOPES }) }
      if (path === '/oauth/token') return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 1800, scope: 'oapqieman:level1 oapqieman:level2' }) }
      throw new Error('unexpected ' + path)
    },
  }
  const reg = await registerQiemanClient({ redirectUri: 'http://127.0.0.1:1234/callback', deps })
  assert.equal(reg.clientId, 'dcr_x')
  const pkce = createQiemanPkce()
  assert.equal(pkce.method, 'S256')
  assert.notEqual(pkce.verifier, pkce.challenge)
  const url = new URL(buildQiemanAuthorizeUrl({ clientId: reg.clientId, redirectUri: 'http://127.0.0.1:1234/callback', challenge: pkce.challenge, state: 's1' }))
  assert.equal(url.origin + url.pathname, 'https://stargate-partner.yingmi.com/oauth/authorize')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.match(url.searchParams.get('scope'), /oapqieman:level1/)
  assert.match(url.searchParams.get('scope'), /oapqieman:level2/)
  assert.equal(url.searchParams.get('resource'), 'https://stargate-partner.yingmi.com/mcp/v2/oauth/qieman')
  const token = await exchangeQiemanCode({ code: 'c', clientId: 'dcr_x', redirectUri: 'http://127.0.0.1:1234/callback', verifier: pkce.verifier, deps })
  assert.equal(token.accessToken, 'at')
  assert.equal(token.refreshToken, 'rt')
  const refreshed = await refreshQiemanToken({ refreshToken: 'rt', clientId: 'dcr_x', deps })
  assert.equal(refreshed.accessToken, 'at')
  assert.equal(calls.filter(c => c.path === '/oauth/token').length, 2)
})

test('且慢 fingerprint hashes the credential without storing it', () => {
  const part = qiemanMcpFingerprintPart(SECRETS)
  assert.equal(part, createHash('sha256').update('qm-key-1').digest('hex').slice(0, 16))
  assert.equal(qiemanMcpFingerprintPart({}), '')
})
