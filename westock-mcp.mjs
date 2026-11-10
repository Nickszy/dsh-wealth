// 腾讯自选股 westock-mcp（stockbuddy.qq.com）——可选行情数据源，微信/QQ 授权。
// OAuth：动态注册的回调是本机 http://127.0.0.1:端口/callback。浏览器授权后直接跳回，
// 不使用 workbuddy://，也不改系统协议处理。
// 行情：data_kline 日线（fq=qfq 前复权，与东方财富 fqt=1 口径一致）；场外基金净值不在覆盖范围。
import { randomBytes, createHash } from 'node:crypto'
import { createMcpHttpClient } from './mcp-http.mjs'

export const WESTOCK_MCP_ENDPOINT = 'https://stockbuddy.qq.com/cgi/cgi-bin/openai/mcp/mcp'
export const WESTOCK_OAUTH_BASE = 'https://stockbuddy.qq.com/cgi/cgi-bin/openai/mcp/oauth'
export const WESTOCK_OAUTH_REGISTER = WESTOCK_OAUTH_BASE + '/register'
export const WESTOCK_OAUTH_AUTHORIZE = WESTOCK_OAUTH_BASE + '/authorize'
export const WESTOCK_OAUTH_TOKEN = WESTOCK_OAUTH_BASE + '/token'
export const WESTOCK_SCOPE = 'read write'
const LOOPBACK_REDIRECT = /^http:\/\/127\.0\.0\.1:\d+\/callback$/

const fail = (message) => { throw new Error(message) }

async function oauthPost(url, body, { fetch: fetchImpl = globalThis.fetch, timeoutMs = 15000, json = false } = {}) {
  const headers = json
    ? { 'content-type': 'application/json', accept: 'application/json' }
    : { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }
  const response = await fetchImpl(url, {
    method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    body: json ? JSON.stringify(body) : new URLSearchParams(body).toString(),
  })
  const payload = await response.json().catch(() => null)
  const error = payload?.error
  if (!response.ok || error) {
    const detail = typeof error === 'object' && error !== null
      ? (error.error_description || error.error)
      : payload?.error_description || payload?.message
    fail('westock 授权失败：' + (detail || 'HTTP ' + response.status))
  }
  return payload
}

/** 动态客户端注册（RFC 7591）。平台只接受 workbuddy:// 回调 scheme。 */
export async function registerWestockClient({ redirectUri, fetch: fetchImpl, timeoutMs } = {}) {
  const redirect = String(redirectUri || '')
  if (!LOOPBACK_REDIRECT.test(redirect)) fail('westock 授权失败：回调必须是本机 http://127.0.0.1:端口/callback')
  const payload = await oauthPost(WESTOCK_OAUTH_REGISTER, {
    client_name: 'dsh-wealth',
    redirect_uris: [redirect],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: WESTOCK_SCOPE,
  }, { fetch: fetchImpl, timeoutMs, json: true })
  if (!payload?.client_id) fail('westock 授权失败：注册响应缺少 client_id')
  return { clientId: payload.client_id }
}

export function createWestockPkce() {
  const codeVerifier = randomBytes(48).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

/** 授权页地址：浏览器打开后用 QQ / 手机号 / 微信扫码登录。 */
export function buildWestockAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
  const redirect = String(redirectUri || '')
  if (!LOOPBACK_REDIRECT.test(redirect)) fail('westock 授权失败：回调必须是本机 http://127.0.0.1:端口/callback')
  const url = new URL(WESTOCK_OAUTH_AUTHORIZE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirect)
  url.searchParams.set('scope', WESTOCK_SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  // RFC 8707：token 必须绑定到 MCP 资源，否则签发的 token 调 MCP 会 401。
  url.searchParams.set('resource', WESTOCK_MCP_ENDPOINT)
  // 登录页的「微信回跳」分支（网址里带 code 时）只从该参数取回调地址，
  // 缺了它点「同意授权」后不会跳回 workbuddy://，用户就拿不到授权码。
  url.searchParams.set('connector_authorize_url', redirect)
  return url.toString()
}

const mapToken = (payload, fallbackRefresh) => {
  if (!payload?.access_token) fail('westock 授权失败：token 响应缺少 access_token')
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || fallbackRefresh || '',
    expiresAt: Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1000 : 0,
  }
}

export async function exchangeWestockCode({ code, clientId, redirectUri, codeVerifier }, deps = {}) {
  const redirect = String(redirectUri || '')
  if (!LOOPBACK_REDIRECT.test(redirect)) fail('westock 授权失败：回调必须是本机 http://127.0.0.1:端口/callback')
  return mapToken(await oauthPost(WESTOCK_OAUTH_TOKEN, {
    grant_type: 'authorization_code', code, client_id: clientId,
    redirect_uri: redirect, code_verifier: codeVerifier, resource: WESTOCK_MCP_ENDPOINT,
  }, deps))
}

export async function refreshWestockToken({ refreshToken, clientId }, deps = {}) {
  return mapToken(await oauthPost(WESTOCK_OAUTH_TOKEN, {
    grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, resource: WESTOCK_MCP_ENDPOINT,
  }, deps))
}

/** 行情代码映射：sh600519 / sz000651 / hk00700 / usAAPL；场外基金不在覆盖范围。 */
export function westockCode(target) {
  if (!target) return null
  const symbol = String(target.symbol || '').trim()
  const market = String(target.market || '').trim().toUpperCase()
  if (target.kind === 'fund') return null
  if (market === 'CN' && /^\d{6}$/.test(symbol)) return (/^[569]/.test(symbol) ? 'sh' : 'sz') + symbol
  if (market === 'HK' && /^\d{3,5}$/.test(symbol)) return 'hk' + symbol.padStart(5, '0')
  if (market === 'US' && /^[A-Za-z.]{1,8}$/.test(symbol)) return 'us' + symbol.toUpperCase()
  return null
}

const dateText = (value) => {
  const text = String(value ?? '').trim()
  const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!matched) return null
  return `${matched[1]}-${matched[2].padStart(2, '0')}-${matched[3].padStart(2, '0')}`
}
const numberText = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
const DATE_FIELDS = ['date', 'day', 'time', 'tradeDate', 'klineDate', 'datetime']
const CLOSE_FIELDS = ['last', 'close', 'closePrice', 'close_price', 'price']

/**
 * data_kline 返回结构（官方文档口径）：
 * { ok, data: { code, name, nodes: [{ date, open, last, high, low, volume, amount }] } }
 * 字段多为字符串。这里做容错解析：找带日期+收盘价的数组，兼容 items/list 等变体。
 */
export function parseWestockKline(payload) {
  const found = []
  const visit = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > 4) return
    if (Array.isArray(value)) {
      const rows = []
      for (const item of value) {
        if (!item || typeof item !== 'object') continue
        const date = DATE_FIELDS.map((key) => dateText(item[key])).find(Boolean)
        const close = CLOSE_FIELDS.map((key) => numberText(item[key])).find((value) => value !== null)
        if (date && close !== undefined) rows.push([date, close])
      }
      if (rows.length) found.push(rows)
      for (const item of value) visit(item, depth + 1)
      return
    }
    for (const child of Object.values(value)) visit(child, depth + 1)
  }
  visit(payload, 0)
  if (!found.length) return []
  const rows = found.reduce((best, rows) => (rows.length > best.length ? rows : best), [])
  const unique = new Map(rows.map(([d, p]) => [d, p]))
  return [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/** 用户粘贴回来的回调地址 → { code, state }。兼容完整 workbuddy:// URL 或裸 code 参数。 */
export function westockCallbackCode(raw) {
  const text = String(raw || '').trim()
  if (!text) return { code: '', state: '' }
  try {
    const url = new URL(text)
    return { code: url.searchParams.get('code') || '', state: url.searchParams.get('state') || '' }
  } catch { /* not a URL — try raw query/code */ }
  const code = text.match(/(?:^|[?&])code=([^&\s]+)/)
  const state = text.match(/(?:^|[?&])state=([^&\s]+)/)
  return { code: code ? decodeURIComponent(code[1]) : '', state: state ? decodeURIComponent(state[1]) : '' }
}

/** 校验已存 token：能完成 MCP 会话即有效。 */
export async function checkWestockToken(accessToken, deps = {}) {
  if (!accessToken) fail('缺少 westock access token')
  const client = createMcpHttpClient({ endpoint: WESTOCK_MCP_ENDPOINT, headers: { authorization: 'Bearer ' + accessToken }, deps })
  await client.listTools()
  return true
}

/** 取单个标的的日线收盘序列（不缓存）。失败抛错，由调用方决定是否回落。 */
export async function fetchWestockSeries(target, { from = '2015-01-01', to, accessToken, fetch: fetchImpl, timeoutMs, deps } = {}) {
  const code = westockCode(target)
  if (!code || !accessToken) return []
  const client = createMcpHttpClient({
    endpoint: WESTOCK_MCP_ENDPOINT,
    headers: { authorization: 'Bearer ' + accessToken },
    deps: {
      ...(deps || {}),
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
      ...(Number.isFinite(timeoutMs) ? { timeoutMs } : {}),
    },
  })
  const payload = await client.call('data_kline', { code, period: 'day', fq: 'qfq', start: from, end: to, limit: 5000 })
  return parseWestockKline(payload).filter(([date]) => date >= from && (!to || date <= to))
}
