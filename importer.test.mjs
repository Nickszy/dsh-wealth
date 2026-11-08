import test from 'node:test'
import assert from 'node:assert/strict'
import { previewImport } from './importer.mjs'

const db = { accounts: [{ id: 'cn', name: '内地', currency: 'CNY' }, { id: 'hk', name: '香港', currency: 'HKD' }, { id: 'us', name: '美国', currency: 'USD' }] }
const preview = (text, options = {}, ledger = db) => previewImport({ text, ...options }, ledger)

test('legacy holdings preserve leading zero codes and optional price / class', () => {
  const r = preview('内地,000001,平安银行,CN,100,10.2,CNY,12,股票')
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.rows[0], { accountId: 'cn', symbol: '000001', name: '平安银行', market: 'CN', qty: 100, avgCost: 10.2, currency: 'CNY', manualPrice: 12, assetClass: 'stock', source: 'generic' })
  assert.equal(r.columns[0].field, 'account')
})

test('BOM CSV handles quoted thousands, escaped quotes and multiline CRLF', () => {
  const r = preview('\uFEFF账户名,证券代码,证券名称,数量,成本价,币种,备注\r\n香港,00700.HK,"腾讯 ""控股""",“bad”,10,HKD,"first\r\nsecond"\r\n香港,00005.HK,汇丰,"1,000","20,123.50",HKD,"line\r\nend"', { source: 'futu' })
  assert.equal(r.errors.length, 1)
  assert.equal(r.errors[0].row, 2)
  assert.equal(r.errors[0].field, 'qty')
  assert.equal(r.rows[0].symbol, '00005')
  assert.equal(r.rows[0].qty, 1000)
  assert.equal(r.rows[0].avgCost, 20123.5)
  assert.equal(r.rows[0].note, 'line\nend')
  const valid = preview('代码,名称,数量,成本\n000001,"a ""quote""\nname",1,2', { accountId: 'cn' })
  assert.equal(valid.rows[0].name, 'a "quote"\nname')
})

test('English Longbridge TSV trade export maps fields and dedup identifiers', () => {
  const r = preview('Symbol\tName\tSide\tFilled Quantity\tFilled Price\tCommission\tTrade Date\tCurrency\tExecution ID\nAAPL.US\tApple\tBUY\t2\t150.5\t0.35\t2026/11/06 10:20:30\tUSD\t000032', { mode: 'trades', accountId: 'us', source: 'longbridge' })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.rows[0], { accountId: 'us', symbol: 'AAPL', name: 'Apple', market: 'US', currency: 'USD', assetClass: 'stock', source: 'longbridge', externalId: '000032', qty: 2, side: 'buy', price: 150.5, fee: 0.35, date: '2026-11-06' })
})

test('THS Chinese trade headers and generic legacy trades', () => {
  const ths = preview('证券代码,买卖方向,成交数量,成交价格,手续费,成交日期,成交编号\n000001,卖出,10,12.2,1,20261106,00012', { accountId: 'cn', mode: 'trades', source: 'ths' })
  assert.deepEqual(ths.errors, [])
  assert.equal(ths.rows[0].side, 'sell')
  assert.equal(ths.rows[0].externalId, '00012')
  const legacy = preview('内地,000001,买入,100,9.8,0,2026-11-06,CNY,CN', { mode: 'trades' })
  assert.deepEqual(legacy.errors, [])
  assert.equal(legacy.rows[0].side, 'buy')
})

test('Aifund forces fund market and maps unit NAV', () => {
  const r = preview('基金代码,基金名称,持有份额,单位成本,单位净值\n000001,基金,100.25,1.2,1.3', { accountId: 'cn', source: 'aifund' })
  assert.deepEqual(r.errors, [])
  assert.equal(r.rows[0].market, 'FUND')
  assert.equal(r.rows[0].assetClass, 'fund')
  assert.equal(r.rows[0].manualPrice, 1.3)
})

test('accounts resolve id, name, selected default, ledger default and sole account', () => {
  const csv = '代码,数量,成本\n000001,1,2'
  assert.equal(preview(csv, { accountId: 'cn' }).rows[0].accountId, 'cn')
  assert.equal(preview(csv, { accountId: '内地' }).rows[0].accountId, 'cn')
  assert.equal(preview(csv, {}, { ...db, defaultAccountId: 'hk' }).rows[0].market, 'HK')
  assert.equal(preview(csv, {}, { accounts: [db.accounts[2]] }).rows[0].market, 'US')
  assert.equal(preview(csv).errors[0].code, 'missing-account')
  const ambiguous = { accounts: [{ id: '1', name: 'same', currency: 'CNY' }, { id: '2', name: 'same', currency: 'USD' }] }
  assert.equal(preview('same,000001,平安,CN,1,2,CNY', {}, ambiguous).errors[0].code, 'ambiguous-account')
  assert.equal(preview(csv, { accountId: 'missing' }).errors[0].code, 'missing-account')
})

test('invalid numeric input is rejected without zero coercion', () => {
  for (const invalid of ['', 'NaN', 'Infinity', '0x10', '1e3', '1,23', '1.2.3', '-1', '--']) {
    const r = preview(`代码,数量,成本\n000001,"${invalid}",2`, { accountId: 'cn' })
    assert.equal(r.rows.length, 0, invalid)
    assert.ok(r.errors.some((e) => e.field === 'qty' && e.row === 2), invalid)
  }
  assert.equal(preview('代码,数量,成本\n000001,0,0', { accountId: 'cn' }).rows[0].qty, 0)
  assert.equal(preview('账户名,代码,名称,市场,数量,成本,币种\n内地,,x,CN,1,2,CNY').errors[0].code, 'missing-symbol')
})

test('invalid sides, dates, optional numeric values and mismatched markets fail', () => {
  const r = preview('账户名,代码,方向,数量,价格,费用,日期,币种,市场\n美国,AAPL.HK,HOLD,0,NaN,no,2026-02-30,USD,US', { mode: 'trades' })
  assert.equal(r.rows.length, 0)
  for (const field of ['market', 'side', 'qty', 'price', 'fee', 'date']) assert.ok(r.errors.some((e) => e.field === field), field)
  assert.ok(preview('内地,000001,平安,CN,1,2,CNY,no').errors.some((e) => e.field === 'manualPrice'))
})

test('missing optional fees are visibly defaulted; unknown columns are warned', () => {
  const r = preview('代码,方向,数量,价格,日期,Unmapped\n000001,BUY,1,2,2026-11-06,data', { mode: 'trades', accountId: 'cn' })
  assert.deepEqual(r.errors, [])
  assert.equal(r.rows[0].fee, 0)
  assert.ok(r.warnings.some((w) => w.code === 'missing-fee'))
  assert.ok(r.warnings.some((w) => w.code === 'unknown-column'))
})

test('malformed CSV is not partially returned and reports physical row', () => {
  for (const csv of ['代码,数量,成本\n000001,"1,2', '代码,数量,成本\n000001,"1"bad,2', '代码,数量,成本\n000001,1"a,2']) {
    const r = preview(csv, { accountId: 'cn' })
    assert.equal(r.rows.length, 0)
    assert.equal(r.errors[0].row, 2)
    assert.equal(r.errors[0].code, 'csv-syntax')
  }
  const r = preview('代码,名称,数量,成本\n000001,"multi\nline",1,2\n000002,b,bad,2', { accountId: 'cn' })
  assert.equal(r.errors[0].row, 4)
})

test('empty input, duplicate columns, excess columns, bad mode/source are explicit errors', () => {
  assert.equal(preview(' \r\n').errors[0].code, 'empty-input')
  assert.equal(preview('代码,数量,成本').errors[0].code, 'empty-input')
  assert.equal(preview('代码,证券代码,数量,成本\n1,2,3,4').errors[0].code, 'ambiguous-column')
  assert.equal(preview('代码,数量,成本\n1,2,3,4', { accountId: 'cn' }).errors[0].code, 'column-count')
  assert.equal(preview('', { mode: 'bad' }).errors[0].code, 'invalid-mode')
  assert.equal(preview('', { source: 'live-broker' }).errors[0].code, 'invalid-source')
  assert.equal(previewImport({ text: null }).errors[0].code, 'invalid-text')
})

test('date calendar and time validation and suffix-only symbols', () => {
  const trade = (date) => preview(`内地,000001,BUY,1,2,0,${date},CNY,CN`, { mode: 'trades' })
  assert.equal(trade('2026/1/2').rows[0].date, '2026-01-02')
  assert.equal(trade('2024-02-29').rows[0].date, '2024-02-29')
  for (const date of ['2026-02-29', '2026-11-06 25:00:00', '2026-11-06 12:70:00']) {
    assert.ok(trade(date).errors.some((e) => e.field === 'date'))
  }
  assert.ok(preview('代码,数量,成本\n.HK,1,2', { accountId: 'hk' }).errors.some((e) => e.field === 'symbol'))
})

test('preview does not modify a frozen ledger and payloads work with backend ops', async () => {
  const { applyOp } = await import('./store.mjs')
  const ledger = { accounts: [{ id: 'cn', name: '内地', currency: 'CNY' }], instruments: [], holdings: [], trades: [] }
  const frozen = structuredClone(ledger)
  Object.freeze(frozen.accounts[0]); Object.freeze(frozen.accounts); Object.freeze(frozen)
  const r = preview('内地,000001,平安,CN,10,2,CNY,3', {}, frozen)
  assert.deepEqual(r.errors, [])
  assert.deepEqual(frozen, ledger)
  const applied = applyOp(ledger, 'import.holdings', { rows: r.rows })
  assert.equal(applied.imported, 1)
  assert.equal(ledger.holdings[0].qty, 10)
  assert.equal(ledger.instruments[0].symbol, '000001')
})
