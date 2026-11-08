// Shared MCP Streamable HTTP client tests. Synthetic transport only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMcpHttpClient, mcpAuthHeaders, normalizeToolName, pickTool } from './mcp-http.mjs'

function jsonDeps(responses) {
  const calls = []
  let sessionId = null
  return {
    calls,
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url, headers: init.headers, body })
      if (body.method === 'initialize') {
        sessionId = 'sess-x'
        return { ok: true, status: 200, headers: { get: h => h === 'mcp-session-id' ? sessionId : (h === 'content-type' ? 'application/json' : null) }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'test', version: '1' } } }) }
      }
      if (body.method === 'notifications/initialized') return { ok: true, status: 202, headers: { get: () => null }, text: async () => '' }
      const handler = responses[body.method === 'tools/call' ? body.params?.name : body.method]
      if (!handler) return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'application/json' : null }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'no handler for ' + (body.params?.name || body.method) } }) }
      const value = await handler(body.params?.arguments || {}, calls.length)
      return { ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'application/json' : null }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(value) }] } }) }
    },
  }
}

test('MCP client: initialize, session header, structured call and dynamic headers', async () => {
  const tokens = ['tok-1', 'tok-2']
  const deps = jsonDeps({ echo: (args) => ({ ...args, done: true }) })
  const client = createMcpHttpClient({
    endpoint: 'https://mcp.test/mcp',
    headers: async () => ({ authorization: 'Bearer ' + tokens[Math.min(tokens.length - 1, deps.calls.length)] }),
    deps,
  })
  try {
    const result = await client.call('echo', { a: 1 })
    assert.equal(result.done, true)
    assert.equal(deps.calls[0].headers['mcp-protocol-version'].length > 5, true)
    assert.equal(deps.calls[2].headers['mcp-session-id'], 'sess-x')
    assert.equal(deps.calls[0].headers.authorization, 'Bearer tok-1')
    assert.equal(deps.calls[1].headers.authorization, 'Bearer tok-2')
  } finally { await client.dispose() }
})

test('MCP client rejects invalid endpoint and 401', async () => {
  assert.throws(() => createMcpHttpClient({ endpoint: 'not-a-url', deps: jsonDeps({}) }), /http/)
  assert.throws(() => createMcpHttpClient({ endpoint: 'ftp://x', deps: jsonDeps({}) }), /http/)
  const deps = jsonDeps({})
  deps.fetch = async () => ({ ok: false, status: 401, headers: { get: () => null }, text: async () => 'no' })
  await assert.rejects(() => createMcpHttpClient({ endpoint: 'https://mcp.test/mcp', headers: { authorization: 'Bearer t' }, deps }).call('x', {}), /认证失败/)
})

test('mcpAuthHeaders and tool-name matching', () => {
  assert.deepEqual(mcpAuthHeaders({ apiKey: 'k' }), { 'x-api-key': 'k' })
  assert.deepEqual(mcpAuthHeaders({ bearerToken: 'b' }), { authorization: 'Bearer b' })
  assert.throws(() => mcpAuthHeaders({}), /API Key/)
  assert.equal(normalizeToolName('GetUser_Asset-Tree'), 'getuserassettree')
  const tools = [{ name: 'get_user_asset_tree' }, { name: 'other' }]
  assert.equal(pickTool(tools, ['GetUserAssetTree']).name, 'get_user_asset_tree')
  assert.equal(pickTool(tools, ['missing']), null)
})
