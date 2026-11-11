import assert from 'node:assert/strict'
import test from 'node:test'
import { createThsMcpLogin } from './ths-mcp-login.mjs'

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// 最小 http 桩：createServer() 立即可监听，listen 回调同步给端口。
function fakeHttp() {
  const listeners = {}
  const srv = {
    on: (ev, fn) => { (listeners[ev] ??= []).push(fn); return srv },
    address: () => ({ port: 46464 }),
    listen: (_port, _host, cb) => { setImmediate(cb); return srv },
    close: () => srv,
  }
  return { createServer: () => srv }
}

// unhandledRejection 在 Node 24 默认直接杀死进程（dsh 宿主就是这么退出的）。
// 挂监听器既抑制默认行为，又让我们能断言"零泄漏"。
function watchUnhandled() {
  const seen = []
  const onUnhandled = (reason) => seen.push(reason)
  process.on('unhandledRejection', onUnhandled)
  return {
    seen,
    async settle(ms = 150) { await sleep(ms) },
    stop() { process.off('unhandledRejection', onUnhandled) },
  }
}

const neverFetch = () => () => new Promise(() => {})

test('abort during registration does not leak an unhandled rejection from the callback promise', async () => {
  const watch = watchUnhandled()
  try {
    const ctrl = new AbortController()
    const login = createThsMcpLogin({
      onToken: () => {},
      signal: ctrl.signal,
      http: fakeHttp(),
      deps: { fetch: neverFetch() },
    })
    const starting = login.start()
    // 等 startServer resolve、注册挂起——此刻 callback promise 尚无任何消费者。
    await sleep(100)
    // abort 一到，旧代码会在监听器里 callbackReject(new Error('cancelled')) → unhandledRejection。
    ctrl.abort()
    await starting
    assert.equal(login.status().status, 'timeout')
    await watch.settle()
    assert.deepEqual(watch.seen, [])
    await login.dispose()
  } finally {
    watch.stop()
  }
})

test('flow timeout firing after an early registration failure does not crash the host minutes later', async () => {
  const watch = watchUnhandled()
  try {
    const login = createThsMcpLogin({
      onToken: () => {},
      timeoutMs: 60,
      http: fakeHttp(),
      deps: { fetch: async () => { throw new Error('connection refused') } },
    })
    const status = await login.start()
    assert.equal(status.status, 'error')
    assert.match(status.message, /同花顺授权失败/)
    // 错误路径里 run() 从未 await 到 callback promise；等总超时定时器随后触发 abort listener。
    await sleep(120)
    await watch.settle()
    assert.deepEqual(watch.seen, [])
    await login.dispose()
  } finally {
    watch.stop()
  }
})

test('dispose while starting stays handled', async () => {
  const watch = watchUnhandled()
  try {
    const login = createThsMcpLogin({
      onToken: () => {},
      http: fakeHttp(),
      deps: { fetch: neverFetch() },
    })
    const starting = login.start()
    await sleep(100)
    await login.dispose()
    await starting
    assert.equal(login.status().status, 'disposed')
    await watch.settle()
    assert.deepEqual(watch.seen, [])
  } finally {
    watch.stop()
  }
})
