// Futu (富途) official MCP adapter (Streamable HTTP). Read-only: positions + funds
// (balance) + fills/cash-flow history. Docs: https://open.futunn.com/zh-cn/mcp-docs/quick-start
// - Service: https://mcp.futunn.com/mcp (OAuth 2.1 Bearer token required)
// - OAuth: dynamic client registration + PKCE (S256) + loopback redirect. Access
//   tokens last ~2 hours; the refresh token must be stored and used by the client.
//   Scopes needed here: `trade:read` (持仓/资产/历史订单) and `quote:read` (行情).
import { createHash, randomBytes } from 'node:crypto'
import { cashSignOf, isFlowKind, marketCurrency } from './model.mjs'

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
  let skipped = false
  for (const row of array(positions, 'positions')) {
    const type = String(row?.security_type || '').toUpperCase()
    if (UNSUPPORTED_SECURITY.test(type)) throw new Error('富途 MCP 返回了期权或衍生品持仓，本插件暂不支持：' + (row?.code || '?'))
    if (String(row?.position_side || 'LONG').toUpperCase() === 'SHORT') throw new Error('富途 MCP 返回了空头持仓，本插件暂不支持：' + (row?.code || '?'))
    const { symbol, market } = futuSymbol(row?.code, 'positions.code')
    const key = market + ':' + symbol
    if (seen.has(key)) fail('富途 MCP 返回了重复持仓 ' + symbol)
    seen.add(key)
    const qty = money(row?.qty, 'positions.qty')
    if (qty === 0) continue // 已清仓（当日卖光）：不是缺数据，旧持仓应随完整快照删除
    if (qty == null || qty < 0) { warnings.push('FUTU_MCP_MISSING_QTY:' + symbol); skipped = true; continue }
    const currencyValue = currency(row?.currency || marketDefaultCurrency(market) || 'USD', 'positions.currency')
    // v1 契约要求 avgCost 必填：缺成本价时跳过该行并降级覆盖，绝不伪造成本。
    const cost = money(row?.cost_price, 'positions.cost_price')
    if (cost == null) { warnings.push('FUTU_MCP_COST_UNAVAILABLE:' + symbol); skipped = true; continue }
    list.push({
      symbol,
      name: typeof row?.stock_name === 'string' && row.stock_name.trim() ? row.stock_name.trim() : symbol,
      market, assetClass: type === 'FUND' ? 'fund' : 'stock', currency: currencyValue,
      qty, avgCost: cost,
      manualPrice: money(row?.nominal_price, 'positions.nominal_price'), externalId: symbol,
    })
  }
  return { list, skipped }
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
    const { list: holdings, skipped } = mapPositions(positionRows, warnings, seen)
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
      // complete 只看覆盖：接口失败或有行因缺 qty/成本被跳过都不能删旧持仓；缺价不影响。
      complete: !skipped && !failed,
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
