// Minimal MCP Streamable HTTP client shared by the 且慢 and 老虎 connectors.
// Only what a read-only snapshot/history adapter needs: initialize, tools/list,
// tools/call. No credentials, storage or scheduling live here.
const DEFAULT_PROTOCOL = '2025-11-25'
const CLIENT_NAME = 'dsh-wealth'
const fail = (message) => { throw new Error(message) }

function endpointUrl(raw, label) {
  let url
  try { url = new URL(String(raw || '').trim()) } catch { fail(label + '地址须为有效的 http(s):// URL') }
  if (!['http:', 'https:'].includes(url.protocol)) fail(label + '地址须以 http(s):// 开头')
  if (url.username || url.password || url.hash) fail(label + '地址不能包含凭据或片段')
  return url.href.replace(/\/+$/, '')
}

function parseSse(text, id) {
  const frames = text.split(/\r?\n\r?\n/)
  let parsed = null
  for (const frame of frames) {
    for (const line of frame.split(/\r?\n/)) {
      if (!/^data:\s?/.test(line)) continue
      const raw = line.replace(/^data:\s?/, '').trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const value = JSON.parse(raw)
        if (value && (value.id === id || value.method || value.result || value.error)) parsed = value
      } catch { /* keep the last parseable frame */ }
    }
  }
  return parsed
}

/**
 * Create an MCP Streamable HTTP client.
 * headers: plain object or async function returning extra headers (used for
 * bearer tokens that may be refreshed between calls).
 */
export function createMcpHttpClient({
  endpoint,
  headers = {},
  protocolVersion = DEFAULT_PROTOCOL,
  signal,
  deps = {},
} = {}) {
  const base = endpointUrl(endpoint, 'MCP ')
  const fetchImpl = deps.fetch || globalThis.fetch
  const timeoutMs = deps.timeoutMs ?? 30000
  const clientVersion = deps.clientVersion || '1.0.0'
  let sessionId = null
  let initialized = false
  let seq = 0
  const guard = () => { if (signal?.aborted) throw signal.reason ?? new Error('MCP 请求已中止') }
  const resolveHeaders = async () => (typeof headers === 'function' ? await headers() : headers) || {}

  async function rpc(method, params, { auth = true, timeout = timeoutMs } = {}) {
    guard()
    seq++
    const id = seq
    const body = { jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }
    const extra = auth ? await resolveHeaders() : {}
    const requestHeaders = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': protocolVersion,
      ...extra,
    }
    if (sessionId) requestHeaders['mcp-session-id'] = sessionId
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('MCP 请求超时')), timeout)
    const onAbort = () => controller.abort(signal.reason ?? new Error('MCP 请求已中止'))
    signal?.addEventListener('abort', onAbort, { once: true })
    let response
    try {
      guard()
      response = await fetchImpl(base, { method: 'POST', headers: requestHeaders, body: JSON.stringify(body), signal: controller.signal, redirect: 'error' })
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) fail('MCP 请求超时')
      throw error
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
    const sid = response.headers.get('mcp-session-id')
    if (sid) sessionId = sid
    if (response.status === 401) fail('MCP 认证失败：凭据无效或已过期')
    if (response.status === 403) fail('MCP 拒绝访问：授权范围不足')
    if (!response.ok) fail('MCP 返回 HTTP ' + response.status)
    const contentType = String(response.headers.get('content-type') || '')
    const payloadText = await response.text()
    guard()
    if (!payloadText.trim()) return null
    let payload
    if (contentType.includes('text/event-stream')) {
      payload = parseSse(payloadText, id)
      if (!payload) fail('MCP 返回了无法解析的 SSE 响应')
    } else {
      try { payload = JSON.parse(payloadText) } catch { fail('MCP 返回了无法解析的响应') }
    }
    if (payload.error) {
      const detail = payload.error.message || payload.error.data || 'unknown error'
      fail('MCP 调用失败：' + detail)
    }
    return payload
  }

  async function ensureSession() {
    if (initialized) return
    const init = await rpc('initialize', {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: CLIENT_NAME, version: clientVersion },
    })
    if (!init?.result?.serverInfo && !init?.result?.protocolVersion) fail('MCP 初始化失败：响应缺少 serverInfo')
    initialized = true
    await rpc('notifications/initialized', undefined, { auth: true, timeout: 8000 })
  }

  function unwrap(result) {
    if (!result) return null
    if (result.structuredContent !== undefined && result.structuredContent !== null) return result.structuredContent
    if (Array.isArray(result.content)) {
      const text = result.content.filter((c) => c && typeof c.text === 'string').map((c) => c.text).join('\n')
      if (!text.trim()) return null
      try { return JSON.parse(text) } catch { return text }
    }
    return result
  }

  async function call(tool, args = {}) {
    guard()
    if (typeof tool !== 'string' || !tool.trim()) fail('MCP 工具名不能为空')
    await ensureSession()
    const response = await rpc('tools/call', { name: tool, arguments: args })
    const result = response?.result
    if (!result) fail('MCP 工具调用没有返回结果')
    if (result.isError) {
      const message = (Array.isArray(result.content) ? result.content : []).map((c) => c?.text || '').join(' ') || 'tool reported an error'
      fail('MCP 工具 ' + tool + ' 调用失败：' + message)
    }
    return unwrap(result)
  }

  async function listTools() {
    await ensureSession()
    const response = await rpc('tools/list', {})
    const tools = response?.result?.tools
    if (!Array.isArray(tools)) fail('MCP 工具列表响应无效')
    return tools
  }

  return {
    call,
    listTools,
    get endpoint() { return base },
    async dispose() { initialized = false; sessionId = null },
  }
}

/** Build a header object for an API-key endpoint (x-api-key) or a bearer token. */
export function mcpAuthHeaders({ apiKey, bearerToken } = {}) {
  const key = String(apiKey || '').trim(), bearer = String(bearerToken || '').trim()
  if (key && bearer) return { 'x-api-key': key, authorization: 'Bearer ' + bearer }
  if (key) return { 'x-api-key': key }
  if (bearer) return { authorization: 'Bearer ' + bearer }
  fail('请填写 MCP API Key 或 Bearer Token')
}

/** Normalise a tool name for tolerant matching (GetUserAssetTree == get_user_asset_tree). */
export function normalizeToolName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Pick the first tool whose normalised name matches one of the candidates. */
export function pickTool(tools, candidates) {
  const wanted = new Set(candidates.map(normalizeToolName))
  return (tools || []).find((tool) => wanted.has(normalizeToolName(tool?.name || tool?.id))) || null
}
