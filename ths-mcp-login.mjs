// 同花顺投资账本一键授权：动态注册 + PKCE + 本机回环，并打开系统默认浏览器。
import { spawn } from 'node:child_process'
import * as http from 'node:http'
import { randomUUID } from 'node:crypto'
import { registerTzzbClient, buildTzzbAuthorizeUrl, createTzzbPkce, exchangeTzzbCode } from './ths-mcp.mjs'

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
    Promise.resolve(promise).then((value) => finish(resolve, value), (error) => finish(reject, error))
  })
}
/** Open the user's default browser — the OAuth flow and the cookie fallback both rely on
 *  the trusted daily profile; a separate scraper window trips 同花顺 risk control. */
export function openBrowser(url, deps = {}) {
  const spawnImpl = deps.spawn ?? spawn
  try {
    if (process.platform === 'win32') spawnImpl('rundll32', ['url.dll,FileProtocolHandler', url], { stdio: 'ignore', shell: false, windowsHide: true }).unref?.()
    else if (process.platform === 'darwin') spawnImpl('open', [url], { stdio: 'ignore', shell: false }).unref?.()
    else spawnImpl('xdg-open', [url], { stdio: 'ignore', shell: false }).unref?.()
  } catch { /* the authorize URL is also returned for a manual click */ }
}
const PAGE = (title, body) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1f2937"><h2>${title}</h2><p style="color:#4b5563;line-height:1.7">${body}</p></body></html>`

export function createThsMcpLogin(options = {}) {
  const { onToken } = options
  if (typeof onToken !== 'function') throw new TypeError('onToken is required')
  let current = { status: 'idle', message: '点击一键授权后会打开同花顺投资账本登录页' }
  let disposed = false
  let starting
  let running
  let server
  let control
  let savePending = false
  const status = () => ({ ...current })

  function startServer(signal) {
    return new Promise((resolve, reject) => {
      const srv = (options.http ?? http).createServer()
      let callbackResolve
      let callbackReject
      const callback = new Promise((res, rej) => { callbackResolve = res; callbackReject = rej })
      const cleanup = () => { try { srv.close() } catch { /* already closed */ } }
      signal?.addEventListener('abort', () => { cleanup(); reject(new Error('cancelled')); callbackReject(new Error('cancelled')) }, { once: true })
      srv.on('error', (err) => reject(err))
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
          res.end(PAGE('授权未完成', '同花顺返回：' + (errorDescription || error) + '。请回到账本重试。'))
          callbackReject(new Error('同花顺授权被拒绝：' + (errorDescription || error)))
          return
        }
        if (!code) { res.writeHead(400); res.end(PAGE('缺少授权码', '回调未携带 code，请重试。')); return }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(PAGE('授权完成', '已收到同花顺投资账本授权，可以关闭本页并回到账本。'))
        callbackResolve({ code, state })
      })
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port
        resolve({ server: srv, redirectUri: 'http://127.0.0.1:' + port + '/callback', close: cleanup, callback })
      })
    })
  }

  async function run(signal) {
    const deps = options.deps ?? {}
    current = { status: 'starting', message: '正在准备同花顺投资账本授权…' }
    const loop = await bounded(startServer(signal), options.startupTimeoutMs ?? 20000, signal)
    server = loop.server
    const registration = await bounded(registerTzzbClient({ redirectUri: loop.redirectUri, signal, deps }), options.networkTimeoutMs ?? 20000, signal)
    const pkce = createTzzbPkce()
    const state = randomUUID()
    const authorizeUrl = buildTzzbAuthorizeUrl({ clientId: registration.clientId, redirectUri: loop.redirectUri, challenge: pkce.challenge, state })
    current = { status: 'waiting', message: '请在浏览器中登录同花顺并同意授权，完成后会自动返回', authorizeUrl }
    openBrowser(authorizeUrl, options)
    const result = await bounded(loop.callback, options.timeoutMs ?? 300000, signal)
    if (result.state !== state) throw new Error('同花顺授权回调校验失败，请重试')
    current = { status: 'starting', message: '已获得授权码，正在保存登录…', authorizeUrl }
    const token = await bounded(exchangeTzzbCode({
      code: result.code,
      clientId: registration.clientId,
      redirectUri: loop.redirectUri,
      verifier: pkce.verifier,
      signal,
      deps,
    }), options.networkTimeoutMs ?? 20000, signal)
    if (signal.aborted) throw new Error('cancelled')
    savePending = true
    await bounded(Promise.resolve().then(() => onToken({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      clientId: registration.clientId,
      expiresIn: token.expiresIn,
      scope: token.scope,
    })), options.saveTimeoutMs ?? 30000, signal)
    savePending = false
    if (!signal.aborted) current = { status: 'ready', message: '同花顺投资账本已连接，可以读取账本' }
  }

  return {
    status,
    start() {
      if (disposed) return Promise.resolve({ status: 'disposed', message: '授权服务已关闭' })
      if (starting) return starting
      if (running || savePending) return Promise.resolve(status())
      starting = (async () => {
        control = new AbortController()
        const signal = options.signal
          ? AbortSignal.any([control.signal, options.signal, AbortSignal.timeout(options.timeoutMs ?? 300000)])
          : AbortSignal.any([control.signal, AbortSignal.timeout(options.timeoutMs ?? 300000)])
        running = run(signal).catch((error) => {
          // 适配器抛出的错误已经带了「同花顺授权失败：」前缀，别再叠一层。
          const detail = String(error?.message || 'unknown')
          if (!disposed) current = { status: signal.aborted ? 'timeout' : 'error', message: signal.aborted ? '等待授权超时，请重试' : detail.startsWith('同花顺授权') ? detail : '同花顺授权失败：' + detail }
        }).finally(() => { running = undefined; savePending = false; try { server?.close() } catch { /* ignore */ } })
        for (let i = 0; i < 200 && !current.authorizeUrl && running && !['error', 'timeout'].includes(current.status); i++) await (options.sleep ?? sleep)(50, control.signal).catch(() => {})
        return status()
      })().finally(() => { starting = undefined })
      return starting
    },
    async dispose() {
      disposed = true
      control?.abort()
      try { server?.close() } catch { /* ignore */ }
      current = { status: 'disposed', message: '授权服务已关闭' }
      await starting
      await running
    },
  }
}
