/**
 * dsh-portfolio — host half.
 * Serves the local ledger over `/portfolio/api/*` so the plugin page (client.js)
 * can read and edit it, and so any local script can POST operations.
 * The AI (资产管家 / any agent) edits the same store through cli.mjs.
 */
import { join } from 'node:path'
import { load, save, applyOp, summarize, OpError, DATA_DIR } from './store.mjs'
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
import { createQiemanLogin } from './qieman-login.mjs'
import { createCredentialStore } from './credentials.mjs'
import { createThsLogin } from './ths-login.mjs'
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
  const sync = createSyncService(ctx, { ...config.syncOptions, credentials:vault })
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
  let loginTarget = null
  const login = createThsLogin({ onCookie:cookie=>sync.acceptThsLogin(loginTarget,cookie) })
  const loginStatus = () => {
    const current = login.status()
    const status = current.status === 'saved' ? 'ready' : ['failed','timeout','cleanup_pending','disposed'].includes(current.status) ? 'error' : ['starting','acquiring'].includes(current.status) ? 'waiting' : 'idle'
    return { status, message:current.message }
  }
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
  // Tiger's remote MCP uses the OAuth 2.1 device flow: no redirect listener, the
  // user enters a short code in the browser. The refresh token is long-lived.
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
          send(res, 200, { ok: true, ledger: db, summary: summarize(db), analysis: analyze(db) })
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
          const result = await computePerformance(load(), { accountIds: ids, days, cachePath: join(DATA_DIR, 'cache', 'klines.json') })
          send(res, 200, { ok: true, ...result })
          return
        }
        if (path === 'api/sources/login/status') {
          if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
          send(res,200,{ok:true,...loginStatus()}); return
        }
        if (path === 'api/sources/login/start' || path === 'api/sources/accounts') {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          const body = JSON.parse(await readBody(req))
          if (path.endsWith('/start')) {
            const target = body.authId || body.sourceId || null
            if (body.authId && !sync.list().authorizations.some(a=>a.id === body.authId && a.connector === 'ths')) throw new OpError('bad-request','同花顺授权不存在')
            if (!body.authId && target && !sync.list().sources.some(s=>s.id === target && s.connector === 'ths')) throw new OpError('bad-request','同花顺连接不存在')
            if (['starting','acquiring'].includes(login.status().status)) throw new OpError('bad-request','登录正在进行，请先完成当前登录')
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
