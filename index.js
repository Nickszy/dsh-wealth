/**
 * dsh-portfolio — host half.
 * Serves the local ledger over `/portfolio/api/*` so the plugin page (client.js)
 * can read and edit it, and so any local script can POST operations.
 * The AI (资产管家 / any agent) edits the same store through cli.mjs.
 */
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { load, save, applyOp, summarize, OpError, DATA_DIR } from './store.mjs'

const VERSION = (() => {
  try { return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version } catch { return '0.0.0' }
})()
import { refreshQuotes } from './quotes.mjs'
import { forecast } from './forecast.mjs'
import { billSummary } from './bills.mjs'
import { parseBillCsv, billPreview } from './bills-import.mjs'
import { buildDigest } from './digest.mjs'
import { computePerformance } from './performance.mjs'
import { inferredTransfers } from './timeline.mjs'
import { previewImport } from './importer.mjs'
import { modelInfo, chatTurn, applyChatOps } from './chat.mjs'
import { createSyncService } from './sync.mjs'
import { startTigerDeviceAuth, pollTigerDeviceToken } from './tiger-mcp.mjs'
import { createTigerLogin } from './tiger-login.mjs'
import { createQiemanLogin } from './qieman-login.mjs'
import { generateFosunClientKey, fosunTicketCreate, checkFosunApiKey, verifyFosunCredentials } from './fosun-client.mjs'
import { checkThsToken, THS_ADMIN_URL } from './ths-data.mjs'
import { refreshWestockToken } from './westock-mcp.mjs'
import { createWestockLogin } from './westock-login.mjs'
import qrcode from 'qrcode-generator'
import { createCredentialStore } from './credentials.mjs'
import { createThsMcpLogin, openBrowser } from './ths-mcp-login.mjs'
import { createFutuLogin } from './futu-login.mjs'
import { createHistoryService } from './history.mjs'
import { analyze, scopeLedger } from './analytics.mjs'

export const name = 'dsh-wealth'
export const inject = ['webServer']

function readBody(req, limit = 5_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj))
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.length), 'cache-control': 'no-store' })
  res.end(body)
}

function isLoopback(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]' || hostname === '::1') return true
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
}

function trusted(req, ctx) {
  const raw = req.headers.host
  if (!raw) return false
  let hostUrl
  try { hostUrl = new URL('http://' + raw) } catch { return false }
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (origin) {
    try { if (new URL(origin).host !== hostUrl.host) return false } catch { return false }
  }
  if (isLoopback(hostUrl.hostname)) return true
  const trustedHosts = ctx.webStartup?.trustedHosts
  if (Array.isArray(trustedHosts)) {
    return trustedHosts.some((entry) => {
      try { const u = new URL(/^https?:\/\//.test(entry) ? entry : 'https://' + entry); return u.hostname === hostUrl.hostname } catch { return false }
    })
  }
  return false
}

export function apply(ctx, config = {}) {
  const vault = config.syncOptions?.credentials || createCredentialStore()
  const sync = createSyncService(ctx, { ...config.syncOptions, credentials:vault, refreshQuotes: config.syncOptions?.refreshQuotes || refreshQuotes })
  const history = createHistoryService({sources:()=>sync.list().sources,readSourceHistory:sync.readHistory,...config.historyOptions})
  ctx.effect(()=>()=>history.dispose(), 'dsh-wealth: historical import previews')
  const syncHistory = async (accountId, opts) => {
    try {
      const history_ = await history.syncAccount(accountId, opts)
      const db = load()
      return { history: history_, ledger: db, summary: summarize(db), analysis: analyze(db) }
    } catch (error) {
      return { historyError: String(error?.message || error) }
    }
  }
  // 应用级行情数据密钥（同花顺金融数据 API）。不属于任何来源授权，存进同一个加密保险库。
  const DATA_TOKEN_ID = 'app:finapi'
  const dataToken = () => String(vault.get(DATA_TOKEN_ID).token || '')
  // 腾讯自选股 westock-mcp：微信/QQ 扫码授权的行情来源，token 过期前自动续期。
  const WESTOCK_ID = 'app:westock'
  const WESTOCK_CACHE = () => join(DATA_DIR, 'cache')
  let westockLogin = null
  const westockLoginService = () => {
    if (!westockLogin) {
      westockLogin = createWestockLogin({
        onToken: async (token) => {
          vault.set(WESTOCK_ID, 'westock', { accessToken: token.accessToken, refreshToken: token.refreshToken, clientId: token.clientId, expiresAt: String(token.expiresAt || '') })
        },
      })
    }
    return westockLogin
  }
  ctx.effect(() => () => { westockLogin?.dispose(); westockLogin = null }, 'dsh-wealth: westock login lifecycle')
  // 以前接管过 workbuddy:// 的安装，只能从这里按备份还原。新的授权不再注册该协议。
  const WESTOCK_REG_KEY = 'HKCU\\Software\\Classes\\workbuddy'
  const westockProtocolFile = () => join(WESTOCK_CACHE(), 'westock-protocol.json')
  const runReg = (args) => new Promise((resolve) => execFile('reg', args, { windowsHide: true }, (error, stdout) => resolve({ error, stdout: String(stdout || '') })))
  const westockProtocolStatus = () => {
    try { return JSON.parse(readFileSync(westockProtocolFile(), 'utf8')) } catch { return null }
  }
  const dataSourceStatus = () => ({ westock: { configured: vault.configured(WESTOCK_ID, 'westock'), protocol: !!westockProtocolStatus() }, thsData: { configured: vault.configured(DATA_TOKEN_ID, 'finapi'), adminUrl: THS_ADMIN_URL } })
  let loginTarget = null
  const login = createThsMcpLogin({ onToken: token => {
    const fields = { accessToken: token.accessToken }
    if (token.refreshToken) fields.refreshToken = token.refreshToken
    if (token.clientId) fields.clientId = token.clientId
    if (loginTarget && sync.list().authorizations.some(a => a.id === loginTarget && a.connector === 'ths')) vault.set(loginTarget, 'ths', fields)
    // 覆盖而非合并：MCP 令牌不能混进旧的 Cookie 暂存。
    vault.remove('pending-ths')
    vault.set('pending-ths', 'ths', fields)
  } })
  const loginStatus = () => {
    const current = login.status()
    const status = current.status === 'ready' ? 'ready' : ['error','timeout','disposed'].includes(current.status) ? 'error' : ['starting','waiting'].includes(current.status) ? 'waiting' : 'idle'
    return { status, message: current.message, ...(current.authorizeUrl ? { authorizeUrl: current.authorizeUrl } : {}) }
  }
  // 旧会话（Cookie）备用入口：不开独立浏览器窗口——独立临时指纹会触发同花顺风控
  //（封号 / 一直提示登录未完成）。改为在系统默认浏览器打开投资账本页，由收藏栏书签
  // 一键回传或手动粘贴 Cookie 完成；回传沿用 acceptThsLogin 的域名白名单与校验。
  let cookieAssistState = { status: 'idle', message: '' }
  const thsLoginBusy = () => ['starting','waiting'].includes(login.status().status)
  ctx.effect(() => () => login.dispose(), 'dsh-wealth: own THS login lifecycle')
  // Futu official MCP uses browser OAuth (no auth-code). The loopback listener
  // captures the callback and stores the token set under `pending-futu-mcp`.
  let futuLoginSlot = null, futuLoginTarget = null
  const futuLogin = () => {
    if (!futuLoginSlot) {
      futuLoginSlot = createFutuLogin({ onToken: async t => {
        const fields = { mcpToken: t.mcpToken }
        if (t.refreshToken) fields.refreshToken = t.refreshToken
        if (t.clientId) fields.clientId = t.clientId
        // Scope the captured token to the login it was requested for, so a flow
        // started for one account can never be consumed by another.
        vault.set(futuLoginTarget ? 'pending-futu-mcp:' + futuLoginTarget : 'pending-futu-mcp','futu',fields)
      } })
    }
    return futuLoginSlot
  }
  const futuStatus = () => {
    const current = futuLogin().status()
    const status = current.status === 'ready' ? 'ready' : ['error','timeout','disposed'].includes(current.status) ? 'error' : ['starting','waiting','acquiring'].includes(current.status) ? 'waiting' : 'idle'
    return { status, message:current.message, ...(current.authorizeUrl ? {authorizeUrl:current.authorizeUrl} : {}) }
  }
  ctx.effect(() => () => futuLoginSlot?.dispose(), 'dsh-wealth: own Futu MCP login lifecycle')
  // Qieman 账户与资产 tools are user-scoped: browser OAuth (DCR + PKCE + loopback)
  // is the only route. The refresh token is stored under `pending-qieman-mcp`.
  let qiemanLoginSlot = null, qiemanLoginTarget = null
  const qiemanLogin = () => {
    if (!qiemanLoginSlot) {
      qiemanLoginSlot = createQiemanLogin({ onToken: async t => {
        const fields = { bearerToken: t.accessToken }
        if (t.refreshToken) fields.refreshToken = t.refreshToken
        if (t.clientId) fields.clientId = t.clientId
        vault.set(qiemanLoginTarget ? 'pending-qieman-mcp:' + qiemanLoginTarget : 'pending-qieman-mcp', 'qieman', fields)
      } })
    }
    return qiemanLoginSlot
  }
  const qiemanStatus = () => {
    const current = qiemanLogin().status()
    const status = current.status === 'ready' ? 'ready' : ['error', 'timeout', 'disposed'].includes(current.status) ? 'error' : ['starting', 'waiting'].includes(current.status) ? 'waiting' : 'idle'
    return { status, message: current.message, ...(current.authorizeUrl ? { authorizeUrl: current.authorizeUrl } : {}) }
  }
  ctx.effect(() => () => qiemanLoginSlot?.dispose(), 'dsh-wealth: own Qieman MCP login lifecycle')
  // 复星 OpenAPI 扫码开通：本机生成客户端密钥对 -> TicketCreate 签发开通页；
  // H5 完成后再次 TicketCreate（同一 clientPubKey）即返回 apiKey + serverPubKey，
  // 存入 `pending-fosun` 供授权创建消费（照 ths/futu 的 pending 模式）。
  let fosunOnboard = null
  const appendTicketToUrl = (url, ticket) => {
    if (!ticket || url.includes('ticket=')) return url
    if (url.includes('#')) {
      const [base, fragment] = url.split('#', 2)
      return base + '#' + fragment + (fragment.includes('?') ? '&' : '?') + 'ticket=' + encodeURIComponent(ticket)
    }
    return url + (url.includes('?') ? '&' : '?') + 'ticket=' + encodeURIComponent(ticket)
  }
  const qrDataUrlFor = (url) => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createDataURL(6, 8)
  }
  const fosunOnboardStatus = () => fosunOnboard ? {
    status: fosunOnboard.status,
    message: fosunOnboard.message,
    openUrl: fosunOnboard.openUrl,
    qrDataUrl: fosunOnboard.qrDataUrl,
    expiresAt: fosunOnboard.expiresAt || null,
  } : { status: 'idle', message: '' }
  const pendingFosunOwner = () => fosunOnboard?.authId ? 'pending-fosun:' + fosunOnboard.authId : 'pending-fosun'
  const pollFosunOnboard = async () => {
    if (!fosunOnboard || fosunOnboard.status !== 'waiting') return
    // 网关对 TicketCreate 有频率限制（频繁调用会返回 40012），轮询至少间隔 5 秒。
    if (Date.now() - (fosunOnboard.lastPollAt || 0) < 5000) return
    fosunOnboard.lastPollAt = Date.now()
    try {
      // 注意：TicketCreate 首次调用就会返回 apiKey + serverPubKey，但手机端完成绑定前
      // 这个 Key 是未激活的——只有 APIKeyCheck 明确 valid 才能入库。
      const ticket = await fosunTicketCreate({ gatewayUrl: fosunOnboard.gatewayUrl, clientPubKey: fosunOnboard.publicPem, macId: fosunOnboard.macId })
      if (!ticket.apiKey || !ticket.serverPubKey) {
        fosunOnboard.message = '等待手机端完成绑定…'
        return
      }
      const check = await checkFosunApiKey({ gatewayUrl: fosunOnboard.gatewayUrl, apiKey: ticket.apiKey }).catch(() => ({ status: 'unknown' }))
      if (check.status !== 'valid') {
        fosunOnboard.message = '等待手机端完成绑定…（当前 API Key 未激活）'
        return
      }
      const secrets = { apiKey: ticket.apiKey, privateKey: fosunOnboard.privatePem, serverPublicKey: ticket.serverPubKey }
      try {
        await verifyFosunCredentials({ gatewayUrl: fosunOnboard.gatewayUrl }, secrets)
      } catch (error) {
        // 网关登记的客户端公钥不是本次会话这把 → 必须重置开通常数后重新绑定。
        fosunOnboard.status = 'error'
        fosunOnboard.message = '握手校验未通过（' + String(error?.message || error).slice(0, 80) + '）：该账户原先绑定过别的客户端公钥，请到开通页点「忘记API参数 / OpenAPI参数重置」，重置后重新扫码或粘贴新的 Key 与公钥'
        return
      }
      vault.set(pendingFosunOwner(), 'fosun', secrets)
      fosunOnboard.status = 'ready'
      fosunOnboard.message = '复星开通完成，凭据已保存，可以读取账户'
    } catch (error) {
      // Transient gateway errors (including 40012 rate limiting) must not kill the waiting flow.
      fosunOnboard.message = '轮询开通状态失败，稍后自动重试：' + String(error?.message || error)
    }
  }
  // Tiger's remote MCP uses the OAuth 2.1 device flow: no redirect listener, the
  // user enters a short code in the browser. The refresh token is long-lived.
  // 浏览器授权码流（官方 MCP 客户端同款）；设备码流保留作为备用入口。
  let tigerAuthTarget = null, tigerAuthSlot = null
  const tigerAuthLogin = () => {
    if (!tigerAuthSlot) {
      tigerAuthSlot = createTigerLogin({ onToken: t => {
        const owner = tigerAuthTarget ? 'pending-tiger-mcp:' + tigerAuthTarget : 'pending-tiger-mcp'
        const fields = { accessToken: t.accessToken, clientId: t.clientId }
        if (t.refreshToken) fields.refreshToken = t.refreshToken
        vault.set(owner, 'tiger', fields)
      } })
    }
    return tigerAuthSlot
  }
  const tigerAuthStatus = () => {
    const current = tigerAuthLogin().status()
    const status = current.status === 'ready' ? 'ready' : ['error', 'timeout', 'disposed'].includes(current.status) ? 'error' : ['starting', 'waiting'].includes(current.status) ? 'waiting' : 'idle'
    return { status, message: current.message, ...(current.authorizeUrl ? { authorizeUrl: current.authorizeUrl } : {}) }
  }
  ctx.effect(() => () => tigerAuthSlot?.dispose(), 'dsh-wealth: own Tiger OAuth login lifecycle')
  let tigerLogin = null
  const tigerStatus = () => tigerLogin ? {
    status: tigerLogin.status,
    message: tigerLogin.message,
    ...(tigerLogin.device ? {
      userCode: tigerLogin.device.userCode,
      verificationUri: tigerLogin.device.verificationUri,
      verificationUriComplete: tigerLogin.device.verificationUriComplete,
      expiresAt: tigerLogin.expiresAt,
    } : {}),
  } : { status: 'idle', message: '' }
  const pollTiger = async () => {
    if (!tigerLogin || tigerLogin.status !== 'waiting') return
    if (Date.now() > tigerLogin.expiresAt) {
      tigerLogin.status = 'error'
      tigerLogin.message = '老虎授权码已过期，请重新发起授权'
      return
    }
    if (Date.now() < tigerLogin.nextPollAt) return
    try {
      const result = await pollTigerDeviceToken(tigerLogin.device)
      if (result.status === 'ready') {
        const owner = tigerLogin.authId ? 'pending-tiger-mcp:' + tigerLogin.authId : 'pending-tiger-mcp'
        const fields = { accessToken: result.token.accessToken }
        if (result.token.refreshToken) fields.refreshToken = result.token.refreshToken
        if (result.token.clientId) fields.clientId = result.token.clientId
        vault.set(owner, 'tiger', fields)
        tigerLogin.status = 'ready'
        tigerLogin.message = '老虎授权已保存，可以读取账户'
      } else if (result.status === 'slow_down') {
        tigerLogin.interval = result.interval || tigerLogin.interval + 5
        tigerLogin.nextPollAt = Date.now() + tigerLogin.interval * 1000
        tigerLogin.message = '请在浏览器完成授权（轮询已放慢）'
      } else {
        tigerLogin.nextPollAt = Date.now() + tigerLogin.interval * 1000
      }
    } catch (error) {
      tigerLogin.status = 'error'
      tigerLogin.message = String(error?.message || error)
    }
  }
  ctx.effect(() => {
    // 持仓按来源间隔刷新；历史流水每 6 小时增量补一次（从上次水位回看 30 天，去重归档）。
    const historyDue = () => {
      const state = load().historySync || {}
      return sync.list().sources.filter(s => s.enabled !== false && s.accountId && s.lastStatus === 'ok' && (!state[s.accountId]?.at || Date.now() - Date.parse(state[s.accountId].at) > 6 * 3600 * 1000))
    }
    const attempted = new Map()
    const run = () => sync.tick().then(async () => {
      for (const s of historyDue()) {
        if (Date.now() - (attempted.get(s.accountId) || 0) < 6 * 3600 * 1000) continue
        attempted.set(s.accountId, Date.now())
        await history.syncAccount(s.accountId).catch(() => {})
      }
    }).catch(() => { /* per-source failures are persisted */ })
    const timer = setInterval(run, 60000)
    timer.unref?.()
    queueMicrotask(run)
    return () => { clearInterval(timer); sync.dispose() }
  }, 'dsh-wealth: automatic source refresh')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/portfolio',
    handler: async (req, res) => {
      if (!trusted(req, ctx)) { res.writeHead(403); res.end('forbidden'); return }
      let url
      try { url = new URL(req.url || '/', 'http://dsh.internal') } catch { res.writeHead(400); res.end(); return }
      const path = url.pathname.replace(/^\/portfolio\/?/, '')
      try {
        if (path === 'api/state' || path === 'api/summary') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const db = load()
          send(res, 200, { ok: true, version: VERSION, ledger: db, summary: summarize(db), analysis: analyze(db), dataSource: dataSourceStatus() })
          return
        }
        if (path === 'api/settings/data-source') {
          if (req.method === 'GET') { send(res, 200, { ok: true, ...dataSourceStatus() }); return }
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req, 64 * 1024))
          const token = typeof body.token === 'string' ? body.token.trim() : ''
          if (!token) {
            vault.remove(DATA_TOKEN_ID)
            send(res, 200, { ok: true, ...dataSourceStatus() })
            return
          }
          try {
            await checkThsToken(token)
          } catch (error) {
            send(res, 400, { ok: false, error: { code: 'invalid-token', message: String(error?.message || error) } })
            return
          }
          vault.set(DATA_TOKEN_ID, 'finapi', { token })
          send(res, 200, { ok: true, ...dataSourceStatus() })
          return
        }
        if (path === 'api/settings/westock/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const status = await westockLoginService().start()
          if (!status.authorizeUrl) { send(res, 400, { ok: false, error: { code: 'bad-request', message: status.message || '授权未能开始' } }); return }
          send(res, 200, { ok: true, authorizeUrl: status.authorizeUrl, ...dataSourceStatus() })
          return
        }
        if (path === 'api/settings/westock/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const current = westockLogin ? westockLogin.status() : { status: 'idle', message: '' }
          send(res, 200, { ok: true, status: current.status, message: current.message || '', ...dataSourceStatus() })
          return
        }
        if (path === 'api/settings/westock/unregister-protocol') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const backup = westockProtocolStatus()
          if (backup?.previousCommand) {
            const result = await runReg(['add', WESTOCK_REG_KEY + '\\shell\\open\\command', '/ve', '/d', backup.previousCommand, '/f'])
            if (result.error) { send(res, 500, { ok: false, error: { code: 'internal', message: '恢复注册表失败：' + String(result.error.message || result.error).slice(0, 120) } }); return }
          } else {
            await runReg(['delete', WESTOCK_REG_KEY, '/f'])
          }
          rmSync(westockProtocolFile(), { force: true })
          send(res, 200, { ok: true, ...dataSourceStatus() })
          return
        }
        if (path === 'api/settings/westock/disconnect') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          vault.remove(WESTOCK_ID)
          westockLogin?.dispose()
          westockLogin = null
          send(res, 200, { ok: true, ...dataSourceStatus() })
          return
        }
        if (path === 'api/analysis') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const ids = String(url.searchParams.get('accounts') || '').split(',').map(s => s.trim()).filter(Boolean)
          const db = load()
          send(res, 200, { ok: true, accounts: ids, analysis: analyze(ids.length ? scopeLedger(db, ids) : db) })
          return
        }
        if (path === 'api/forecast') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const days = Math.min(365, Math.max(7, Number(url.searchParams.get('days')) || 30))
          send(res, 200, { ok: true, ...forecast(load(), { days }) })
          return
        }
        if (path === 'api/digest') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const horizon = Math.min(30, Math.max(1, Number(url.searchParams.get('days')) || 7))
          send(res, 200, { ok: true, ...buildDigest(load(), { horizonDays: horizon }) })
          return
        }
        if (path === 'api/bills') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const months = Math.min(60, Math.max(1, Number(url.searchParams.get('months')) || 12))
          send(res, 200, { ok: true, ...billSummary(load(), { months }) })
          return
        }
        if (path === 'api/bills/preview') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req, 8 * 1024 * 1024))
          if (typeof body.text !== 'string' || !body.text.trim()) { send(res, 400, { ok: false, error: { code: 'bad-request', message: '请提供账单文件文本' } }); return }
          const parsed = parseBillCsv(body.text)
          send(res, 200, { ok: true, ...billPreview(parsed) })
          return
        }
        if (path === 'api/bills/import') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req, 8 * 1024 * 1024))
          if (!body.accountId) { send(res, 400, { ok: false, error: { code: 'bad-request', message: '请选择入账账户' } }); return }
          if (typeof body.text !== 'string' || !body.text.trim()) { send(res, 400, { ok: false, error: { code: 'bad-request', message: '请提供账单文件文本' } }); return }
          const parsed = parseBillCsv(body.text)
          const db = load()
          const result = applyOp(db, 'bills.import', { accountId: body.accountId, rows: parsed.rows, provider: parsed.provider })
          if (result.imported) save(db)
          send(res, 200, { ok: true, ...result, summary: summarize(db) })
          return
        }
        if (path === 'api/inferred-flows') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const ids = String(url.searchParams.get('accounts') || '').split(',').map((s) => s.trim()).filter(Boolean)
          send(res, 200, { ok: true, ...inferredTransfers(load(), { accountIds: ids }) })
          return
        }
        if (path === 'api/performance') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          const ids = String(url.searchParams.get('accounts') || '').split(',').map((s) => s.trim()).filter(Boolean)
          const days = Math.min(3650, Math.max(30, Number(url.searchParams.get('days')) || 1095))
          const result = await computePerformance(load(), { accountIds: ids, days, cachePath: join(DATA_DIR, 'cache', 'klines.json'), dataToken: dataToken(), westockToken: await westockAuth() })
          send(res, 200, { ok: true, ...result })
          return
        }
        if (path === 'api/sources/login/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res,200,{ok:true,...loginStatus()}); return
        }
        if (path === 'api/sources/login/cookie/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res,200,{ok:true,...cookieAssistState}); return
        }
        if (path === 'api/sources/login/cookie/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          const target = body.authId || body.sourceId || null
          if (body.authId && !sync.list().authorizations.some(a=>a.id === body.authId && a.connector === 'ths')) throw new OpError('bad-request','同花顺授权不存在')
          if (!body.authId && target && !sync.list().sources.some(s=>s.id === target && s.connector === 'ths')) throw new OpError('bad-request','同花顺连接不存在')
          loginTarget = target
          cookieAssistState = { status: 'waiting', message: '已在你的默认浏览器打开投资账本页，登录后点收藏栏书签回传，或手动粘贴 Cookie' }
          openBrowser('https://tzzb.10jqka.com.cn/pc/index.html')
          send(res,200,{ok:true,...cookieAssistState}); return
        }
        // 收藏栏书签跨源回传：浏览器读不到响应（CORS），204 即可；内容仍要过
        // acceptThsLogin 的域名白名单 + 登录校验，垃圾 Cookie 会在校验时被拒，不入库。
        if (path === 'api/sources/login/cookie/capture') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const raw = await readBody(req)
          let cookie = String(raw || '')
          try { const parsed = JSON.parse(cookie); if (parsed && typeof parsed === 'object' && typeof parsed.cookie === 'string') cookie = parsed.cookie } catch { /* plain-text body from the bookmarklet */ }
          try {
            await sync.acceptThsLogin(loginTarget, cookie)
            cookieAssistState = { status: 'ready', message: '登录已保存，可以读取账本' }
          } catch (error) {
            cookieAssistState = { status: 'error', message: String(error?.message || error) }
          }
          res.writeHead(204); res.end(); return
        }
        if (path === 'api/sources/login/start' || path === 'api/sources/accounts') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          if (path.endsWith('/start')) {
            const target = body.authId || body.sourceId || null
            if (body.authId && !sync.list().authorizations.some(a=>a.id === body.authId && a.connector === 'ths')) throw new OpError('bad-request','同花顺授权不存在')
            if (!body.authId && target && !sync.list().sources.some(s=>s.id === target && s.connector === 'ths')) throw new OpError('bad-request','同花顺连接不存在')
            if (thsLoginBusy()) throw new OpError('bad-request','登录正在进行，请先完成当前登录')
            loginTarget = target
            await login.start(); send(res,200,{ok:true,...loginStatus()}); return
          }
          const found = body.authId ? await sync.listAuthAccounts(body.authId, body.credentials) : await sync.listAccounts(body.source,body.credentials)
          send(res,200,{ok:true,...found}); return
        }
        if (['api/sources/auth/create','api/sources/auth/accounts','api/sources/auth/rename','api/sources/auth/remove'].includes(path)) {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          if (path.endsWith('/create')) { send(res,200,{ok:true,...await sync.createAuthorization(body.auth || body.source || body, body.credentials)}); return }
          if (path.endsWith('/accounts')) { send(res,200,{ok:true,...await sync.listAuthAccounts(body.authId, body.credentials)}); return }
          if (path.endsWith('/rename')) { send(res,200,{ok:true,...sync.renameAuthorization(body.authId, body.label)}); return }
          send(res,200,{ok:true,...sync.removeAuthorization(body.authId)}); return
        }
        if (path === 'api/sources' || path === 'api/sources/ths/portfolios') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res, 200, { ok: true, ...(path === 'api/sources' ? sync.list() : await sync.listThsPortfolios()) }); return
        }
        if (path === 'api/sources/fosun/onboard/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req).catch(() => '{}') || '{}')
          const target = body.authId ? sync.list().authorizations.find(a => a.id === body.authId && a.connector === 'fosun') : null
          // 客户端密钥对按授权隔离：已有授权重新绑定时复用它保存的私钥；
          // 新开通在「pending-fosun」里保留未完成会话的私钥（重试/扫码超时后
          // 再发起仍是同一把，避免绑定与私钥错配——网关按第一次绑定的公钥校验），
          // 一旦完成开通（pending 里已有 apiKey）下一次新开生成全新密钥对，
          // 因此多账户各持各的私钥，删除授权时私钥随保险库一并删除。
          let clientPrivatePem = ''
          if (target) clientPrivatePem = vault.get(target.id).privateKey || ''
          if (!clientPrivatePem) {
            const pending = vault.get('pending-fosun')
            if (!pending.apiKey && pending.privateKey) clientPrivatePem = pending.privateKey
          }
          if (!clientPrivatePem) {
            clientPrivatePem = generateFosunClientKey().privatePem
            vault.set('pending-fosun', 'fosun', { privateKey: clientPrivatePem })
          }
          const key = fosunClientKeyFromPrivate(clientPrivatePem)
          const macId = randomUUID().replace(/-/g, '')
          const gatewayUrl = String(body.gatewayUrl || '').trim() || undefined
          const ticket = await fosunTicketCreate({ gatewayUrl, clientPubKey: key.publicPem, macId })
          const openUrl = appendTicketToUrl(ticket.url, ticket.ticket)
          let expiresAt = null
          const expireNumber = Number(ticket.expireTime)
          if (Number.isFinite(expireNumber) && expireNumber > 0) expiresAt = expireNumber > 1e12 ? expireNumber : expireNumber * 1000
          fosunOnboard = {
            status: 'waiting',
            message: '请用星财富 App 扫码，或点开链接完成开通',
            openUrl, ticket: ticket.ticket,
            qrDataUrl: qrDataUrlFor(openUrl),
            privatePem: key.privatePem, publicPem: key.publicPem, macId, gatewayUrl,
            authId: target ? target.id : null, expiresAt,
          }
          send(res, 200, { ok: true, ...fosunOnboardStatus() }); return
        }
        if (path === 'api/sources/fosun/onboard/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          await pollFosunOnboard()
          send(res, 200, { ok: true, ...fosunOnboardStatus() }); return
        }
        if (path === 'api/sources/fosun/onboard/complete') {
          // 手动完成：手机页面上已显示 Key + 服务端公钥时，配合本会话生成的私钥直接配对入库。
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req, 256 * 1024))
          if (!fosunOnboard || fosunOnboard.status !== 'waiting') { send(res, 400, { ok: false, error: { code: 'bad-request', message: '请先点「扫码开通」生成密钥对后再粘贴凭据' } }); return }
          const apiKey = String(body.apiKey || '').trim()
          const serverPublicKey = String(body.serverPublicKey || '').trim()
          if (!/^ak_/.test(apiKey)) { send(res, 400, { ok: false, error: { code: 'bad-request', message: 'API Key 应以 ak_ 开头（fsk_ 等平台型 Key 不适用于 OpenAPI）' } }); return }
          if (!serverPublicKey.includes('BEGIN PUBLIC KEY')) { send(res, 400, { ok: false, error: { code: 'bad-request', message: '服务端公钥应为 -----BEGIN PUBLIC KEY----- 开头的 PEM 文本' } }); return }
          const check = await checkFosunApiKey({ gatewayUrl: fosunOnboard.gatewayUrl, apiKey })
          if (check.status !== 'valid') {
            send(res, 400, { ok: false, error: { code: 'bad-request', message: '这个 Key 还未激活（校验状态：' + check.status + '）——请在星财富 App 里把开通/绑定流程走完后再试' } })
            return
          }
          // 真正握手一次：网关登记的客户端公钥若不是本次会话这把，签名会被拒
          //（Handshake signature verification failed），此时必须让用户重置开通常数。
          const secrets = { apiKey, privateKey: fosunOnboard.privatePem, serverPublicKey }
          try {
            await verifyFosunCredentials({ gatewayUrl: fosunOnboard.gatewayUrl }, secrets)
          } catch (error) {
            send(res, 400, { ok: false, error: { code: 'handshake-failed', message: '握手校验未通过：' + String(error?.message || error) + '。该账户原先绑定过别的客户端公钥，请到开通页点「忘记API参数 / OpenAPI参数重置」，重置后把页面显示的新 API Key 和服务端公钥重新粘贴。' } })
            return
          }
          vault.set(pendingFosunOwner(), 'fosun', secrets)
          fosunOnboard.status = 'ready'
          fosunOnboard.message = '复星开通完成，凭据已保存，可以读取账户'
          send(res, 200, { ok: true, ...fosunOnboardStatus() })
          return
        }
        if (path === 'api/sources/fosun/onboard/cancel') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          fosunOnboard = null
          send(res, 200, { ok: true, ...fosunOnboardStatus() }); return
        }
        if (path === 'api/sources/qieman/mcp/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req).catch(() => '{}') || '{}')
          const target = body.authId ? sync.list().authorizations.find(a => a.id === body.authId && a.connector === 'qieman') : null
          qiemanLoginTarget = target ? target.id : null
          await qiemanLogin().start()
          send(res, 200, { ok: true, ...qiemanStatus() }); return
        }
        if (path === 'api/sources/qieman/mcp/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res, 200, { ok: true, ...qiemanStatus() }); return
        }
        if (path === 'api/sources/tiger/login/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req).catch(() => '{}') || '{}')
          const target = body.authId ? sync.list().authorizations.find(a => a.id === body.authId && a.connector === 'tiger') : null
          tigerAuthTarget = target ? target.id : null
          await tigerAuthLogin().start()
          send(res, 200, { ok: true, ...tigerAuthStatus() }); return
        }
        if (path === 'api/sources/tiger/login/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res, 200, { ok: true, ...tigerAuthStatus() }); return
        }
        if (path === 'api/sources/tiger/oauth/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req).catch(() => '{}') || '{}')
          const target = body.authId ? sync.list().authorizations.find(a => a.id === body.authId && a.connector === 'tiger') : null
          const device = await startTigerDeviceAuth()
          tigerLogin = {
            device, authId: target ? target.id : null,
            status: 'waiting', message: '请在浏览器输入设备码并完成老虎授权',
            interval: device.interval, nextPollAt: Date.now() + device.interval * 1000,
            expiresAt: Date.now() + device.expiresIn * 1000,
          }
          send(res, 200, { ok: true, ...tigerStatus() }); return
        }
        if (path === 'api/sources/tiger/oauth/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          await pollTiger()
          send(res, 200, { ok: true, ...tigerStatus() }); return
        }
        if (path === 'api/sources/futu/mcp/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res,200,{ok:true,...futuStatus()}); return
        }
        if (path === 'api/sources/futu/mcp/start') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req).catch(()=> '{}') || '{}')
          // Only a known Futu authorization may claim the captured token.
          const target = body.authId ? sync.list().authorizations.find(a => a.id === body.authId && a.connector === 'futu') : null
          futuLoginTarget = target ? target.id : null
          await futuLogin().start(); send(res,200,{ok:true,...futuStatus()}); return
        }
        if (path === 'api/sources/longbridge/mcp/exchange') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          const { exchangeLongbridgeMcpCode } = await import('./lb-mcp.mjs')
          const { token } = await exchangeLongbridgeMcpCode(body.code, { endpoint: body.endpoint })
          // 一码一 Token：不落盘，由前端随 credentials 提交，经 vault 加密保存。
          send(res, 200, { ok: true, token })
          return
        }
        if (path === 'api/sources/sync-all') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          await readBody(req).catch(() => '')
          const sources = sync.list().sources.filter(s => s.enabled)
          // 与单个同步相同的 inFlight 去重；不同连接器可以并行，失败逐条返回。
          // 同步后照单个 sources/sync 的行为补历史流水（尽力而为，不影响持仓结果）。
          const settled = await Promise.allSettled(sources.map(async (s) => {
            const result = await sync.sync(s.id)
            const accountId = result.account?.id || s.accountId
            const history = accountId ? await syncHistory(accountId) : {}
            return { ...result, ...history }
          }))
          send(res, 200, {
            ok: true,
            results: settled.map((r, i) => ({ id: sources[i].id, name: sources[i].name, ok: r.status === 'fulfilled', error: r.status === 'rejected' ? String(r.reason?.message || r.reason) : r.value?.historyError ?? null })),
            sources: sync.list().sources,
          })
          return
        }
        if (['api/sources/save','api/sources/sync','api/sources/remove','api/sources/connect'].includes(path)) {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          if (path.endsWith('/connect') && body.account?.mode === 'existing') throw new OpError('bad-request','来源账户直接导入，无需绑定其他账户')
          const result = path.endsWith('/connect') ? await sync.connectSource(body.source,body.credentials) : path.endsWith('/save') ? sync.saveSource(body.source,body.credentials) : path.endsWith('/sync') ? await sync.sync(body.id) : sync.removeSource(body.id)
          // 导入或同步后自动把历史流水补到最新（无需选择区间）；流水失败不影响持仓结果。
          if (path.endsWith('/connect') || path.endsWith('/sync')) {
            const accountId = result.account?.id || sync.list().sources.find(s=>s.id===body.id)?.accountId
            if (accountId) Object.assign(result, await syncHistory(accountId))
          }
          send(res, 200, { ok: true, ...result }); return
        }
        if (path === 'api/accounts/sync') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          const source = sync.list().sources.find(s=>s.accountId===body.accountId)
          if (!source) throw new OpError('bad-request','该账户是手动账户，没有可同步的来源')
          const result = await sync.sync(source.id)
          Object.assign(result, await syncHistory(body.accountId, { full: body.full === true }))
          send(res, 200, { ok: true, ...result }); return
        }
        // 银证转账深扫：首次全历史可能要几分钟；之后每次同步自动增量收尾。
        if (path === 'api/transfers/scan') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          if (!body.accountId) throw new OpError('bad-request','缺少 accountId')
          send(res, 200, { ok: true, ...(await sync.scanThsTransfers(body.accountId, { maxRequests: body.maxRequests })) }); return
        }
        if (path === 'api/history/capabilities') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res,200,{ok:true,...history.capabilities()});return
        }
        if (path === 'api/history/preview' || path === 'api/history/commit') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req,8*1024*1024))
          const result = path.endsWith('/preview') ? await history.preview(body) : history.commit(body)
          send(res,200,{ok:true,...result});return
        }
        if (path === 'api/model') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res, 200, { ok: true, model: modelInfo(ctx) }); return
        }
        if (['api/import/preview', 'api/chat', 'api/chat/apply'].includes(path)) {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          const db = load()
          if (path === 'api/import/preview') { send(res, 200, { ok: true, ...previewImport(body, db) }); return }
          if (path === 'api/chat') { send(res, 200, { ok: true, ...await chatTurn(ctx, body, db) }); return }
          const applied = applyChatOps(db, body)
          save(applied.ledger)
          send(res, 200, { ok: true, ledger: applied.ledger, summary: summarize(applied.ledger), analysis: analyze(applied.ledger), result: applied.result }); return
        }
        if (path === 'api/op') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const text = await readBody(req)
          let req2
          try { req2 = JSON.parse(text) } catch { send(res, 400, { ok: false, error: { code: 'bad-json', message: '请求体不是合法 JSON' } }); return }
          const op = req2.op
          if (!op) { send(res, 400, { ok: false, error: { code: 'bad-request', message: '缺少 op' } }); return }
          const payload = { ...req2 }; delete payload.op
          const db = load()
          try {
            const result = applyOp(db, op, payload)
            save(db)
            send(res, 200, { ok: true, op, result, ledger: db, summary: summarize(db), analysis: analyze(db) })
          } catch (error) {
            const code = error instanceof OpError ? error.code : 'internal'
            send(res, code === 'not-found' ? 404 : code === 'bad-request' ? 400 : 500, { ok: false, op, error: { code, message: error.message } })
          }
          return
        }
        if (path === 'api/quotes/refresh') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const db = load()
          const result = await refreshQuotes(db)
          if (result.updated) save(db)
          send(res, 200, { ok: true, ...result, summary: summarize(db), analysis: analyze(db) })
          return
        }
        res.writeHead(404); res.end('not found')
      } catch (error) {
        const code = error instanceof OpError ? error.code : error instanceof SyntaxError ? 'bad-json' : 'internal'
        const status = code === 'not-found' ? 404 : ['bad-request', 'bad-json'].includes(code) ? 400 : 500
        try { send(res, status, { ok: false, error: { code, message: String(error && error.message || error) } }) } catch { res.destroy() }
      }
    },
  }), 'dsh-portfolio: /portfolio routes')
}
