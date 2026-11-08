import { normalizeSnapshot } from './connectors.mjs'

// Endpoint/form contracts and v3 cookie encoding adapted from dsh-ths-holdings
// (MIT); see THS-NOTICE.txt. This module has no DSH or plugin runtime imports.
const BASE = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
export class ThsError extends Error {
  constructor(code, message) { super(message); this.name = 'ThsError'; this.code = code }
}
const fail = (code, message) => { throw new ThsError(code, message) }
const record = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail('INVALID_RESPONSE', '同花顺账本响应格式异常，请稍后重试')
  return v
}
const scalar = (v) => typeof v === 'string' || typeof v === 'number' ? String(v) : ''
export function normalizeThsCookie(value) {
  if (typeof value !== 'string' || value.length > 65536 || /[\r\n\0]/.test(value)) fail('AUTH_REQUIRED', '请登录同花顺，或手动填写有效 Cookie')
  return value.split(';').map(v => v.replace(/\s+/g, '')).filter(Boolean).join('; ')
}
export function thsCookieIdentity(value, explicitUser) {
  const cookie = normalizeThsCookie(value)
  const fields = new Map(cookie.split('; ').map(part => { const i = part.indexOf('='); return [part.slice(0, i), part.slice(i + 1)] }))
  const cookieUser = fields.get('userid')
  const user = scalar(explicitUser || cookieUser).trim()
  if (!cookie || !user || /^(?:0|null|undefined|false|guest)$/i.test(user) || !/^[A-Za-z0-9_-]{1,128}$/.test(user)) fail('AUTH_REQUIRED', '同花顺登录缺少有效用户标识，请重新登录')
  if (cookieUser && explicitUser && user !== cookieUser) fail('AUTH_REQUIRED', '同花顺用户标识不一致，请重新登录')
  return { cookie, user }
}
function decimal(value) {
  if (value == null || value === '') return null
  const text = scalar(value).trim()
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text) || text.length > 80 || !Number.isFinite(Number(text))) fail('INVALID_RESPONSE', '同花顺账本包含无效数值')
  return Number(text)
}
const checksum = bytes => { let n = 0; for (const b of bytes) n = (n << 5) - n + b; return n & 255 }
// Only updates a validated existing public v3 timestamp/counter; never creates identity.
export function createThsVTokenRefresher(now = Date.now) {
  const counters = new Map()
  return cookie => {
    const matches = [...cookie.matchAll(/(?:^|;\s*)v=([^;]*)/g)]
    if (matches.length !== 1 || !/^[A-Za-z0-9_-]{60}$/.test(matches[0][1])) return cookie
    const token = matches[0][1], bytes = Buffer.from(token, 'base64url')
    if (bytes.length !== 45 || bytes[0] !== 3) return cookie
    const payload = Buffer.alloc(43)
    let state = bytes[1]
    for (let i = 0; i < 43; i++) { payload[i] = bytes[i + 2] ^ (state & 255); state = ~(state * 131) }
    if (payload[42] !== 3 || checksum(payload) !== bytes[1]) return cookie
    const seconds = Math.floor(now() / 1000)
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 4294967295) return cookie
    const count = ((counters.get(token) ?? payload.readUInt16BE(40)) + 1) & 65535
    if (counters.size >= 32) counters.delete(counters.keys().next().value)
    counters.set(token, count)
    payload.writeUInt32BE(seconds, 8); payload.writeUInt16BE(count, 40)
    bytes[1] = state = checksum(payload)
    for (let i = 0; i < 43; i++) { bytes[i + 2] = payload[i] ^ (state & 255); state = ~(state * 131) }
    return cookie.replace(/((?:^|;\s*)v=)[^;]*/, (_, prefix) => prefix + bytes.toString('base64url'))
  }
}
function session(source, secrets, signal, deps) {
  const identity = thsCookieIdentity(secrets?.cookie, secrets?.userId ?? secrets?.user_id)
  const deadline = AbortSignal.timeout(deps.timeoutMs ?? 15000)
  const timed = signal ? AbortSignal.any([signal, deadline]) : deadline
  const refresh = createThsVTokenRefresher(deps.nowMs)
  const check = () => { if (timed.aborted) fail('CANCELLED', '同花顺查询超时或已取消') }
  return async (path, extra = {}) => {
    check()
    let response
    try {
      response = await (deps.fetch ?? globalThis.fetch)(BASE + path, {
        method: 'POST', redirect: 'manual', signal: timed,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, text/plain, */*', 'Accept-Language': 'zh-CN,zh;q=0.9', Referer: 'https://tzzb.10jqka.com.cn/pc/index.html', 'User-Agent': UA, Cookie: refresh(identity.cookie) },
        body: new URLSearchParams({ terminal: '1', version: '0.0.0', userid: identity.user, user_id: identity.user, ...extra }).toString(),
      })
    } catch { check(); fail('NETWORK_ERROR', '同花顺账本暂时无法连接，请稍后重试') }
    check()
    if (response.status === 401) fail('AUTH_REQUIRED', '同花顺登录已失效，请重新登录或更新 Cookie')
    if (response.status >= 300 && response.status < 400) fail('REDIRECT_REFUSED', '同花顺请求发生重定向，请重新登录后重试')
    if (!response.ok) fail('HTTP_ERROR', '同花顺请求失败（HTTP ' + response.status + '），请稍后重试或更新插件')
    let body
    try { body = record(await response.json()) } catch { check(); fail('INVALID_RESPONSE', '同花顺账本响应格式异常，请稍后重试') }
    check()
    if (String(body.error_code) !== '0') fail('API_REJECTED', '同花顺拒绝请求，请重新登录并检查账本设置')
    return record(body.ex_data)
  }
}
async function accounts(post) {
  const data = record(await post('pc/account/v1/account_list'))
  const rows = Array.isArray(data.common) ? data.common : fail('INVALID_RESPONSE', '同花顺账本列表不完整')
  const ids = new Set()
  const stock = rows.map(raw => {
    const row = record(raw), id = scalar(row.fund_key).trim()
    if (!id || ids.has(id)) fail('INVALID_RESPONSE', '同花顺账本标识缺失或重复')
    ids.add(id)
    return { id, name: scalar(row.manualname).trim() || '未命名账本', thsType: 'common', ...(row.brokername ? { broker: scalar(row.brokername) } : {}), currency: 'CNY' }
  })
  // 基金账本（爱基金 ijj / 手动基金 manFund）与股票账本共用登录，同一列表返回。
  const fundRows = Array.isArray(data.fund) ? data.fund : []
  const fund = fundRows.map(raw => {
    const row = record(raw), id = scalar(row.fundId).trim(), type = scalar(row.type).trim()
    if (!id || ids.has(id)) fail('INVALID_RESPONSE', '同花顺基金账本标识缺失或重复')
    if (type !== 'ijj' && type !== 'manFund') return null
    ids.add(id)
    return { id, name: scalar(row.fundname).trim() || (type === 'ijj' ? '爱基金' : '基金账本'), thsType: type, currency: 'CNY' }
  }).filter(Boolean)
  return [...stock, ...fund]
}
export async function listThsAccounts(source, secrets, signal, deps = {}) {
  return { accounts: await accounts(session(source, secrets, signal, deps)), warnings: [] }
}
const thsBookType = source => {
  const t = scalar(source?.thsBookType).trim()
  return ['common', 'manFund', 'ijj'].includes(t) ? t : 'common'
}
export async function fetchStandaloneThsSnapshot(source, secrets, signal, deps = {}) {
  const id = typeof source?.portfolioId === 'string' ? source.portfolioId.trim() : ''
  if (!id) fail('PORTFOLIO_REQUIRED', '请先明确选择同花顺账本')
  const post = session(source, secrets, signal, deps)
  if (thsBookType(source) !== 'common') return fundSnapshot(post, source, id, deps)
  const list = await accounts(post)
  if (!list.some(row => row.id === id && row.thsType === 'common')) fail('PORTFOLIO_NOT_FOUND', '指定同花顺账本不属于当前登录用户，请重新选择')
  const data = await post('pc/asset/v1/stock_position', { manual_id: '', fund_key: id, rzrq_fund_key: '', is_merge: '0' })
  if (!Array.isArray(data.position)) fail('INVALID_RESPONSE', '同花顺持仓数据不完整，已保留现有持仓')
  if (data.currency !== undefined && !['CNY', 'RMB', '156'].includes(scalar(data.currency))) fail('UNSUPPORTED_ACCOUNT', '仅支持人民币沪深股票及 ETF 普通账本')
  const warnings = [], sourceTotals = {}, holdings = [], seen = new Set()
  let complete = true
  const missing = warning => { complete = false; warnings.push(warning) }
  for (const [canonical, native] of [['cash', 'money_remain'], ['totalValue', 'total_value'], ['totalAsset', 'total_asset'], ['totalLiability', 'total_liability'], ['investedPct', 'position_rate']]) {
    const n = decimal(data[native])
    sourceTotals[canonical] = n === null ? null : canonical === 'investedPct' ? n * 100 : n
    if (n === null) missing('MISSING_ASSET_FIELD:' + canonical)
    if (n !== null && n < 0) fail('UNSUPPORTED_ACCOUNT', '不支持负资产或融资融券账本')
  }
  if (sourceTotals.totalLiability !== null && sourceTotals.totalLiability !== 0) fail('UNSUPPORTED_ACCOUNT', '仅支持无融资负债的普通账本')
  let holdingProfit = 0, dayProfit = 0
  for (const raw of data.position) {
    const row = record(raw), symbol = scalar(row.code), market = scalar(row.market)
    const skip = warning => { complete = false; warnings.push(warning) }
    // 港股通（market 15，5 位港股代码）：最新价与成本价是港币（A股行 value=数量×价格，
    // 港股行 value=数量×价格×汇率，即折算后的人民币），统一按港股 HKD 导入；value 列
    // 与 qty×price 不同币种，不参与逐行对账，人民币估值交给账本的 HKD 汇率。
    const hkConnect = market === '15' && /^\d{4,5}$/.test(symbol)
    if (!hkConnect && !(market === '1' ? /^[013]\d{5}$/.test(symbol) : market === '2' && /^[56]\d{5}$/.test(symbol))) {
      skip('THS_POSITION_SKIPPED:UNSUPPORTED_MARKET:' + market + ':' + symbol)
      continue
    }
    const key = `${market}:${symbol}`
    if (seen.has(key)) fail('INVALID_RESPONSE', '同花顺持仓证券重复')
    seen.add(key)
    const qty = decimal(row.count), avgCost = decimal(row.cost), manualPrice = decimal(row.price), value = decimal(row.value)
    // 摊薄成本可以为负（分红总额超过投入成本）；数量、现价、市值为负才不可用。
    if (qty !== null && qty < 0) { skip('THS_POSITION_SKIPPED:NEGATIVE_QTY:' + market + ':' + symbol); continue }
    if ((manualPrice !== null && manualPrice < 0) || (value !== null && value < 0)) { skip('THS_POSITION_SKIPPED:NEGATIVE_VALUE:' + market + ':' + symbol); continue }
    const hp = decimal(row.hold_profit), dp = decimal(row.pre_profit)
    holdingProfit = holdingProfit === null || hp === null ? null : holdingProfit + hp
    dayProfit = dayProfit === null || dp === null ? null : dayProfit + dp
    if (qty === null || avgCost === null) { missing('MISSING_POSITION_FIELDS:' + key); continue }
    if (manualPrice === null || value === null) missing('MISSING_POSITION_VALUE:' + key)
    else if (!hkConnect && Math.abs(qty * manualPrice - value) > 0.011) missing('POSITION_VALUE_MISMATCH:' + key)
    holdings.push({
      symbol, name: scalar(row.name).trim() || symbol, market: hkConnect ? 'HK' : 'CN',
      assetClass: hkConnect || !/^(?:5[168]|15)/.test(symbol) ? 'stock' : 'etf',
      currency: hkConnect ? 'HKD' : 'CNY',
      qty, avgCost, manualPrice, externalId: key,
    })
  }
  sourceTotals.holdingProfit = holdingProfit; sourceTotals.dayProfit = dayProfit
  if (sourceTotals.cash !== null) holdings.push({ symbol: 'CASH:CNY', name: '人民币现金', market: 'CASH', assetClass: 'cash', currency: 'CNY', qty: sourceTotals.cash, avgCost: 1, manualPrice: 1, externalId: 'cash:CNY' })
  const values = data.position.map(row => decimal(row.value))
  if (values.every(v => v !== null)) {
    const sum = values.reduce((a, b) => a + b, 0)
    if (sourceTotals.totalValue !== null && Math.abs(sum - sourceTotals.totalValue) > 0.011) missing('TOTAL_VALUE_MISMATCH')
    if (sourceTotals.cash !== null && sourceTotals.totalAsset !== null && Math.abs(sum + sourceTotals.cash - sourceTotals.totalAsset) > 0.011) missing('TOTAL_ASSET_MISMATCH')
  }
  const uploaded = scalar(data.upload_time)
  const uploadedAt = /^\d{13}$/.test(uploaded) && Number.isFinite(new Date(Number(uploaded)).getTime()) ? new Date(Number(uploaded)).toISOString() : null
  if (!uploadedAt) warnings.push('UPLOAD_TIME_UNAVAILABLE')
  return normalizeSnapshot({ holdings, complete, warnings, queriedAt: (deps.now ?? (() => new Date()))().toISOString(), uploadedAt, quoteDate: null, sourceTotals })
}

// 基金账本快照（fund/v1/merge_fund）：爱基金 ijj 用 custid，手动基金 manFund 用 fundid。
async function fundSnapshot(post, source, id, deps) {
  const type = thsBookType(source)
  const list = await accounts(post)
  const book = list.find(row => row.thsType === type && row.id === id)
  if (!book) fail('PORTFOLIO_NOT_FOUND', '指定同花顺基金账本不属于当前登录用户，请重新选择')
  // 2026-11 起服务端强制要求 from_id 在位（任意值均可，空串即可），缺失时直接 HTTP 400。
  const params = type === 'ijj' ? { custid: id, fundid: '', from_id: '' } : { custid: '', fundid: id, from_id: '' }
  const data = record(await post('fund/v1/merge_fund', params))
  const account = record(data.account)
  const warnings = [], sourceTotals = {}, holdings = [], seen = new Set()
  let complete = true
  const missing = warning => { complete = false; warnings.push(warning) }
  const totalAsset = decimal(account.total_asset), totalCost = decimal(account.total_cost)
  sourceTotals.totalAsset = totalAsset
  sourceTotals.totalCost = totalCost
  // 券商口径的持有盈亏（爱基金 now_profit），与股票账本逐行 hold_profit 汇总同义。
  const holdingProfit = decimal(account.now_profit)
  if (holdingProfit !== null) sourceTotals.holdingProfit = holdingProfit
  if (totalAsset === null) missing('MISSING_ASSET_FIELD:totalAsset')
  const groups = [['fund', 'fund'], ['currencyfund', 'cash']]
  for (const [key] of groups) {
    const rows = Array.isArray(data[key]) ? data[key] : fail('INVALID_RESPONSE', '同花顺基金账本持仓数据不完整，已保留现有持仓')
    for (const raw of rows) {
      const row = record(raw)
      const symbol = scalar(row.fundcode).trim()
      if (!/^\d{6}$/.test(symbol)) { missing('INVALID_FUND_CODE:' + symbol); continue }
      if (seen.has(symbol)) fail('INVALID_RESPONSE', '同花顺基金持仓重复')
      seen.add(symbol)
      const qty = decimal(row.fundcount), costTotal = decimal(row.fundcost), manualPrice = decimal(row.fundnav), value = decimal(row.fundvalue)
      // 摊薄成本可以为负（分红超过投入）；净值或市值为负的行跳过并标记不完整。
      if ((manualPrice !== null && manualPrice < 0) || (value !== null && value < 0)) { missing('THS_FUND_SKIPPED:negative_value:' + symbol); continue }
      if (qty === null || qty <= 0 || costTotal === null) { missing('MISSING_FUND_FIELDS:' + symbol); continue }
      const percost = decimal(row.percost)
      const avgCost = percost !== null && percost > 0 ? percost : Math.round((costTotal / qty) * 1e6) / 1e6
      const quoteDate = thsDay(scalar(row.date).trim(), '净值日期')
      if (quoteDate && (sourceTotals.quoteDate === undefined || quoteDate > sourceTotals.quoteDate)) sourceTotals.quoteDate = quoteDate
      holdings.push({ symbol, name: scalar(row.fundname).trim() || symbol, market: 'CN', assetClass: 'fund', currency: 'CNY', qty, avgCost, manualPrice, externalId: symbol })
      if (manualPrice === null || value === null) missing('MISSING_FUND_VALUE:' + symbol)
      else if (Math.abs(qty * manualPrice - value) > 0.011) missing('FUND_VALUE_MISMATCH:' + symbol)
    }
  }
  for (const key of ['onwayfund', 'clearfund']) {
    if (Array.isArray(data[key]) && data[key].length) warnings.push('THS_FUND_SKIPPED:' + key + ':' + data[key].length)
  }
  sourceTotals.quoteDate = sourceTotals.quoteDate || scalar(account.trans_date).trim() || null
  return normalizeSnapshot({ holdings, complete, warnings, queriedAt: (deps.now ?? (() => new Date()))().toISOString(), uploadedAt: null, quoteDate: sourceTotals.quoteDate, sourceTotals })
}

// 同花顺投资账本「资金流水」接口（get_money_history）。与持仓接口共用登录会话，
// 返回全部原始字符串字段；这里只做读取与规范化，不推断文件之外的任何金额。
// kind 枚举与现金方向沿用标准模型（model.mjs FLOW_KINDS），不在本文件另行定义。
import { cashSignOf, isFlowKind } from './model.mjs'
const KIND_BY_OP = new Map([
  ['1', 'buy'], ['2', 'sell'], ['5', 'repo_open'], ['35', 'repo_close'],
  ['6', 'dividend'], ['95', 'tax'], ['222', 'security_in'], ['235', 'security_in'], ['236', 'security_out'], ['16', 'security_in'],
])
// 现金流方向只由业务类型决定：entry_money 恒为正数金额，不代表方向。
const CASH_SIGN_BY_OP = new Map([['1', -1], ['5', -1], ['235', -1], ['2', 1], ['35', 1], ['236', 1], ['6', 1], ['95', -1], ['222', 0], ['16', 0]])
// 基金账本流水（account_type '4' 手动基金 / '5' 爱基金）：0 申购 1 定投 2 现金分红
// 3 分红再投（红利转份额，现金中性、份额增加）4 赎回 10 转入 11 转出 100 修改持仓。
// 转入/转出为基金转换的两条腿，现金中性记 0；修改持仓为手动修正，现金未知记 null。
const FUND_KIND_BY_OP = new Map([
  ['0', { kind: 'buy', sign: -1 }], ['1', { kind: 'buy', sign: -1 }],
  ['2', { kind: 'dividend', sign: 1 }], ['3', { kind: 'security_in', sign: 0 }],
  ['4', { kind: 'sell', sign: 1 }],
  ['10', { kind: 'security_in', sign: 0 }], ['11', { kind: 'security_out', sign: 0 }],
  ['100', { kind: 'other', sign: null }],
])
// Assert at module load that every mapped kind exists in the canonical registry.
for (const kind of [...KIND_BY_OP.values(), ...FUND_KIND_BY_OP.values().map(v => v.kind)]) {
  if (!isFlowKind(kind)) fail('INVALID_RESPONSE', '流水类型 ' + kind + ' 不在标准模型枚举中')
}
const thsDay = (value, label = '流水日期') => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null
  if (!d || d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) fail('INVALID_RESPONSE', label + '无效，请检查后重试')
  return value
}
export async function fetchThsHistory(source, secrets, range, signal, deps = {}) {
  const id = typeof source?.portfolioId === 'string' ? source.portfolioId.trim() : ''
  if (!id) fail('PORTFOLIO_REQUIRED', '请先明确选择同花顺账本')
  const bookType = thsBookType(source)
  const from = thsDay(range?.from, '开始日期'), to = thsDay(range?.to, '结束日期')
  if (from > to) fail('INVALID_RESPONSE', '开始日期不能晚于结束日期')
  const post = session(source, secrets, signal, deps)
  const rows = new Map(), warnings = []
  const multiplicity = new Map()
  const idParams = bookType === 'ijj' ? { fund_key: '', fundid: '', custid: id }
    : bookType === 'manFund' ? { fund_key: '', fundid: id, custid: '' }
    : { fund_key: id, fundid: '', custid: '' }
  for (let page = 1; page <= 200; page++) {
    const data = await post('pc/account/v2/get_money_history', {
      manual_id: '', rzrq_fund_key: '', ...idParams,
      start_date: from.replaceAll('-', ''), end_date: to.replaceAll('-', ''),
      query_list: '[]', page: String(page), count: '200', sort_type: '', sort_order: '1', h5id: String(Date.now()),
    })
    const list = Array.isArray(data?.list) ? data.list : fail('INVALID_RESPONSE', '同花顺流水数据不完整，请稍后重试')
    for (const raw of list) {
      const row = record(raw)
      const kindBase = scalar(row.account_type).trim() === '1' ? KIND_BY_OP : FUND_KIND_BY_OP
      const op = scalar(row.op)
      const mapped = kindBase.get(op)
      const kind = typeof mapped === 'string' ? mapped : mapped?.kind || 'other'
      if (!kindBase.has(op)) warnings.push('UNKNOWN_OP:' + op + ':' + (scalar(row.op_name) || ''))
      const money = decimal(row.entry_money)
      // 金额为负才是错账；空金额（送股、转增等不涉及资金的业务）保留记录，现金记为未知或 0。
      if (money !== null && money < 0) fail('INVALID_RESPONSE', '同花顺流水金额无效，已停止导入以避免错账')
      const qty = decimal(row.entry_count), price = decimal(row.entry_price)
      const fee = decimal(row.fee_total)
      const sign = typeof mapped === 'string' ? CASH_SIGN_BY_OP.get(op) : mapped?.sign
      // The canonical registry is the direction authority; the local map must agree.
      const canonicalSign = cashSignOf(kind)
      const effectiveSign = typeof sign === 'number' ? sign : canonicalSign === 0 || canonicalSign === null ? sign : canonicalSign
      // 基金账本流水没有 vid/trans_no 唯一编号：用弱键（经济字段+出现次数）生成稳定去重 ID。
      let externalId = scalar(row.vid).trim()
      if (!externalId) {
        const weak = [scalar(row.entry_date).trim(), op, scalar(row.code).trim(), money ?? '', qty ?? '', price ?? '', fee ?? ''].join('|')
        const n = (multiplicity.get(weak) || 0) + 1
        multiplicity.set(weak, n)
        externalId = `weak:${weak}#${n}`
      }
      rows.set(externalId, {
        date: thsDay(scalar(row.entry_date).trim(), '流水日期'),
        time: /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(scalar(row.entry_time)) ? scalar(row.entry_time) : null,
        kind, originalType: scalar(row.op_name).trim() || null,
        symbol: scalar(row.code).trim() || null,
        name: scalar(row.name).trim() || null,
        // 港股通（market_code 15）的成交也是人民币交收；市场标注仅用于展示。
        market: scalar(row.market_code).trim() === '15' ? 'HK' : scalar(row.code).trim() ? 'CN' : null,
        currency: 'CNY',
        qty: qty !== null && qty > 0 ? qty : null,
        price: price !== null && price > 0 ? price : null,
        grossAmount: null,
        cashAmount: effectiveSign === 0 ? 0 : typeof effectiveSign === 'number' && money !== null ? effectiveSign * money : null,
        fee: fee !== null && fee > 0 ? fee : fee === 0 ? 0 : null,
        externalId,
        note: [scalar(row.trans_no).trim() ? 'trans_no=' + scalar(row.trans_no).trim() : '', scalar(row.remark).trim() || ''].filter(Boolean).join('; ') || null,
      })
      if (money === null && effectiveSign !== 0) warnings.push('MISSING_AMOUNT:' + scalar(row.entry_date) + ' ' + (scalar(row.op_name) || op))
      if (rows.size > 25000) fail('INVALID_RESPONSE', '同花顺流水超过 25000 条，请缩小日期范围')
    }
    const total = Number(data?.total)
    if (!Number.isFinite(total) || page >= Number(data?.max_page || 0) || list.length === 0) break
  }
  return {
    rows: [...rows.values()].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`) || a.externalId.localeCompare(b.externalId)),
    errors: [],
    warnings: [...new Set(warnings)].map(w => ({ message: w.startsWith('MISSING_AMOUNT:') ? '同花顺流水缺少金额，已保留记录、现金记为未知：' + w.slice(15) : '同花顺返回了未识别的流水类型，已按其他类型保留：' + w })),
    coverage: {
      complete: false,
      note: bookType === 'common'
        ? `已读取同花顺投资账本 ${from} 至 ${to} 的资金流水；该接口只含交易与费税（2026-11 实测业务类型全集：买卖、回购、派息、缴税、入账、配股对价），不含银证转账等银行侧记录，可用券商导出文件补充。`
        : `已读取同花顺基金账本 ${from} 至 ${to} 的申购、定投、赎回、分红与转入转出记录；银行侧资金进出不在该接口内。费用口径以流水标注为准。`,
    },
  }
}
