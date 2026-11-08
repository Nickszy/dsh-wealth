import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'
import { createThsLogin, thsCookiesToHeader, launchThsBrowser } from './ths-login.mjs'

const cookies = [
  { domain: '.10jqka.com.cn', name: 'userid', value: '123' },
  { domain: 'tzzb.10jqka.com.cn', name: 'v', value: 'fixture' },
  { domain: 'evil10jqka.com.cn', name: 'password', value: 'excluded' },
]
const tick = () => new Promise(resolve => setImmediate(resolve))
async function until(predicate) { for (let i = 0; i < 100; i++) { if (predicate()) return; await tick() } assert.fail('state did not settle') }
function browser(overrides = {}) {
  return { closed: 0, cookies: async () => cookies, isClosed: async () => false, async close() { this.closed++ }, ...overrides }
}
test('cookie capture allowlists THS domains, rejects guest and userid-only cookies', () => {
  assert.equal(thsCookiesToHeader(cookies), 'userid=123; v=fixture')
  for (const c of [[cookies[0]], [{ ...cookies[0], value: '0' }, cookies[1]], [{ ...cookies[0], domain: '10jqka.com.cn.evil.test' }, cookies[1]]]) assert.throws(() => thsCookiesToHeader(c))
  assert.throws(() => thsCookiesToHeader([...cookies, { ...cookies[0], value: '456' }]))
  assert.equal(thsCookiesToHeader([...cookies, { domain: '.10jqka.com.cn', name: 'bad', value: 'x\r\ny' }]), 'userid=123; v=fixture')
})
test('successful login verifies then saves only server side and closes owned browser', async () => {
  const b = browser(), events = []
  const login = createThsLogin({ launchBrowser: async url => { assert.equal(url, 'https://tzzb.10jqka.com.cn'); return b }, verifyCookie: async cookie => { assert.equal(cookie, 'userid=123; v=fixture'); events.push('verify') }, onCookie: async cookie => { assert.equal(cookie, 'userid=123; v=fixture'); events.push('save') } })
  const initial = await login.start(); assert.equal(initial.status, 'acquiring')
  await until(() => login.status().status === 'saved')
  assert.deepEqual(events, ['verify', 'save']); assert.equal(b.closed, 1)
  assert.ok(!JSON.stringify(login.status()).includes('fixture')); await login.dispose()
})
test('API verification failure never saves and redacts thrown secrets', async () => {
  let saves = 0; const b = browser()
  const login = createThsLogin({ launchBrowser: async () => b, verifyCookie: async () => { throw new Error('secret-cookie') }, onCookie: () => saves++ })
  await login.start(); await until(() => login.status().status === 'failed')
  assert.equal(saves, 0); assert.equal(b.closed, 1); assert.ok(!JSON.stringify(login.status()).includes('secret-cookie')); await login.dispose()
})
test('start deduplicates concurrent requests and dispose aborts polling', async () => {
  let launches = 0, saves = 0; const b = browser({ cookies: async () => [] })
  const login = createThsLogin({ launchBrowser: async () => { launches++; return b }, onCookie: () => saves++, pollMs: 10000 })
  await Promise.all([login.start(), login.start()]); await login.dispose()
  assert.equal(launches, 1); assert.equal(saves, 0); assert.equal(b.closed, 1); assert.equal(login.status().status, 'disposed')
  assert.equal((await login.start()).status, 'disposed')
})
test('timeout aborts acquisition and cleans temporary browser', async () => {
  const b = browser({ cookies: async () => [] })
  const login = createThsLogin({ launchBrowser: async () => b, onCookie: () => assert.fail('no save'), timeoutMs: 15, pollMs: 1 })
  await login.start()
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.equal(login.status().status, 'timeout'); assert.equal(b.closed, 1); await login.dispose()
})
test('external abort stops a pending cookie read and closes browser', async () => {
  const control = new AbortController(), b = browser({ cookies: () => new Promise(() => {}) })
  const login = createThsLogin({ launchBrowser: async () => b, onCookie: () => assert.fail('no save'), signal: control.signal })
  await login.start(); await tick(); control.abort(); await until(() => b.closed === 1)
  assert.equal(login.status().status, 'timeout'); await login.dispose()
})
test('late browser launch after dispose is still cleaned', async () => {
  let finish; const launched = new Promise(resolve => { finish = resolve }), b = browser()
  const login = createThsLogin({ launchBrowser: () => launched, onCookie: () => assert.fail('no save') })
  const starting = login.start(); await tick(); const disposing = login.dispose(); finish(b)
  await starting; await disposing; await until(() => b.closed > 0)
  assert.equal(login.status().status, 'disposed')
})
test('launch unavailable has friendly manual-cookie fallback, no raw errors', async () => {
  const login = createThsLogin({ launchBrowser: async () => { throw new Error('private-path secret') }, onCookie: () => {} })
  const state = await login.start(); assert.equal(state.status, 'failed'); assert.match(state.message, /手动/); assert.ok(!state.message.includes('secret')); await login.dispose()
})
test('closed login window is contained and cleanup failures block a second launch', async () => {
  let launches = 0, cleanupWorks = false
  const b = browser({ isClosed: async () => true, close: async () => { if (!cleanupWorks) throw new Error('path-secret') } })
  const login = createThsLogin({ launchBrowser: async () => { launches++; return b }, onCookie: () => {} })
  await login.start(); await until(() => login.status().status === 'cleanup_pending')
  assert.equal((await login.start()).status, 'cleanup_pending'); assert.equal(launches, 1)
  cleanupWorks = true; await login.dispose()
})
test('onCookie error is sanitized and owned browser still closes', async () => {
  const b = browser()
  const login = createThsLogin({ launchBrowser: async () => b, verifyCookie: async () => {}, onCookie: async () => { throw new Error('userid=123; v=fixture') } })
  await login.start(); await until(() => login.status().status === 'failed')
  assert.equal(b.closed, 1); assert.ok(!JSON.stringify(login.status()).includes('fixture')); await login.dispose()
})
test('failed launch retains cleanup ownership even when launch errors are redacted', async () => {
  let clean = false, closes = 0
  const b = browser({ close: async () => { closes++; if (!clean) throw new Error('private profile path') } })
  const login = createThsLogin({ launchBrowser: async () => { const error = new Error('launch details'); error.browser = b; throw error }, onCookie: () => {} })
  assert.equal((await login.start()).status, 'cleanup_pending')
  assert.equal((await login.start()).status, 'cleanup_pending'); assert.ok(closes >= 2)
  clean = true; await login.dispose()
})
test('save timeout cannot start a concurrent second save and still closes browser', async () => {
  let finishSave, launches = 0
  const b = browser(), saving = new Promise(resolve => { finishSave = resolve })
  const login = createThsLogin({ launchBrowser: async () => { launches++; return b }, verifyCookie: async () => {}, onCookie: () => saving, saveTimeoutMs: 5 })
  await login.start(); await new Promise(resolve => setTimeout(resolve, 15))
  assert.equal(login.status().status, 'failed'); assert.equal(b.closed, 1)
  await login.start(); assert.equal(launches, 1)
  finishSave(); await tick(); await login.dispose()
})
function launchFixture({ noPort = false } = {}) {
  const child = new EventEmitter(), deleted = [], spawned = []
  const profile = join(process.cwd(), 'fake-temp', 'dsh-portfolio-ths-fixture')
  let removed = false
  child.kill = () => { queueMicrotask(() => child.emit('exit', 0)); return true }
  class FakeSocket extends EventTarget {
    constructor(url) { super(); assert.equal(url, 'ws://127.0.0.1:12345/devtools/browser/fixture'); queueMicrotask(() => this.dispatchEvent(new Event('open'))) }
    send(text) {
      const { id, method } = JSON.parse(text)
      if (method === 'Browser.close') queueMicrotask(() => child.emit('exit', 0))
      const result = method === 'Storage.getCookies' ? { cookies } : method === 'Target.getTargets' ? { targetInfos: [{ type: 'page' }] } : {}
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ id, result }) })))
    }
    close() {}
  }
  return { deleted, spawned, profile, deps: {
    browserCandidates: ['fake-edge'], tempDir: join(process.cwd(), 'fake-temp'), WebSocket: FakeSocket,
    fs: { access: async () => {}, mkdtemp: async () => profile, realpath: async p => p, lstat: async () => { if (removed) { const e = new Error(); e.code = 'ENOENT'; throw e } return { isSymbolicLink: () => false, isDirectory: () => true } }, readFile: async p => { assert.equal(p, join(profile, 'DevToolsActivePort')); if (noPort) throw new Error('not yet'); return '12345\n/devtools/browser/fixture\n' }, rm: async p => { deleted.push(p); removed = true } },
    spawn: (exe, args, options) => { spawned.push({ exe, args, options }); return child },
  } }
}
test('owned launcher uses isolated profile/ephemeral port and CDP cookies, removes only owned path', async () => {
  const f = launchFixture(), b = await launchThsBrowser(undefined, f.deps)
  assert.equal(f.spawned.length, 1)
  assert.ok(f.spawned[0].args.includes('--remote-debugging-port=0'))
  assert.ok(f.spawned[0].args.includes(`--user-data-dir=${f.profile}`))
  assert.equal(f.spawned[0].options.shell, false); assert.equal(f.spawned[0].options.stdio, 'ignore')
  assert.deepEqual(await b.cookies(), cookies); assert.equal(await b.isClosed(), false)
  await b.close(); assert.deepEqual(f.deleted, [f.profile])
})
test('profile cleanup refuses a replaced symlink and preserves unrelated paths', async () => {
  const f = launchFixture(), b = await launchThsBrowser(undefined, f.deps)
  f.deps.fs.lstat = async () => ({ isSymbolicLink: () => true, isDirectory: () => true })
  await assert.rejects(b.close())
  assert.deepEqual(f.deleted, [])
})
test('launcher abort during DevTools discovery kills only owned child and removes profile', async () => {
  const f = launchFixture({ noPort: true }), control = new AbortController()
  f.deps.signal = control.signal
  f.deps.sleep = async () => { control.abort() }
  await assert.rejects(launchThsBrowser(undefined, f.deps))
  assert.deepEqual(f.deleted, [f.profile]); assert.equal(f.spawned.length, 1)
})
