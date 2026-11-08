// 且慢 / 盈米 MCP adapter tests. All fixtures synthetic; transport is faked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listQiemanAccounts, fetchQiemanSnapshot, fetchQiemanHistory, qiemanMcpFingerprintPart } from './qieman-mcp.mjs'
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

const FUND_DETAIL = {
  result: {
    accountName: '长钱账户',
    fundList: [
      { fundCode: '000001', fundName: '华夏成长', holdShare: '1234.56', holdAmount: '2000.00', holdProfit: '200.00', nav: '1.6188', currency: 'CNY' },
      { fundCode: '110011', fundName: '易方达中小盘', holdShare: '100', holdAmount: '150.5', holdProfit: '10.5', currency: 'CNY' },
      { fundCode: '512880', fundName: '证券ETF', holdShare: '0', holdAmount: '0', holdProfit: '0', nav: '1.0', currency: 'CNY' },
    ],
  },
  totalAsset: '2150.5',
  dayProfit: '3.21',
}

test('且慢 tool names resolve case-insensitively and holdings map with derived cost', async () => {
  const deps = jsonDeps(
    ['get_user_accounts_and_products', 'get_user_m4_fund_detail', 'get_user_asset_tree'],
    {
      get_user_accounts_and_products: () => ({ accounts: [{ id: 'A1', name: '总账户' }] }),
      get_user_m4_fund_detail: () => FUND_DETAIL,
      get_user_asset_tree: () => { throw new Error('should not be called') },
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
  assert.equal(first.manualPrice, 1.6188)
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

test('且慢 fails clearly without holdings tools or API key', async () => {
  const deps = jsonDeps(['search_fund'], {})
  await assert.rejects(() => fetchQiemanSnapshot({}, SECRETS, undefined, deps), /持仓读取工具/)
  await assert.rejects(() => listQiemanAccounts({}, {}, undefined, jsonDeps(['get_user_accounts_and_products'], {})), /API Key|Bearer/)
  await assert.rejects(() => fetchQiemanHistory(), /账单文件/)
})

test('且慢 fingerprint hashes the credential without storing it', () => {
  const part = qiemanMcpFingerprintPart(SECRETS)
  assert.equal(part, createHash('sha256').update('qm-key-1').digest('hex').slice(0, 16))
  assert.equal(qiemanMcpFingerprintPart({}), '')
})
