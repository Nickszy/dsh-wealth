// 预览版插件（preview/）的冒烟测试：host 半的静态路由 + 包元数据。
// 预览页本身是否构建过由环境决定（preview/public/ 是 gitignore 的构建产物），
// 所以这里只断言「已构建就返回页面、没构建就明确 503」，两种都算通过。
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { name as HOST_NAME, inject as HOST_INJECT, apply } from './preview/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = join(HERE, 'preview', 'public', 'index.html')
const BUILT = existsSync(PAGE)

// 挂载插件，拿到它注册的路由与 dispose。
function mount() {
  let route = null
  let disposed = false
  apply({
    effect: (fn) => fn(),
    webServer: { register: (r) => { route = r; return () => { disposed = true } } },
  })
  return { route, isDisposed: () => disposed }
}

function request(url, method = 'GET', headers = { host: '127.0.0.1:3580' }) {
  const res = { status: 0, headers: null, body: '', writeHead(code, hdrs) { this.status = code; this.headers = hdrs || {} }, end(body) { this.body = body ? String(body) : '' } }
  mount().route.handler({ method, url, headers }, res)
  return res
}

test('预览插件只挂一个 /portfolio-preview 前缀路由', () => {
  const { route } = mount()
  assert.equal(HOST_NAME, 'dsh-wealth-preview')
  assert.deepEqual(HOST_INJECT, ['webServer'])
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/portfolio-preview')
  assert.equal(typeof route.handler, 'function')
})

test('三个入口路径都能拿到预览页；未构建时返回可读的 503', () => {
  for (const path of ['/portfolio-preview', '/portfolio-preview/', '/portfolio-preview/index.html']) {
    const res = request(path)
    if (BUILT) {
      assert.equal(res.status, 200, path)
      assert.match(res.headers['content-type'], /text\/html/)
      assert.match(String(res.body), /资产账本/, path)
    } else {
      assert.equal(res.status, 503, path)
      assert.match(res.body, /preview-build/, path)
    }
  }
})

test('页面响应带 no-store 与限制性 CSP，且允许同源嵌入', () => {
  const { headers } = request('/portfolio-preview/')
  assert.equal(headers['cache-control'], 'no-store')
  const csp = String(headers['content-security-policy'])
  assert.match(csp, /default-src 'none'/)
  assert.match(csp, /frame-ancestors 'self'/)
  assert.match(csp, /connect-src 'none'/)
})

test('非入口路径 404，非 GET 405', () => {
  assert.equal(request('/portfolio-preview/secret').status, 404)
  assert.equal(request('/portfolio-preview/index.html.bak').status, 404)
  assert.equal(request('/portfolio-preview/', 'POST').status, 405)
})

test('只服务本机直连的同源请求', () => {
  assert.equal(request('/portfolio-preview/', 'GET', { host: 'evil.example.com' }).status, 403)
  assert.equal(request('/portfolio-preview/', 'GET', {}).status, 403)
  assert.equal(request('/portfolio-preview/', 'GET', { host: '127.0.0.1:3580', 'sec-fetch-site': 'cross-site' }).status, 403)
  assert.equal(request('/portfolio-preview/', 'GET', { host: '127.0.0.1:3580', origin: 'http://evil.example.com' }).status, 403)
  assert.notEqual(request('/portfolio-preview/', 'GET', { host: 'localhost:3580', origin: 'http://localhost:3580' }).status, 403)
})

test('页面自包含，不加载外部资源，也不出现真实账本路径', () => {
  if (!BUILT) return
  const html = readFileSync(PAGE, 'utf8')
  assert.doesNotMatch(html, /<script[^>]+src=/i)
  assert.doesNotMatch(html, /<(?:link|img|iframe)[^>]+(?:href|src)=["']https?:/i)
  assert.doesNotMatch(html, /fetch\(\s*['"]https?:/)
  assert.doesNotMatch(html, /\.dsh[\\/]data/)
  assert.match(html, /window\.fetch\s*=/)
  assert.match(html, /预览模式 · 演示数据 · 不读写真实账本/)
})

// `main.conversation` 是 single slot：同一 priority 只能有一个注册。正式的 dsh-wealth
// 面板占着 -10，预览再注册 -10 会直接报 "already has a registration"。这里锁住约定。
test('预览的 main.conversation 占位用独立 priority，不抢 dsh-wealth 的 -10', async () => {
  const src = readFileSync(join(HERE, 'preview', 'client.js'), 'utf8')
  assert.doesNotMatch(src, /priority:\s*-10\b/)
  assert.match(src, /priority:\s*OVERLAY_PRIORITY/)
  assert.match(src, /OVERLAY_PRIORITY\s*=\s*-20/)
  assert.match(src, /yield on panel switch/)
  const { execFileSync } = await import('node:child_process')
  const copy = join((await import('node:fs')).mkdtempSync(join((await import('node:os')).tmpdir(), 'preview-check-')), 'client.mjs')
  writeFileSync(copy, src)
  execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' })
})

test('package.json 的 dsh 元数据指向本包的 host / client 半', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, 'preview', 'package.json'), 'utf8'))
  assert.equal(pkg.name, HOST_NAME)
  assert.equal(pkg.exports['.'], './index.js')
  assert.equal(pkg.exports['./client'], './client.js')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  for (const file of pkg.files) assert.ok(existsSync(join(HERE, 'preview', file)), file)
})
