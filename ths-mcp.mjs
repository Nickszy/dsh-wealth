// 同花顺投资账本官方远程 MCP（https://tzzb.10jqka.com.cn/mcp）。
// 用 OAuth 2.1 授权码 + PKCE + 本机回环替换浏览器抓 Cookie。scope 固定 tools.read。
import { createHash, randomBytes } from 'node:crypto'
import { cashSignOf } from './model.mjs'
import { createMcpHttpClient } from './mcp-http.mjs'
import { normalizeSnapshot } from './snapshot-schema.mjs'

export const TZZB_MCP_ENDPOINT = 'https://tzzb.10jqka.com.cn/mcp'
export const TZZB_OAUTH_ORIGIN = 'https://tzzb.10jqka.com.cn'
export const TZZB_SCOPE = 'tools.read'

const fail = (message) => { throw new Error(message) }
const text = (value) => {
  if (value == null) return ''
  return String(value).trim()
}
const num = (value) => {
  if (value == null || value === '' || typeof value === 'boolean') return null
  const raw = String(value).replace(/,/g, '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
const pick = (row, fields) => {
  for (const field of fields) {
    if (row && row[field] !== null && row[field] !== undefined && row[field] !== '') return row[field]
  }
  return null
}
// 基金接口返回的是表格 {columns, rows}（不是对象数组）；也兼容直接给对象数组的形态。
function tableRows(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
  const columns = Array.isArray(value.columns) ? value.columns : null
  const rows = Array.isArray(value.rows) ? value.rows : null
  if (!columns || !rows) return []
  return rows.filter((row) => Array.isArray(row)).map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])))
}
const isFundTable = (value) => Array.isArray(value) || (value && typeof value === 'object' && Array.isArray(value.columns) && Array.isArray(value.rows))

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createTzzbPkce() {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge, method: 'S256' }
}

async function oauthJson(url, { method = 'POST', headers = {}, body, signal, deps = {} } = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch
  const response = await fetchImpl(url, { method, headers, body, signal, redirect: 'error' })
  const raw = await response.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = null }
  if (!response.ok) {
    const detail = data?.error_description || data?.error || ('HTTP ' + response.status)
    fail('同花顺授权失败：' + detail)
  }
  return data || {}
}

export async function registerTzzbClient({ redirectUri, signal, deps = {} } = {}) {
  if (!redirectUri) fail('同花顺授权缺少回调地址')
  // 注意：这台 Spring 授权服务不接受注册元数据里的 scope 字段
  //（"Invalid Client Registration: scope"）；scope 只在 authorize 请求里带。
  const data = await oauthJson(TZZB_OAUTH_ORIGIN + '/oauth2/register', {
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'dsh-wealth',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
    signal,
    deps,
  })
  if (!data.client_id) fail('同花顺授权注册没有返回 client_id')
  return { clientId: data.client_id }
}

export function buildTzzbAuthorizeUrl({ clientId, redirectUri, challenge, state } = {}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: TZZB_SCOPE,
    resource: TZZB_MCP_ENDPOINT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  if (state) params.set('state', String(state))
  return TZZB_OAUTH_ORIGIN + '/oauth2/authorize?' + params.toString()
}

async function tokenRequest(fields, signal, deps) {
  const data = await oauthJson(TZZB_OAUTH_ORIGIN + '/oauth2/token', {
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams(fields).toString(),
    signal,
    deps,
  })
  if (!data.access_token) fail('同花顺授权响应缺少 access_token')
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    clientId: fields.client_id,
    expiresIn: Number(data.expires_in) || null,
    scope: data.scope || TZZB_SCOPE,
  }
}

export async function exchangeTzzbCode({ code, clientId, redirectUri, verifier, signal, deps = {} } = {}) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    resource: TZZB_MCP_ENDPOINT,
  }, signal, deps)
}

export async function refreshTzzbToken({ refreshToken, clientId, signal, deps = {} } = {}) {
  if (!refreshToken || !clientId) fail('同花顺授权缺少 refresh token，无法自动续期')
  return tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    resource: TZZB_MCP_ENDPOINT,
  }, signal, deps)
}

function clientFor(secrets, signal, deps) {
  const token = text(secrets?.accessToken)
  if (!token) fail('同花顺投资账本未授权，请先点击一键授权')
  return createMcpHttpClient({
    endpoint: deps.endpoint || TZZB_MCP_ENDPOINT,
    headers: { authorization: 'Bearer ' + token },
    signal,
    deps,
  })
}

const BOOK_GROUPS = [
  ['fund_key', 'common'],
  ['manual_id', 'manual'],
  ['fund_id', 'manFund'],
  ['cust_id', 'ijj'],
]

export function bookArgs(source) {
  const id = text(source?.portfolioId)
  const type = text(source?.thsBookType) || 'common'
  const blank = { fundKey: '', rzrqFundKey: '', manualId: '', fundId: '', custId: '' }
  if (type === 'ijj') return { ...blank, custId: id }
  if (type === 'manFund') return { ...blank, fundId: id }
  if (type === 'manual') return { ...blank, manualId: id }
  return { ...blank, fundKey: id }
}

export async function listThsMcpAccounts(source, secrets, signal, deps = {}) {
  const client = clientFor(secrets, signal, deps)
  const data = await client.call('promptAccountSelection', { scope: 'all' })
  if (!data || typeof data !== 'object') fail('同花顺投资账本没有返回账户列表')
  const warnings = []
  const accounts = []
  const seen = new Set()
  // 同一个 id 会同时出现在多组里（实测：爱基金 id 既在 fund_id 也在 cust_id），
  // 按「爱基金 > 手工基金 > 手工股票 > 普通股票」保留一次，避免同一账本重复导入。
  const TYPE_PRIORITY = { ijj: 4, manFund: 3, manual: 2, common: 1 }
  const groups = [...BOOK_GROUPS].sort((a, b) => TYPE_PRIORITY[b[1]] - TYPE_PRIORITY[a[1]])
  for (const [group, thsType] of groups) {
    const rows = Array.isArray(data[group]) ? data[group] : []
    for (const row of rows) {
      const id = text(row?.id)
      if (!id || seen.has(id)) continue
      seen.add(id)
      accounts.push({
        id,
        name: text(row.name) || (thsType === 'ijj' ? '爱基金' : thsType === 'manFund' ? '基金账本' : '未命名账本'),
        thsType,
        currency: 'CNY',
      })
    }
  }
  if (Array.isArray(data.rzrq_fund_key) && data.rzrq_fund_key.length) warnings.push('融资融券账本未导入')
  return { accounts, warnings }
}

function marketOf(code) {
  if (/^\d{6}$/.test(code)) return 'CN'
  if (/^\d{4,5}$/.test(code)) return 'HK'
  return null
}

export async function fetchThsMcpSnapshot(source, secrets, signal, deps = {}) {
  const id = text(source?.portfolioId)
  if (!id) fail('请先明确选择同花顺账本')
  const type = text(source?.thsBookType) || 'common'
  const client = clientFor(secrets, signal, deps)
  const args = bookArgs(source)
  const warnings = []
  const now = (deps.now ?? (() => new Date()))().toISOString()
  if (type === 'manFund' || type === 'ijj') {
    const data = await client.call('queryFundAccount', { fundId: args.fundId, custId: args.custId })
    const account = data?.account && typeof data.account === 'object' ? data.account : {}
    // 基金持仓是表格 {columns, rows}：fundcount 份额、fundcost 总成本、fundvalue 市值。
    const parsed = isFundTable(data?.funds)
    if (!parsed) warnings.push('基金持仓格式异常，已按部分覆盖处理')
    const holdings = [], seen = new Set()
    for (const row of tableRows(data?.funds)) {
      const symbol = text(pick(row, ['fundcode', 'fundCode', 'code', 'symbol']))
      const qty = num(pick(row, ['fundcount', 'holdShare', 'share', 'holdQuantity']))
      if (!/^\d{6}$/.test(symbol) || qty === null || qty <= 0 || seen.has(symbol)) continue
      seen.add(symbol)
      const costTotal = num(pick(row, ['fundcost', 'costTotal']))
      const value = num(pick(row, ['fundvalue', 'marketValue', 'value']))
      const round6 = (n) => n === null ? null : Math.round(n * 1e6) / 1e6
      holdings.push({
        symbol,
        name: text(pick(row, ['fundname', 'fundName', 'name'])) || symbol,
        market: 'CN',
        assetClass: 'fund',
        currency: 'CNY',
        qty,
        avgCost: round6(costTotal === null ? null : costTotal / qty),
        manualPrice: round6(value === null ? null : value / qty),
        externalId: symbol,
      })
    }
    // 净值日期：旧接口取每行 date 的最大值，MCP 只有账户级 transDate（实测同一天）。
    const quoteDate = dayOf(account.transDate)
    const sourceTotals = {
      totalAsset: num(account.totalAsset),
      totalCost: num(account.totalCost),
      holdingProfit: num(account.nowProfit),
      // 账户级当日盈亏在基金账户里有现成字段（preProfit）；股票账本没有等价口径。
      ...(num(account.preProfit) !== null ? { dayProfit: num(account.preProfit) } : {}),
      quoteDate,
    }
    return normalizeSnapshot({
      holdings,
      coverage: { fund: parsed ? 'full' : 'partial' },
      warnings,
      queriedAt: now,
      uploadedAt: null,
      quoteDate,
      sourceTotals,
    })
  }
  const data = await client.call('queryStockPosition', { fundKey: args.fundKey, rzrqFundKey: '', manualId: args.manualId })
  const liability = num(data?.totalLiability)
  if (liability !== null && liability !== 0) fail('不支持融资融券账本')
  const holdings = []
  let holdingProfit = 0
  for (const row of Array.isArray(data?.holdings) ? data.holdings : []) {
    const symbol = text(row.stockCode)
    const market = marketOf(symbol)
    const qty = num(row.holdQuantity)
    if (!market || qty === null || qty < 0) continue
    const profit = num(row.holdProfit)
    if (profit !== null) holdingProfit += profit
    holdings.push({
      symbol,
      name: text(row.stockName) || symbol,
      market,
      assetClass: 'stock',
      currency: market === 'HK' ? 'HKD' : 'CNY',
      qty,
      avgCost: num(row.costPrice),
      manualPrice: num(row.currentPrice),
      externalId: market + ':' + symbol,
    })
  }
  const cash = num(data?.availableFunds)
  const sourceTotals = {
    cash,
    totalValue: num(data?.totalMarketValue),
    totalAsset: num(data?.totalAsset),
    totalLiability: liability,
    holdingProfit,
  }
  if (cash !== null) {
    holdings.push({ symbol: 'CASH:CNY', name: '人民币现金', market: 'CASH', assetClass: 'cash', currency: 'CNY', qty: cash, avgCost: 1, manualPrice: 1, externalId: 'cash:CNY' })
  }
  // 持仓接口不带上传时间；账户列表里的 lastSyncTime（北京时间）与旧接口 upload_time 同源。
  let uploadedAt = null
  try {
    const listed = await client.call('promptAccountSelection', { scope: 'all' })
    const group = type === 'manual' ? 'manual_id' : 'fund_key'
    const row = (Array.isArray(listed?.[group]) ? listed[group] : []).find((item) => text(item?.id) === id)
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(text(row?.lastSyncTime))
    if (match) uploadedAt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]) - 8, Number(match[5]), Number(match[6]))).toISOString()
  } catch { /* 上传时间只是展示用，取不到不影响快照 */ }
  return normalizeSnapshot({
    holdings,
    coverage: { stock: 'full', ...(cash !== null ? { cash: 'full' } : {}) },
    warnings,
    queriedAt: now,
    uploadedAt,
    quoteDate: null,
    sourceTotals,
  })
}

function kindOf(name) {
  const label = text(name)
  if (/分红再投|红利再投/.test(label)) return { kind: 'security_in', sign: 0 }
  if (/赎回/.test(label) || /卖出|卖/.test(label)) return { kind: 'sell', sign: 1 }
  if (/申购|定投|买入|买/.test(label)) return { kind: 'buy', sign: -1 }
  if (/分红|派息/.test(label)) return { kind: 'dividend', sign: 1 }
  if (/税/.test(label)) return { kind: 'tax', sign: -1 }
  if (/转入/.test(label)) return { kind: 'security_in', sign: 0 }
  if (/转出/.test(label)) return { kind: 'security_out', sign: 0 }
  return { kind: 'other', sign: null }
}

function dayOf(value) {
  const raw = text(value)
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  const dashed = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  const parts = compact || dashed
  if (!parts) return null
  return parts[1] + '-' + parts[2] + '-' + parts[3]
}

function monthsBetween(from, to) {
  const start = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1))
  const end = new Date(Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1))
  const months = []
  for (let cursor = start; cursor <= end && months.length < 36; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    months.push(cursor.toISOString().slice(0, 7))
  }
  return months
}

function historyRows(list) {
  const rows = []
  const warnings = []
  // queryMoneyHistory 偶尔会把同一条成交按完全相同的字段返回多次（实测 2026-11-11
  // 002242 多出两条 400@26.5）；旧接口按流水号去重，这里按经济字段折叠，与旧口径一致。
  const byKey = new Map()
  let collapsed = 0
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const date = dayOf(pick(row, ['entryDate', 'entry_date', 'date', 'confirmDate']))
    if (!date) continue
    const label = text(pick(row, ['opName', 'op_name', 'type', 'businessName']))
    const mapped = kindOf(label)
    const money = num(pick(row, ['entryMoney', 'entry_money', 'amount', 'money', 'transAmount']))
    const qty = num(pick(row, ['entryCount', 'entry_count', 'share', 'quantity', 'transCount']))
    const price = num(pick(row, ['entryPrice', 'entry_price', 'price', 'nav']))
    const fee = num(pick(row, ['feeTotal', 'fee_total', 'fee']))
    const symbol = text(pick(row, ['stockCode', 'code', 'fundCode', 'symbol']))
    const sign = mapped.sign === null ? cashSignOf(mapped.kind) : mapped.sign
    // 稳定键（不含页内序号）：同一笔流水跨同步、跨窗口去重都靠它。
    const key = 'ths-mcp:' + [date, label, symbol, money ?? '', qty ?? '', price ?? '', fee ?? ''].join('|')
    if (byKey.has(key)) { collapsed += 1; continue }
    byKey.set(key, {
      date,
      time: null,
      kind: mapped.kind,
      originalType: label || null,
      symbol: symbol || null,
      name: text(pick(row, ['stockName', 'name', 'fundName'])) || null,
      market: marketOf(symbol),
      currency: 'CNY',
      qty: qty !== null && qty > 0 ? qty : null,
      price: price !== null && price > 0 ? price : null,
      grossAmount: null,
      cashAmount: sign === 0 ? 0 : typeof sign === 'number' && money !== null ? sign * money : null,
      fee: fee !== null && fee >= 0 ? fee : null,
      externalId: key,
      note: text(row.remark) || null,
    })
    if (mapped.kind === 'other') warnings.push('同花顺返回了未识别的流水类型，已按其他类型保留')
  }
  if (collapsed > 0) warnings.push('同花顺返回了 ' + collapsed + ' 条完全重复的流水，已合并（与旧接口去重口径一致）')
  return { rows: [...byKey.values()], warnings }
}

export async function fetchThsMcpHistory(source, secrets, range, signal, deps = {}) {
  const id = text(source?.portfolioId)
  if (!id) fail('请先明确选择同花顺账本')
  const from = text(range?.from)
  const to = text(range?.to)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) fail('流水日期范围无效')
  const type = text(source?.thsBookType) || 'common'
  const client = clientFor(secrets, signal, deps)
  const args = bookArgs(source)
  let list = []
  if (type === 'manFund' || type === 'ijj') {
    const data = await client.call('queryFundSummaryHistory', {
      monthList: monthsBetween(from, to).join(','),
      fundId: args.fundId,
      custId: args.custId,
    })
    // 基金流水是「每月一个 {month, list:{columns, rows}}」，展开成行。
    const months = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    for (const month of months) {
      if (!month || typeof month !== 'object') continue
      list = list.concat(tableRows(month.list || month.data || month))
    }
  } else {
    for (let page = 1; page <= 200; page++) {
      const data = await client.call('queryMoneyHistory', {
        page: String(page),
        count: '200',
        startDate: from.replaceAll('-', ''),
        endDate: to.replaceAll('-', ''),
        fundKey: args.fundKey,
        rzrqFundKey: '',
        manualId: args.manualId,
      })
      const chunk = Array.isArray(data?.list) ? data.list : []
      list = list.concat(chunk)
      const maxPage = Number(data?.maxPage ?? data?.max_page ?? 0)
      if (!chunk.length || (Number.isFinite(maxPage) && maxPage > 0 && page >= maxPage)) break
    }
  }
  const built = historyRows(list.filter((row) => {
    const date = dayOf(pick(row, ['entryDate', 'entry_date', 'date', 'confirmDate']))
    return date && date >= from && date <= to
  }))
  built.rows.sort((a, b) => (a.date + (a.externalId)).localeCompare(b.date + b.externalId))
  return {
    rows: built.rows,
    errors: [],
    warnings: [...new Set(built.warnings)].map((message) => ({ message })),
    coverage: {
      complete: false,
      note: '已通过同花顺投资账本 MCP 读取 ' + from + ' 至 ' + to + ' 的流水。银证转账如未出现在流水里，仍可用「回扫」或券商导出补录。',
    },
  }
}
