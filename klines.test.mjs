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
