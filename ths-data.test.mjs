// 同花顺金融数据 API 适配层测试：合成响应，不联网。
import test from 'node:test'
import assert from 'node:assert/strict'
import { thsTarget, thsNavRange, parseThsBars, parseThsNav, fetchThsSeries, checkThsToken, ThsDataError } from './ths-data.mjs'

const reply = (payload) => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => payload })
const fakeFetch = (handler) => {
  const calls = []
  return { calls, fetch: async (url, init) => { calls.push({ url: String(url), headers: init?.headers || {} }); return handler(String(url)) } }
}
const ms = (date) => Date.parse(date + 'T00:00:00+08:00')

test('thsTarget maps CN stocks / ETFs / OTC funds and skips uncovered markets', () => {
  assert.deepEqual(thsTarget({ kind: 'eastmoney', market: 'CN', symbol: '600519', assetClass: 'stock' }), { kind: 'stock', thscode: '600519.SH' })
  assert.deepEqual(thsTarget({ kind: 'eastmoney', market: 'CN', symbol: '000001', assetClass: 'stock' }), { kind: 'stock', thscode: '000001.SZ' })
  assert.deepEqual(thsTarget({ kind: 'eastmoney', market: 'CN', symbol: '510300', assetClass: 'etf' }), { kind: 'etf', thscode: '510300.SH' })
  assert.deepEqual(thsTarget({ kind: 'eastmoney', market: 'CN', symbol: '159977', assetClass: 'etf' }), { kind: 'etf', thscode: '159977.SZ' })
  assert.deepEqual(thsTarget({ kind: 'fund', market: 'CN', symbol: '001257', assetClass: 'fund' }), { kind: 'fund', thscode: '001257.OF' })
  assert.equal(thsTarget({ kind: 'eastmoney', market: 'HK', symbol: '00700', assetClass: 'stock' }), null)
  assert.equal(thsTarget({ kind: 'eastmoney', market: 'US', symbol: 'AAPL', assetClass: 'stock' }), null)
  assert.equal(thsTarget(null), null)
})

test('raw ms timestamps are read in Asia/Shanghai and sorted ascending', () => {
  const bars = parseThsBars({ data: { item: [
    { date_ms: ms('2026-11-06'), close_price: 1433.33 },
    { date_ms: ms('2026-11-05'), close_price: 1435.13 },
    { date_ms: ms('2026-11-04'), close_price: -1 },
    { date_ms: null, close_price: 10 },
  ] } })
  assert.deepEqual(bars, [['2026-11-05', 1435.13], ['2026-11-06', 1433.33]])
  const nav = parseThsNav({ data: { item: [
    { nav_date: ms('2026-11-06'), unit_nav: 1.612 },
    { nav_date: ms('2026-11-05'), unit_nav: '1.608' },
  ] } })
  assert.deepEqual(nav, [['2026-11-05', 1.608], ['2026-11-06', 1.612]])
  assert.deepEqual(parseThsBars({ data: null }), [])
  assert.deepEqual(parseThsNav({}), [])
})

test('nav range picks the shortest window that covers the gap', () => {
  const day = (d) => ms(d)
  assert.equal(thsNavRange(day('2026-11-01'), day('2026-11-06')), 'week')
  assert.equal(thsNavRange(day('2026-10-20'), day('2026-11-06')), 'month')
  assert.equal(thsNavRange(day('2026-09-01'), day('2026-11-06')), 'tmonth')
  assert.equal(thsNavRange(day('2026-06-01'), day('2026-11-06')), 'hyear')
  assert.equal(thsNavRange(day('2026-01-01'), day('2026-11-06')), 'year')
  assert.equal(thsNavRange(day('2025-06-01'), day('2026-11-06')), 'twoyear')
  assert.equal(thsNavRange(day('2024-06-01'), day('2026-11-06')), 'tyear')
  assert.equal(thsNavRange(day('2018-01-01'), day('2026-11-06')), 'fyear')
})

test('stocks split into 10-year windows; ETFs use the 5-year fund endpoint; OTC funds use NAV', async () => {
  const stock = { kind: 'eastmoney', market: 'CN', symbol: '600519', assetClass: 'stock' }
  const stockFetch = fakeFetch(() => reply({ code: 0, data: { item: [{ date_ms: ms('2026-11-06'), close_price: 1433.33 }] } }))
  const bars = await fetchThsSeries(stock, { from: '2015-01-01', to: '2026-11-08', token: 'tk', fetch: stockFetch.fetch })
  assert.deepEqual(bars, [['2026-11-06', 1433.33]])
  assert.equal(stockFetch.calls.length, 2, '11年窗口必须拆成两段')
  for (const call of stockFetch.calls) {
    const url = new URL(call.url)
    assert.equal(url.pathname, '/api/a-share/prices/historical')
    assert.equal(url.searchParams.get('thscode'), '600519.SH')
    assert.equal(url.searchParams.get('adjust'), 'forward')
    assert.ok(Number(url.searchParams.get('end')) - Number(url.searchParams.get('start')) <= 10 * 366 * 86400000)
    assert.equal(call.headers['x-api-key'], 'tk')
  }

  const etfFetch = fakeFetch(() => reply({ code: 0, data: { item: [{ date_ms: ms('2026-11-06'), close_price: 4.682 }] } }))
  const etf = { kind: 'eastmoney', market: 'CN', symbol: '510300', assetClass: 'etf' }
  await fetchThsSeries(etf, { from: '2015-01-01', to: '2026-11-08', token: 'tk', fetch: etfFetch.fetch })
  assert.equal(etfFetch.calls.length, 1)
  const etfUrl = new URL(etfFetch.calls[0].url)
  assert.equal(etfUrl.pathname, '/api/fund/market/historical')
  assert.ok(Number(etfUrl.searchParams.get('end')) - Number(etfUrl.searchParams.get('start')) <= 5 * 367 * 86400000, '超出 5 年的起点要裁剪')

  const navFetch = fakeFetch(() => reply({ code: 0, data: { item: [{ nav_date: ms('2026-11-06'), unit_nav: 1.612 }] } }))
  const fund = { kind: 'fund', market: 'CN', symbol: '001257', assetClass: 'fund' }
  const nav = await fetchThsSeries(fund, { from: '2026-01-01', to: '2026-11-08', token: 'tk', fetch: navFetch.fetch })
  assert.deepEqual(nav, [['2026-11-06', 1.612]])
  const navUrl = new URL(navFetch.calls[0].url)
  assert.equal(navUrl.pathname, '/api/fund/performance/nav')
  assert.equal(navUrl.searchParams.get('thscode'), '001257.OF')
  assert.equal(navUrl.searchParams.get('range'), 'year')
  assert.equal(navUrl.searchParams.get('nav_type'), 'unit')
})

test('uncovered symbols and no-data codes yield empty series instead of errors', async () => {
  const hk = fakeFetch(() => { throw new Error('should not be called') })
  assert.deepEqual(await fetchThsSeries({ kind: 'eastmoney', market: 'HK', symbol: '00700', assetClass: 'stock' }, { token: 'tk', fetch: hk.fetch }), [])
  assert.equal(hk.calls.length, 0)
  const noData = fakeFetch(() => reply({ code: 3002, message: '数据未就绪', data: null }))
  assert.deepEqual(await fetchThsSeries({ kind: 'eastmoney', market: 'CN', symbol: '600519', assetClass: 'stock' }, { from: '2026-01-01', to: '2026-11-08', token: 'tk', fetch: noData.fetch }), [])
})

test('checkThsToken rejects blank keys and surfaces auth errors', async () => {
  await assert.rejects(() => checkThsToken(''), ThsDataError)
  await assert.rejects(() => checkThsToken('has space'), ThsDataError)
  const invalid = fakeFetch(() => reply({ code: 2001, message: '未认证', data: null }))
  await assert.rejects(() => checkThsToken('bad-key', { fetch: invalid.fetch }), /API Key 无效/)
  const ok = fakeFetch(() => reply({ code: 0, data: { item: [{ thscode: '600519.SH' }] } }))
  assert.equal(await checkThsToken('good-key', { fetch: ok.fetch }), true)
  assert.equal(new URL(ok.calls[0].url).pathname, '/api/meta/tickers/search')
  assert.equal(ok.calls[0].headers['x-api-key'], 'good-key')
})
