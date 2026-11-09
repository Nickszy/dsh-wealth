// 老虎证券 (Tiger Brokers) remote MCP adapter.
// Docs: https://docs.itigerup.com/docs/remote-mcp
//   MCP endpoint        https://mcp.tigerfintech.com/mcp  (Streamable HTTP, Bearer)
//   OAuth authorization server https://openapi-oauth2.tigerfintech.com
// OAuth 2.1 device flow is used so the plugin needs no redirect listener:
// register -> device_authorization -> user approves in browser -> poll token.
// The refresh token is long-lived and rotated on every refresh.
import { createHash, randomBytes } from 'node:crypto'
import { cashSignOf, isFlowKind } from './model.mjs'
import { createMcpHttpClient } from './mcp-http.mjs'

export const TIGER_MCP_ENDPOINT = 'https://mcp.tigerfintech.com/mcp'
export const TIGER_OAUTH_ISSUER = 'https://openapi-oauth2.tigerfintech.com'
// 网关的 WWW-Authenticate 挑战要求全部五个 scope（缺 quote/news/basic 会 401）：
// scope="api.quote:read api.news:read api.basic:read api.account:read api.trade:read"
export const TIGER_SCOPE = 'api.basic:read api.quote:read api.news:read api.account:read api.trade:read'
// RFC 8707 resource indicator: the protected-resource metadata binds tokens to
// this audience; without it the MCP endpoint rejects the token as invalid.
export const TIGER_RESOURCE = TIGER_MCP_ENDPOINT

const fail = (message) => { throw new Error(message) }
const text = (value) => {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}
const number = (value) => {
  if (value == null || typeof value === 'boolean') return null
  if (typeof value === 'object') {
    for (const key of ['value', 'amount', 'num']) if (value[key] != null) return number(value[key])
    return null
  }
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
const eachArray = (value, visit, depth = 0) => {
  if (value == null || depth > 12) return
  if (Array.isArray(value)) { if (value.length) visit(value); for (const item of value) eachArray(item, visit, depth + 1); return }
  if (typeof value !== 'object') return
  for (const child of Object.values(value)) eachArray(child, visit, depth + 1)
}

const CODE_FIELDS = ['symbol', 'stock_code', 'stockCode', 'code']
const QTY_FIELDS = ['position', 'quantity', 'qty', 'holding_quantity', 'holdingQuantity', 'position_quantity']
const COST_FIELDS = ['average_cost', 'averageCost', 'cost_price', 'costPrice', 'avg_cost', 'avgCost']
const PRICE_FIELDS = ['market_price', 'marketPrice', 'last_price', 'lastPrice', 'price', 'latest_price']
const VALUE_FIELDS = ['market_value', 'marketValue', 'value', 'position_value', 'positionValue']
const CURRENCY_FIELDS = ['currency', 'currency_code', 'currencyCode']
const NAME_FIELDS = ['name', 'symbol_name', 'symbolName', 'stock_name', 'stockName']
const ASSET_TOTAL_FIELDS = ['net_liquidation', 'netLiquidation', 'total_assets', 'totalAssets', 'equity_with_loan', 'equityWithLoan', 'total_asset', 'totalAsset']
const CASH_FIELDS = ['cash', 'cash_balance', 'cashBalance', 'available_cash', 'availableCash', 'total_cash', 'totalCash']
const UNREALIZED_FIELDS = ['unrealized_pnl', 'unrealizedPnl', 'unrealized_profit', 'unrealizedProfit', 'profit']
const MARKET_BY_CODE = { US: 'US', HK: 'HK', CN: 'CN', SH: 'CN', SZ: 'CN' }
const CURRENCY_BY_MARKET = { US: 'USD', HK: 'HKD', CN: 'CNY', FUND: 'CNY' }

function marketOf(row) {
  const raw = text(pick(row, ['market', 'market_code', 'marketCode', 'sec_market']))
  if (!raw) return null
  return MARKET_BY_CODE[raw.toUpperCase()] || null
}

function timestamp(value) {
  if (value == null) return null
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value
    const date = new Date(ms)
    return Number.isFinite(date.getTime()) ? { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 19) } : null
  }
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) return timestamp(Number(raw))
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return null
  // Keep the source's local wall clock when it carries an offset.
  const offset = /([+-]\d{2}:?\d{2})$/.exec(raw)
  if (offset) {
    const sign = offset[1][0] === '-' ? -1 : 1
    const digits = offset[1].slice(1).replace(':', '')
    const minutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)))
    const local = new Date(date.getTime() + minutes * 60000)
    return { date: local.toISOString().slice(0, 10), time: local.toISOString().slice(11, 19) }
  }
  return { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 19) }
}

function createClient(secrets, signal, deps) {
  const token = text(secrets.accessToken)
  if (!token) fail('老虎 MCP 未授权，请先完成浏览器授权')
  return createMcpHttpClient({
    endpoint: deps.endpoint || TIGER_MCP_ENDPOINT,
    headers: { authorization: 'Bearer ' + token },
    signal,
    deps,
  })
}

// ---------- OAuth device flow ----------

async function oauthPost(path, body, { headers = {}, signal, deps } = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('老虎授权请求超时')), deps.timeoutMs ?? 20000)
  const onAbort = () => controller.abort(signal?.reason ?? new Error('老虎授权已中止'))
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetchImpl(TIGER_OAUTH_ISSUER + path, {
      method: 'POST',
      headers: { accept: 'application/json', ...headers },
      body,
      signal: controller.signal,
      redirect: 'error',
    })
    const raw = await response.text()
    let payload = null
    try { payload = raw ? JSON.parse(raw) : null } catch { payload = { raw } }
    if (!response.ok) {
      const detail = payload?.error_description || payload?.error || payload?.message || ('HTTP ' + response.status)
      const error = new Error('老虎授权失败：' + detail)
      error.oauthError = payload?.error || null
      error.status = response.status
      throw error
    }
    return payload || {}
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
}

function formBody(fields) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) if (value !== undefined && value !== null) params.set(key, String(value))
  return params.toString()
}

let cachedClientId = null

async function registerClient(options) {
  if (cachedClientId) return cachedClientId
  const payload = await oauthPost('/oauth2/register', JSON.stringify({
    client_name: 'dsh-wealth',
    redirect_uris: [],
    grant_types: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
    response_types: [],
    token_endpoint_auth_method: 'none',
    scope: TIGER_SCOPE,
  }), { headers: { 'content-type': 'application/json' }, ...options })
  const clientId = text(payload.client_id)
  if (!clientId) fail('老虎 OAuth 注册没有返回 client_id')
  cachedClientId = clientId
  return clientId
}

/** Begin a device authorization. Returns the code the user must approve. */
export async function startTigerDeviceAuth({ signal, deps = {} } = {}) {
  const clientId = await registerClient({ signal, deps })
  const payload = await oauthPost('/oauth2/device_authorization', formBody({ client_id: clientId, scope: TIGER_SCOPE, resource: TIGER_RESOURCE }), {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    signal,
    deps,
  })
  const deviceCode = text(payload.device_code)
  if (!deviceCode) fail('老虎授权没有返回 device_code')
  return {
    clientId,
    deviceCode,
    userCode: text(payload.user_code) || '',
    verificationUri: text(payload.verification_uri) || text(payload.verification_url) || 'https://openapi.tigerfintech.com',
    verificationUriComplete: text(payload.verification_uri_complete) || null,
    interval: Number(payload.interval) > 0 ? Number(payload.interval) : 5,
    expiresIn: Number(payload.expires_in) > 0 ? Number(payload.expires_in) : 600,
    scope: text(payload.scope) || TIGER_SCOPE,
  }
}

/** Poll once. Returns {status:'pending'|'slow_down'|'ready', token?}. */
export async function pollTigerDeviceToken(device, { signal, deps = {} } = {}) {
  try {
    const payload = await oauthPost('/oauth2/token', formBody({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: device.deviceCode,
      client_id: device.clientId,
      resource: TIGER_RESOURCE,
    }), { headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal, deps })
    const accessToken = text(payload.access_token)
    if (!accessToken) fail('老虎授权响应缺少 access_token')
    return {
      status: 'ready',
      token: {
        accessToken,
        refreshToken: text(payload.refresh_token) || null,
        clientId: device.clientId,
        scope: text(payload.scope) || device.scope,
        expiresAt: Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1000 : null,
      },
    }
  } catch (error) {
    const code = String(error.oauthError || '')
    if (code === 'authorization_pending') return { status: 'pending' }
    if (code === 'slow_down') return { status: 'slow_down', interval: (device.interval || 5) + 5 }
    if (code === 'access_denied') fail('老虎授权被拒绝')
    if (code === 'expired_token') fail('老虎授权码已过期，请重新发起授权')
    throw error
  }
}

export async function refreshTigerToken({ refreshToken, clientId, signal, deps = {} } = {}) {
  if (!refreshToken || !clientId) fail('老虎授权缺少 refresh token，无法自动续期')
  const payload = await oauthPost('/oauth2/token', formBody({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    resource: TIGER_RESOURCE,
  }), { headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal, deps })
  const accessToken = text(payload.access_token)
  if (!accessToken) fail('老虎 Token 续期响应缺少 access_token')
  return {
    accessToken,
    refreshToken: text(payload.refresh_token) || refreshToken,
    expiresAt: Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1000 : null,
  }
}

// ---------------------------------------------------------------------------
// Authorization-code flow (browser + loopback redirect). Official MCP clients
// (Claude Code / Cursor) use this flow; device-flow tokens are rejected by the
// MCP gateway as invalid, so the plugin logs in the same way.
// ---------------------------------------------------------------------------

/** Register a public client bound to the loopback redirect URI. */
export async function registerTigerAuthCodeClient({ redirectUri, signal, deps = {} } = {}) {
  if (!redirectUri) fail('老虎授权缺少回调地址')
  const payload = await oauthPost('/oauth2/register', JSON.stringify({
    client_name: 'dsh-wealth',
    redirect_uris: [redirectUri],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: TIGER_SCOPE,
  }), { headers: { 'content-type': 'application/json' }, signal, deps })
  const clientId = text(payload.client_id)
  if (!clientId) fail('老虎 OAuth 注册没有返回 client_id')
  return { clientId }
}

export function createTigerPkce() {
  const verifier = randomBytes(48).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

/** 授权页地址；resource 参数按 RFC 8707 绑定 MCP 资源。 */
export function buildTigerAuthorizeUrl({ clientId, redirectUri, challenge, state }) {
  const url = new URL(TIGER_OAUTH_ISSUER + '/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', TIGER_SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('resource', TIGER_RESOURCE)
  return url.toString()
}

export async function exchangeTigerCode({ code, clientId, redirectUri, verifier, signal, deps = {} } = {}) {
  if (!code || !clientId || !redirectUri || !verifier) fail('老虎授权回调参数不完整')
  const payload = await oauthPost('/oauth2/token', formBody({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    resource: TIGER_RESOURCE,
  }), { headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal, deps })
  const accessToken = text(payload.access_token)
  if (!accessToken) fail('老虎授权响应缺少 access_token')
  return {
    accessToken,
    refreshToken: text(payload.refresh_token),
    expiresIn: Number(payload.expires_in) > 0 ? Number(payload.expires_in) : null,
    scope: text(payload.scope),
  }
}

/** Validate a bearer token by listing authorized accounts. */
export async function verifyTigerToken(secrets, { signal, deps = {} } = {}) {
  const mcp = createClient(secrets, signal, deps)
  try { return await mcp.call('get_accounts', {}) } finally { await mcp.dispose() }
}

// ---------- accounts ----------

function accountRows(payload) {
  const rows = []
  eachArray(payload, (list) => {
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const id = text(pick(item, ['account', 'account_id', 'accountId', 'id', 'account_no']))
      if (id && !rows.some((row) => row.id === id)) rows.push({ id, raw: item })
    }
  })
  return rows
}

export async function listTigerAccounts(source, secrets, signal, deps = {}) {
  const mcp = createClient(secrets, signal, deps)
  try {
    const payload = await mcp.call('get_accounts', {})
    const warnings = []
    const rows = accountRows(payload)
    if (!rows.length) {
      const fallback = text(payload?.default_account)
      if (fallback) rows.push({ id: fallback, raw: {} })
    }
    if (!rows.length) fail('老虎 MCP 没有返回授权账户，请在授权页选择要导入的账户')
    return {
      accounts: rows.map(({ id, raw }) => ({
        id,
        name: text(pick(raw, ['account_name', 'accountName', 'name'])) || ('老虎账户 ' + id),
        currency: text(pick(raw, CURRENCY_FIELDS))?.toUpperCase() || null,
        broker: text(pick(raw, ['broker', 'broker_name', 'brokerName'])) || 'Tiger',
      })),
      warnings,
    }
  } finally { await mcp.dispose() }
}

// ---------- snapshot ----------

function positionRows(payload) {
  const rows = []
  // A row with a symbol but no quantity is malformed: it belongs in the ledger
  // but cannot be imported, so its segment can no longer be full.
  let malformed = 0
  eachArray(payload, (list) => {
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const symbol = text(pick(item, CODE_FIELDS))
      if (!symbol) continue
      if (number(pick(item, QTY_FIELDS)) === null) { malformed++; continue }
      rows.push(item)
    }
  })
  return { rows, malformed }
}

/**
 * get_assets 实测返回 prime_assets 结构：
 * { account, account_type, route, updated_at, segments: [
 *   { category: 'S'|'C'|'F', currency, net_liquidation, cash_balance,
 *     cash_available_for_trade, gross_position_value, buying_power, unrealized_pnl } ] }
 * 旧结构（顶层 cash[] + 汇总字段）作为兜底。
 */
function assetSummary(payload) {
  const segments = Array.isArray(payload?.segments) ? payload.segments : null
  if (segments && segments.length) {
    const cash = new Map()
    let total = 0, hasTotal = false, unrealized = 0, hasUnrealized = false
    for (const seg of segments) {
      if (!seg || typeof seg !== 'object') continue
      const nlv = number(pick(seg, ASSET_TOTAL_FIELDS))
      if (nlv !== null) { total += nlv; hasTotal = true }
      const currency = text(pick(seg, CURRENCY_FIELDS))?.toUpperCase()
      const balance = number(pick(seg, CASH_FIELDS))
      // 现金允许为负（融资融券负债），不能像旧逻辑那样丢掉负值。
      if (currency && balance !== null && /^[A-Z]{3}$/.test(currency)) cash.set(currency, (cash.get(currency) || 0) + balance)
      const pnl = number(pick(seg, UNREALIZED_FIELDS))
      if (pnl !== null) { unrealized += pnl; hasUnrealized = true }
    }
    return {
      total: hasTotal ? total : null,
      cash: [...cash.entries()].map(([currency, balance]) => ({ currency, cash: balance })),
      unrealized: hasUnrealized ? unrealized : null,
    }
  }
  return { total: assetTotal(payload), cash: cashRows(payload), unrealized: unrealizedTotal(payload) }
}

function cashRows(payload) {
  const rows = []
  eachArray(payload, (list) => {
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const currency = text(pick(item, CURRENCY_FIELDS))?.toUpperCase()
      const cash = number(pick(item, CASH_FIELDS))
      if (currency && cash !== null && /^[A-Z]{3}$/.test(currency)) rows.push({ currency, cash })
    }
  })
  return rows
}

function assetTotal(payload) {
  let best = null
  const walk = (value, depth) => {
    if (value == null || depth > 12) return
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (ASSET_TOTAL_FIELDS.includes(key)) {
        const n = number(child)
        if (n !== null && n >= 0 && (best === null || n > best)) best = n
      }
      walk(child, depth + 1)
    }
  }
  walk(payload, 0)
  return best
}

function unrealizedTotal(payload) {
  let total = 0, found = false
  const walk = (value, depth) => {
    if (value == null || depth > 12) return
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (UNREALIZED_FIELDS.includes(key)) {
        const n = number(child)
        if (n !== null) { total += n; found = true }
      }
      walk(child, depth + 1)
    }
  }
  walk(payload, 0)
  return found ? total : null
}

/**
 * Map one position row. Unknown cost becomes `avgCost: null` (v2.1) instead of a
 * fabricated price or a skipped row, so a missing cost never reduces coverage.
 */
function positionToHolding(row, warnings) {
  const symbol = text(pick(row, CODE_FIELDS))
  const qty = number(pick(row, QTY_FIELDS))
  if (!symbol || qty === null) return { holding: null }
  if (!(qty > 0)) return { holding: null }
  const secType = String(text(pick(row, ['sec_type', 'secType', 'security_type'])) || 'STK').toUpperCase()
  // Unsupported instruments (options, futures...) never enter the ledger, so
  // skipping them does not reduce coverage.
  if (!['STK', 'FUND', 'ETF'].includes(secType)) {
    warnings.push(`TIGER_UNSUPPORTED_SEC_TYPE:${symbol}:${secType}`)
    return { holding: null }
  }
  const market = marketOf(row)
  const currency = (text(pick(row, CURRENCY_FIELDS)) || CURRENCY_BY_MARKET[market] || 'HKD').toUpperCase()
  const price = number(pick(row, PRICE_FIELDS))
  // 未知成本保留为 null，不伪造、也不跳过该行。
  const cost = number(pick(row, COST_FIELDS))
  return {
    holding: {
      symbol,
      name: text(pick(row, NAME_FIELDS)) || symbol,
      market: secType === 'FUND' ? 'FUND' : (market || 'US'),
      assetClass: secType === 'FUND' ? 'fund' : 'stock',
      currency,
      qty,
      avgCost: cost,
      manualPrice: price,
      externalId: symbol,
    },
  }
}

export async function fetchTigerSnapshot(source, secrets, signal, deps = {}) {
  const account = text(source?.brokerAccountId)
  if (!account) fail('请选择老虎账户')
  const mcp = createClient(secrets, signal, deps)
  try {
    const warnings = []
    // v2 分段覆盖：complete 由覆盖率派生。缺价格/缺成本只影响展示，不影响覆盖。
    const coverage = { cash: 'full', stock: 'full', fund: 'full' }
    const authError = (error) => /认证|授权|401|403|expired|unauthor/i.test(String(error?.message || error))
    // 不要传 base_currency：服务端只接受具体币种（baseCurrency，camelCase），
    // 传 ALL/下划线会被整段拒绝；segments 本身按币种返回。
    const assets = await mcp.call('get_assets', { account }).catch((error) => {
      if (authError(error)) throw error
      coverage.cash = 'failed'
      warnings.push('TIGER_ASSET_SUMMARY_UNAVAILABLE:老虎资产汇总读取失败：' + String(error?.message || error))
      return null
    })
    const positions = []
    for (const secType of ['STK', 'FUND']) {
      const segment = secType === 'STK' ? 'stock' : 'fund'
      try {
        const payload = await mcp.call('get_positions', { account, sec_type: secType, limit: 200 })
        const { rows, malformed } = positionRows(payload)
        if (malformed > 0) coverage[segment] = 'partial'
        if (rows.length >= 200) {
          coverage[segment] = 'partial'
          warnings.push(`TIGER_POSITIONS_PAGE_LIMIT:${secType} 可能被截断，请拆分账户查看`)
        }
        positions.push(...rows)
      } catch (error) {
        if (authError(error)) throw error
        coverage[segment] = 'failed'
        const label = secType === 'STK' ? '股票' : '基金'
        warnings.push(`TIGER_${secType}_POSITIONS_UNAVAILABLE:老虎${label}持仓读取失败：` + String(error?.message || error))
      }
    }

    const seen = new Set()
    const holdings = []
    for (const row of positions) {
      const { holding } = positionToHolding(row, warnings)
      if (!holding) continue
      const key = holding.market + ':' + holding.symbol + ':' + holding.currency
      if (seen.has(key)) continue
      seen.add(key)
      holdings.push(holding)
    }
    const summary = assets ? assetSummary(assets) : { total: null, cash: [], unrealized: null }
    // 快照契约：qty 必须非负（与富途一致）。负现金是融资负债，不能作为持仓行，
    // 用警告明示，来源总资产（sourceTotals）仍如实保存。
    const cash = summary.cash.filter((row) => row.cash > 0)
    for (const debt of summary.cash.filter((row) => row.cash < 0)) {
      warnings.push(`TIGER_MARGIN_CASH:${debt.currency} ${debt.cash} 融资负债未计入现金行，持仓合计会比来源总资产偏高`)
    }
    for (const row of cash) {
      const key = 'CASH:' + row.currency
      if (seen.has(key)) continue
      seen.add(key)
      holdings.push({ symbol: 'CASH:' + row.currency, name: row.currency + ' cash', market: 'CASH', assetClass: 'cash', currency: row.currency, qty: row.cash, avgCost: 1, manualPrice: 1, externalId: key })
    }
    if (!holdings.length) fail('老虎 MCP 没有返回任何持仓或现金；请确认授权账户内有资产')

    const sourceTotals = {}
    if (summary.total !== null) sourceTotals.totalAsset = summary.total
    const cashCurrencies = new Set(summary.cash.map((row) => row.currency))
    // 负现金是融资负债（已由 TIGER_MARGIN_CASH 告警说明），不能作为现金合计，否则整份快照被拒。
    const cashSum = summary.cash.reduce((sum, row) => sum + row.cash, 0)
    if (cashCurrencies.size === 1 && cashSum >= 0) sourceTotals.cash = cashSum
    else if (cashCurrencies.size > 1) warnings.push(`TIGER_MIXED_CURRENCY_TOTALS:现金涉及 ${[...cashCurrencies].join('/')} 多个币种，未汇总 cash`)
    if (summary.unrealized !== null) sourceTotals.holdingProfit = summary.unrealized

    const priced = holdings.filter((h) => h.market !== 'CASH').every((h) => h.manualPrice != null)
    if (!priced) warnings.push('部分证券缺少现价，按成本暂估')
    if (!summary.cash.length && holdings.some((h) => h.market !== 'CASH')) warnings.push('来源未提供现金明细，现金行缺失')

    return {
      holdings,
      coverage,
      warnings,
      queriedAt: new Date(deps.now?.() ?? Date.now()).toISOString(),
      uploadedAt: null,
      quoteDate: null,
      ...(Object.keys(sourceTotals).length ? { sourceTotals } : {}),
    }
  } finally { await mcp.dispose() }
}

// ---------- history ----------

function canonicalFlow(row) {
  return {
    date: row.date, time: row.time || null, kind: row.kind, originalType: row.originalType || null,
    symbol: row.symbol || null, name: row.name || null, market: row.market || null, currency: row.currency,
    qty: row.qty ?? null, price: row.price ?? null, grossAmount: row.grossAmount ?? null,
    cashAmount: row.cashAmount ?? null, fee: row.fee ?? null, externalId: row.externalId ?? null, note: row.note || null,
  }
}

function mapTransaction(row, warnings) {
  if (!row || typeof row !== 'object') return null
  // 订单行（get_orders）里未成交 / 已撤 / 已拒绝的委托不产生流水。
  const status = String(text(pick(row, ['status', 'order_status', 'orderStatus', 'state'])) || '').toLowerCase()
  if (status && !/fill|deal|execut|partial|complete|success/.test(status) && /cancel|reject|expire|invalid|pending|wait|new|submit|plac|init/.test(status)) return null
  const secType = String(text(pick(row, ['sec_type', 'secType', 'security_type'])) || 'STK').toUpperCase()
  if (!['STK', 'FUND', 'ETF'].includes(secType)) { warnings.push(`TIGER_HISTORY_UNSUPPORTED:${pick(row, CODE_FIELDS) || '?'}`); return null }
  const action = String(text(pick(row, ['action', 'side', 'trade_side', 'direction', 'order_side'])) || '').toUpperCase()
  const when = timestamp(pick(row, ['trade_time', 'tradeTime', 'filled_time', 'filledTime', 'create_time', 'created_time', 'order_time', 'updated_time', 'time']))
  const symbol = text(pick(row, CODE_FIELDS))
  const qty = number(pick(row, ['filled_quantity', 'filledQuantity', 'executed_quantity', 'quantity', 'qty']))
  const price = number(pick(row, ['filled_price', 'filledPrice', 'avg_fill_price', 'avgFillPrice', 'average_fill_price', 'avg_price', 'average_cost', 'order_price', 'price']))
  const externalId = text(pick(row, ['id', 'transaction_id', 'transactionId', 'trade_id', 'tradeId', 'order_id', 'orderId']))
  if (!when || !symbol || qty === null || price === null) { warnings.push('TIGER_HISTORY_INCOMPLETE_ROW'); return null }
  let kind = null
  if (/^BUY|买/.test(action)) kind = 'buy'
  else if (/^SELL|卖/.test(action)) kind = 'sell'
  if (!kind) { warnings.push(`TIGER_HISTORY_UNKNOWN_ACTION:${action || '?'}:${symbol}`); return null }
  if (!isFlowKind(kind)) return null
  const market = secType === 'FUND' ? 'FUND' : (marketOf(row) || 'US')
  const currency = (text(pick(row, CURRENCY_FIELDS)) || CURRENCY_BY_MARKET[market] || 'USD').toUpperCase()
  const fee = number(pick(row, ['commission', 'fee', 'total_fee', 'totalFee']))
  const sign = cashSignOf(kind)
  return canonicalFlow({
    ...when, kind, originalType: action || null, symbol, name: text(pick(row, NAME_FIELDS)) || symbol,
    market, currency, qty, price, grossAmount: qty * price,
    cashAmount: sign == null ? null : sign * Math.abs(qty * price + (fee || 0)),
    fee: fee ?? null, externalId,
    note: text(pick(row, ['remark', 'note'])) || null,
  })
}

export async function fetchTigerHistory(source, secrets, range, signal, deps = {}) {
  const account = text(source?.brokerAccountId)
  if (!account) fail('请选择老虎账户')
  const from = String(range?.from || ''), to = String(range?.to || '')
  const startMs = Date.parse(from + 'T00:00:00Z'), endMs = Date.parse(to + 'T23:59:59Z')
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) fail('开始日期不能晚于结束日期')
  const mcp = createClient(secrets, signal, deps)
  try {
    const warnings = []
    const rows = []
    let pageToken = null, pages = 0
    do {
      // get_transactions 只能按 order_id 或 symbol 查；账户级历史用 get_orders 翻页，
      // 已成交委托再映射成买卖流水（字段与成交记录基本一致）。
      const payload = await mcp.call('get_orders', {
        account, start_time: startMs, end_time: endMs, limit: 100,
        ...(pageToken ? { page_token: pageToken } : {}),
      })
      const list = Array.isArray(payload) ? payload : (payload?.orders || payload?.items || [])
      for (const item of list) {
        const mapped = mapTransaction(item, warnings)
        if (mapped) rows.push(mapped)
      }
      pageToken = text(payload?.next_page_token) || text(payload?.nextPageToken)
      pages++
      if (pages >= 50 && pageToken) fail('老虎流水超过 5000 条，请按日期拆分回补')
    } while (pageToken)

    const unique = new Map()
    for (const row of rows) {
      const key = row.externalId || JSON.stringify([row.date, row.time, row.kind, row.symbol, row.qty, row.price])
      if (!unique.has(key)) unique.set(key, row)
    }
    const result = [...unique.values()].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
    return {
      rows: result, errors: [], warnings,
      coverage: {
        complete: false,
        note: `已读取老虎 ${from} 至 ${to} 的成交记录；费用、分红、出入金等非成交记录可能缺失，可用券商账单文件补充。`,
        observedFrom: result.length ? result[0].date : null,
        observedTo: result.length ? result[result.length - 1].date : null,
      },
    }
  } finally { await mcp.dispose() }
}

export function tigerMcpFingerprintPart(secrets = {}) {
  const value = String(secrets.clientId || '')
  return value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : ''
}
