import test from 'node:test'
import assert from 'node:assert/strict'
import {getConnectorStatus,normalizeSnapshot} from './connectors.mjs'
const canonical = () => ({ holdings: [{ symbol: '000001', name: '股票', market: 'CN', assetClass: 'stock', currency: 'CNY', qty: 100, avgCost: 10, manualPrice: 11, externalId: 'p1' }], complete: true, warnings: [], queriedAt: '2026-11-06T12:00:00Z', uploadedAt: null, quoteDate: '2026-11-06' })


test('standalone connector catalogue needs no other plugin service',()=>{const rows=getConnectorStatus({get(){throw Error('must not access plugins')}});assert.deepEqual(rows.filter(x=>x.transport==='native').map(x=>x.id),['ths','futu','longbridge','fosun','ib']);assert.ok(rows.every(x=>x.available))})
test('unknown prices remain null and are never fabricated as zero',()=>{const raw=canonical();raw.holdings[0].manualPrice=null;assert.equal(normalizeSnapshot(raw).holdings[0].manualPrice,null)})
test('normalizer strips unknown fields recursively, returns detached data, accepts numeric decimals', () => {
  const raw = canonical(); raw.secret = 'remove'; raw.holdings[0].accountId = 'remove'; raw.holdings[0].qty = '100.5'; raw.sourceTotals = { cash: '10', secret: 'remove' }
  const result = normalizeSnapshot(raw)
  assert.equal(result.secret, undefined); assert.equal(result.holdings[0].accountId, undefined)
  assert.equal(result.holdings[0].qty, 100.5); assert.deepEqual(result.sourceTotals, { cash: 10 })
  result.holdings[0].name = 'changed'; result.warnings.push('changed')
  assert.equal(raw.holdings[0].name, '股票'); assert.deepEqual(raw.warnings, [])
})
test('normalizer keeps broker transfer totals and their period while stripping unknown keys', () => {
  const raw = canonical()
  raw.sourceTotals = { transferIn: '5600', transferOut: 2400, assetProfit: '-500', assetStart: 1000, assetEnd: 6900, transferFrom: '2000-01-01', transferTo: '2026-11-08', secret: 'remove' }
  assert.deepEqual(normalizeSnapshot(raw).sourceTotals, {
    transferIn: 5600, transferOut: 2400, assetProfit: -500, assetStart: 1000, assetEnd: 6900,
    transferFrom: '2000-01-01', transferTo: '2026-11-08',
  })
})
test('normalizer rejects missing required values, shorts, duplicates and invalid metadata', () => {
  for (const field of ['symbol', 'name', 'market', 'currency', 'assetClass', 'qty', 'avgCost', 'manualPrice']) {
    const raw = canonical(); delete raw.holdings[0][field]; assert.throws(() => normalizeSnapshot(raw), undefined, field)
  }
  for (const mutate of [s => { s.complete = 'yes' }, s => { s.warnings = [1] }, s => { s.queriedAt = '2026-02-30' }, s => { s.holdings[0].qty = -1 }, s => { s.holdings.push({ ...s.holdings[0], market: 'cn', currency: 'cny' }) }]) {
    const raw = canonical(); mutate(raw); assert.throws(() => normalizeSnapshot(raw))
  }
})
test('optional trades validate identity, numbers, dates and external IDs, strip unrelated fields', () => {
  const raw = canonical(); raw.trades = [{ ...raw.holdings[0], side: 'buy', price: '11', date: '2026-11-06', fee: '1', secret: 'remove' }]
  const result = normalizeSnapshot(raw)
  assert.equal(result.trades[0].price, 11); assert.equal(result.trades[0].date, '2026-11-06')
  assert.equal(result.trades[0].secret, undefined); assert.equal(result.trades[0].manualPrice, undefined)
  for (const [field, value] of [['price', null], ['qty', -1], ['date', '2026-02-30'], ['externalId', ''], ['fee', -1], ['side', 'short']]) {
    const copy = structuredClone(raw); copy.trades[0][field] = value; assert.throws(() => normalizeSnapshot(copy))
  }
})
