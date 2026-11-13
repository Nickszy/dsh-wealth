import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSymbol, identityKey, resolveSecurity, canonicalDisplayCode, isFundLike } from './symbols.mjs'

test('normalizeSymbol converges HK/CN/US spellings', () => {
  assert.deepEqual(normalizeSymbol('2549.HK', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('HK.02549', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('HKEX.2549', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('700', 'HK'), { symbol: '00700', market: 'HK' })
  assert.deepEqual(normalizeSymbol('SH.600519', 'CN'), { symbol: '600519', market: 'CN' })
  assert.deepEqual(normalizeSymbol('sz000001', 'CN'), { symbol: '000001', market: 'CN' })
  assert.deepEqual(normalizeSymbol('us.aapl', 'US'), { symbol: 'AAPL', market: 'US' })
  assert.deepEqual(normalizeSymbol('NIO250117C6000', 'US'), { symbol: 'NIO250117C6000', market: 'US' })
  assert.deepEqual(normalizeSymbol('AAPL.US', 'US'), { symbol: 'AAPL', market: 'US' })
  assert.deepEqual(normalizeSymbol('600519.SH', 'CN'), { symbol: '600519', market: 'CN' })
  assert.deepEqual(normalizeSymbol('430047.BJ', 'CN'), { symbol: '430047', market: 'CN' })
  assert.deepEqual(normalizeSymbol('000001.OF', 'FUND'), { symbol: '000001', market: 'FUND' })
  // 股份类别里的点必须保留：BRK.B 不是 BRKB，ADR 与普通股也不能合并
  assert.deepEqual(normalizeSymbol('US.BRK.B', 'US'), { symbol: 'BRK.B', market: 'US' })
  assert.notEqual(identityKey({ symbol: 'BRK.B', market: 'US' }), identityKey({ symbol: 'BRKB', market: 'US' }))
  assert.deepEqual(normalizeSymbol('', 'HK'), { symbol: '', market: 'HK' })
})

test('identityKey groups the same security across spellings', () => {
  assert.equal(identityKey({ symbol: '2549.HK', market: 'HK' }), identityKey({ symbol: 'HK.02549', market: 'HK' }))
  assert.equal(identityKey({ symbol: '2549.HK', market: 'HK' }), identityKey({ symbol: '02549', market: 'HK' }))
  assert.notEqual(identityKey({ symbol: '600519', market: 'CN' }), identityKey({ symbol: '600519', market: 'HK' }))
})

test('resolveSecurity picks a tradable security and degrades honestly', async () => {
  const fake = async () => ({
    ok: true, status: 200,
    json: async () => ({ QuotationCodeTable: { Data: [
      { Code: '000001', Name: '上证指数', MktNum: '1', SecurityTypeName: '指数' },
      { Code: '02549', Name: '卡罗特', MktNum: '116', SecurityTypeName: '港股', QuoteID: '116.02549' },
    ] } }),
  })
  const resolved = await resolveSecurity('卡罗特', { fetch: fake })
  assert.deepEqual([resolved.symbol, resolved.market, resolved.name, resolved.quoteId], ['02549', 'HK', '卡罗特', '116.02549'])
  const none = await resolveSecurity('查无此券', { fetch: async () => ({ ok: true, status: 200, json: async () => ({ QuotationCodeTable: { Data: [] } }) }) })
  assert.equal(none, null)
  const onlyIndex = await resolveSecurity('上证指数', { fetch: async () => ({ ok: true, status: 200, json: async () => ({ QuotationCodeTable: { Data: [{ Code: '000001', Name: '上证指数', MktNum: '1', SecurityTypeName: '指数' }] } }) }) })
  assert.equal(onlyIndex, null)
  await assert.rejects(resolveSecurity('x', { fetch: async () => ({ ok: false, status: 503 }) }), /HTTP 503/)
})

test('canonicalDisplayCode renders the agreed local code while storage stays symbol+market', () => {
  assert.equal(canonicalDisplayCode({ symbol: '600519', market: 'CN', assetClass: 'stock' }), '600519.SH')
  assert.equal(canonicalDisplayCode({ symbol: '000001', market: 'CN', assetClass: 'stock' }), '000001.SZ')
  assert.equal(canonicalDisplayCode({ symbol: '300750', market: 'CN', assetClass: 'stock' }), '300750.SZ')
  assert.equal(canonicalDisplayCode({ symbol: '688106', market: 'CN', assetClass: 'stock' }), '688106.SH')
  assert.equal(canonicalDisplayCode({ symbol: '430047', market: 'CN', assetClass: 'stock' }), '430047.BJ')
  assert.equal(canonicalDisplayCode({ symbol: '510300', market: 'CN', assetClass: 'etf' }), '510300.SH')
  assert.equal(canonicalDisplayCode({ symbol: '700.HK', market: 'HK', assetClass: 'stock' }), '00700.HK')
  assert.equal(canonicalDisplayCode({ symbol: 'AAPL.US', market: 'US', assetClass: 'stock' }), 'AAPL.US')
  assert.equal(canonicalDisplayCode({ symbol: 'BRK.B', market: 'US', assetClass: 'stock' }), 'BRK.B.US')
  assert.equal(canonicalDisplayCode({ symbol: '000001.OF', market: 'FUND', assetClass: 'fund' }), '000001.OF')
  assert.equal(canonicalDisplayCode({ symbol: '000001', market: 'CN', assetClass: 'fund' }), '000001.OF')
  assert.equal(canonicalDisplayCode({ symbol: 'CNY.CASH', market: 'CASH', assetClass: 'cash' }), 'CASH:CNY')
  assert.equal(canonicalDisplayCode({ symbol: 'HKD.CASH', market: 'CN', assetClass: 'cash', currency: 'HKD' }), 'CASH:HKD')
  // 非币种现金行（信用卡账单等）保留自己的代码，避免与真实现金行重名
  assert.equal(canonicalDisplayCode({ symbol: 'CREDIT.BALANCE', market: 'CASH', assetClass: 'cash', currency: 'CNY' }), 'CREDIT.BALANCE')
})

test('isFundLike separates funds from stocks that share a six-digit code', () => {
  assert.equal(isFundLike({ market: 'FUND', assetClass: 'fund' }), true)
  assert.equal(isFundLike({ market: 'CN', assetClass: 'fund' }), true)
  assert.equal(isFundLike({ market: 'FUND', assetClass: 'cash' }), true)
  assert.equal(isFundLike({ market: 'CN', assetClass: 'stock' }), false)
  assert.equal(isFundLike({ market: 'HK', assetClass: 'etf' }), false)
})
