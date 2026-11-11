import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTzzbAuthorizeUrl, bookArgs, listThsMcpAccounts, fetchThsMcpSnapshot, fetchThsMcpHistory, TZZB_MCP_ENDPOINT } from './ths-mcp.mjs'

function mcpFetch(tools) {
  return async (_url, options) => {
    const body = JSON.parse(options.body)
    let payload
    if (body.method === 'initialize') payload = { jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-11-25', serverInfo: { name: 'caishen-mcp', version: '1.0.0' } } }
    else if (body.method === 'tools/call') {
      const data = tools[body.params.name](body.params.arguments)
      payload = { jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(data) }] } }
    } else payload = { jsonrpc: '2.0' }
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(payload) }
  }
}

test('authorize URL is the investment-ledger OAuth endpoint with PKCE', () => {
  const url = new URL(buildTzzbAuthorizeUrl({ clientId: 'cid', redirectUri: 'http://127.0.0.1:9/callback', challenge: 'abc', state: 'st' }))
  assert.equal(url.origin + url.pathname, 'https://tzzb.10jqka.com.cn/oauth2/authorize')
  assert.equal(url.searchParams.get('client_id'), 'cid')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('resource'), TZZB_MCP_ENDPOINT)
  assert.equal(url.searchParams.get('scope'), 'tools.read')
  assert.equal(url.searchParams.get('state'), 'st')
})

test('book args keep fund, manual and aijijin ids on their own parameters', () => {
  assert.equal(bookArgs({ portfolioId: '1', thsBookType: 'common' }).fundKey, '1')
  assert.equal(bookArgs({ portfolioId: '2', thsBookType: 'manual' }).manualId, '2')
  assert.equal(bookArgs({ portfolioId: '3', thsBookType: 'manFund' }).fundId, '3')
  assert.equal(bookArgs({ portfolioId: '4', thsBookType: 'ijj' }).custId, '4')
})

test('account selection maps stock, manual and fund books and skips margin', async () => {
  const fetch = mcpFetch({
    promptAccountSelection: () => ({
      fund_key: [{ id: '52420925', name: '股票', param: 'fundKey' }],
      rzrq_fund_key: [{ id: '9', name: '两融', param: 'rzrqFundKey' }],
      manual_id: [{ id: '8', name: '手工', param: 'manualId' }],
      fund_id: [{ id: '24507604', name: '手工基金', param: 'fundId' }],
      cust_id: [{ id: '100108832246', name: '爱基金', param: 'custId' }],
    }),
  })
  const result = await listThsMcpAccounts({}, { accessToken: 'token' }, undefined, { fetch })
  assert.deepEqual(result.accounts.map(a => [a.id, a.thsType]), [
    ['52420925', 'common'],
    ['8', 'manual'],
    ['24507604', 'manFund'],
    ['100108832246', 'ijj'],
  ])
  assert.equal(result.warnings.length, 1)
})

test('stock snapshot reads holdings and cash from the MCP tool', async () => {
  const fetch = mcpFetch({
    queryStockPosition: (args) => {
      assert.equal(args.fundKey, '52420925')
      return {
        availableFunds: '100.5',
        totalMarketValue: '200',
        totalAsset: '300.5',
        totalLiability: '0',
        holdings: [{ stockCode: '600519', stockName: '贵州茅台', holdQuantity: '10', costPrice: '1', currentPrice: '2', holdProfit: '10' }],
      }
    },
  })
  const snap = await fetchThsMcpSnapshot({ portfolioId: '52420925', thsBookType: 'common' }, { accessToken: 'token' }, undefined, { fetch, now: () => new Date('2026-11-11T00:00:00Z') })
  const stock = snap.holdings.find(h => h.symbol === '600519')
  assert.equal(stock.qty, 10)
  assert.equal(stock.currency, 'CNY')
  assert.ok(snap.holdings.some(h => h.symbol === 'CASH:CNY' && h.qty === 100.5))
})

test('money history maps a buy to a cash outflow', async () => {
  const fetch = mcpFetch({
    queryMoneyHistory: () => ({
      page: '1', count: '200', maxPage: '1',
      list: [{ opName: '买入', stockCode: '600519', stockName: '贵州茅台', entryMoney: '1000', entryCount: '10', entryPrice: '100', entryDate: '20261101', feeTotal: '5' }],
    }),
  })
  const history = await fetchThsMcpHistory({ portfolioId: '52420925', thsBookType: 'common' }, { accessToken: 'token' }, { from: '2026-11-01', to: '2026-11-11' }, undefined, { fetch })
  assert.equal(history.rows.length, 1)
  assert.equal(history.rows[0].kind, 'buy')
  assert.equal(history.rows[0].cashAmount, -1000)
  assert.equal(history.rows[0].date, '2026-11-01')
})
