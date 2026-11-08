import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { listThsAccounts, thsCookieIdentity } from './ths-client.mjs'

const LOGIN_URL = 'https://tzzb.10jqka.com.cn'
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
    Promise.resolve(promise).then(v => finish(resolve, v), () => finish(reject, new Error('operation failed')))
  })
}
function candidates() {
  if (process.platform === 'win32') return ['Microsoft/Edge/Application/msedge.exe', 'Google/Chrome/Application/chrome.exe'].flatMap(p => [process.env['PROGRAMFILES(X86)'], process.env.PROGRAMFILES, process.env.LOCALAPPDATA].filter(Boolean).map(root => join(root, p)))
  if (process.platform === 'darwin') return ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  return ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
}
async function connectCdp(url, deps, signal) {
  const WebSocketImpl = deps.WebSocket ?? globalThis.WebSocket ?? (await import('ws')).default
  const socket = new WebSocketImpl(url)
  const pending = new Map()
  let sequence = 0, failed = false
  const listen = (name, handler) => socket.addEventListener(name, handler)
  const stop = () => {
    failed = true
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('browser disconnected')) }
    pending.clear()
  }
  listen('error', stop); listen('close', stop)
  listen('message', event => {
    let message
    try { message = JSON.parse(String(event.data)) } catch { stop(); socket.close(); return }
    const p = pending.get(message.id)
    if (!p) return
    pending.delete(message.id); clearTimeout(p.timer)
    if (message.error) p.reject(new Error('browser operation failed')); else p.resolve(message.result)
  })
  try {
    await bounded(new Promise((res, rej) => { listen('open', res); listen('error', () => rej(new Error('connection failed'))) }), deps.cdpTimeoutMs ?? 10000, signal)
  } catch { socket.close(); throw new Error('browser connection failed') }
  return {
    send(method, params = {}) {
      if (failed) return Promise.reject(new Error('browser disconnected'))
      return new Promise((resolve, reject) => {
        const id = ++sequence
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('browser operation timeout')) }, deps.cdpTimeoutMs ?? 10000)
        pending.set(id, { resolve, reject, timer })
        try { socket.send(JSON.stringify({ id, method, params })) } catch { stop() }
      })
    },
    dispose() { stop(); socket.close() },
  }
}
/** Creates a new visible browser; never attaches to an existing user's browser/profile. */
export async function launchThsBrowser(url = LOGIN_URL, deps = {}) {
  if (url !== LOGIN_URL) throw new Error('Unsupported login URL')
  const io = deps.fs ?? fs, signal = deps.signal
  let executable
  for (const candidate of deps.browserCandidates ?? candidates()) {
    try { await io.access(candidate); executable = candidate; break } catch {}
  }
  if (!executable) throw new Error('未找到 Chrome 或 Edge，可手动填写 Cookie')
  const root = resolve(deps.tempDir ?? tmpdir())
  const profile = await io.mkdtemp(join(root, 'dsh-portfolio-ths-'))
  // Verify the exact created directory before any recursive removal.
  const ownedPath = resolve(profile)
  if (dirname(ownedPath) !== root || !basename(ownedPath).startsWith('dsh-portfolio-ths-')) throw new Error('临时目录校验失败')
  const realProfile = await io.realpath(ownedPath)
  let child, cdp, exited = false, exitResolve, closing, removing
  const exit = new Promise(res => { exitResolve = res })
  const remove = () => removing ??= (async () => {
    const stat = await io.lstat(ownedPath).catch(e => { if (e.code === 'ENOENT') return null; throw e })
    if (!stat) return
    if (stat.isSymbolicLink() || !stat.isDirectory() || await io.realpath(ownedPath) !== realProfile) throw new Error('临时目录校验失败')
    await io.rm(ownedPath, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
  })().finally(() => { removing = undefined })
  const didExit = () => { if (exited) return; exited = true; exitResolve(); cdp?.dispose(); remove().catch(() => {}) }
  const browser = {
    cookies: async () => { if (!cdp || exited) throw new Error('browser closed'); return (await cdp.send('Storage.getCookies')).cookies },
    isClosed: async () => exited || !(await cdp.send('Target.getTargets')).targetInfos.some(t => t.type === 'page'),
    close() {
      return closing ??= (async () => {
        let killer
        try {
          if (!exited && child) {
            if (cdp) cdp.send('Browser.close').catch(() => {}); else child.kill()
            killer = setTimeout(() => { if (!exited) child.kill() }, deps.killMs ?? 1000)
            await bounded(exit, deps.closeTimeoutMs ?? 5000)
          }
          if (!child || exited) await remove()
        } finally { clearTimeout(killer); cdp?.dispose() }
      })().finally(() => { closing = undefined })
    },
  }
  try {
    child = (deps.spawn ?? spawn)(executable, [`--user-data-dir=${ownedPath}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-mode', '--new-window', LOGIN_URL], { stdio: 'ignore', shell: false, windowsHide: false })
    child.once('exit', didExit); child.once('error', didExit)
    const started = Date.now()
    while (!cdp) {
      if (signal?.aborted || exited || Date.now() - started > (deps.startupTimeoutMs ?? 15000)) throw new Error('browser startup failed')
      let text
      try { text = await io.readFile(join(ownedPath, 'DevToolsActivePort'), 'utf8') } catch {}
      if (text) {
        const [port, path] = text.trim().split(/\r?\n/)
        if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535 || !/^\/devtools\/browser\/[A-Za-z0-9-]+$/.test(path)) throw new Error('browser endpoint invalid')
        cdp = await connectCdp(`ws://127.0.0.1:${port}${path}`, deps, signal)
      } else await (deps.sleep ?? sleep)(100, signal)
    }
    return browser
  } catch {
    try { await browser.close() } catch { const error = new Error('登录浏览器未能启动，清理仍在等待窗口退出'); error.browser = browser; throw error }
    throw new Error('登录浏览器未能启动，可手动填写 Cookie')
  }
}
export function thsCookiesToHeader(cookies) {
  if (!Array.isArray(cookies)) throw new Error('Invalid browser cookies')
  const fields = new Map()
  const now = Date.now() / 1000
  for (const cookie of cookies) {
    const domain = typeof cookie.domain === 'string' ? cookie.domain.toLowerCase().replace(/^\./, '') : ''
    if (!(domain === '10jqka.com.cn' || domain.endsWith('.10jqka.com.cn'))) continue
    if (cookie.expires > 0 && cookie.expires <= now) continue
    if (typeof cookie.name !== 'string' || !/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(cookie.name) || typeof cookie.value !== 'string' || /[;\r\n\0]/.test(cookie.value)) continue
    if (fields.has(cookie.name) && fields.get(cookie.name) !== cookie.value) throw new Error('Ambiguous browser cookie')
    fields.set(cookie.name, cookie.value)
  }
  const header = [...fields].map(([k, v]) => `${k}=${v}`).join('; ')
  thsCookieIdentity(header)
  // userid alone may be stale; require a browser auth/anti-bot field and verify via API.
  if (!['v', 'ticket', 'user', 'sessionid', 'sid', 'PHPSESSID'].some(name => fields.get(name)?.trim())) throw new Error('Login pending')
  return header
}
/** Parent routes start/status return these safe objects; Cookie only enters onCookie. */
export function createThsLogin(options = {}) {
  const { onCookie } = options
  if (typeof onCookie !== 'function') throw new TypeError('onCookie is required')
  let current = { status: 'idle', message: '请登录同花顺，或手动填写 Cookie' }
  let disposed = false, starting, running, browser, control, savePending = false
  const cleanup = new Set()
  const status = () => ({ ...current })
  const close = async owned => {
    if (!owned) return true
    cleanup.add(owned)
    try { await bounded(owned.close(), options.cleanupTimeoutMs ?? 10000); cleanup.delete(owned); return true } catch { return false }
  }
  const cleanAll = async () => { for (const owned of [...cleanup]) await close(owned) }
  async function acquire(owned, signal) {
    try {
      while (!signal.aborted) {
        if (await bounded(owned.isClosed(), options.operationTimeoutMs ?? 15000, signal)) throw new Error('closed')
        const cookies = await bounded(owned.cookies(), options.operationTimeoutMs ?? 15000, signal)
        let cookie
        try { cookie = thsCookiesToHeader(cookies) } catch {}
        if (cookie) {
          // Authoritative verification also checks expiry and userid acceptance upstream.
          await bounded((options.verifyCookie ?? (value => listThsAccounts({}, { cookie: value }, signal, options)))(cookie, signal), options.operationTimeoutMs ?? 15000, signal)
          if (signal.aborted) break
          savePending = true
          const saving = Promise.resolve().then(() => { if (signal.aborted) throw new Error('cancelled'); return onCookie(cookie) }).finally(() => { savePending = false })
          await bounded(saving, options.saveTimeoutMs ?? 30000, signal)
          if (!signal.aborted) current = { status: 'saved', message: '同花顺登录已保存，请选择账本' }
          return
        }
        await (options.sleep ?? sleep)(options.pollMs ?? 1000, signal)
      }
    } catch {
      if (!disposed) current = { status: signal.aborted ? 'timeout' : 'failed', message: signal.aborted ? '等待登录超时或已取消，请重试；也可手动填写 Cookie' : '未能完成同花顺登录，请重试或手动填写 Cookie' }
    } finally {
      const cleaned = await close(owned)
      if (!cleaned && !disposed) current = { status: 'cleanup_pending', message: '请关闭本次登录窗口后重试清理；临时登录数据尚未清理完成' }
      if (browser === owned) browser = undefined
    }
  }
  return {
    status,
    start() {
      if (disposed) return Promise.resolve({ status: 'disposed', message: '登录服务已关闭' })
      if (starting) return starting
      if (running || savePending) return Promise.resolve(status())
      starting = (async () => {
        await cleanAll()
        if (cleanup.size) { current = { status: 'cleanup_pending', message: '请先关闭上次登录窗口，再重试' }; return status() }
        control = new AbortController()
        const signal = options.signal ? AbortSignal.any([control.signal, options.signal, AbortSignal.timeout(options.timeoutMs ?? 600000)]) : AbortSignal.any([control.signal, AbortSignal.timeout(options.timeoutMs ?? 600000)])
        current = { status: 'starting', message: '正在打开同花顺登录窗口' }
        const launch = Promise.resolve().then(() => (options.launchBrowser ?? launchThsBrowser)(LOGIN_URL, { ...options, signal }))
        // A late successful launch must still close after abort/dispose.
        launch.then(owned => { if (signal.aborted || disposed) close(owned) }, error => {
          // Launch errors can retain an owned child awaiting exit. Do not lose its
          // cleanup handle when bounded() intentionally redacts the raw error.
          if (error?.browser) close(error.browser)
        })
        try {
          browser = await bounded(launch, options.startupTimeoutMs ?? 20000, signal)
          if (signal.aborted || disposed) { await close(browser); browser = undefined; return status() }
          current = { status: 'acquiring', message: '请在新打开的窗口登录同花顺，完成后将自动保存' }
          running = acquire(browser, signal).finally(() => { running = undefined })
        } catch (error) {
          control.abort()
          if (error.browser) await close(error.browser)
          if (!disposed) current = cleanup.size
            ? { status: 'cleanup_pending', message: '请关闭本次登录窗口后重试清理；临时登录数据尚未清理完成' }
            : { status: 'failed', message: '无法启动登录窗口，请确认已安装 Chrome 或 Edge；也可手动填写 Cookie' }
        }
        return status()
      })().finally(() => { starting = undefined })
      return starting
    },
    async dispose() {
      disposed = true; control?.abort()
      current = { status: 'disposed', message: '登录服务已关闭' }
      await starting; await running
      if (browser) await close(browser)
      await cleanAll()
    },
  }
}
