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
test('normalizer keeps broker-reported net assets (futu/longbridge MCP report netAssets, not totalAsset)', () => {
  const raw = canonical()
  raw.sourceTotals = { netAssets: '12345.6', cash: 10 }
  assert.deepEqual(normalizeSnapshot(raw).sourceTotals, { cash: 10, netAssets: 12345.6 })
})
test('unknown holding cost survives as null, distinct from a real zero cost', () => {
  const raw = canonical(); raw.holdings[0].avgCost = null
  const result = normalizeSnapshot(raw)
  assert.equal(result.holdings[0].avgCost, null)
  assert.notEqual(result.holdings[0].avgCost, 0)
  raw.holdings[0].avgCost = 0
  assert.equal(normalizeSnapshot(raw).holdings[0].avgCost, 0)
  // 缺字段仍然拒绝（沿用 v1 必填规则）
  delete raw.holdings[0].avgCost
  assert.throws(() => normalizeSnapshot(raw), /avgCost/)
})
test('trades still require a numeric price because a trade defines its own cost', () => {
  const raw = canonical(); raw.trades = [{ ...raw.holdings[0], side: 'buy', price: 11, date: '2026-11-06' }]
  const result = normalizeSnapshot(raw)
  assert.equal(result.trades[0].price, 11)
  assert.equal('avgCost' in result.trades[0], false)
  for (const price of [null, undefined]) {
    const copy = structuredClone(raw); copy.trades[0].price = price
    assert.throws(() => normalizeSnapshot(copy), /price/)
  }
})
test('coverage segments derive complete and replace an explicit complete flag', () => {
  const allFull = canonical(); delete allFull.complete; allFull.coverage = { stock: 'full', cash: 'full' }
  const derived = normalizeSnapshot(allFull)
  assert.equal(derived.complete, true)
  assert.deepEqual(derived.coverage, { stock: 'full', cash: 'full' })
  for (const state of ['partial', 'failed']) {
    const raw = canonical(); raw.complete = true; raw.coverage = { stock: 'full', cash: state }
    assert.equal(normalizeSnapshot(raw).complete, false, state)
  }
  // 无 coverage 时保持 v1 行为：complete 必填且原样保留
  const v1 = canonical()
  assert.equal(normalizeSnapshot(v1).complete, true)
  assert.ok(!('coverage' in normalizeSnapshot(v1)))
})
test('coverage rejects unknown segments, invalid states and non-object values', () => {
  for (const coverage of [{ etf: 'full' }, { stock: 'unknown' }, { stock: 1 }, { stock: null }, [], 'full']) {
    const raw = canonical(); raw.coverage = coverage
    assert.throws(() => normalizeSnapshot(raw), undefined, JSON.stringify(coverage))
  }
  const badComplete = canonical(); badComplete.coverage = { stock: 'full' }; badComplete.complete = 'yes'
  assert.throws(() => normalizeSnapshot(badComplete), /complete must be boolean/)
})
test('v2 warning objects normalize to display strings plus severity details', () => {
  const raw = canonical()
  raw.warnings = ['FUTU_MCP_MISSING_COST:US.AAPL', { code: 'QUOTE_DATE_UNAVAILABLE', severity: 'info', message: '行情日期缺失' }, { code: 'COST_UNAVAILABLE' }]
  const result = normalizeSnapshot(raw)
  assert.deepEqual(result.warnings, ['FUTU_MCP_MISSING_COST:US.AAPL', '行情日期缺失', 'COST_UNAVAILABLE'])
  assert.deepEqual(result.warningDetails, [
    { code: 'FUTU_MCP_MISSING_COST', severity: 'degraded', message: 'FUTU_MCP_MISSING_COST:US.AAPL' },
    { code: 'QUOTE_DATE_UNAVAILABLE', severity: 'info', message: '行情日期缺失' },
    { code: 'COST_UNAVAILABLE', severity: 'degraded', message: 'COST_UNAVAILABLE' },
  ])
  // 字符串缺冒号时取前 40 字符并大写；对象缺 severity 默认 degraded。
  const long = normalizeSnapshot({ ...canonical(), warnings: ['x'.repeat(60)] })
  assert.equal(long.warningDetails[0].code, 'X'.repeat(40))
  assert.equal(long.warningDetails[0].severity, 'degraded')
  result.warningDetails.push({ code: 'MUTATED' })
  assert.equal(raw.warnings.length, 3)
})
test('v2 warning validation rejects bad codes, messages and severities', () => {
  for (const warning of [{ severity: 'info' }, { code: '' }, { code: 1 }, { code: 'X', severity: 'warn' }, { code: 'X', severity: 'INFO' }, { code: 'X', message: 5 }, { code: 'X', message: '' }]) {
    const raw = canonical(); raw.warnings = [warning]
    assert.throws(() => normalizeSnapshot(raw), undefined, JSON.stringify(warning))
  }
})
test('v1 string warnings output stays byte-identical to before', () => {
  const raw = canonical(); raw.warnings = ['PARTIAL', 'FUTU_MCP_COST_UNAVAILABLE:US.AAPL']
  const result = normalizeSnapshot(raw)
  assert.deepEqual(result.warnings, ['PARTIAL', 'FUTU_MCP_COST_UNAVAILABLE:US.AAPL'])
})
