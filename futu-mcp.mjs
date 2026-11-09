// Futu (富途) official MCP adapter (Streamable HTTP). Read-only: positions + funds
// (balance) + fills/cash-flow history. Docs: https://open.futunn.com/zh-cn/mcp-docs/quick-start
// - Service: https://mcp.futunn.com/mcp (OAuth 2.1 Bearer token required)
// - OAuth: dynamic client registration + PKCE (S256) + loopback redirect. Access
//   tokens last ~2 hours; the refresh token must be stored and used by the client.
//   Scopes needed here: `trade:read` (持仓/资产/历史订单) and `quote:read` (行情).
import { createHash, randomBytes } from 'node:crypto'
import { cashSignOf, isFlowKind, marketCurrency } from './model.mjs'
import { withFutu } from './brokers-sdk.mjs'

const DEFAULT_ENDPOINT = 'https://mcp.futunn.com'
const PROTOCOL_VERSION = '2025-11-25'
const CLIENT_NAME = 'dsh-wealth'
const CLIENT_VERSION = '0.8.0'
const SCOPES = 'quote:read trade:read'
const AUTHORIZE_URL = 'https://webapi.futunn.com/oauth2/authorize/confirm'
const TOKEN_URL = 'https://webapi.futunn.com/oauth2/token'
const REGISTER_URL = 'https://webapi.futunn.com/oauth2/register'
const fail = (message) => { throw new Error(message) }

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} is required`)
  return value.trim()
}
function numeric(value, field, { signed = false, positive = false } = {}) {
  // Futu cash logs format amounts like "+4,000.00" / "-8,029.74".
  if (typeof value === 'string' && /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/.test(value.trim())) value = value.trim().replace(/,/g, '')
  if (typeof value === 'string') value = value.trim()
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value))) fail(`${field} is unknown or invalid`)
  const n = Number(value)
  if (!Number.isFinite(n)) fail(`${field} is not finite`)
  if (!signed && n < 0) fail(`${field} is negative`)
  if (positive && !(n > 0)) fail(`${field} must be positive`)
  return n
}
function money(value, field, opts) {
  if (value == null || value === '') return null
  if (typeof value === 'object') {
    if (typeof value.toString === 'function') value = value.toString()
    else fail(`${field} is invalid`)
  }
  return numeric(value, field, opts)
}
function currency(value, field = 'currency') {
  const c = text(value, field).toUpperCase()
  if (!/^[A-Z]{3}$/.test(c)) fail(`${field} must be a three-letter currency`)
  return c
}
function day(value, field) {
  const d = /^\d{4}-\d{2}-\d{2}$/.exec(String(value || ''))
  if (!d || new Date(d[0] + 'T00:00:00Z').toISOString().slice(0, 10) !== d[0]) fail(`${field} must be a valid YYYY-MM-DD date`)
  return d[0]
}
function fromMicros(value, field) {
  // Futu timestamps are int64 microseconds since the Unix epoch (UTC).
  const us = numeric(value, field, { signed: true })
  if (us <= 0) fail(`${field} must be a positive microsecond timestamp`)
  const iso = new Date(Math.round(us / 1000)).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
}
function parseCashTime(value, field) {
  // account_cash_logs.created_time is "MM/DD/YYYY HH:MM:SS" (local exchange time).
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(String(value || '').trim())
  if (!m) fail(`${field} is not a valid timestamp`)
  return { date: `${m[3]}-${m[1]}-${m[2]}`, time: `${m[4]}:${m[5]}:${m[6]}` }
}
function array(value, field) { if (!Array.isArray(value)) fail(`${field} must be an array`); return value }

// Futu code is "MARKET.CODE" e.g. US.AAPL / HK.00700 / SH.600000.
const FUTU_MARKET = { HK: 'HK', US: 'US', SH: 'CN', SZ: 'CN', SG: 'SG', CA: 'OTHER', JP: 'OTHER', AU: 'OTHER', MY: 'OTHER', KR: 'OTHER' }
function futuSymbol(raw, field = 'code') {
  const full = text(raw, field).toUpperCase()
  const match = /^([A-Z]{2})\.(.+)$/.exec(full)
  if (!match) fail(`富途 MCP 返回了无法识别的标的代码：${full}`)
  const market = FUTU_MARKET[match[1]]
  if (!market) fail(`富途 MCP 返回了暂不支持的市场：${full}`)
  return { symbol: full, market }
}
function canonical(row) {
  if (!isFlowKind(row.kind)) fail(`富途 MCP returned an unmapped flow kind: ${row.kind}`)
  return {
    date: row.date, time: row.time || null, kind: row.kind, originalType: row.originalType || null,
    symbol: row.symbol || null, name: row.name || null, market: row.market || null, currency: row.currency,
    qty: row.qty ?? null, price: row.price ?? null, grossAmount: null,
    cashAmount: row.cashAmount ?? null, fee: row.fee ?? null, externalId: row.externalId ?? null, note: row.note || null,
  }
}
function dedupe(rows) {
  const seen = new Map()
  for (const row of rows) {
    const key = JSON.stringify([row.date, row.time, row.kind, row.symbol, row.currency, row.qty, row.price, row.cashAmount, row.fee, row.externalId])
    if (!seen.has(key)) seen.set(key, row)
  }
  return [...seen.values()].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')) || String(a.externalId).localeCompare(String(b.externalId)))
}

export const FUTU_MCP_DEFAULT_ENDPOINT = DEFAULT_ENDPOINT

function normalizeBase(endpoint) {
  return text(endpoint || DEFAULT_ENDPOINT, 'Futu MCP endpoint').replace(/\/+$/, '').replace(/\/mcp$/, '')
}

/** Minimal MCP Streamable HTTP client: initialize, notifications/initialized, tools/call. */
export function createFutuMcp({ secrets = {}, endpoint, signal, deps = {} } = {}) {
  const base = normalizeBase(endpoint)
  if (base.endsWith('/agent')) fail('富途 MCP 不支持 /agent 授权码端点，请使用浏览器 OAuth 授权')
  let token = text(secrets.mcpToken, 'Futu MCP token (mcpToken)')
  const fetchImpl = deps.fetch || globalThis.fetch
  // Real Futu MCP calls routinely take 5–20s; allow headroom and retry read-only calls on timeout/network errors.
  const timeoutMs = deps.timeoutMs ?? 90000
  const retries = deps.retries ?? 2
  let sessionId = null, initialized = false, seq = 0
  const guard = () => { if (signal?.aborted) throw signal.reason ?? new Error('Futu MCP aborted') }

  async function rpc(method, params, { auth = true, timeout = timeoutMs } = {}) {
    guard(); seq++; const id = seq
    const body = { jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': PROTOCOL_VERSION }
    if (auth && token) headers.authorization = 'Bearer ' + token
    if (sessionId) headers['mcp-session-id'] = sessionId
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('富途 MCP 请求超时')), timeout)
    const onAbort = () => controller.abort(signal.reason ?? new Error('Futu MCP aborted'))
    signal?.addEventListener('abort', onAbort, { once: true })
    let response
    try {
      guard()
      response = await fetchImpl(base + '/mcp', { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal, redirect: 'error' })
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) fail('富途 MCP 请求超时')
      throw error
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
    const sid = response.headers.get('mcp-session-id'); if (sid) sessionId = sid
    if (response.status === 401) fail('富途 MCP 授权已失效或未授权，请重新进行浏览器授权')
    if (response.status === 403) fail('富途 MCP 拒绝访问：权限范围不足（需 trade:read 与 quote:read），请在富途开放平台重新授权')
    if (!response.ok) fail('Futu MCP 返回 HTTP ' + response.status)
    const contentType = String(response.headers.get('content-type') || '')
    const payloadText = await response.text()
    guard()
    if (!payloadText.trim()) return null
    let payload
    if (contentType.includes('text/event-stream')) {
      const frames = payloadText.split(/\r?\n\r?\n/); let parsed = null
      for (const frame of frames) for (const line of frame.split(/\r?\n/)) {
        if (!/^data:\s?/.test(line)) continue
        const raw = line.replace(/^data:\s?/, '').trim()
        if (!raw || raw === '[DONE]') continue
        try { const value = JSON.parse(quoteBigInts(raw)); if (value && (value.id === id || value.method)) parsed = value } catch { /* keep last */ }
      }
      if (!parsed) fail('富途 MCP 返回了无法解析的 SSE 响应')
      payload = parsed
    } else {
      try { payload = JSON.parse(quoteBigInts(payloadText)) } catch { fail('富途 MCP 返回了无法解析的响应') }
    }
    if (payload.error) {
      const detail = payload.error.message || 'unknown error'
      if (/scope|permission|授权/i.test(detail)) fail('富途 MCP 权限不足（' + detail + '）：请重新授权并勾选 trade:read / quote:read')
      fail('Futu MCP 调用失败：' + detail)
    }
    return payload
  }

  async function ensureSession() {
    if (initialized) return
    const init = await rpc('initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION } })
    if (!init?.result?.serverInfo) fail('富途 MCP 初始化失败：响应缺少 serverInfo')
    initialized = true
    await rpc('notifications/initialized', undefined, { auth: true, timeout: 8000 })
  }

  async function call(tool, args = {}) {
    guard()
    if (typeof tool !== 'string' || !tool.trim()) fail('Futu MCP tool name is required')
    let response
    for (let attempt = 0; ; attempt++) {
      try {
        await ensureSession()
        response = await rpc('tools/call', { name: tool, arguments: args })
        break
      } catch (error) {
        const transient = /请求超时|fetch failed|ECONNRESET|ETIMEDOUT|socket|HTTP 50[234]/i.test(String(error?.message || '')) || error?.cause?.code === 'ECONNRESET'
        if (!transient || attempt >= retries || signal?.aborted) throw error
        initialized = false; sessionId = null
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    const result = response?.result
    if (!result) fail('富途 MCP 工具调用没有返回结果')
    if (result.isError) {
      const content = Array.isArray(result.content) ? result.content : []
      const message = content.map(c => c?.text || '').join(' ') || 'tool reported an error'
      if (/授权|401|invalid token|unauthorized|token expired|re-?auth/i.test(message) && !/unknown tool/i.test(message)) fail('富途 MCP 授权已失效，请重新授权：' + message)
      fail('富途 MCP 工具 ' + tool + ' 失败：' + message)
    }
    let value
    if (result.structuredContent !== undefined && result.structuredContent !== null) value = result.structuredContent
    else {
      const content = Array.isArray(result.content) ? result.content : []
      const first = content.find(c => typeof c?.text === 'string')
      if (!first) return null
      try { value = JSON.parse(quoteBigInts(first.text)) } catch { return first.text }
    }
    // Futu wraps tool payloads as { s: 'ok', d: {...} }; anything else is a tool-level error.
    if (value && typeof value === 'object' && !Array.isArray(value) && 's' in value && 'd' in value) {
      if (String(value.s).toLowerCase() !== 'ok') fail('富途 MCP 工具 ' + tool + ' 失败：' + (value.m || value.msg || value.message || value.s))
      value = value.d
    }
    return value
  }

  return { call, get endpoint() { return base }, async dispose() { initialized = false; sessionId = null } }
}

// Futu account / deal / order IDs are uint64 and exceed Number.MAX_SAFE_INTEGER.
// Quote any 16+ digit integer value before JSON.parse so IDs survive exactly.
// The lookbehind skips keys inside escaped JSON strings (content text is
// handled separately once unescaped).
export function quoteBigInts(text) {
  return String(text).replace(/(?<!\\)"([A-Za-z0-9_]+)"(\s*:\s*)(-?\d{16,})(?=\s*[,}\]])/g, '"$1"$2"$3"')
}

// ---------- OAuth 2.1 (dynamic registration + PKCE) ----------
function base64url(buffer) { return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
export function createFutuPkce() {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge, method: 'S256' }
}

export async function registerFutuClient({ redirectUri, clientName = 'dsh-wealth', signal, deps = {} } = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch
  const body = {
    client_name: clientName,
    redirect_uris: [text(redirectUri, 'redirect_uri')],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: SCOPES,
  }
  const response = await fetchImpl(REGISTER_URL, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal, redirect: 'error' })
  if (!response.ok) fail('富途客户端注册失败：HTTP ' + response.status)
  const data = await response.json()
  if (!data?.client_id) fail('富途客户端注册失败：响应缺少 client_id')
  return { clientId: data.client_id, registrationAccessToken: data.registration_access_token || null, registrationClientUri: data.registration_client_uri || null, scope: data.scope || SCOPES }
}

export function buildFutuAuthorizeUrl({ clientId, redirectUri, challenge, state } = {}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: text(clientId, 'client_id'),
    redirect_uri: text(redirectUri, 'redirect_uri'),
    scope: SCOPES,
    code_challenge: text(challenge, 'code_challenge'),
    code_challenge_method: 'S256',
  })
  if (state) params.set('state', String(state))
  return AUTHORIZE_URL + '?' + params.toString()
}

async function tokenRequest(params, signal, deps) {
  const fetchImpl = deps.fetch || globalThis.fetch
  const response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams(params).toString(), signal, redirect: 'error' })
  const raw = await response.text()
  let data
  try { data = JSON.parse(raw) } catch { data = null }
  if (!response.ok) fail('富途 Token 请求失败：HTTP ' + response.status + (data?.error ? '（' + data.error + '）' : ''))
  if (!data?.access_token) fail('富途 Token 响应缺少 access_token')
  return { accessToken: data.access_token, refreshToken: data.refresh_token || null, expiresIn: Number(data.expires_in) || null, tokenType: data.token_type || 'Bearer', scope: data.scope || SCOPES }
}

export async function exchangeFutuCode({ code, clientId, redirectUri, verifier, signal, deps = {} } = {}) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code: text(code, 'code'),
    client_id: text(clientId, 'client_id'),
    redirect_uri: text(redirectUri, 'redirect_uri'),
    code_verifier: text(verifier, 'code_verifier'),
  }, signal, deps)
}

export async function refreshFutuToken({ clientId, refreshToken, signal, deps = {} } = {}) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: text(refreshToken, 'refresh_token'), client_id: text(clientId, 'client_id') }, signal, deps)
}

export async function verifyFutuMcpToken(token, { endpoint, signal, deps = {} } = {}) {
  const mcp = createFutuMcp({ secrets: { mcpToken: token }, endpoint, signal, deps })
  try { await mcp.call('account_authorized_trd_accs', {}); return true } finally { await mcp.dispose() }
}

export function futuMcpFingerprintPart(secrets = {}) {
  const token = String(secrets?.mcpToken || '')
  return token ? createHash('sha256').update(token).digest('hex').slice(0, 16) : ''
}

// ---------- snapshot ----------
const FUND_CURRENCY_BY_MARKET = { HK: 'HKD', US: 'USD', CN: 'CNY', SG: 'SGD' }
function marketDefaultCurrency(market) { return marketCurrency(market) ?? FUND_CURRENCY_BY_MARKET[market] ?? null }
const UNSUPPORTED_SECURITY = /OPTION|FUTURES|MULTILEG/i

function mapPositions(positions, warnings, seen) {
  const list = []
  // 覆盖按资产段统计：缺 qty 的行是真缺失（partial）；缺成本的行照常入库，不算覆盖损失。
  let skippedStock = false, skippedFund = false
  for (const row of array(positions, 'positions')) {
    const type = String(row?.security_type || '').toUpperCase()
    if (UNSUPPORTED_SECURITY.test(type)) throw new Error('富途 MCP 返回了期权或衍生品持仓，本插件暂不支持：' + (row?.code || '?'))
    if (String(row?.position_side || 'LONG').toUpperCase() === 'SHORT') throw new Error('富途 MCP 返回了空头持仓，本插件暂不支持：' + (row?.code || '?'))
    const { symbol, market } = futuSymbol(row?.code, 'positions.code')
    const key = market + ':' + symbol
    if (seen.has(key)) fail('富途 MCP 返回了重复持仓 ' + symbol)
    seen.add(key)
    const assetClass = type === 'FUND' ? 'fund' : 'stock'
    const qty = money(row?.qty, 'positions.qty')
    if (qty === 0) continue // 已清仓（当日卖光）：不是缺数据，旧持仓应随完整快照删除
    if (qty == null || qty < 0) {
      warnings.push('FUTU_MCP_MISSING_QTY:' + symbol)
      if (assetClass === 'fund') skippedFund = true; else skippedStock = true
      continue
    }
    const currencyValue = currency(row?.currency || marketDefaultCurrency(market) || 'USD', 'positions.currency')
    // v2.1：成本可空。缺成本价时行照常入库（avgCost=null），既不伪造也不丢覆盖。
    const cost = money(row?.cost_price, 'positions.cost_price')
    list.push({
      symbol,
      name: typeof row?.stock_name === 'string' && row.stock_name.trim() ? row.stock_name.trim() : symbol,
      market, assetClass, currency: currencyValue,
      qty, avgCost: cost,
      manualPrice: money(row?.nominal_price, 'positions.nominal_price'), externalId: symbol,
    })
  }
  return { list, skippedStock, skippedFund }
}

async function fetchCash(mcp, accId, currencies, warnings) {
  const list = []
  const totals = { assets: [] }
  // 任一币种的资金接口失败或被跳过的行都会丢失现金覆盖，不能当作完整快照。
  let failed = false
  for (const c of currencies) {
    let funds
    try { funds = await mcp.call('account_funds', { acc_id: accId, currency: c }) } catch (error) { warnings.push('FUTU_MCP_FUNDS_UNAVAILABLE:' + c + ':' + (error?.message || 'failed')); failed = true; continue }
    const rows = Array.isArray(funds) ? funds : [funds]
    for (const row of rows) {
      if (!row || typeof row !== 'object') { warnings.push('FUTU_MCP_FUNDS_ROW_INVALID:' + c); failed = true; continue }
      const cash = money(row.cash, 'account_funds.cash') ?? 0
      const available = money(row.available_funds, 'account_funds.available_funds')
      const frozen = money(row.frozen_cash, 'account_funds.frozen_cash') ?? 0
      // Prefer the explicit `cash` figure; fall back to available+frozen when absent.
      const total = cash || ((available ?? 0) + frozen)
      if (total > 0) list.push({ symbol: `CASH:${c}`, name: `${c} 现金`, market: 'CASH', assetClass: 'cash', currency: c, qty: total, avgCost: 1, manualPrice: 1, externalId: `CASH:${c}` })
      const assets = money(row.total_assets, 'account_funds.total_assets')
      if (assets != null) totals.assets.push({ currency: c, assets })
    }
  }
  return { list, totals, failed }
}

export async function fetchFutuMcpSnapshot(source, secrets, signal, deps = {}) {
  const accId = text(source?.brokerAccountId, '富途账户 acc_id (brokerAccountId)')
  const mcp = createFutuMcp({ secrets, endpoint: source?.mcpEndpoint, signal, deps })
  try {
    const warnings = []
    const rawPositions = await mcp.call('account_positions', { acc_id: accId })
    const positionRows = Array.isArray(rawPositions) ? rawPositions : Array.isArray(rawPositions?.positions) ? rawPositions.positions : []
    const seen = new Set()
    const { list: holdings, skippedStock, skippedFund } = mapPositions(positionRows, warnings, seen)
    const currencies = [...new Set(holdings.map(h => h.currency))]
    if (!currencies.length) currencies.push('HKD')
    const { list: cashList, totals, failed } = await fetchCash(mcp, accId, currencies, warnings)
    const all = [...holdings, ...cashList]
    if (!all.length) fail('富途 MCP 没有返回任何持仓或现金；请确认账户内有资产或已授权 trade:read 权限')
    const sourceTotals = {}
    // Mixed-currency accounts cannot be summed without FX; only report a single-currency total.
    if (totals.assets.length === 1) sourceTotals.netAssets = totals.assets[0].assets
    else if (totals.assets.length > 1) warnings.push('FUTU_MCP_MIXED_CURRENCY_TOTALS:多币种资产总额不做汇率折算，已省略合计')
    const cashSum = cashList.length === 1 ? cashList[0].qty : null
    if (cashSum != null) sourceTotals.cash = cashSum
    const priced = all.filter(h => h.market !== 'CASH' && h.manualPrice != null).length
    const securityCount = all.filter(h => h.market !== 'CASH').length
    if (securityCount && !priced) warnings.push('PRICE_UNAVAILABLE:富途持仓未返回市价，证券按成本价暂估')
    return {
      holdings: all,
      // v2.2 分段覆盖：持仓调用成功且没有缺 qty 的行即为完整；资金接口失败 → cash failed。
      // complete 由 normalizeSnapshot 按 coverage 派生（全部 full 才为 true），这里不再重复。
      coverage: { stock: skippedStock ? 'partial' : 'full', fund: skippedFund ? 'partial' : 'full', cash: failed ? 'failed' : 'full' },
      warnings,
      queriedAt: new Date(deps.now?.() ?? Date.now()).toISOString(),
      uploadedAt: null, quoteDate: null,
      ...(Object.keys(sourceTotals).length ? { sourceTotals } : {}),
    }
  } finally { await mcp.dispose() }
}

const MARKET_LABEL = { '1': '港股', '2': '美股', '4': 'A股通', '6': '新加坡', '8': '澳股', '11': '马股', '12': '加股', '15': '日股', '18': '韩股' }
const FIRM_LABEL = { FUTUSECURITIES: '富途证券', FUTUINC: 'Moomoo US', FUTUSG: 'Moomoo SG', FUTUAU: 'Moomoo AU', FUTUCA: 'Moomoo CA', FUTUJP: 'Moomoo JP', FUTUMY: 'Moomoo MY' }
const ACC_TYPE_LABEL = { margin: '融资账户', cash: '现金账户' }
/** Account discovery: one entry per authorized trading account (acc_id). */
export async function listFutuMcpAccounts(source, secrets, signal, deps = {}) {
  const mcp = createFutuMcp({ secrets, endpoint: source?.mcpEndpoint, signal, deps })
  try {
    const data = await mcp.call('account_authorized_trd_accs', {})
    const rows = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : []
    const accounts = []
    for (const row of rows) {
      const id = String(row?.acc_id ?? row?.account_id ?? '').trim()
      if (!id) continue
      const markets = (Array.isArray(row?.enable_market) ? row.enable_market : []).map(String)
      const futuresOnly = markets.length > 0 && markets.every(m => m === '5')
      const marketNames = [...new Set(markets.map(m => MARKET_LABEL[m]).filter(Boolean))]
      const card = String(row?.univs_account_card_number || row?.account_card_number || '')
      const parts = [FIRM_LABEL[row?.security_firm] || row?.security_firm || '富途', futuresOnly ? '期货账户' : (ACC_TYPE_LABEL[row?.acc_type] || row?.acc_type || '证券账户'), !futuresOnly && marketNames.length ? marketNames.slice(0, 4).join('/') : '', card.length >= 4 ? '尾号 ' + card.slice(-4) : '']
      accounts.push({ id, name: parts.filter(Boolean).join(' · '), currency: null, accountCardNumber: row?.account_card_number || null, futures: futuresOnly })
    }
    if (!accounts.length) fail('富途 MCP 未返回任何已授权的交易账户，请确认授权范围包含账户访问')
    return { accounts, warnings: [] }
  } finally { await mcp.dispose() }
}

// ---------- history ----------
const ENABLE_MARKET_TO_TRD = { '1': 'HK', '2': 'US', '4': 'HKCC', '5': 'FUTURES', '6': 'SG', '11': 'MY', '12': 'CA', '15': 'JP', '18': 'KR', '8': 'AU' }
const TRD_MARKET_CURRENCY = { HK: 'HKD', US: 'USD', HKCC: 'CNH', SG: 'SGD', CA: 'CAD', JP: 'JPY', KR: 'KRW', MY: 'MYR', AU: 'AUD', FUTURES: 'HKD' }

async function accountMarkets(mcp, accId, warnings) {
  try {
    const data = await mcp.call('account_authorized_trd_accs', {})
    const rows = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : []
    const acc = rows.find(r => String(r?.acc_id ?? r?.account_id) === String(accId))
    const markets = new Set()
    for (const code of (Array.isArray(acc?.enable_market) ? acc.enable_market : [])) {
      const m = ENABLE_MARKET_TO_TRD[String(code)]
      if (m) markets.add(m)
    }
    return markets
  } catch (error) {
    warnings.push({ message: 'FUTU_MCP_ACCOUNT_UNAVAILABLE:' + (error?.message || 'failed') })
    return new Set()
  }
}

function microsRange(from, to) {
  const start = Date.parse(from + 'T00:00:00Z') * 1000
  const end = Date.parse(to + 'T23:59:59Z') * 1000 + 999999
  return { start: String(start), end: String(end) }
}

async function fetchFills(mcp, accId, market, range, warnings) {
  const rows = []
  let pageFlag = '', pages = 0
  do {
    if (++pages > 400) fail('富途成交记录分页超过上限，请按日期拆分回补')
    let data
    try { data = await mcp.call('account_fills_history', { acc_id: accId, trd_market: market, start: range.start, end: range.end, page_size: 50, ...(pageFlag ? { page_flag: pageFlag } : {}) }) }
    catch (error) { warnings.push({ message: 'FUTU_MCP_FILLS_UNAVAILABLE:' + market + ':' + (error?.message || 'failed') }); return rows }
    const fills = Array.isArray(data) ? data : Array.isArray(data?.order_fills) ? data.order_fills : []
    for (const raw of fills) {
      const status = String(raw?.status || '').toUpperCase()
      const side = String(raw?.trd_side || '').toUpperCase()
      if (side !== 'BUY' && side !== 'SELL') { warnings.push({ message: `FUTU_MCP_UNKNOWN_SIDE:${side || '?'}:${raw?.code || '?'}` }); continue }
      if (status && status !== 'OK') { warnings.push({ message: `FUTU_MCP_INACTIVE_FILL:${status}:${raw?.deal_id || '?'}` }); continue }
      let parsed
      try { parsed = futuSymbol(raw?.code, 'fills.code') } catch { warnings.push({ message: 'FUTU_MCP_BAD_SYMBOL:' + (raw?.code || '?') }); continue }
      const qty = money(raw?.qty, 'fills.qty', { positive: true })
      const price = money(raw?.price, 'fills.price', { positive: true })
      const externalId = text(raw?.deal_id, 'fills.deal_id')
      const when = fromMicros(raw?.create_time, 'fills.create_time')
      const currencyValue = TRD_MARKET_CURRENCY[market] || marketDefaultCurrency(parsed.market) || 'USD'
      rows.push(canonical({ ...when, kind: side === 'BUY' ? 'buy' : 'sell', originalType: side, symbol: parsed.symbol, market: parsed.market, currency: currencyValue, qty, price, cashAmount: null, fee: null, externalId, note: `富途 dealId=${externalId}` }))
    }
    pageFlag = data?.page_flag ? String(data.page_flag) : ''
    if (data?.completed) pageFlag = ''
  } while (pageFlag)
  return rows
}

// Stock/ETF trade principal is represented by fills; skip those cash rows to avoid double counting.
const TRADE_LOG = /成交|买入|卖出|^buy\b|^sell\b|stock trad|securities trad|trade settlement|order fill/i
// Fund subscriptions/redemptions never appear in account_fills_history, so keep them as cash-only buy/sell.
const FUND_BUY = /fund subscription|基金申购|基金认购|申购|认购/i, FUND_SELL = /fund redemption|基金赎回|赎回/i
export function classifyFutuCashLog(name, amount) {
  const label = String(name || '').toLowerCase()
  if (/ipo|新股/.test(label)) return 'other' // subscription freeze and refund net out; keep as visible cash movements
  if (/dividend|股息|红利|分红|派息/.test(label)) return 'dividend'
  if (/interest|利息/.test(label)) return 'interest'
  if (/\btax\b|withholding|税/.test(label)) return 'tax'
  if (/fee|commission|charge|佣金|手续费|交收费|结算费|平台费|服务费/.test(label)) return 'fee'
  if (FUND_BUY.test(label)) return 'buy'
  if (FUND_SELL.test(label)) return 'sell'
  if (/withdraw|取出|出金|转出/.test(label)) return 'withdrawal'
  if (/deposit|存入|入金|转入/.test(label)) return 'deposit'
  if (/transfer|调拨|转账/.test(label)) return amount >= 0 ? 'deposit' : 'withdrawal'
  if (TRADE_LOG.test(label)) return null
  return 'other'
}
function mapCashLogs(logs, warnings, fallbackCurrency) {
  const rows = []
  for (const raw of array(logs, 'cash_logs')) {
    const name = String(raw?.transaction_name || '').trim()
    let amount
    try { amount = money(raw?.cash_change, 'cash_logs.cash_change', { signed: true }) } catch { amount = undefined }
    if (amount == null) { warnings.push({ message: 'FUTU_MCP_CASH_LOG_NO_AMOUNT:' + (name || '?') }); continue }
    const kind = classifyFutuCashLog(name, amount)
    if (kind === null) continue
    let parsed = null
    try { parsed = raw?.symbol ? futuSymbol(raw.symbol, 'cash_logs.symbol') : null } catch { parsed = null }
    // The running balance string carries the row's currency: "Balance: 466.65 HKD".
    const balanceCurrency = /\b([A-Z]{3})\s*$/.exec(String(raw?.balance || '').trim())?.[1]
    let currencyValue
    if (balanceCurrency) currencyValue = balanceCurrency
    else if (parsed) currencyValue = marketDefaultCurrency(parsed.market) || fallbackCurrency
    else currencyValue = fallbackCurrency
    const bareSymbol = !parsed && raw?.symbol ? String(raw.symbol).trim() : null
    const stockName = String(raw?.stock_name || '').trim() || null
    if (!currencyValue) { warnings.push({ message: 'FUTU_MCP_CASH_LOG_NO_CURRENCY:' + (name || '?') }); continue }
    const when = parseCashTime(raw?.created_time, 'cash_logs.created_time')
    // cash_change is already signed from the account's perspective; keep its sign.
    rows.push(canonical({ ...when, kind, originalType: name || null, symbol: parsed?.symbol || bareSymbol, name: stockName, market: parsed?.market || (bareSymbol && /^\d{5}$/.test(bareSymbol) ? 'HK' : bareSymbol ? 'FUND' : null), currency: currencyValue, qty: null, price: null, cashAmount: amount, fee: null, externalId: null, note: name || null }))
  }
  return rows
}

async function fetchCashLogs(mcp, accId, range, warnings, fallbackCurrency) {
  const rows = []
  let pageFlag = '', pages = 0
  do {
    if (++pages > 2000) fail('富途资金流水分页超过上限，请按日期拆分回补')
    let data
    let lastError
    for (let attempt = 0; attempt < 3 && data === undefined; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 1500 * attempt))
      try { data = await mcp.call('account_cash_logs', { acc_id: accId, begin_time: range.start, end_time: range.end, page_size: 20, ...(pageFlag ? { page_flag: pageFlag } : {}) }) }
      catch (error) { lastError = error; if (/授权|权限/.test(error?.message || '')) break }
    }
    if (data === undefined) { warnings.push({ message: '富途资金流水读取中断（已读取 ' + rows.length + ' 条），下次同步会自动续读：' + (lastError?.message || 'failed') }); return rows }
    const logs = Array.isArray(data) ? data : Array.isArray(data?.cash_logs) ? data.cash_logs : []
    rows.push(...mapCashLogs(logs, warnings, fallbackCurrency))
    pageFlag = data?.page_flag ? String(data.page_flag) : ''
    if (data?.completed) pageFlag = ''
  } while (pageFlag)
  return rows
}

export async function fetchFutuMcpHistory(source, secrets, range, signal, deps = {}) {
  const from = day(range?.from, '开始日期'), to = day(range?.to, '结束日期')
  if (from > to) fail('开始日期不能晚于结束日期')
  const accId = text(source?.brokerAccountId, '富途账户 acc_id (brokerAccountId)')
  const mcp = createFutuMcp({ secrets, endpoint: source?.mcpEndpoint, signal, deps })
  try {
    const warnings = []
    const micro = microsRange(from, to)
    const markets = await accountMarkets(mcp, accId, warnings)
    if (!markets.size) markets.add('HK')
    const fills = []
    for (const market of markets) fills.push(...await fetchFills(mcp, accId, market, micro, warnings))
    // Fallback currency for cash logs that carry no symbol. An explicit source.currency
    // wins (multi-currency accounts need it); otherwise only a single covered market is
    // unambiguous.
    const fallbackCurrency = source?.currency ? currency(source.currency) : markets.size === 1 ? (TRD_MARKET_CURRENCY[[...markets][0]] || null) : null
    const flows = await fetchCashLogs(mcp, accId, micro, warnings, fallbackCurrency)
    const rows = dedupe([...fills, ...flows])
    if (rows.length > 25000) fail('富途历史流水超过 25000 条，请按日期拆分回补')
    return {
      rows, errors: [], warnings,
      coverage: {
        complete: false,
        note: `已读取富途 ${from} 至 ${to} 的成交与资金流水（按市场：${[...markets].join('/')}）；未成交订单、单笔费用分摊和部分公司行为可能缺失，可用券商账单文件补充。`,
        observedFrom: rows.length ? rows[0].date : null, observedTo: rows.length ? rows[rows.length - 1].date : null,
      },
    }
  } finally { await mcp.dispose() }
}

// ---------- native OpenD history ----------
// The native-SDK history adapters live beside their transport adapter instead of in
// the dispatcher, so the dependency graph stays one-way:
// history-provider -> registry -> adapters. The exported helpers are shared
// with the native Longbridge history in lb-mcp.mjs (which imports them from here);
// adapters must never import history-provider.mjs, or the registry/dispatcher pair
// would become circular again.
const MAX_ROWS = 25000
export const ZONES = { HK: 'Asia/Hong_Kong', US: 'America/New_York', CN: 'Asia/Shanghai' }
const FT_CURRENCIES = { 1: 'HKD', 2: 'USD', 3: 'CNH', 4: 'JPY', 5: 'SGD', 6: 'AUD', 7: 'CAD', 8: 'MYR', 9: 'NZD' }
const futuBudgets = new Map()
export const fallback = message => fail(`${message}; narrow the date range or import an official broker statement file`)
function uint64(value, field) {
  // All uint64 identifiers stay strings, including protobuf Long objects.
  if (typeof value === 'number' && !Number.isSafeInteger(value)) fail(`${field} is an unsafe number; require a uint64 string`)
  const s = value != null && typeof value === 'object' ? value.toString() : String(value)
  if (!/^\d+$/.test(s) || BigInt(s) <= 0n || BigInt(s) > 18446744073709551615n) fail(`${field} must be a positive uint64 string`)
  return BigInt(s).toString()
}
// Named `executionNumeric` (not `numeric`) because this module's MCP helpers use a
// different, options-object numeric() with different error semantics.
function executionNumeric(value, field, positive = false) {
  if (value != null && typeof value === 'object') value = value.toString()
  if (!['number', 'string'].includes(typeof value) || !/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value))) fail(`${field} is unknown, negative or invalid`)
  const n = Number(value)
  if (!Number.isFinite(n) || (positive && n <= 0) || (n === 0 && /[1-9]/.test(String(value).split(/[eE]/)[0]))) fail(`${field} is invalid or underflows`)
  return n
}
function executionDay(value, field = 'Date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(`${field} must be YYYY-MM-DD`)
  return value
}
export function localDateTime(date, market) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) fail('Execution tradeDoneAt must be a valid SDK Date')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONES[market], year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]))
  const ms = date.getUTCMilliseconds()
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}${ms ? '.' + String(ms).padStart(3, '0') : ''}` }
}
function futuDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T]((?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?)$/.exec(value)
  if (!match) fail('Futu execution createTime is invalid; require market-local date and time')
  return { date: executionDay(match[1], 'Futu execution date'), time: match[2] }
}
export function instrument(symbol, market) {
  // Only unambiguous cash-equity/ETF code shapes are supported. HK warrants,
  // CBBCs, US OCC option codes, mainland options and futures fail explicitly.
  const valid = market === 'US' ? /^[A-Z][A-Z0-9]*(?:[.\-][A-Z0-9]+)?$/.test(symbol) && !/\d{6}[CP]\d/i.test(symbol)
    : market === 'HK' ? /^\d{1,5}$/.test(symbol) && +symbol > 0 && (+symbol < 10000 || (+symbol >= 80000 && +symbol < 90000))
      : market === 'CN' ? /^\d{6}$/.test(symbol) : false
  if (!valid) fail('Derivative or unknown execution instrument is unsupported')
}
export function unsupportedFlags(value) {
  if (value?.isShort === true || value?.shortSale === true || value?.isCorrection === true || value?.isCancelled === true || (value?.comboLegs?.length ?? 0) > 0) fail('Short, derivative, cancelled or corrected executions are unsupported')
}
// Named `canonicalExecution` because this module already has an unrelated canonical()
// for MCP snapshot rows.
export function canonicalExecution(base, qtyValue, priceValue) {
  const qty = executionNumeric(qtyValue, 'Execution quantity', true), price = executionNumeric(priceValue, 'Execution price')
  const grossAmount = executionNumeric(qty * price, 'Execution gross amount')
  if (qty > 0 && price > 0 && grossAmount === 0) fail('Execution gross amount underflows')
  return { ...base, qty, price, grossAmount, cashAmount: null, fee: null }
}
export function addUnique(map, row) {
  const previous = map.get(row.externalId)
  if (previous && JSON.stringify(previous) !== JSON.stringify(row)) fail('Conflicting records for the same execution ID; corrections are unsupported')
  map.set(row.externalId, row)
  if (map.size > MAX_ROWS) fallback('Execution archive exceeds 25000 records')
}
export function result(rows, from, to, extra = []) {
  return { rows: [...rows].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || a.externalId.localeCompare(b.externalId)), errors: [], warnings: [{ message: '仅含成交记录：费用与净现金未知；出入金、分红等非成交记录需用账单文件补录。' }, ...extra.map(message => ({ message }))], coverage: { complete: false, note: `Requested executions for ${from} through ${to}; API date bounds do not prove broker retention or full ledger coverage. Cash, dividends, fees and other non-trade events are not covered.` } }
}
export function inRange(date, range) { return date >= range.from && date <= range.to }
function futuBudget(id) {
  // Futu limits follow the remote account, even across sources/endpoints.
  const key = id
  return () => {
    const now = Date.now()
    for (const [k, timestamps] of futuBudgets) { const active = timestamps.filter(t => now - t < 30000); if (active.length) futuBudgets.set(k, active); else futuBudgets.delete(k) }
    const used = futuBudgets.get(key) ?? []
    if (used.length >= 10) fallback('Futu per-account budget of 10 requests per 30 seconds reached; wait 30 seconds before retrying')
    used.push(now); futuBudgets.set(key, used)
  }
}
export async function futuHistory(source, secrets, range, signal, deps, now) {
  const id = uint64(source.brokerAccountId, 'source.brokerAccountId'), marketNum = { HK: 1, US: 2, CN: 3 }[source.tradeMarket]
  if (source.tradeEnvironment !== 'REAL') fail('Futu history supports only REAL accounts; paper history is unsupported')
  if (!['HK', 'US', 'CN'].includes(source.tradeMarket)) fail('Futu history requires tradeMarket HK/US/CN')
  const header = { trdEnv: 1, accID: id, trdMarket: marketNum }, reserve = futuBudget(id)
  const today = localDateTime(now, source.tradeMarket).date
  return withFutu(source, secrets, signal, deps, async rawCall => {
    let calls = 0
    const call = async (name, args, checkHeader = true) => {
      if (++calls > 10) fallback('Futu preview request budget reached')
      reserve()
      const response = await rawCall(name, args)
      if (checkHeader) {
        const h = response.header
        if (!h || uint64(h.accID, 'Futu response account ID') !== id || h.trdEnv !== 1 || h.trdMarket !== marketNum) fail('Futu response account/environment/market does not match selected source')
      }
      if (response.hasMore === true || response.has_more === true) fallback('Futu response signals incomplete results')
      return response
    }
    const accounts = array((await call('GetAccList', { userID: 0 }, false)).accList, 'Futu accList')
    const matching = accounts.filter(a => uint64(a.accID, 'Futu account ID') === id && a.trdEnv === 1)
    if (matching.length !== 1 || !array(matching[0].trdMarketAuthList, 'Futu tradeMarketAuthList').includes(marketNum)) fail('Selected Futu account/environment/market was not authorized by GetAccList')
    const history = await call('GetHistoryOrderFillList', { header, filterConditions: { beginTime: `${range.from} 00:00:00`, endTime: `${range.to} 23:59:59.999` } })
    const fills = [...array(history.orderFillList, 'Futu history orderFillList')]
    if (inRange(today, range)) fills.push(...array((await call('GetOrderFillList', { header })).orderFillList, 'Futu today orderFillList'))
    if (fills.length > MAX_ROWS * 2) fallback('Futu execution response is too large')
    const unique = new Map()
    for (const fill of fills) {
      unsupportedFlags(fill)
      if (fill.status != null && fill.status !== 0) fail('Futu cancelled, changed or payout fills are unsupported; entire preview rejected')
      if (![1, 2].includes(fill.trdSide)) fail('Futu short, buyback or unknown execution side is unsupported')
      const market = { 1: 'HK', 2: 'US', 31: 'CN', 32: 'CN' }[fill.secMarket]
      if (market !== source.tradeMarket) fail('Futu fill security market does not match selected trade market')
      const symbol = text(fill.code, 'Futu execution code'); instrument(symbol, market)
      const stamp = futuDateTime(fill.createTime), executionId = uint64(fill.fillID, 'Futu fillID')
      const row = canonicalExecution({ ...stamp, kind: fill.trdSide === 1 ? 'buy' : 'sell', originalType: fill.trdSide === 1 ? 'Buy' : 'Sell', symbol, name: text(fill.name, 'Futu execution name'), market, currency: null, externalId: executionId,
        note: `Futu market-local time (${ZONES[market]}); orderIDEx=${fill.orderIDEx ?? ''}; orderID=${fill.orderID == null ? '' : uint64(fill.orderID, 'Futu orderID')}; fillIDEx diagnostic=${fill.fillIDEx ?? ''}` }, fill.qty, fill.price)
      if (!inRange(row.date, range)) continue
      const orderId = text(fill.orderIDEx, 'Futu fill orderIDEx needed for currency lookup; import an official broker statement file if unavailable')
      addUnique(unique, { ...row, orderId })
    }
    const ids = [...new Set([...unique.values()].map(row => row.orderId))]
    if (ids.length > 150) fallback('Futu currency lookup exceeds 150 distinct orders per preview')
    const orders = new Map()
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const remember = response => {
        for (const order of array(response.orderList, 'Futu metadata orderList')) {
          const key = text(order.orderIDEx, 'Futu metadata orderIDEx')
          if (!batch.includes(key)) fail('Futu order lookup returned an unrequested order')
          unsupportedFlags(order)
          const c = Number.isInteger(order.currency) ? FT_CURRENCIES[order.currency] : null
          if (!c) fallback('Futu order currency is unknown; source reporting currency cannot be substituted')
          const value = { currency: c, code: order.code, trdSide: order.trdSide, secMarket: order.secMarket }
          if (orders.has(key) && JSON.stringify(orders.get(key)) !== JSON.stringify(value)) fail('Futu order metadata is conflicting')
          orders.set(key, value)
        }
      }
      // An order may have been placed long before its fill date. A wide metadata
      // window is intentional; missing older metadata causes a file fallback.
      remember(await call('GetHistoryOrderList', { header, filterConditions: { beginTime: `${range.from < '2018-01-01' ? range.from : '2018-01-01'} 00:00:00`, endTime: `${range.to > today ? range.to : today} 23:59:59.999`, orderIDExList: batch } }))
      const missing = batch.filter(key => !orders.has(key))
      if (missing.length) remember(await call('GetOrderList', { header, filterConditions: { orderIDExList: missing } }))
      if (batch.some(key => !orders.has(key))) fallback('Futu order currency lookup is incomplete (order may predate available history)')
    }
    const rows = []
    for (const row of unique.values()) {
      const order = orders.get(row.orderId)
      if (order.code !== row.symbol || order.trdSide !== (row.kind === 'buy' ? 1 : 2) || (order.secMarket != null && ({ 1: 'HK', 2: 'US', 31: 'CN', 32: 'CN' })[order.secMarket] !== row.market)) fail('Futu execution/order metadata identity does not match')
      const { orderId, ...canonicalRow } = row
      rows.push({ ...canonicalRow, currency: order.currency })
    }
    return result(rows, range.from, range.to)
  })
}
