// dsh-wealth-preview — host half.
// 只做一件事：把构建好的预览页（演示数据、只读）作为静态文件挂到
// /portfolio-preview。不 import 账本模块、不读写任何真实账本、不起定时任务。
// 构建：node scripts/preview-build.mjs（在插件仓库根目录运行）。
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const name = 'dsh-wealth-preview'
export const inject = ['webServer']

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = join(HERE, 'public', 'index.html')

// 只接受本机直连、同源的请求：挡掉 DNS rebinding（Host 指向外部域名）和跨站嵌入。
// 预览页只有演示数据，但这层和 dsh-wealth 的 /portfolio 路由保持一致，免得留下一个
// 无守卫的静态出口。
function isLoopback(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '')
  return h === 'localhost' || h === '::1' || h === '127.0.0.1' || /^127\.\d+\.\d+\.\d+$/.test(h)
}

function trusted(req) {
  const raw = req.headers && req.headers.host
  if (!raw) return false
  let hostUrl
  try { hostUrl = new URL('http://' + raw) } catch { return false }
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (origin) {
    try { if (new URL(origin).host !== hostUrl.host) return false } catch { return false }
  }
  return isLoopback(hostUrl.hostname)
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/portfolio-preview',
    handler: (req, res) => {
      if (!trusted(req)) { res.writeHead(403); res.end('forbidden'); return }
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
      let path
      try { path = new URL(req.url || '/', 'http://dsh.internal').pathname } catch { res.writeHead(400); res.end(); return }
      if (!['/portfolio-preview', '/portfolio-preview/', '/portfolio-preview/index.html'].includes(path)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found'); return
      }
      if (!existsSync(PAGE)) {
        res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('预览页尚未构建：在插件仓库运行 node scripts/preview-build.mjs')
        return
      }
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-ancestors 'self'",
      })
      res.end(readFileSync(PAGE))
    },
  }), 'dsh-wealth-preview: static preview page')
}
