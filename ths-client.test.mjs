import test from 'node:test'
import assert from 'node:assert/strict'
import { listThsAccounts, fetchStandaloneThsSnapshot, fetchThsHistory, createThsVTokenRefresher } from './ths-client.mjs'

const source = { portfolioId: 'chosen' }, secrets = { cookie: 'userid=123; v=fixture' }
const rows = [{ fund_key: 'other', manualname: 'Other' }, { fund_key: 'chosen', manualname: 'Selected', brokername: 'Broker' }]
function fixture(overrides = {}) {
  return { currency: 'CNY', money_remain: '50', total_value: '200', total_asset: '250', total_liability: '0', position_rate: '0.8', upload_time: '1794000000000', position: [{ code: '600000', market: '2', name: '示例', count: '20', cost: '8', price: '10', value: '200', hold_profit: '40', pre_profit: '-2' }], ...overrides }
}
function deps(data = fixture(), options = {}) {
  const calls = []
  return { calls, now: () => new Date('2026-11-07T00:00:00Z'), fetch: async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: url.endsWith('account_list') ? { common: rows } : data, ...options }) }
  } }
}
test('lists account identities and uses exact form/header contracts', async () => {
  const d = deps(), result = await listThsAccounts({}, secrets, undefined, d)
  assert.equal(result.accounts[1].id, 'chosen'); assert.equal(result.accounts[1].currency, 'CNY')
  const { url, init } = d.calls[0]
  assert.equal(url, 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/account/v1/account_list')
  assert.equal(init.redirect, 'manual'); assert.equal(init.headers.Cookie, secrets.cookie)
  assert.equal(new URLSearchParams(init.body).get('userid'), '123'); assert.equal(new URLSearchParams(init.body).get('user_id'), '123')
})
test('selects explicit owned account, preserves numeric holdings and native cash', async () => {
  const d = deps(), result = await fetchStandaloneThsSnapshot(source, secrets, undefined, d)
  assert.equal(new URLSearchParams(d.calls[1].init.body).get('fund_key'), 'chosen')
  assert.equal(new URLSearchParams(d.calls[1].init.body).get('is_merge'), '0')
  assert.equal(result.complete, true); assert.equal(result.holdings[0].qty, 20)
  assert.equal(result.holdings[0].avgCost, 8); assert.equal(result.holdings[1].qty, 50)
  assert.deepEqual(result.sourceTotals, { cash: 50, totalValue: 200, totalAsset: 250, totalLiability: 0, investedPct: 80, holdingProfit: 40, dayProfit: -2 })
  assert.equal(result.quoteDate, null)
})
test('requires explicit account and refuses foreign account before position fetch', async () => {
  await assert.rejects(fetchStandaloneThsSnapshot({}, secrets, undefined, deps()), { code: 'PORTFOLIO_REQUIRED' })
  const d = deps()
  await assert.rejects(fetchStandaloneThsSnapshot({ portfolioId: 'foreign' }, secrets, undefined, d), { code: 'PORTFOLIO_NOT_FOUND' })
  assert.equal(d.calls.length, 1)
})
test('missing quantity/cost skips row and cannot prune; null cash never becomes zero', async () => {
  const f = fixture({ money_remain: null }); f.position[0].count = null
  const result = await fetchStandaloneThsSnapshot(source, secrets, undefined, deps(f))
  assert.equal(result.complete, false); assert.deepEqual(result.holdings, [])
  assert.equal(result.sourceTotals.cash, null); assert.ok(result.warnings.some(v => v.startsWith('MISSING_POSITION_FIELDS')))
})
test('null quote stays null and makes snapshot incomplete', async () => {
  const f = fixture(); f.position[0].price = null
  const result = await fetchStandaloneThsSnapshot(source, secrets, undefined, deps(f))
  assert.equal(result.holdings[0].manualPrice, null); assert.equal(result.complete, false)
})
test('missing upstream arrays, null data, error results reject without snapshot', async () => {
  for (const data of [null, {}, { position: null }]) await assert.rejects(fetchStandaloneThsSnapshot(source, secrets, undefined, deps(data)), { code: 'INVALID_RESPONSE' })
  await assert.rejects(fetchStandaloneThsSnapshot(source, secrets, undefined, deps(fixture(), { error_code: '-1', error_msg: secrets.cookie })), error => error.code === 'API_REJECTED' && !error.message.includes(secrets.cookie))
})
test('rejects unsupported currency, debt and duplicate securities; short rows skip instead of failing', async () => {
  const short = fixture(); short.position[0].count = '-1'
  const dup = fixture(); dup.position.push(dup.position[0])
  for (const data of [fixture({ currency: 'HKD' }), fixture({ total_liability: '1' }), dup]) await assert.rejects(fetchStandaloneThsSnapshot(source, secrets, undefined, deps(data)))
  const skipped = await fetchStandaloneThsSnapshot(source, secrets, undefined, deps(short))
  assert.equal(skipped.complete, false)
  assert.deepEqual(skipped.holdings.map(row => row.assetClass), ['cash'])
  assert.ok(skipped.warnings.some(v => v.startsWith('THS_POSITION_SKIPPED:NEGATIVE_QTY')))
})

test('HK connect rows and negative diluted cost are handled per row, not per book', async () => {
  const f = fixture()
  f.position.push({ code: '01164', market: '15', name: '中广核矿', count: '5000', cost: '-2.6035', price: '2.09', value: '8882.5', hold_profit: '10', pre_profit: '1' })
  f.position.push({ code: '501018', market: '2', name: '南方原油', count: '34', cost: '-28.6260', price: '2.062', value: '70.108', hold_profit: '5', pre_profit: '0.5' })
  const result = await fetchStandaloneThsSnapshot(source, secrets, undefined, deps(f))
  // 港股通行被跳过并标记不完整；负摊薄成本的沪深基金照常导入。
  assert.equal(result.complete, false)
  assert.ok(result.warnings.some(v => v.startsWith('THS_POSITION_SKIPPED:UNSUPPORTED_MARKET:15:01164')))
  const oil = result.holdings.find(row => row.symbol === '501018')
  assert.equal(oil.avgCost, -28.626)
  assert.equal(oil.currency, 'CNY')
  // 原有持仓 + 负摊薄成本行 + 现金行；港股通行不在其中。
  assert.equal(result.holdings.length, 3)
  assert.ok(result.holdings.every(row => row.symbol !== '01164'))
})
test('403 is not auth expiry; redirects never follow; errors contain no secrets', async () => {
  for (const status of [302, 401, 403, 500]) {
    await assert.rejects(listThsAccounts({}, secrets, undefined, { fetch: async () => ({ status, ok: false }) }), error => !error.message.includes(secrets.cookie) && (status !== 401 || error.code === 'AUTH_REQUIRED'))
  }
  await assert.rejects(listThsAccounts({}, secrets, undefined, { fetch: async () => { throw new Error(secrets.cookie) } }), error => !error.message.includes(secrets.cookie))
})
test('missing login, malformed cookies, userid disagreement and abort fail safely', async () => {
  for (const s of [{}, { cookie: 'userid=0' }, { cookie: 'userid=123\r\nx=abc' }, { cookie: 'userid=123', userId: '456' }]) await assert.rejects(listThsAccounts({}, s, undefined, deps()), { code: 'AUTH_REQUIRED' })
  const controller = new AbortController(); controller.abort()
  const d = deps(); await assert.rejects(listThsAccounts({}, secrets, controller.signal, d), { code: 'CANCELLED' }); assert.equal(d.calls.length, 0)
})
function vToken() {
  const p = Buffer.alloc(43); p[42] = 3; p.writeUInt16BE(7, 40)
  let sum = 0; for (const b of p) sum = (sum << 5) - sum + b
  const out = Buffer.alloc(45); out[0] = 3; out[1] = sum & 255
  let state = out[1]; for (let i = 0; i < 43; i++) { out[i + 2] = p[i] ^ (state & 255); state = ~(state * 131) }
  return out.toString('base64url')
}
test('refreshes only validated existing v3 tokens and increments counters', () => {
  const token = vToken(), cookie = `userid=123; v=${token}`, refresh = createThsVTokenRefresher(() => 1794000000000)
  const first = refresh(cookie), second = refresh(cookie)
  assert.notEqual(first, cookie); assert.notEqual(first, second); assert.ok(first.startsWith('userid=123; v='))
  assert.equal(refresh('userid=123; v=bad'), 'userid=123; v=bad')
  assert.equal(refresh(cookie + `; v=${token}`), cookie + `; v=${token}`)
})

// get_money_history fixtures: pages keyed by request page number.
function historyDeps(pages, options = {}) {
  const calls = []
  return { calls, fetch: async (url, init) => {
    calls.push({ url, init })
    const page = Number(new URLSearchParams(init.body).get('page'))
    const data = pages[page]
    if (!data) return { ok: true, status: 200, json: async () => ({ error_code: options.errorCode ?? '0', error_msg: options.errorMsg ?? 'success', ex_data: { list: [], total: 0, max_page: 1, page, count: 200 } }) }
    return { ok: true, status: 200, json: async () => ({ error_code: options.errorCode ?? '0', error_msg: options.errorMsg ?? 'success', ex_data: { ...data, page, count: 200 } }) }
  } }
}
const moneyRow = (overrides = {}) => ({ account_id: '1', account_type: '1', code: '600000', name: '示例证券', market_code: '1', op: '1', op_name: '买入', entry_date: '2026-01-04', entry_time: '09:31:00', entry_money: '28122.0000', entry_count: '900', entry_price: '31.24', entry_cost: '0', fee_total: '0', commission: '5', transfer_fee: '0', commission_rate: '', transfer_fee_rate: '', trans_no: 'I200070190', history_id: 'null', manual_id: '', oid: '', remark: '', vid: 'a'.repeat(32), ...overrides })

test('THS history maps ops, signs cash by direction and keeps repo rate as price', async () => {
  const d = historyDeps({ 1: { list: [
    moneyRow({ vid: 'v1' }),
    moneyRow({ vid: 'v2', op: '2', op_name: '卖出', entry_money: '14652', entry_time: '14:55:03', trans_no: 'I200070191' }),
    moneyRow({ vid: 'v3', op: '5', op_name: '买入', code: '131810', name: 'GC001', entry_money: '1760', entry_count: '1760', entry_price: '0.975', remark: '' }),
    moneyRow({ vid: 'v4', op: '35', op_name: '卖出', code: '131810', name: 'GC001', entry_money: '1761', entry_count: '1760', entry_price: '0.981', trans_no: 'I200070190' }),
    moneyRow({ vid: 'v5', op: '6', op_name: '派息', code: '601872', name: '招商轮船', entry_money: '702', entry_count: '5400', entry_price: '', fee_total: '', trans_no: '' }),
    moneyRow({ vid: 'v6', op: '95', op_name: '缴税', code: '601872', name: '招商轮船', entry_money: '85', entry_count: '0', entry_price: '' }),
    moneyRow({ vid: 'v7', op: '222', op_name: '入账', code: '301111', name: '新股', entry_money: '0', entry_count: '500', entry_price: '12.34' }),
    moneyRow({ vid: 'v8', op: '999', op_name: '未知类型', code: '', name: '', entry_money: '12.5', entry_count: '0', entry_price: '' }),
  ], total: 8, max_page: 1 } })
  const out = await fetchThsHistory(source, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, d)
  const call = d.calls[0], form = new URLSearchParams(call.init.body)
  assert.equal(call.url, 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/account/v2/get_money_history')
  assert.equal(form.get('fund_key'), 'chosen'); assert.equal(form.get('start_date'), '20260101'); assert.equal(form.get('end_date'), '20260131')
  assert.equal(form.get('count'), '200'); assert.equal(form.get('page'), '1')
  const rows = out.rows
  assert.equal(rows.length, 8); assert.deepEqual(out.errors, [])
  const byId = Object.fromEntries(rows.map(r => [r.externalId, r]))
  assert.deepEqual([byId.v1.kind, byId.v1.cashAmount, byId.v1.qty, byId.v1.price, byId.v1.fee, byId.v1.currency, byId.v1.market], ['buy', -28122, 900, 31.24, 0, 'CNY', 'CN'])
  assert.equal(byId.v2.cashAmount, 14652)
  assert.deepEqual([byId.v3.kind, byId.v3.cashAmount, byId.v3.price, byId.v3.grossAmount], ['repo_open', -1760, 0.975, null])
  assert.equal(byId.v4.kind, 'repo_close'); assert.equal(byId.v4.cashAmount, 1761)
  assert.equal(byId.v5.kind, 'dividend'); assert.equal(byId.v5.cashAmount, 702); assert.equal(byId.v5.fee, null); assert.equal(byId.v5.qty, 5400)
  assert.equal(byId.v6.kind, 'tax'); assert.equal(byId.v6.cashAmount, -85)
  assert.deepEqual([byId.v7.kind, byId.v7.cashAmount, byId.v7.qty, byId.v7.price], ['security_in', 0, 500, 12.34])
  assert.equal(byId.v8.kind, 'other'); assert.equal(byId.v8.originalType, '未知类型'); assert.equal(byId.v8.symbol, null); assert.equal(byId.v8.market, null); assert.equal(byId.v8.cashAmount, null)
  assert.ok(out.warnings.some(w => /999/.test(w.message)))
  assert.match(out.coverage.note, /银证转账/)
})
test('THS history paginates by max_page and deduplicates repeated vid overlap', async () => {
  const d = historyDeps({ 1: { list: [moneyRow({ vid: 'v1' })], total: 2, max_page: 2 }, 2: { list: [moneyRow({ vid: 'v2', op: '2', op_name: '卖出' }), moneyRow({ vid: 'v1' })], total: 2, max_page: 2 } })
  const out = await fetchThsHistory(source, secrets, { from: '2020-01-01', to: '2026-11-07' }, undefined, d)
  assert.equal(d.calls.length, 2)
  assert.deepEqual(out.rows.map(r => r.externalId), ['v1', 'v2'])
})
test('THS history rejects invalid money, bad dates and reversed range before any write; empty vid falls back to a stable weak key', async () => {
  const noVid = historyDeps({ 1: { list: [moneyRow({ vid: '' })], total: 1, max_page: 1 } })
  const noVidOut = await fetchThsHistory(source, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, noVid)
  assert.equal(noVidOut.rows.length, 1)
  assert.ok(noVidOut.rows[0].externalId.startsWith('weak:'))
  const badMoney = historyDeps({ 1: { list: [moneyRow({ vid: 'v9', entry_money: '-5' })], total: 1, max_page: 1 } })
  await assert.rejects(fetchThsHistory(source, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, badMoney), /金额/)
  // 送股（op 16）等无资金业务金额为空：保留记录，现金记 0；买入缺金额则保留并标记未知+警告。
  const bonus = historyDeps({ 1: { list: [moneyRow({ vid: 'b1', op: '16', op_name: '送股', entry_money: '', entry_price: '', entry_count: '200' }), moneyRow({ vid: 'b2', entry_money: '' })], total: 2, max_page: 1 } })
  const bonusOut = await fetchThsHistory(source, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, bonus)
  const b1 = bonusOut.rows.find(r => r.externalId === 'b1'), b2 = bonusOut.rows.find(r => r.externalId === 'b2')
  assert.deepEqual([b1.kind, b1.cashAmount, b1.qty], ['security_in', 0, 200])
  assert.deepEqual([b2.kind, b2.cashAmount], ['buy', null])
  assert.ok(bonusOut.warnings.some(w => /缺少金额/.test(w.message)))
  await assert.rejects(fetchThsHistory(source, secrets, { from: '2026-02-30', to: '2026-03-01' }, undefined, historyDeps({})), /无效/)
  await assert.rejects(fetchThsHistory(source, secrets, { from: '2026-02-01', to: '2026-01-01' }, undefined, historyDeps({})), /开始日期不能晚于/)
  await assert.rejects(fetchThsHistory({ portfolioId: '' }, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, historyDeps({})), /明确选择/)
  assert.ok(noVid.calls.length >= 1)
})
test('THS history rejects error envelopes and oversized archives without partial rows', async () => {
  const failing = historyDeps({}, { errorCode: '-1', errorMsg: '会话失效' })
  await assert.rejects(fetchThsHistory(source, secrets, { from: '2026-01-01', to: '2026-01-31' }, undefined, failing), /拒绝请求/)
  const huge = historyDeps({ 1: { list: Array.from({ length: 200 }, (_, i) => moneyRow({ vid: 'u' + i })), total: 999999, max_page: 250 } })
  for (let p = 2; p <= 126; p++) huge_calls_fix(huge, p)
  await assert.rejects(fetchThsHistory(source, secrets, { from: '2020-01-01', to: '2026-11-07' }, undefined, huge), /25000/)
})
function huge_calls_fix(deps, page) {
  const original = deps.fetch
  deps.fetch = async (url, init) => {
    const p = Number(new URLSearchParams(init.body).get('page'))
    if (p > 1) return { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: { list: Array.from({ length: 200 }, (_, i) => moneyRow({ vid: `p${p}r${i}` })), total: 999999, max_page: 250, page: p, count: 200 } }) }
    return original(url, init)
  }
}

// ---- 基金账本（爱基金 ijj / 手动基金 manFund）----
const fundRows = [{ fund_key: 'chosen', manualname: 'Selected' }, { fundId: '100108832246', fundname: '爱基金', type: 'ijj' }, { fundId: '24507604', fundname: '南洋基金', type: 'manFund' }, { fundId: 'bad-book', fundname: '未知类型', type: 'other' }]
function fundDeps({ list = fundRows, merge, history } = {}, options = {}) {
  const calls = []
  return { calls, fetch: async (url, init) => {
    calls.push({ url, init })
    const body = new URLSearchParams(init.body)
    if (url.endsWith('account_list')) return { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: { common: list.filter(r => r.fund_key), fund: list.filter(r => r.fundId) }, ...options }) }
    if (url.endsWith('merge_fund')) return { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: merge ?? { account: { cust_id: '100108832246', username: '爱基金', total_asset: '115116.337772', total_cost: '141202.550427', trans_date: '2026-11-06' }, fund: [{ fundcode: '001257', fundname: '兴业收益增强债券A', fundtype: '1', fundcount: '4316.86', fundcost: '6954.46146', fundnav: '1.612', fundvalue: '6958.77832', date: '2026-11-06', percost: '1.611245', onway: '0', unconf_count: 0 }, { fundcode: '020686', fundname: '南方上证科创板新材料ETF联接C', fundtype: '0', fundcount: '23397.83', fundcost: '53861.80', fundnav: '1.5198', fundvalue: '35560.02', date: '2026-11-05', percost: '2.302047', onway: '0', unconf_count: 0 }], currencyfund: [], onwayfund: [], clearfund: [], empty: 'false' } }) }
    return { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: history ?? { list: [], total: 0, max_page: 1, page: Number(body.get('page') || 1), count: 200 } }) }
  } }
}
const fundMoneyRow = (overrides = {}) => ({ account_id: '1', account_type: '5', code: '001257', name: '兴业收益增强债券A', market_code: '', op: '0', op_name: '申购', entry_date: '2026-10-09', entry_time: '00:00:00', entry_money: '1000.00', entry_count: '620.12', entry_price: '1.6127', entry_cost: '0', fee_total: '1.50', trans_no: '', history_id: 'null', manual_id: '', oid: '', remark: '', vid: '', ...overrides })

test('fund books appear in account list with type labels and unknown types are skipped', async () => {
  const d = fundDeps(), result = await listThsAccounts({}, secrets, undefined, d)
  assert.deepEqual(result.accounts.map(a => [a.id, a.thsType]), [['chosen', 'common'], ['100108832246', 'ijj'], ['24507604', 'manFund']])
  assert.equal(result.accounts[1].name, '爱基金')
})
test('fund snapshot (ijj) maps merge_fund to holdings with percost avg cost and totals', async () => {
  const d = fundDeps(), result = await fetchStandaloneThsSnapshot({ portfolioId: '100108832246', thsBookType: 'ijj' }, secrets, undefined, d)
  const call = d.calls.find(c => c.url.endsWith('merge_fund')), form = new URLSearchParams(call.init.body)
  assert.equal(form.get('custid'), '100108832246'); assert.equal(form.get('fundid'), '')
  assert.equal(result.holdings.length, 2)
  const first = result.holdings[0]
  assert.deepEqual([first.symbol, first.assetClass, first.market, first.currency, first.qty, first.avgCost, first.manualPrice, first.externalId], ['001257', 'fund', 'CN', 'CNY', 4316.86, 1.611245, 1.612, '001257'])
  assert.equal(result.sourceTotals.totalAsset, 115116.337772)
  assert.equal(result.sourceTotals.totalCost, 141202.550427)
  assert.equal(result.quoteDate, '2026-11-06')
  assert.equal(result.complete, true)
})
test('fund snapshot (manFund) uses fundid and derives avg cost when percost missing', async () => {
  const merge = { account: { cust_id: '', username: '南洋基金', total_asset: '9000', total_cost: '8500', trans_date: '2026-11-01' }, fund: [{ fundcode: '110022', fundname: '消费龙头', fundtype: '0', fundcount: '100', fundcost: '85', fundnav: '0.9', fundvalue: '90', date: '2026-11-01', percost: '', onway: '0', unconf_count: 0 }], currencyfund: [], onwayfund: [], clearfund: [], empty: 'false' }
  const d = fundDeps({ merge }), result = await fetchStandaloneThsSnapshot({ portfolioId: '24507604', thsBookType: 'manFund' }, secrets, undefined, d)
  const form = new URLSearchParams(d.calls.find(c => c.url.endsWith('merge_fund')).init.body)
  assert.equal(form.get('fundid'), '24507604'); assert.equal(form.get('custid'), '')
  assert.equal(result.holdings[0].avgCost, 0.85)
  assert.equal(result.sourceTotals.totalAsset, 9000)
})
test('fund snapshot rejects foreign book, invalid codes, bad values and skips onway/clear with warnings', async () => {
  await assert.rejects(fetchStandaloneThsSnapshot({ portfolioId: 'other-book', thsBookType: 'ijj' }, secrets, undefined, fundDeps()), { code: 'PORTFOLIO_NOT_FOUND' })
  const bad = fundDeps({ merge: { account: { cust_id: '100108832246', username: '爱基金', total_asset: '10', total_cost: '9', trans_date: '2026-11-06' }, fund: [{ fundcode: 'AB12', fundname: '坏代码', fundcount: '1', fundcost: '1', fundnav: '1', fundvalue: '1', date: '2026-11-06' }, { fundcode: '110022', fundname: '缺数量', fundcount: '0', fundcost: '1', fundnav: '1', fundvalue: '0', date: '2026-11-06' }, { fundcode: '110023', fundname: '价值不符', fundcount: '10', fundcost: '10', fundnav: '1', fundvalue: '99', date: '2026-11-06' }], currencyfund: [], onwayfund: [{ fundcode: '000001' }], clearfund: [], empty: 'false' } })
  const result = await fetchStandaloneThsSnapshot({ portfolioId: '100108832246', thsBookType: 'ijj' }, secrets, undefined, bad)
  assert.equal(result.complete, false)
  assert.ok(result.warnings.some(w => w.startsWith('INVALID_FUND_CODE')))
  assert.ok(result.warnings.some(w => w.startsWith('MISSING_FUND_FIELDS')))
  assert.ok(result.warnings.some(w => w.startsWith('FUND_VALUE_MISMATCH')))
  assert.ok(result.warnings.some(w => w.startsWith('THS_FUND_SKIPPED:onwayfund:1')))
  assert.equal(result.holdings.length, 1)
  assert.equal(result.holdings[0].symbol, '110023')
})
test('fund history uses custid-only params for ijj and maps fund ops with weak dedup', async () => {
  const history = { list: [
    fundMoneyRow(),
    fundMoneyRow({ op: '1', op_name: '定投', entry_date: '2026-10-19' }),
    fundMoneyRow({ op: '2', op_name: '现金分红', entry_money: '35.6', entry_count: '0', entry_price: '', fee_total: '' }),
    fundMoneyRow({ op: '4', op_name: '赎回', entry_money: '5000', entry_count: '3000', entry_price: '1.6666', entry_date: '2026-11-02' }),
    fundMoneyRow({ op: '10', op_name: '转入', entry_money: '1000', entry_count: '600', entry_price: '1.666', entry_date: '2026-11-03' }),
    fundMoneyRow({ op: '11', op_name: '转出', entry_money: '1000', entry_count: '600', entry_price: '1.666', entry_date: '2026-11-03' }),
    fundMoneyRow({ op: '100', op_name: '修改持仓', entry_money: '0', entry_count: '10', entry_price: '1.6', entry_date: '2026-11-04' }),
  ], total: 7, max_page: 1 }
  const d = fundDeps({ history }), out = await fetchThsHistory({ portfolioId: '100108832246', thsBookType: 'ijj' }, secrets, { from: '2026-10-01', to: '2026-11-07' }, undefined, d)
  const form = new URLSearchParams(d.calls.find(c => c.url.endsWith('get_money_history')).init.body)
  assert.equal(form.get('custid'), '100108832246'); assert.equal(form.get('fundid'), ''); assert.equal(form.get('fund_key'), '')
  const rows = out.rows
  assert.equal(rows.length, 7)
  const byDate = Object.fromEntries(rows.map(r => [r.date + '|' + r.kind, r]))
  assert.equal(byDate['2026-10-09|buy'].cashAmount, -1000); assert.equal(byDate['2026-10-09|buy'].fee, 1.5)
  assert.equal(byDate['2026-10-19|buy'].originalType, '定投')
  assert.equal(byDate['2026-10-09|dividend'].cashAmount, 35.6)
  assert.equal(byDate['2026-11-02|sell'].cashAmount, 5000)
  assert.equal(byDate['2026-11-03|security_in'].cashAmount, 0)
  assert.equal(byDate['2026-11-03|security_out'].cashAmount, 0)
  assert.equal(byDate['2026-11-04|other'].cashAmount, null)
  assert.ok(rows.every(r => r.externalId.startsWith('weak:')))
  const weakKeys = new Set(rows.map(r => r.externalId))
  assert.equal(weakKeys.size, 7)
  assert.match(out.coverage.note, /基金账本/)
  assert.match(out.coverage.note, /费用口径/)
})
test('fund history weak externalId is stable across repeated fetches and distinct rows stay distinct', async () => {
  const history = { list: [fundMoneyRow(), fundMoneyRow({ entry_money: '2000', entry_count: '1240.24' }), fundMoneyRow({ op: '2', op_name: '现金分红', entry_money: '35.6', entry_count: '0', entry_price: '', fee_total: '' })], total: 3, max_page: 1 }
  const first = await fetchThsHistory({ portfolioId: '100108832246', thsBookType: 'ijj' }, secrets, { from: '2026-10-01', to: '2026-11-07' }, undefined, fundDeps({ history }))
  const second = await fetchThsHistory({ portfolioId: '100108832246', thsBookType: 'ijj' }, secrets, { from: '2026-10-01', to: '2026-11-07' }, undefined, fundDeps({ history }))
  assert.deepEqual(first.rows.map(r => r.externalId), second.rows.map(r => r.externalId))
  assert.equal(new Set(first.rows.map(r => r.externalId)).size, 3)
})
test('fund history for manFund books uses fundid param and account_type 4 keeps fund op map', async () => {
  const history = { list: [fundMoneyRow({ account_type: '4', op: '0', op_name: '申购' })], total: 1, max_page: 1 }
  const d = fundDeps({ history })
  const out = await fetchThsHistory({ portfolioId: '24507604', thsBookType: 'manFund' }, secrets, { from: '2026-10-01', to: '2026-11-07' }, undefined, d)
  const form = new URLSearchParams(d.calls.find(c => c.url.endsWith('get_money_history')).init.body)
  assert.equal(form.get('fundid'), '24507604'); assert.equal(form.get('custid'), '')
  assert.equal(out.rows[0].kind, 'buy'); assert.equal(out.rows[0].cashAmount, -1000)
})
