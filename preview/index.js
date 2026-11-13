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

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/portfolio-preview',
    handler: (req, res) => {
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
