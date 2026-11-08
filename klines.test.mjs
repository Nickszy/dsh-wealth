import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { klineTarget, parseEastmoneyKline, parseFundNav, loadDailyCloses } from './klines.mjs'

const klineJson = (rows) => ({ data: { klines: rows } })
const fundJson = (rows) => ({ ErrCode: 0, Data: { LSJZList: rows } })
const fakeFetch = (handler) => {
  const calls = []
  return { calls, fetch: async (url, init) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => handler(String(url)) } } }
}

test('klineTarget maps A-share/ETF/HK/fund and rejects unsupported assets', () => {
  assert.equal(klineTarget({ symbol: '600519', market: 'CN', assetClass: 'stock' }).key, 'em:1.600519')
  assert.equal(klineTarget({ symbol: '000001', market: 'CN', assetClass: 'stock' }).key, 'em:0.000001')
  assert.equal(klineTarget({ symbol: '510300', market: 'CN', assetClass: 'etf' }).key, 'em:1.510300')
  assert.equal(klineTarget({ symbol: '159977', market: 'CN', assetClass: 'etf' }).key, 'em:0.159977')
  assert.equal(klineTarget({ symbol: '700', market: 'HK', assetClass: 'stock' }).key, 'em:116.00700')
  // 旧写法同样能查历史行情（2549.HK → 02549）。
  assert.equal(klineTarget({ symbol: '2549.HK', market: 'HK', assetClass: 'stock' }).key, 'em:116.02549')
  assert.equal(klineTarget({ symbol: 'HK.02549', market: 'HK', assetClass: 'stock' }).key, 'em:116.02549')
  assert.equal(klineTarget({ symbol: '001257', market: 'CN', assetClass: 'fund' }).key, 'fund:001257')
  assert.equal(klineTarget({ symbol: 'AAPL', market: 'US', assetClass: 'stock' }), null)
  assert.equal(klineTarget({ symbol: 'CASH:CNY', market: 'CASH', assetClass: 'cash' }), null)
})

test('parsers keep valid rows, drop malformed ones and sort ascending', () => {
  const kline = parseEastmoneyKline(klineJson(['2026-01-05,11.2', '2026-01-02,10.5', 'bad,1', '2026-01-06,-1', '2026-01-07,']))
  assert.deepEqual(kline, [['2026-01-02', 10.5], ['2026-01-05', 11.2]])
  const nav = parseFundNav(fundJson([{ FSRQ: '2026-11-06', DWJZ: '1.6120' }, { FSRQ: '2026-11-05', DWJZ: 'oops' }, { FSRQ: '2026-11-04', DWJZ: '1.6000' }]))
  assert.deepEqual(nav, [['2026-11-04', 1.6], ['2026-11-06', 1.612]])
  assert.deepEqual(parseEastmoneyKline({ data: null }), [])
  assert.deepEqual(parseFundNav({}), [])
})

test('loadDailyCloses caches per day, reuses coverage and merges longer history', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-kline-'))
  const cachePath = join(dir, 'cache.json')
  const instruments = [{ id: 'I1', symbol: '510300', market: 'CN', assetClass: 'etf' }]
  const today = Date.parse('2026-11-08T00:00:00Z')
  let fetches = 0
  const fetchImpl = async (url) => { fetches++; return { ok: true, status: 200, json: async () => klineJson(['2026-11-06,4.124', '2026-11-05,4.1']) } }
  const first = await loadDailyCloses(instruments, { from: '2024-01-01', fetch: fetchImpl, cachePath, now: () => today })
  assert.equal(first.fetched, 1)
  assert.deepEqual(first.prices.get('em:1.510300'), [['2026-11-05', 4.1], ['2026-11-06', 4.124]])
  const second = await loadDailyCloses(instruments, { from: '2024-01-01', fetch: fetchImpl, cachePath, now: () => today })
  assert.equal(second.fetched, 0); assert.equal(second.cached, 1); assert.equal(fetches, 1)
  // 请求更长历史 → 重新拉取并合并旧缓存
  const third = await loadDailyCloses(instruments, { from: '2023-01-01', fetch: async () => { fetches++; return { ok: true, status: 200, json: async () => klineJson(['2025-12-31,3.9', '2026-11-06,4.124']) } }, cachePath, now: () => today })
  assert.equal(third.fetched, 1)
  assert.deepEqual(third.prices.get('em:1.510300').map(([d]) => d), ['2025-12-31', '2026-11-05', '2026-11-06'])
  rmSync(dir, { recursive: true, force: true })
})

test('loadDailyCloses reports failures per target and never invents prices', async () => {
  const d = fakeFetch(() => { throw Object.assign(new Error('boom'), { name: 'TypeError' }) })
  const down = await loadDailyCloses([{ id: 'I1', symbol: '600519', market: 'CN', assetClass: 'stock' }], { fetch: async () => { throw new Error('down') } })
  assert.equal(down.prices.size, 0)
  assert.ok(down.warnings[0].startsWith('KLINE_FAILED:em:1.600519'))
  const empty = await loadDailyCloses([{ id: 'I1', symbol: '600519', market: 'CN', assetClass: 'stock' }], { fetch: async () => ({ ok: true, status: 200, json: async () => ({ data: null }) }) })
  assert.deepEqual(empty.warnings, ['KLINE_EMPTY:em:1.600519'])
  assert.ok(d.calls.length === 0)
})

test('loadDailyCloses keeps history and syncs only the tail on a new day', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-kline-inc-'))
  const cachePath = join(dir, 'cache.json')
  const instruments = [{ id: 'I1', symbol: '600519', market: 'CN', assetClass: 'stock' }]
  const day1 = Date.parse('2026-11-06T10:00:00Z')
  const calls = []
  const first = await loadDailyCloses(instruments, {
    from: '2026-01-01', cachePath, now: () => day1,
    fetch: async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => klineJson(['2026-11-06,1433.33', '2026-11-05,1435.13', '2026-10-30,1410']) } },
  })
  assert.equal(first.fetched, 1)
  assert.ok(calls[0].includes('beg=20260101'), '首次拉取从请求起点开始')
  calls.length = 0
  // 同一天再次查看：完全命中缓存，不发请求。
  const again = await loadDailyCloses(instruments, {
    from: '2026-01-01', cachePath, now: () => day1,
    fetch: async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => klineJson(['2026-11-06,1433.33']) } },
  })
  assert.equal(again.cached, 1); assert.equal(again.fetched, 0); assert.equal(calls.length, 0)
  // 第二天：只回看最后缓存日之前 5 天，历史缓存原样保留。
  const day2 = Date.parse('2026-11-07T10:00:00Z')
  const next = await loadDailyCloses(instruments, {
    from: '2026-01-01', cachePath, now: () => day2,
    fetch: async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => klineJson(['2026-11-07,1440']) } },
  })
  assert.equal(next.fetched, 1)
  assert.equal(calls.length, 1)
  assert.ok(calls[0].includes('beg=20261101'), '尾部同步从最后缓存日回看 5 天：' + calls[0])
  assert.deepEqual(next.prices.get('em:1.600519').map(([d]) => d), ['2026-10-30', '2026-11-05', '2026-11-06', '2026-11-07'])
  rmSync(dir, { recursive: true, force: true })
})

test('an empty tail keeps cached history and stops refetching that day', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-kline-empty-'))
  const cachePath = join(dir, 'cache.json')
  const instruments = [{ id: 'F1', symbol: '001257', market: 'CN', assetClass: 'fund' }]
  const day1 = Date.parse('2026-11-06T10:00:00Z')
  await loadDailyCloses(instruments, { from: '2026-01-01', cachePath, now: () => day1, fetch: async () => ({ ok: true, status: 200, json: async () => fundJson([{ FSRQ: '2026-11-06', DWJZ: '1.612' }]) }) })
  const day2 = Date.parse('2026-11-08T10:00:00Z') // 周末，没有新净值
  let calls = 0
  const empty = await loadDailyCloses(instruments, { from: '2026-01-01', cachePath, now: () => day2, fetch: async () => { calls++; return { ok: true, status: 200, json: async () => fundJson([]) } } })
  assert.equal(empty.warnings.length, 0)
  assert.deepEqual(empty.prices.get('fund:001257'), [['2026-11-06', 1.612]])
  assert.equal(calls, 1)
  await loadDailyCloses(instruments, { from: '2026-01-01', cachePath, now: () => day2, fetch: async () => { calls++; return { ok: true, status: 200, json: async () => fundJson([]) } } })
  assert.equal(calls, 1, '当天失败/空结果不应反复请求')
  rmSync(dir, { recursive: true, force: true })
})

test('with a data token THS is preferred and eastmoney is the fallback', async () => {
  const instruments = [{ id: 'I1', symbol: '600519', market: 'CN', assetClass: 'stock' }]
  const now = () => Date.parse('2026-11-08T10:00:00Z')
  const calls = []
  const ths = await loadDailyCloses(instruments, {
    from: '2026-11-01', dataToken: 'tk', now,
    fetch: async (url) => {
      calls.push(String(url))
      if (String(url).includes('fuyao.aicubes.cn')) return { ok: true, status: 200, json: async () => ({ code: 0, data: { item: [{ date_ms: Date.parse('2026-11-06T00:00:00+08:00'), close_price: 1433.33 }] } }) }
      return { ok: true, status: 200, json: async () => klineJson(['2026-11-06,1']) }
    },
  })
  assert.ok(calls[0].includes('fuyao.aicubes.cn'))
  assert.deepEqual(ths.prices.get('em:1.600519'), [['2026-11-06', 1433.33]])
  const fallback = await loadDailyCloses(instruments, {
    from: '2026-11-01', dataToken: 'tk', now,
    fetch: async (url) => {
      if (String(url).includes('fuyao.aicubes.cn')) throw new Error('down')
      return { ok: true, status: 200, json: async () => klineJson(['2026-11-06,99']) }
    },
  })
  assert.deepEqual(fallback.prices.get('em:1.600519'), [['2026-11-06', 99]])
})

test('fund NAV fetches pages until the requested start date is covered', async () => {
  const pages = [
    [{ FSRQ: '2026-11-06', DWJZ: '1.612' }, { FSRQ: '2026-10-01', DWJZ: '1.5' }],
    [{ FSRQ: '2026-09-30', DWJZ: '1.49' }, { FSRQ: '2026-01-05', DWJZ: '1.2' }],
  ]
  let call = 0
  const fetchImpl = async (url) => {
    const index = Number(new URL(url).searchParams.get('pageIndex')) - 1
    call++
    return { ok: true, status: 200, json: async () => fundJson(pages[index] || []) }
  }
  const out = await loadDailyCloses([{ id: 'F1', symbol: '001257', market: 'CN', assetClass: 'fund' }], { from: '2026-01-01', fetch: fetchImpl })
  assert.equal(call, 3) // 第 2 页仍未覆盖起点，必须再请求一页确认到底
  assert.deepEqual(out.prices.get('fund:001257').map(([d]) => d), ['2026-01-05', '2026-09-30', '2026-10-01', '2026-11-06'])
})
