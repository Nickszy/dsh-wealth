// model.test.mjs — canonical model registry. Synthetic data only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODEL_VERSION, MARKETS, FLOW_KINDS, KIND_NAMES, CATEGORIES, isFlowKind, flowKind, cashSignOf, isTradeKind, kindLabel, flowKindList, canonicalMarket, marketCurrency, isCashRow } from './model.mjs'

test('flow taxonomy covers every archived kind and direction convention', () => {
  assert.equal(MODEL_VERSION, 2)
  assert.deepEqual([...KIND_NAMES].sort(), ['buy','deposit','dividend','fee','interest','ipo','other','repo_close','repo_open','security_in','security_out','sell','tax','withdrawal'])
  for (const kind of KIND_NAMES) {
    const meta = FLOW_KINDS[kind]
    assert.ok(CATEGORIES.includes(meta.category), kind + ' category')
    assert.ok([-1, 0, 1, null].includes(meta.cashSign), kind + ' cashSign')
  }
  // Direction comes from the kind, never from the amount sign.
  assert.equal(cashSignOf('buy'), -1)
  assert.equal(cashSignOf('sell'), 1)
  assert.equal(cashSignOf('dividend'), 1)
  assert.equal(cashSignOf('tax'), -1)
  assert.equal(cashSignOf('ipo'), 0)
  assert.equal(cashSignOf('other'), null)
  // Trade-family kinds require an instrument.
  for (const kind of ['buy','sell','repo_open','repo_close','ipo','security_in','security_out']) assert.equal(FLOW_KINDS[kind].requiresSymbol, true, kind)
  for (const kind of ['dividend','deposit','withdrawal','fee','tax','other']) assert.equal(FLOW_KINDS[kind].requiresSymbol, false, kind)
  assert.equal(isTradeKind('buy'), true)
  assert.equal(isTradeKind('dividend'), false)
})

test('unknown kinds are rejected and labelled, never silently mapped', () => {
  assert.equal(isFlowKind('stock_buy'), false)
  assert.equal(flowKind('stock_buy'), null)
  assert.equal(cashSignOf('stock_buy'), null)
  assert.equal(kindLabel('stock_buy'), 'stock_buy')
  assert.equal(kindLabel('repo_open'), '回购融出')
  assert.equal(flowKindList().length, KIND_NAMES.length)
})

test('market normalization collapses source aliases to canonical ids', () => {
  assert.equal(canonicalMarket('sh'), 'CN')
  assert.equal(canonicalMarket('SZ'), 'CN')
  assert.equal(canonicalMarket('HKEX'), 'HK')
  assert.equal(canonicalMarket('NASDAQ'), 'US')
  assert.equal(canonicalMarket('OTC'), 'FUND')
  assert.equal(canonicalMarket(''), 'OTHER')
  assert.equal(canonicalMarket('CN'), 'CN')
  assert.equal(canonicalMarket('US'), 'US')
  // Default currency fills blanks only; it never drives conversion.
  assert.equal(marketCurrency('HK'), 'HKD')
  assert.equal(marketCurrency('US'), 'USD')
  assert.equal(marketCurrency('SG'), 'SGD')
  assert.equal(marketCurrency('FUND'), null)
  assert.equal(marketCurrency('CASH'), null)
})

test('cash rows are recognized for balance handling', () => {
  assert.equal(isCashRow({ assetClass: 'cash', market: 'CASH' }), true)
  assert.equal(isCashRow({ assetClass: 'stock', market: 'HK' }), false)
  assert.equal(isCashRow(null), false)
  assert.deepEqual(Object.keys(MARKETS), ['CN', 'HK', 'US', 'SG', 'FUND', 'CASH', 'OTHER'])
})
