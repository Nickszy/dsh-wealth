// Qieman / 盈米 MCP browser OAuth login (dynamic client registration + PKCE +
// loopback redirect). The 账户与资产 tools are only exposed after a user-scoped
// OAuth authorization; an API key alone reaches research tools only.
// On success onToken receives { accessToken, refreshToken, clientId, expiresIn, scope }
// which the host stores in the encrypted credentials vault (bearerToken + refresh).
import { spawn } from 'node:child_process'
import * as http from 'node:http'
import { randomUUID } from 'node:crypto'
import { registerQiemanClient, buildQiemanAuthorizeUrl, createQiemanPkce, exchangeQiemanCode } from './qieman-mcp.mjs'

const sleep = (ms, signal) => new Promise((res, rej) => {
  const cancel = () => { clearTimeout(timer); rej(new Error('cancelled')) }
  const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); res() }, ms)
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
})
function bounded(promise, ms, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => finish(reject, new Error('cancelled'))
    const timer = setTimeout(() => finish(reject, new Error('timeout')), ms)
    const finish = (fn, value) => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); fn(value) }
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) cancel()
    Promise.resolve(promise).then(v => finish(resolve, v), e => finish(reject, e))
  })
}
function openBrowser(url, deps = {}) {
  const spawnImpl = deps.spawn ?? spawn
  try {
    if (process.platform === 'win32') spawnImpl('rundll32', ['url.dll,FileProtocolHandler', url], { stdio: 'ignore', shell: false, windowsHide: true }).unref?.()
    else if (process.platform === 'darwin') spawnImpl('open', [url], { stdio: 'ignore', shell: false }).unref?.()
    else spawnImpl('xdg-open', [url], { stdio: 'ignore', shell: false }).unref?.()
  } catch { /* opening the browser is best-effort; the URL is also returned so the caller can show it */ }
}

const PAGE = (title, body) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1f2937"><h2>${title}</h2><p style="color:#4b5563;line-height:1.7">${body}</p></body></html>`

/**
 * Loopback OAuth login. `start()` resolves to { status, authorizeUrl } once the
 * browser is opened; the exchange happens in the background and onToken is called
 * on success. Poll `status()` for `ready` / `error` / `timeout`.
 */
export function createQiemanLogin(options = {}) {
  const { onToken } = options
  if (typeof onToken !== 'function') throw new TypeError('onToken is required')
  let current = { status: 'idle', message: '点击授权后会在浏览器中打开且慢登录页' }
  let disposed = false, starting, running, server, control, savePending = false
  const status = () => ({ ...current })

  function startServer(signal) {
    return new Promise((resolve, reject) => {
      const srv = (options.http ?? http).createServer()
      let callbackResolve, callbackReject
      const callback = new Promise((res, rej) => { callbackResolve = res; callbackReject = rej })
      const cleanup = () => { try { srv.close() } catch {} }
      signal?.addEventListener('abort', () => { cleanup(); reject(new Error('cancelled')); callbackReject(new Error('cancelled')) }, { once: true })
      srv.on('error', err => reject(err))
      srv.on('request', (req, res) => {
        let url
        try { url = new URL(req.url, 'http://127.0.0.1') } catch { res.writeHead(400); res.end('bad request'); return }
        if (url.pathname !== '/callback') { res.writeHead(404); res.end('not found'); return }
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        if (error) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
          res.end(PAGE('授权未完成', `盈米返回错误：${errorDescription || error}。请回到 the agent harness 重试。`))
          callbackReject(new Error('且慢授权被拒绝：' + (errorDescription || error))); return
        }
        if (!code) { res.writeHead(400); res.end(PAGE('缺少授权码', '回调未携带 code 参数，请重试。')); return }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(PAGE('授权完成', '已收到且慢授权，可以关闭本页面并回到 the agent harness。'))
        callbackResolve({ code, state })
      })
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port
        resolve({ server: srv, port, redirectUri: `http://127.0.0.1:${port}/callback`, close: cleanup, callback })
      })
    })
  }

  async function run(signal) {
    const deps = options.deps ?? {}
    current = { status: 'starting', message: '正在准备且慢授权（注册客户端）…' }
    const loop = await bounded(startServer(signal), options.startupTimeoutMs ?? 20000, signal)
    server = loop.server
    const registration = await bounded(registerQiemanClient({ redirectUri: loop.redirectUri, signal, deps }), options.networkTimeoutMs ?? 20000, signal)
    const pkce = createQiemanPkce()
    const state = randomUUID()
    const authorizeUrl = buildQiemanAuthorizeUrl({ clientId: registration.clientId, redirectUri: loop.redirectUri, challenge: pkce.challenge, state })
    current = { status: 'waiting', message: '请在浏览器中用且慢账号登录并授权；完成后会自动返回', authorizeUrl, clientId: registration.clientId, redirectUri: loop.redirectUri }
    openBrowser(authorizeUrl, options)
    const result = await bounded(loop.callback, options.timeoutMs ?? 300000, signal)
    if (result.state !== state) throw new Error('且慢授权回调 state 校验失败，请重试')
    current = { status: 'starting', message: '已获取授权码，正在兑换令牌…' }
    const token = await bounded(exchangeQiemanCode({ code: result.code, clientId: registration.clientId, redirectUri: loop.redirectUri, verifier: pkce.verifier, signal, deps }), options.networkTimeoutMs ?? 20000, signal)
    if (signal.aborted) throw new Error('cancelled')
    savePending = true
    await bounded(Promise.resolve().then(() => onToken({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      clientId: registration.clientId,
      expiresIn: token.expiresIn,
      scope: token.scope,
      redirectUri: loop.redirectUri,
    })), options.saveTimeoutMs ?? 30000, signal)
    savePending = false
    if (!signal.aborted) current = { status: 'ready', message: '且慢授权已保存，请继续读取来源账户' }
  }

  return {
    status,
    start() {
      if (disposed) return Promise.resolve({ status: 'disposed', message: '授权服务已关闭' })
      if (starting) return starting
      if (running || savePending) return Promise.resolve(status())
      starting = (async () => {
        control = new AbortController()
        const signal = options.signal ? AbortSignal.any([control.signal, options.signal, AbortSignal.timeout(options.timeoutMs ?? 300000)]) : AbortSignal.any([control.signal, AbortSignal.timeout(options.timeoutMs ?? 300000)])
        running = run(signal).catch(error => {
          if (!disposed) current = { status: signal.aborted ? 'timeout' : 'error', message: signal.aborted ? '且慢授权等待超时，请重试' : '且慢授权失败：' + (error?.message || 'unknown') }
        }).finally(() => { running = undefined; savePending = false; try { server?.close() } catch {} })
        for (let i = 0; i < 200 && !current.authorizeUrl && running && !['error', 'timeout'].includes(current.status); i++) await (options.sleep ?? sleep)(50, control.signal).catch(() => {})
        return status()
      })().finally(() => { starting = undefined })
      return starting
    },
    async dispose() {
      disposed = true; control?.abort()
      try { server?.close() } catch {}
      current = { status: 'disposed', message: '授权服务已关闭' }
      await starting; await running
    },
  }
}
