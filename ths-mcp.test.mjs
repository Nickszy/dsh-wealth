import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTzzbAuthorizeUrl, bookArgs, listThsMcpAccounts, fetchThsMcpSnapshot, fetchThsMcpHistory, registerTzzbClient, TZZB_MCP_ENDPOINT } from './ths-mcp.mjs'

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

test('client registration omits scope — the THS server rejects it ("Invalid Client Registration: scope")', async () => {
  let sent = null
  const fetch = async (_url, options) => {
    sent = JSON.parse(options.body)
    return { ok: true, status: 201, headers: { get: () => null }, text: async () => JSON.stringify({ client_id: 'reg-cid' }) }
  }
  const result = await registerTzzbClient({ redirectUri: 'http://127.0.0.1:9/callback', deps: { fetch } })
  assert.equal(result.clientId, 'reg-cid')
  assert.equal('scope' in sent, false)
  assert.deepEqual(sent.redirect_uris, ['http://127.0.0.1:9/callback'])
  assert.equal(sent.token_endpoint_auth_method, 'none')
})

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

test('account selection maps stock, manual and fund books, dedupes shared ids and skips margin', async () => {
  const fetch = mcpFetch({
    promptAccountSelection: () => ({
      fund_key: [{ id: '52420925', name: '股票', param: 'fundKey' }],
      rzrq_fund_key: [{ id: '9', name: '两融', param: 'rzrqFundKey' }],
      manual_id: [{ id: '8', name: '手工', param: 'manualId' }],
      fund_id: [{ id: '24507604', name: '手工基金', param: 'fundId' }, { id: '100108832246', name: '手工基金 - 爱基金', param: 'fundId' }],
      cust_id: [{ id: '100108832246', name: '爱基金', param: 'custId' }],
    }),
  })
  const result = await listThsMcpAccounts({}, { accessToken: 'token' }, undefined, { fetch })
  const byId = Object.fromEntries(result.accounts.map(a => [a.id, a.thsType]))
  assert.deepEqual(byId, {
    '52420925': 'common',
    '8': 'manual',
    '24507604': 'manFund',
    '100108832246': 'ijj',
  })
  assert.equal(result.accounts.length, 4)
  assert.equal(result.warnings.length, 1)
})

test('stock snapshot reads holdings, cash and the upload time from the MCP tools', async () => {
  const fetch = mcpFetch({
    promptAccountSelection: () => ({ fund_key: [{ id: '52420925', lastSyncTime: '2026-11-11 20:38:34' }] }),
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
  assert.equal(snap.uploadedAt, '2026-11-11T12:38:34.000Z')
})

test('fund snapshot parses the {columns, rows} table into holdings', async () => {
  const fetch = mcpFetch({
    queryFundAccount: (args) => {
      assert.equal(args.custId, '100108832246')
      return {
        account: { totalAsset: '118545.87', totalCost: '116501.92', nowProfit: '2043.95', preProfit: '17.2674', transDate: '2026-11-11' },
        funds: {
          columns: ['fundcode', 'fundname', 'fundcount', 'fundvalue', 'fundcost'],
          rows: [
            ['001257', '兴业收益增强债券A', 4316.86, 6984.67948, 6954.46146],
            ['008164', '南方标普红利低波50ETF联接C', 0, 0, 0],
          ],
        },
      }
    },
  })
  const snap = await fetchThsMcpSnapshot({ portfolioId: '100108832246', thsBookType: 'ijj' }, { accessToken: 'token' }, undefined, { fetch })
  assert.equal(snap.holdings.length, 1)
  const fund = snap.holdings[0]
  assert.equal(fund.symbol, '001257')
  assert.equal(fund.qty, 4316.86)
  assert.ok(Math.abs(fund.avgCost - 6954.46146 / 4316.86) < 1e-6)
  assert.ok(Math.abs(fund.manualPrice - 6984.67948 / 4316.86) < 1e-6)
  assert.equal(snap.coverage.fund, 'full')
  assert.equal(snap.sourceTotals.dayProfit, 17.2674)
  assert.equal(snap.quoteDate, '2026-11-11')
})

test('fund history parses the monthly table lists', async () => {
  const fetch = mcpFetch({
    queryFundSummaryHistory: (args) => {
      assert.match(args.monthList, /^2026-0(9|10|11)/)
      return {
        data: [
          { month: '202611', list: { columns: ['accountName', 'fundCode', 'fundName', 'transAmount', 'transCount', 'confirmDate', 'opName'], rows: [['爱基金', '008164', '红利联接', '0.01', '0.01', '2026-11-06', '分红再投']] } },
          { month: '202610', list: { columns: ['accountName', 'fundCode', 'fundName', 'transAmount', 'transCount', 'confirmDate', 'opName'], rows: [['爱基金', '000719', '现金通', '100', '100', '2026-10-08', '申购']] } },
        ],
      }
    },
  })
  const history = await fetchThsMcpHistory({ portfolioId: '100108832246', thsBookType: 'ijj' }, { accessToken: 'token' }, { from: '2026-09-01', to: '2026-11-11' }, undefined, { fetch })
  assert.equal(history.rows.length, 2)
  const reinvest = history.rows.find(r => r.symbol === '008164')
  assert.equal(reinvest.kind, 'security_in')
  assert.equal(reinvest.cashAmount, 0)
  const buy = history.rows.find(r => r.symbol === '000719')
  assert.equal(buy.kind, 'buy')
  assert.equal(buy.cashAmount, -100)
  assert.equal(buy.date, '2026-10-08')
})

test('money history maps a buy to a cash outflow and collapses exact duplicates', async () => {
  const row = { opName: '买入', stockCode: '600519', stockName: '贵州茅台', entryMoney: '1000', entryCount: '10', entryPrice: '100', entryDate: '20261101', feeTotal: '5' }
  const fetch = mcpFetch({
    queryMoneyHistory: () => ({ page: '1', count: '200', maxPage: '1', list: [row, { ...row }] }),
  })
  const history = await fetchThsMcpHistory({ portfolioId: '52420925', thsBookType: 'common' }, { accessToken: 'token' }, { from: '2026-11-01', to: '2026-11-11' }, undefined, { fetch })
  assert.equal(history.rows.length, 1)
  assert.equal(history.rows[0].kind, 'buy')
  assert.equal(history.rows[0].cashAmount, -1000)
  assert.equal(history.rows[0].date, '2026-11-01')
  assert.ok(history.warnings.some(w => w.message.includes('重复')))
})
