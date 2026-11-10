import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteKey, parseTencentQuotes, fetchQuotes, refreshQuotes, valuationPrice } from './quotes.mjs'

const line = (key, name, price, date = '20261107', time = '15:00:03') => {
  const f = []
  f[1] = name
  f[2] = key.slice(2)
  f[3] = price
  f[30] = date
  f[31] = time
  return `v_${key}="${f.join('~')}";`
}

test('quoteKey maps CN/HK/US instruments and rejects the rest', () => {
  assert.equal(quoteKey({ market: 'CN', symbol: '600519', assetClass: 'stock' }), 'sh600519')
  assert.equal(quoteKey({ market: 'CN', symbol: '000001', assetClass: 'stock' }), 'sz000001')
  assert.equal(quoteKey({ market: 'CN', symbol: '510300', assetClass: 'etf' }), 'sh510300')
  assert.equal(quoteKey({ market: 'CN', symbol: '159977', assetClass: 'etf' }), 'sz159977')
  assert.equal(quoteKey({ market: 'CN', symbol: '830000', assetClass: 'stock' }), null)
  assert.equal(quoteKey({ market: 'HK', symbol: '700', assetClass: 'stock' }), 'hk00700')
  // 旧写法也映射到同一行情键（2549.HK / HK.02549 / 02549）。
  assert.equal(quoteKey({ market: 'HK', symbol: '2549.HK', assetClass: 'stock' }), 'hk02549')
  assert.equal(quoteKey({ market: 'HK', symbol: 'HK.02549', assetClass: 'stock' }), 'hk02549')
  assert.equal(quoteKey({ market: 'HK', symbol: '01164', assetClass: 'stock' }), 'hk01164')
  assert.equal(quoteKey({ market: 'US', symbol: 'aapl', assetClass: 'stock' }), 'usAAPL')
  assert.equal(quoteKey({ market: 'FUND', symbol: '000001', assetClass: 'fund' }), null)
  assert.equal(quoteKey({ market: 'CN', symbol: '600519', assetClass: 'cash' }), null)
  assert.equal(quoteKey({ market: 'CASH', symbol: 'HKD.CASH', assetClass: 'cash' }), null)
})

test('parses batch payload with names, prices and timestamps; bad lines become warnings', () => {
  const text = [
    line('sh600519', '贵州茅台', '1688.00'),
    line('hk00700', '腾讯控股', '410.000', '20261107', '16:08:11'),
    'v_usAAPL="200~苹果~AAPL~invalid~1~1";',
    'v_sz000001="1~平安银行~~~~";',
    'pv_sh600000="garbage";',
  ].join(';')
  const { quotes, warnings } = parseTencentQuotes(text)
  assert.equal(quotes.size, 2)
  const mt = quotes.get('sh600519')
  assert.deepEqual([mt.name, mt.price, mt.currency, mt.quotedAt], ['贵州茅台', 1688, 'CNY', '2026-11-07T15:00:03'])
  const tx = quotes.get('hk00700')
  assert.deepEqual([tx.currency, tx.quotedAt], ['HKD', '2026-11-07T16:08:11'])
  assert.deepEqual(warnings, ['QUOTE_UNAVAILABLE:usAAPL', 'QUOTE_UNAVAILABLE:sz000001'])
})

test('fetchQuotes reports network and HTTP failures as warnings without throwing', async () => {
  const down = await fetchQuotes(['sh600519'], { fetch: async () => { throw new Error('down') } })
  assert.equal(down.quotes.size, 0)
  assert.match(down.warnings[0], /^QUOTES_NETWORK/)
  const http = await fetchQuotes(['sh600519'], { fetch: async () => ({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) }) })
  assert.deepEqual(http.warnings, ['QUOTES_HTTP:503'])
  const missing = await fetchQuotes(['sh600519'], { fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('v_sh600000="1~x~600000~1~1";').buffer }) })
  assert.deepEqual(missing.warnings, ['QUOTE_MISSING:sh600519'])
})

test('refreshQuotes fills quotePrice below manual overrides and reports changes', async () => {
  const db = {
    baseCurrency: 'CNY', fx: { CNY: 1, HKD: 0.92 },
    instruments: [
      { id: 'I1', symbol: '600519', market: 'CN', assetClass: 'stock', currency: 'CNY' },
      { id: 'I2', symbol: '00700', market: 'HK', assetClass: 'stock', currency: 'HKD' },
      { id: 'I3', symbol: '000001', market: 'FUND', assetClass: 'fund', currency: 'CNY' },
    ],
    holdings: [
      { id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 100, avgCost: 1500, manualPrice: 1700, quotePrice: null, currency: 'CNY' },
      { id: 'H2', accountId: 'A', instrumentId: 'I2', qty: 300, avgCost: 380, manualPrice: null, quotePrice: null, currency: 'HKD' },
      { id: 'H3', accountId: 'A', instrumentId: 'I3', qty: 20000, avgCost: 1.2, manualPrice: null, quotePrice: null, currency: 'CNY' },
    ],
  }
  const payload = [
    line('sh600519', '贵州茅台', '1688.00'),
    line('hk00700', '腾讯控股', '410.000', '20261107', '16:08:11'),
  ].join(';')
  const result = await refreshQuotes(db, { fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(payload).buffer }) })
  assert.equal(result.updated, 2)
  assert.deepEqual(result.applied.map(a => a.holdingId).sort(), ['H1', 'H2'])
  // 手填价优先：H1 的 quotePrice 更新为最新行情但估值仍用 1700。
  assert.equal(db.holdings[0].quotePrice, 1688)
  assert.equal(db.holdings[0].manualPrice, 1700)
  assert.equal(db.holdings[1].quotePrice, 410)
  assert.ok(db.holdings[1].quoteAt.startsWith('2026-11-07T'))
  assert.equal(db.holdings[1].quoteSource, 'tencent')
  // 场外基金不在行情范围：不请求、无告警、quotePrice 保持 null。
  assert.deepEqual(result.warnings, [])
  assert.equal(db.holdings[2].quotePrice, null)
})

const fields = (name, price, stamp, change, pct) => {
  const row = []
  row[1] = name
  row[3] = price
  row[30] = stamp
  row[31] = change
  row[32] = pct
  return row.join('~')
}

test('parses live stamps and today change percent, including a limit-up and a loss', () => {
  const text = [
    `v_sz002432="${fields('九安医疗', '57.65', '20261110120524', '5.24', '10.00')}"`,
    `v_hk01164="${fields('中广核矿业', '2.250', '2026/11/10 11:56:46', '0.090', '4.17')}"`,
    `v_usAAPL="${fields('苹果', '350.69', '2026-11-09 16:00:01', '8.32', '-0.42')}"`,
  ].join(';')
  const { quotes } = parseTencentQuotes(text)
  const jiu = quotes.get('sz002432')
  assert.deepEqual([jiu.price, jiu.quotedAt, jiu.changePct], [57.65, '2026-11-10T12:05:24', 10])
  assert.equal(quotes.get('hk01164').quotedAt, '2026-11-10T11:56:46')
  assert.equal(quotes.get('hk01164').changePct, 4.17)
  const apple = quotes.get('usaapl')
  assert.equal(apple.quotedAt, '2026-11-09T16:00:01')
  assert.equal(apple.changePct, -0.42)
})

test('a broker price copied into manualPrice does not hide today quote; a real hand price still does', async () => {
  const db = {
    baseCurrency: 'CNY', fx: { CNY: 1 },
    instruments: [
      { id: 'I1', symbol: '002432', market: 'CN', assetClass: 'stock' },
      { id: 'I2', symbol: '002364', market: 'CN', assetClass: 'stock' },
    ],
    holdings: [
      { id: 'H1', instrumentId: 'I1', manualPrice: 52.41, sourcePrice: 52.41, quotePrice: null },
      { id: 'H2', instrumentId: 'I2', manualPrice: 30, sourcePrice: 24.54, quotePrice: null },
    ],
  }
  const payload = [
    `v_sz002432="${fields('九安医疗', '57.65', '20261110120524', '5.24', '10.00')}"`,
    `v_sz002364="${fields('中恒电气', '25.01', '20261110120524', '0.47', '1.92')}"`,
  ].join(';')
  await refreshQuotes(db, { fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(payload).buffer }) })
  assert.equal(db.holdings[0].manualPrice, null)
  assert.equal(db.holdings[0].quotePrice, 57.65)
  assert.equal(db.holdings[0].quoteChangePct, 10)
  assert.equal(db.holdings[0].quoteAt.startsWith('2026-11-10T12:05:24'), true)
  assert.equal(valuationPrice(db.holdings[0]), 57.65)
  assert.equal(db.holdings[1].manualPrice, 30)
  assert.equal(db.holdings[1].quoteChangePct, 1.92)
  assert.equal(valuationPrice(db.holdings[1]), 30)
})
