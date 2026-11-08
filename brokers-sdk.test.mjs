import test from 'node:test'
import assert from 'node:assert/strict'
import { BROKER_SDK_VERSIONS, listFutuAccounts, fetchFutuSnapshot, listLongbridgeAccounts, fetchLongbridgeSnapshot } from './brokers-sdk.mjs'

const ID = '18446744073709551610'
const futuSource = { host: '127.0.0.1', port: 33333, tls: false, brokerAccountId: ID, tradeEnvironment: 'REAL', tradeMarket: 'HK', currency: 'HKD' }
const lbSecrets = { appKey: 'fixture-key', appSecret: 'fixture-secret', accessToken: 'fixture-token' }
const D = (s) => ({ toString: () => s, valueOf: () => { throw new Error('Decimal valueOf forbidden') } })
function futuFixture(changes = {}) {
  const calls = [], header = { trdEnv: 1, accID: { toString: () => ID }, trdMarket: 1 }
  const data = {
    GetAccList: { accList: [{ accID: { toString: () => ID }, trdEnv: 1, trdMarketAuthList: [1], cardNum: 'Account' }] },
    GetPositionList: { header, positionList: [{ positionSide: 0, code: '00700', name: 'Tencent', qty: 10, costPrice: 200, price: 300, currency: 1, secMarket: 1 }] },
    GetFunds: { header, funds: { totalAssets: 3500, cash: 500, currency: 1, debtCash: 0, cashInfoList: [{ currency: 1, cash: 400 }, { currency: 2, cash: 100 }] } },
    ...changes,
  }
  const client = {
    start(...args) { calls.push(['start', args]); queueMicrotask(() => this.onlogin?.(true, 'ok')) },
    stop() { calls.push(['stop']) },
    websock: { close() { calls.push(['close']) } },
  }
  for (const name of Object.keys(data)) client[name] = async (request) => { calls.push([name, request]); const val = data[name]; if (val instanceof Error) throw val; return { retType: 0, s2c: val } }
  return { client, calls, data, deps: { createFutuClient: () => client, now: () => 0 } }
}
function longbridgeFixture() {
  const calls = [], data = {
    stockPositions: { channels: [{ accountChannel: 'cash', positions: [{ symbol: 'AAPL.US', symbolName: 'Apple', market: 1, currency: 'USD', quantity: D('2.5'), costPrice: D('110.25') }] }] },
    fundPositions: { channels: [{ accountChannel: 'cash', positions: [{ symbol: 'HK00001234', symbolName: 'Fund', currency: 'HKD', holdingUnits: D('3'), costNetAssetValue: D('1.2'), currentNetAssetValue: D('1.5') }] }] },
    accountBalance: [{ currency: 'HKD', totalCash: D('9999'), netAssets: D('999999'), marginCall: D('0'), cashInfos: [{ currency: 'HKD', availableCash: D('100'), frozenCash: D('20'), settlingCash: D('-10'), withdrawCash: D('50') }, { currency: 'USD', availableCash: D('40'), frozenCash: D('1'), settlingCash: D('2'), withdrawCash: D('30') }] }],
  }
  const ctx = { close() { calls.push('close') } }
  for (const name of Object.keys(data)) ctx[name] = async () => { calls.push(name); if (data[name] instanceof Error) throw data[name]; return data[name] }
  return { ctx, calls, data, deps: { createLongbridgeContext: (secrets) => { assert.deepEqual(secrets, lbSecrets); return ctx }, now: () => 0 } }
}

test('pins inspected official package versions', () => assert.deepEqual(BROKER_SDK_VERSIONS, { 'futu-api': '10.12.7208', longport: '4.3.7' }))
test('Futu lists lossless uint64 IDs and always closes socket', async () => {
  const f = futuFixture(), out = await listFutuAccounts(futuSource, {}, undefined, f.deps)
  assert.equal(out.accounts[0].id, ID)
  assert.deepEqual(f.calls.find(([n]) => n === 'GetAccList')[1], { c2s: { userID: 0 } })
  assert.deepEqual(f.calls.slice(-2).map(([n]) => n), ['stop', 'close'])
})
test('Futu snapshot uses selected headers and native cash, never totalAssets as holding', async () => {
  const f = futuFixture(), out = await fetchFutuSnapshot(futuSource, { websocketKey: 'fixture' }, undefined, f.deps)
  assert.deepEqual(out.holdings[0], { symbol: '00700', name: 'Tencent', market: 'HK', assetClass: 'stock', currency: 'HKD', qty: 10, avgCost: 200, manualPrice: 300 })
  assert.deepEqual(out.holdings.slice(1).map((h) => [h.currency, h.qty]), [['HKD', 400], ['USD', 100]])
  assert.equal(out.sourceTotals.totalAsset, 3500)
  assert.equal(out.complete, true)
  assert.equal(out.queriedAt, '1970-01-01T00:00:00.000Z')
  assert.equal(out.quoteDate, null)
  assert.equal(out.uploadedAt, null)
  assert.deepEqual(f.calls.find(([n]) => n === 'GetFunds')[1].c2s, { header: { trdEnv: 1, accID: ID, trdMarket: 1 }, currency: 1 })
  assert.ok(f.calls.every(([n]) => ['start', 'GetAccList', 'GetPositionList', 'GetFunds', 'stop', 'close'].includes(n)))
})
test('Futu requires explicit ID, rejects unsafe numeric ID and currency guessing', async () => {
  for (const patch of [{ brokerAccountId: undefined }, { brokerAccountId: Number(ID) }, { currency: undefined }, { currency: 'CNY' }, { tradeEnvironment: undefined }]) {
    const f = futuFixture()
    await assert.rejects(fetchFutuSnapshot({ ...futuSource, ...patch }, {}, undefined, f.deps))
    assert.equal(f.calls.length, 0)
  }
})
test('Futu validates account selection and response header', async () => {
  const f = futuFixture(); f.data.GetPositionList.header = { trdEnv: 1, accID: '1', trdMarket: 1 }
  await assert.rejects(fetchFutuSnapshot(futuSource, {}, undefined, f.deps), /does not match/)
  assert.equal(f.calls.at(-1)[0], 'close')
  const g = futuFixture(); g.data.GetAccList.accList[0].trdEnv = 0
  await assert.rejects(fetchFutuSnapshot(futuSource, {}, undefined, g.deps), /not authorized/)
})
test('Futu missing or explicitly invalid cost never turns into zero', async () => {
  for (const mode of ['missing', 'invalid', 'null']) {
    const f = futuFixture(), p = f.data.GetPositionList.positionList[0]
    if (mode === 'missing') delete p.costPrice
    if (mode === 'invalid') p.costPriceValid = false
    if (mode === 'null') p.costPrice = null
    await assert.rejects(fetchFutuSnapshot(futuSource, {}, undefined, f.deps), /cost/)
    assert.equal(f.calls.at(-1)[0], 'close')
  }
})
test('Futu rejects shorts, liabilities, unknown currencies and duplicate cash', async () => {
  for (const mutate of [f => { f.data.GetPositionList.positionList[0].positionSide = 1 }, f => { f.data.GetFunds.funds.debtCash = 1 }, f => { f.data.GetPositionList.positionList[0].currency = 99 }, f => { f.data.GetFunds.funds.cashInfoList.push({ currency: 1, cash: 1 }) }]) {
    const f = futuFixture(); mutate(f)
    await assert.rejects(fetchFutuSnapshot(futuSource, {}, undefined, f.deps))
  }
})
test('Futu missing cash details on multi-market account prevents pruning', async () => {
  const f = futuFixture(); f.data.GetAccList.accList[0].trdMarketAuthList = [1, 2]; delete f.data.GetFunds.funds.cashInfoList
  const out = await fetchFutuSnapshot(futuSource, {}, undefined, f.deps)
  assert.equal(out.complete, false)
  assert.match(out.warnings.join(), /CASH_UNAVAILABLE/)
})
test('Futu API failures and handshake failures redact response messages and close', async () => {
  const f = futuFixture({ GetPositionList: new Error('credential-secret') })
  await assert.rejects(fetchFutuSnapshot(futuSource, {}, undefined, f.deps), e => !e.message.includes('credential-secret'))
  assert.equal(f.calls.at(-1)[0], 'close')
  const g = futuFixture(); g.client.start = function () { queueMicrotask(() => this.onlogin(false, 'credential-secret')) }
  await assert.rejects(listFutuAccounts(futuSource, {}, undefined, g.deps), /handshake failed/)
  assert.equal(g.calls.at(-1)[0], 'close')
})
test('Futu timeout and external cancellation close transport', async () => {
  const f = futuFixture(); f.client.GetAccList = () => new Promise(() => {})
  await assert.rejects(listFutuAccounts(futuSource, {}, undefined, { ...f.deps, timeoutMs: 10 }), /timed out/)
  assert.equal(f.calls.at(-1)[0], 'close')
  const g = futuFixture(), controller = new AbortController(); g.client.start = () => { controller.abort(new Error('request aborted')) }
  await assert.rejects(listFutuAccounts(futuSource, {}, controller.signal, g.deps), /aborted/)
  assert.equal(g.calls.at(-1)[0], 'close')
})
test('Longbridge normalizes Decimal positions, NAV and native cash without converted totals', async () => {
  const f = longbridgeFixture(), out = await fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, f.deps)
  assert.deepEqual(out.holdings.map(h => [h.symbol, h.qty, h.avgCost, h.manualPrice]), [['AAPL.US', 2.5, 110.25, null], ['HK00001234', 3, 1.2, 1.5], ['CASH:HKD', 110, 1, 1], ['CASH:USD', 43, 1, 1]])
  assert.equal(out.holdings[0].market, 'US')
  assert.equal(out.holdings[1].market, 'FUND')
  assert.equal(out.complete, true)
  assert.equal(out.quoteDate, null)
  assert.match(out.warnings.join(), /cost estimate/)
  assert.deepEqual(f.calls, ['stockPositions', 'fundPositions', 'accountBalance', 'close'])
})
test('Longbridge lists explicit accountChannels and rejects ambiguous cash scope', async () => {
  const f = longbridgeFixture(); f.data.stockPositions.channels.push({ accountChannel: 'margin', positions: [] })
  const result = await listLongbridgeAccounts({}, lbSecrets, undefined, f.deps)
  assert.deepEqual(result.accounts.map(a => a.id), ['cash', 'margin'])
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, f.deps), /Ambiguous/)
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'wrong' }, lbSecrets, undefined, f.deps), /not returned/)
  await assert.rejects(fetchLongbridgeSnapshot({}, lbSecrets, undefined, f.deps), /brokerAccountId/)
})
test('Longbridge duplicate reporting currency balances do not duplicate native cash', async () => {
  const f = longbridgeFixture(); f.data.accountBalance.push({ ...f.data.accountBalance[0], currency: 'USD' })
  const out = await fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, f.deps)
  assert.equal(out.holdings.filter(h => h.assetClass === 'cash').length, 2)
})
test('Longbridge malformed and unsupported fields reject entire snapshot', async () => {
  for (const mutate of [f => { f.data.stockPositions.channels[0].positions[0].quantity = D('-1') }, f => { f.data.stockPositions.channels[0].positions[0].costPrice = null }, f => { f.data.stockPositions.channels[0].positions[0].market = 0 }, f => { f.data.stockPositions.channels[0].positions[0].currency = '' }, f => { f.data.fundPositions.channels[0].positions[0].holdingUnits = D('NaN') }, f => { f.data.accountBalance[0].marginCall = D('1') }, f => { f.data.accountBalance[0].cashInfos[0].availableCash = D('-1') }]) {
    const f = longbridgeFixture(); mutate(f)
    await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, f.deps))
    assert.equal(f.calls.at(-1), 'close')
  }
})
test('Longbridge missing cash is partial and does not fabricate cash', async () => {
  const f = longbridgeFixture(); f.data.accountBalance[0].cashInfos = []
  const out = await fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, f.deps)
  assert.equal(out.complete, false)
  assert.equal(out.holdings.length, 2)
})
test('Longbridge timeout and sanitized API errors release context', async () => {
  const f = longbridgeFixture(); f.ctx.stockPositions = () => new Promise(() => {})
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, { ...f.deps, timeoutMs: 10 }), /timed out/)
  assert.equal(f.calls.at(-1), 'close')
  const g = longbridgeFixture(); g.data.accountBalance = new Error('fixture-token')
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, g.deps), e => e.message.includes('accountBalance failed') && !e.message.includes('fixture-token'))
  assert.equal(g.calls.at(-1), 'close')
})
test('dynamic SDK loader reports pinned installation guidance, no secrets in errors', async () => {
  await assert.rejects(listFutuAccounts(futuSource, {}, undefined, { loadSdk() { throw new Error('secret') } }), /install futu-api@10.12.7208/)
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, { loadSdk() { throw new Error('fixture-token') } }), /install longport@4.3.7/)
})
test('Futu cleanup clears SDK request timers and rejects pending requests', async () => {
  const f = futuFixture(), reasons = []
  const timer = setTimeout(() => assert.fail('pending timer leaked'), 1000)
  f.client.websock.promisePool = { one: { timer, reject(reason) { reasons.push(reason.message) } } }
  await listFutuAccounts(futuSource, {}, undefined, f.deps)
  assert.deepEqual(reasons, ['Futu request closed'])
})
test('Futu preserves Shanghai/Shenzhen identity and offshore currency', async () => {
  const f = futuFixture(), p = f.data.GetPositionList.positionList[0]
  f.data.GetAccList.accList[0].trdMarketAuthList = [3]
  f.data.GetPositionList.header.trdMarket = 3
  f.data.GetFunds.funds.currency = 3
  p.secMarket = 31; p.currency = 3; p.code = '600000'
  const out = await fetchFutuSnapshot({ ...futuSource, tradeMarket: 'CN', currency: 'CNH' }, {}, undefined, f.deps)
  assert.equal(out.holdings[0].market, 'CN')
  assert.equal(out.holdings[0].currency, 'CNH')
})
test('pre-aborted requests create no SDK clients', async () => {
  const controller = new AbortController(); controller.abort(new Error('request aborted'))
  let calls = 0
  await assert.rejects(listFutuAccounts(futuSource, {}, controller.signal, { createFutuClient() { calls++; } }), /aborted/)
  await assert.rejects(fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, controller.signal, { createLongbridgeContext() { calls++; } }), /aborted/)
  assert.equal(calls, 0)
})
test('late SDK factory resolutions release resources after timeout', async () => {
  const f = futuFixture(), g = longbridgeFixture()
  let resolveFutu, resolveLongbridge
  const fp = listFutuAccounts(futuSource, {}, undefined, { timeoutMs: 5, createFutuClient: () => new Promise(resolve => { resolveFutu = resolve }) })
  await assert.rejects(fp, /timed out/)
  resolveFutu(f.client)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(f.calls.map(([n]) => n), ['stop', 'close'])
  const lp = fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, { timeoutMs: 5, createLongbridgeContext: () => new Promise(resolve => { resolveLongbridge = resolve }) })
  await assert.rejects(lp, /timed out/)
  resolveLongbridge(g.ctx)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(g.calls, ['close'])
})
test('official Longport loader uses fromApikey and never environment auth or quotes', async () => {
  const f = longbridgeFixture(), args = []
  const deps = { now: () => 0, loadSdk: async name => { assert.equal(name, 'longport'); return { Config: { fromApikey(...v) { args.push(v); return 'config' } }, TradeContext: { new(c) { assert.equal(c, 'config'); return f.ctx } } } } }
  await fetchLongbridgeSnapshot({ brokerAccountId: 'cash' }, lbSecrets, undefined, deps)
  assert.deepEqual(args, [['fixture-key', 'fixture-secret', 'fixture-token']])
})
