import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteKey, fundQuoteKey, thsCodeOf, parseTencentQuotes, parseTencentFundQuotes, fetchQuotes, refreshQuotes, valuationPrice, dayChange } from './quotes.mjs'

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

test('quote refresh fills placeholder catalog names but never overwrites real ones', async () => {
  const db = {
    baseCurrency: 'CNY', fx: { CNY: 1 },
    instruments: [
      { id: 'I1', symbol: '600519', name: '600519', market: 'CN', assetClass: 'stock', currency: 'CNY' },
      { id: 'I2', symbol: '000888', name: '黄山旅游', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    ],
    holdings: [
      { id: 'H1', accountId: 'A', instrumentId: 'I1', qty: 100, avgCost: 1500, manualPrice: null, quotePrice: null, currency: 'CNY' },
      { id: 'H2', accountId: 'A', instrumentId: 'I2', qty: 100, avgCost: 10, manualPrice: null, quotePrice: null, currency: 'CNY' },
    ],
  }
  const payload = [
    // 行情响应是 GBK 编码，测试桩统一用 ASCII 名称避免编码器差异。
    line('sh600519', 'MOUTAI-A', '1688.00'),
    line('sh000888', 'HUANGSHAN-B', '0.90'),
  ].join(';')
  await refreshQuotes(db, { fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(payload).buffer }) })
  assert.equal(db.instruments[0].name, 'MOUTAI-A', 'code-as-name placeholder is filled from the quote')
  assert.equal(db.instruments[1].name, '黄山旅游', 'an existing real name is never overwritten by the quote feed')
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
  // 场外基金会去要净值；这个假响应里没有它，所以只告警、不写价格。
  assert.deepEqual(result.warnings, ['QUOTE_MISSING:jj000001'])
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

test('dayChange is the move from the previous close, not the full price', () => {
  // 57.65 相对昨收涨了 10%：今日盈亏只计涨出来的部分，不是整段现价。
  const up = dayChange({ qty: 1900, quotePrice: 57.65, quoteChangePct: 10 })
  assert.ok(Math.abs(up - 1900 * 57.65 * 10 / 110) < 1e-6)
  assert.ok(up < 1900 * 6)
  const down = dayChange({ qty: 100, quotePrice: 17.03, quoteChangePct: -3.68 })
  assert.ok(down < 0)
  assert.equal(dayChange({ qty: 10, quotePrice: 57.65, quoteChangePct: null }), null)
  assert.equal(dayChange({ qty: 10, quotePrice: 57.65 }), null)
  assert.equal(dayChange({ qty: 10, quoteChangePct: 10 }), null)
})

test('fund NAV refresh writes the published unit value and drops a broker snapshot', async () => {
  assert.equal(fundQuoteKey({ symbol: '012709', market: 'FUND', assetClass: 'fund' }), 'jj012709')
  assert.equal(fundQuoteKey({ symbol: '012709', market: 'CN', assetClass: 'fund' }), 'jj012709')
  assert.equal(fundQuoteKey({ symbol: 'HK0000910940.HKD', market: 'FUND', assetClass: 'fund' }), null)
  assert.equal(quoteKey({ symbol: '012709', market: 'FUND', assetClass: 'fund' }), null)
  const parsed = parseTencentFundQuotes([
    'v_jj012709="012709~fund~0~0~~1.3845~1.4775~-0.2018~2026-11-10~"',
    'v_jj003474="003474~cash~0~0~~0~0~0~~"',
  ].join(';'))
  assert.deepEqual([parsed.quotes.get('jj012709').price, parsed.quotes.get('jj012709').changePct, parsed.quotes.get('jj012709').quotedAt], [1.3845, -0.2018, '2026-11-10T00:00:00'])
  assert.deepEqual(parsed.warnings, ['QUOTE_UNAVAILABLE:jj003474'])
  const db = {
    fx: { CNY: 1 },
    instruments: [
      { id: 'I1', symbol: '012709', market: 'FUND', assetClass: 'fund' },
      { id: 'I2', symbol: '001257', market: 'CN', assetClass: 'fund' },
      { id: 'I3', symbol: '008173', market: 'CN', assetClass: 'fund' },
    ],
    holdings: [
      { id: 'H1', instrumentId: 'I1', qty: 100, manualPrice: 1.3914780292942743, sourcePrice: 1.3846834882691457, quotePrice: null },
      { id: 'H2', instrumentId: 'I2', qty: 10, manualPrice: 2, sourcePrice: 1.617, quotePrice: null },
      { id: 'H3', instrumentId: 'I3', qty: 10, manualPrice: 1.2319, sourcePrice: 1.2319, quotePrice: null },
    ],
  }
  const payload = [
    'v_jj012709="012709~fund~0~0~~1.3845~1.4775~-0.2018~2026-11-10~"',
    'v_jj001257="001257~fund~0~0~~1.6200~1.8000~0.12~2026-11-10~"',
    'v_jj008173="008173~fund~0~0~~1.2400~1.5000~0.66~2026-11-10~"',
  ].join(';')
  await refreshQuotes(db, { fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(payload).buffer }) })
  assert.equal(db.holdings[0].manualPrice, null)
  assert.equal(db.holdings[0].quotePrice, 1.3845)
  assert.equal(db.holdings[0].quoteChangePct, -0.2018)
  assert.equal(db.holdings[0].quoteSource, 'tencent-fund')
  assert.equal(valuationPrice(db.holdings[0]), 1.3845)
  assert.equal(db.holdings[1].manualPrice, 2)
  assert.equal(valuationPrice(db.holdings[1]), 2)
  assert.equal(db.holdings[2].quotePrice, 1.24)
  assert.equal(valuationPrice(db.holdings[2]), 1.24)
})

// ---- 同花顺行情快照：A股 / 场内基金优先，港股 / 美股 / 场外净值仍走腾讯 ----
const thsBody = (rows, timestamp = 1763000000000) => ({ code: 0, message: 'success', data: { timestamp, item: rows } })
const thsRow = (thscode, ticker, price, pct) => ({ thscode, ticker, last_price: price, price_change_ratio_pct: pct })
const fundLine = (code, name, nav, date = '2026-11-13') => {
  const f = []
  f[0] = code
  f[1] = name
  f[5] = nav
  f[8] = date
  return `v_jj${code}="${f.join('~')}";`
}
const textResponse = (payload) => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(payload).buffer })
const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

const mixedDb = () => ({
  baseCurrency: 'CNY', fx: { CNY: 1, HKD: 0.92 },
  instruments: [
    { id: 'S', symbol: '600519', market: 'CN', assetClass: 'stock', currency: 'CNY' },
    { id: 'E', symbol: '161725', market: 'CN', assetClass: 'etf', currency: 'CNY' },
    { id: 'H', symbol: '00700', market: 'HK', assetClass: 'stock', currency: 'HKD' },
    { id: 'F', symbol: '000001', market: 'FUND', assetClass: 'fund', currency: 'CNY' },
  ],
  holdings: [
    { id: 'HS', accountId: 'A', instrumentId: 'S', qty: 10, avgCost: 1000, manualPrice: null, quotePrice: null, currency: 'CNY' },
    { id: 'HE', accountId: 'A', instrumentId: 'E', qty: 10, avgCost: 1, manualPrice: null, quotePrice: null, currency: 'CNY' },
    { id: 'HH', accountId: 'A', instrumentId: 'H', qty: 10, avgCost: 300, manualPrice: null, quotePrice: null, currency: 'HKD' },
    { id: 'HF', accountId: 'A', instrumentId: 'F', qty: 10, avgCost: 1, manualPrice: null, quotePrice: null, currency: 'CNY' },
  ],
})

test('thsCodeOf only covers A-share stocks and on-exchange funds', () => {
  assert.equal(thsCodeOf({ market: 'CN', symbol: '600519', assetClass: 'stock' }), '600519.SH')
  assert.equal(thsCodeOf({ market: 'CN', symbol: '000001', assetClass: 'stock' }), '000001.SZ')
  assert.equal(thsCodeOf({ market: 'CN', symbol: '161725', assetClass: 'etf' }), '161725.SZ')
  assert.equal(thsCodeOf({ market: 'HK', symbol: '00700', assetClass: 'stock' }), null)
  assert.equal(thsCodeOf({ market: 'US', symbol: 'AAPL', assetClass: 'stock' }), null)
  assert.equal(thsCodeOf({ market: 'FUND', symbol: '000001', assetClass: 'fund' }), null)
})

test('with a THS key, A-share and ETF prices come from THS while HK/funds stay on Tencent', async () => {
  const db = mixedDb()
  const calls = []
  const fetch = async (url) => {
    const u = String(url)
    calls.push(u)
    if (u.includes('/api/a-share/prices/snapshot')) return jsonResponse(thsBody([thsRow('600519.SH', '600519', 1700, 1.2)]))
    if (u.includes('/api/fund/market/snapshot')) return jsonResponse(thsBody([thsRow('161725.SZ', '161725', 1.11, -0.5)]))
    if (u.includes('qt.gtimg.cn')) return textResponse([
      // 腾讯没收录这只 LOF：没有同花顺时它会一直缺价。
      line('hk00700', 'TENCENT', '410'),
      fundLine('000001', 'FUND-ONE', '1.23'),
    ].join(';'))
    throw new Error('unexpected fetch: ' + u)
  }
  const result = await refreshQuotes(db, { fetch, ths: { token: 'tok-123' } })

  assert.equal(db.holdings[0].quotePrice, 1700)
  assert.equal(db.holdings[0].quoteSource, 'ths')
  assert.equal(db.holdings[0].quoteChangePct, 1.2)
  assert.match(db.holdings[0].quoteAt, /^2025-11-13T/, 'THS ms timestamp lands as a parsed ISO stamp')
  assert.equal(db.holdings[1].quotePrice, 1.11, 'the LOF Tencent does not cover gets a price from THS')
  assert.equal(db.holdings[1].quoteSource, 'ths')
  assert.equal(db.holdings[2].quotePrice, 410)
  assert.equal(db.holdings[2].quoteSource, 'tencent')
  assert.equal(db.holdings[3].quotePrice, 1.23)
  assert.equal(db.holdings[3].quoteSource, 'tencent-fund')
  assert.equal(result.updated, 4)
  assert.ok(!result.warnings.some((w) => w.includes('161725')), 'a key covered by THS is not reported missing')

  const aShare = calls.find((u) => u.includes('/api/a-share/prices/snapshot'))
  assert.match(decodeURIComponent(aShare), /thscodes=600519\.SH/)
  const etf = calls.find((u) => u.includes('/api/fund/market/snapshot'))
  assert.match(decodeURIComponent(etf), /thscode=161725\.SZ/)
  assert.ok(calls.every((u) => !/thscode/.test(decodeURIComponent(u)) || !u.includes('00700')), 'HK never goes to THS')
})

test('a failing THS snapshot falls back to Tencent instead of losing the price', async () => {
  const db = mixedDb()
  const fetch = async (url) => {
    const u = String(url)
    if (u.includes('fuyao.aicubes.cn')) throw new Error('down')
    if (u.includes('qt.gtimg.cn')) return textResponse([line('sh600519', 'MOUTAI', '1690'), line('sz161725', 'LOF', '1.09')].join(';'))
    throw new Error('unexpected fetch: ' + u)
  }
  const result = await refreshQuotes(db, { fetch, ths: { token: 'tok-123' } })
  assert.equal(db.holdings[0].quotePrice, 1690)
  assert.equal(db.holdings[0].quoteSource, 'tencent')
  assert.ok(result.warnings.some((w) => w.startsWith('THS_QUOTES:')), 'the THS failure is surfaced')
})

test('without a THS key the refresh never calls THS', async () => {
  const db = mixedDb()
  const calls = []
  const fetch = async (url) => {
    calls.push(String(url))
    return textResponse([line('sh600519', 'MOUTAI', '1690')].join(';'))
  }
  await refreshQuotes(db, { fetch })
  assert.ok(calls.every((u) => !u.includes('fuyao.aicubes.cn')))
})
