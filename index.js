/**
 * dsh-portfolio — host half.
 * Serves the local ledger over `/portfolio/api/*` so the plugin page (client.js)
 * can read and edit it, and so any local script can POST operations.
 * The AI (资产管家 / any agent) edits the same store through cli.mjs.
 */
import { load, save, applyOp, summarize, OpError } from './store.mjs'

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

export function apply(ctx) {
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
          send(res, 200, { ok: true, ledger: db, summary: summarize(db) })
          return
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
            send(res, 200, { ok: true, op, result, ledger: db, summary: summarize(db) })
          } catch (error) {
            const code = error instanceof OpError ? error.code : 'internal'
            send(res, code === 'not-found' ? 404 : code === 'bad-request' ? 400 : 500, { ok: false, op, error: { code, message: error.message } })
          }
          return
        }
        res.writeHead(404); res.end('not found')
      } catch (error) {
        try { send(res, 500, { ok: false, error: { code: 'internal', message: String(error && error.message || error) } }) } catch { res.destroy() }
      }
    },
  }), 'dsh-portfolio: /portfolio routes')
}
