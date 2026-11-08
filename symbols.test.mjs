import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSymbol, identityKey, resolveSecurity } from './symbols.mjs'

test('normalizeSymbol converges HK/CN/US spellings', () => {
  assert.deepEqual(normalizeSymbol('2549.HK', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('HK.02549', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('HKEX.2549', 'HK'), { symbol: '02549', market: 'HK' })
  assert.deepEqual(normalizeSymbol('700', 'HK'), { symbol: '00700', market: 'HK' })
  assert.deepEqual(normalizeSymbol('SH.600519', 'CN'), { symbol: '600519', market: 'CN' })
  assert.deepEqual(normalizeSymbol('sz000001', 'CN'), { symbol: '000001', market: 'CN' })
  assert.deepEqual(normalizeSymbol('us.aapl', 'US'), { symbol: 'AAPL', market: 'US' })
  assert.deepEqual(normalizeSymbol('NIO250117C6000', 'US'), { symbol: 'NIO250117C6000', market: 'US' })
  assert.deepEqual(normalizeSymbol('AAPL.US', 'US'), { symbol: 'AAPL.US', market: 'US' })
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
