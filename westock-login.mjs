// 腾讯自选股 OAuth：本机 127.0.0.1 收回授权码。不注册 workbuddy://，不改系统协议。
import { spawn } from 'node:child_process'
import * as http from 'node:http'
import { randomUUID } from 'node:crypto'
import { registerWestockClient, buildWestockAuthorizeUrl, createWestockPkce, exchangeWestockCode } from './westock-mcp.mjs'

const sleep = (ms, signal) => new Promise((res, rej) => {
  const cancel = () => { clearTimeout(timer); rej(new Error('cancelled')) }
  const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); res() }, ms)
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
})

function openBrowser(url, deps = {}) {
  const spawnImpl = deps.spawn ?? spawn
  try {
    if (process.platform === 'win32') spawnImpl('rundll32', ['url.dll,FileProtocolHandler', url], { stdio: 'ignore', shell: false, windowsHide: true }).unref?.()
    else if (process.platform === 'darwin') spawnImpl('open', [url], { stdio: 'ignore', shell: false }).unref?.()
    else spawnImpl('xdg-open', [url], { stdio: 'ignore', shell: false }).unref?.()
  } catch { /* 打不开浏览器时，调用方仍可展示授权链接 */ }
}

const PAGE = (title, body) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1f2937"><h2>${title}</h2><p style="color:#4b5563;line-height:1.7">${body}</p></body></html>`

/**
 * Loopback OAuth。start() 在授权页地址就绪后返回；换 token 在后台完成。
 * 轮询 status()：waiting / ready / error / timeout。
 */
export function createWestockLogin(options = {}) {
  const { onToken } = options
  if (typeof onToken !== 'function') throw new TypeError('onToken is required')
  let current = { status: 'idle', message: '点击授权后会在浏览器打开腾讯自选股登录页' }
  let disposed = false, starting, running, server, control
  const status = () => ({ ...current })

  function startServer(signal) {
    return new Promise((resolve, reject) => {
      const srv = (options.http ?? http).createServer()
      let callbackResolve, callbackReject
      const callback = new Promise((res, rej) => { callbackResolve = res; callbackReject = rej })
      const cleanup = () => { try { srv.close() } catch { /* already closed */ } }
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
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        if (error) {
          res.end(PAGE('授权未完成', `腾讯自选股返回：${errorDescription || error}。请回到资产页重试。`))
          callbackReject(new Error('腾讯自选股授权被拒绝：' + (errorDescription || error)))
          return
        }
        if (!code) { res.end(PAGE('缺少授权码', '回调没有 code，请重试。')); return }
        res.end(PAGE('授权完成', '已收到授权，可以关闭本页并回到资产页。'))
        callbackResolve({ code, state })
      })
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port
        resolve({ server: srv, redirectUri: `http://127.0.0.1:${port}/callback`, close: cleanup, callback })
      })
    })
  }

  async function run(signal) {
    const deps = options.deps ?? {}
    current = { status: 'starting', message: '正在准备腾讯自选股授权…' }
    const loop = await startServer(signal)
    server = loop.server
    const registration = await registerWestockClient({ redirectUri: loop.redirectUri, fetch: deps.fetch, timeoutMs: deps.timeoutMs, signal })
    const pkce = createWestockPkce()
    const state = randomUUID().replaceAll('-', '')
    const authorizeUrl = buildWestockAuthorizeUrl({ clientId: registration.clientId, redirectUri: loop.redirectUri, state, codeChallenge: pkce.codeChallenge })
    current = { status: 'waiting', message: '请在浏览器完成登录并同意授权，完成后会自动回到本机', authorizeUrl }
    ;(options.openBrowser ?? openBrowser)(authorizeUrl, options)
    const result = await loop.callback
    if (signal.aborted) throw new Error('cancelled')
    if (result.state !== state) throw new Error('授权回调 state 不一致，请重新发起')
    current = { status: 'starting', message: '已收到授权码，正在换取令牌…' }
    const token = await exchangeWestockCode({ code: result.code, clientId: registration.clientId, redirectUri: loop.redirectUri, codeVerifier: pkce.codeVerifier }, { fetch: deps.fetch, timeoutMs: deps.timeoutMs })
    if (signal.aborted) throw new Error('cancelled')
    await onToken({ ...token, clientId: registration.clientId })
    if (!signal.aborted) current = { status: 'ready', message: '腾讯自选股授权已保存' }
  }

  return {
    status,
    start() {
      if (disposed) return Promise.resolve({ status: 'disposed', message: '授权服务已关闭' })
      if (starting) return starting
      if (running) return Promise.resolve(status())
      starting = (async () => {
        control = new AbortController()
        const signal = AbortSignal.any([control.signal, AbortSignal.timeout(options.timeoutMs ?? 300000)])
        running = run(signal).catch(error => {
          if (!disposed) current = { status: signal.aborted ? 'timeout' : 'error', message: signal.aborted ? '授权等待超时，请重试' : String(error?.message || error) }
        }).finally(() => { running = undefined; try { server?.close() } catch { /* already closed */ } })
        for (let i = 0; i < 200 && !current.authorizeUrl && running && !['error', 'timeout'].includes(current.status); i++) await sleep(50, control.signal).catch(() => {})
        return status()
      })().finally(() => { starting = undefined })
      return starting
    },
    async dispose() {
      disposed = true
      control?.abort()
      try { server?.close() } catch { /* already closed */ }
      current = { status: 'disposed', message: '授权服务已关闭' }
      await starting
      await running
    },
  }
}
