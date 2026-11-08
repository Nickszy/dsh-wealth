import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchNativeHistory } from './history-provider.mjs'

const ACCOUNT = '18446744073709551610', FILL = '18446744073709551609'
const range = { from: '2024-01-02', to: '2024-01-02' }
const secrets = { appKey: 'fixture-key', appSecret: 'fixture-secret', accessToken: 'fixture-token' }
const decimal = value => ({ toString: () => value, valueOf() { throw new Error('Decimal valueOf forbidden') } })
let nextPort = 34000, nextAccount = BigInt(ACCOUNT)
function futuFixture() {
  const account = (nextAccount--).toString()
  const source = { connector: 'futu', transport: 'native', brokerAccountId: account, tradeEnvironment: 'REAL', tradeMarket: 'HK', currency: 'USD', port: nextPort++ }
  const header = { trdEnv: 1, accID: { toString: () => account }, trdMarket: 1 }
  const fill = { trdSide: 1, fillID: { toString: () => FILL }, fillIDEx: 'diagnostic-not-id', orderIDEx: 'order-1', orderID: '18446744073709551608', code: '00700', name: 'Tencent', qty: 2, price: 300, createTime: '2024-01-02 10:01:02.123', secMarket: 1, status: 0 }
  const order = { orderIDEx: 'order-1', code: '00700', trdSide: 1, currency: 1, secMarket: 1, feeAmount: 99 }
  const data = {
    GetAccList: { accList: [{ accID: account, trdEnv: 1, trdMarketAuthList: [1] }] },
    GetHistoryOrderFillList: { header, orderFillList: [fill] },
    GetOrderFillList: { header, orderFillList: [] },
    GetHistoryOrderList: { header, orderList: [order] },
    GetOrderList: { header, orderList: [order] },
  }, calls = []
  const client = { start() { queueMicrotask(() => this.onlogin?.(true)) }, stop() { calls.push(['stop']) }, websock: { close() { calls.push(['close']) } } }
  for (const name of Object.keys(data)) client[name] = async request => { calls.push([name, request]); const response = typeof data[name] === 'function' ? await data[name](request) : data[name]; return { retType: 0, s2c: response } }
  const deps = { createFutuClient: () => client, now: () => Date.parse('2024-02-01T00:00:00Z') }
  return { source, client, data, calls, fill, order, header, deps, fetch: (requested = range, signal, extra = {}) => fetchNativeHistory(source, {}, requested, signal, { ...deps, ...extra }) }
}
function longbridgeFixture() {
  const source = { connector: 'longbridge', transport: 'native', brokerAccountId: 'cash', currency: 'HKD' }, calls = []
  const execution = { orderId: 'order-1', tradeId: 'trade-1', symbol: 'AAPL.US', tradeDoneAt: new Date('2024-01-03T01:02:03.123Z'), quantity: decimal('1.5'), price: decimal('100.25') }
  const detail = { orderId: 'order-1', symbol: 'AAPL.US', stockName: 'Apple', side: 1, currency: 'USD', chargeDetail: { totalAmount: decimal('99') } }
  const data = { stockPositions: { channels: [{ accountChannel: 'cash', positions: [] }] }, fundPositions: { channels: [] }, historyExecutions: [execution], todayExecutions: [], historyOrders: [], todayOrders: [], orderDetail: detail }
  const ctx = { close() { calls.push(['close']) } }
  for (const name of Object.keys(data)) ctx[name] = async (...args) => { calls.push([name, ...args]); if (data[name] instanceof Error) throw data[name]; return typeof data[name] === 'function' ? data[name](...args) : data[name] }
  const deps = { createLongbridgeContext: () => ctx, now: () => Date.parse('2024-02-01T00:00:00Z') }
  return { source, ctx, data, calls, execution, detail, deps, fetch: (requested = range, signal, extra = {}) => fetchNativeHistory(source, secrets, requested, signal, { ...deps, ...extra }) }
}

test('Futu preserves uint64 execution identity and market-local timestamp; currency comes from order, fees stay unknown', async () => {
  const f = futuFixture(), out = await f.fetch()
  assert.deepEqual(out.rows, [{ date: '2024-01-02', time: '10:01:02.123', kind: 'buy', originalType: 'Buy', symbol: '00700', name: 'Tencent', market: 'HK', currency: 'HKD', externalId: FILL,
    note: 'Futu market-local time (Asia/Hong_Kong); orderIDEx=order-1; orderID=18446744073709551608; fillIDEx diagnostic=diagnostic-not-id', qty: 2, price: 300, grossAmount: 600, cashAmount: null, fee: null }])
  assert.deepEqual(out.errors, [])
  assert.equal(out.coverage.complete, false)
  assert.match(out.coverage.note, /retention/)
  assert.match(out.warnings[0].message, /分红/)
  assert.deepEqual(f.calls.find(([n]) => n === 'GetHistoryOrderFillList')[1].c2s, { header: { trdEnv: 1, accID: ACCOUNT, trdMarket: 1 }, filterConditions: { beginTime: '2024-01-02 00:00:00', endTime: '2024-01-02 23:59:59.999' } })
  const metadata = f.calls.find(([n]) => n === 'GetHistoryOrderList')[1].c2s.filterConditions
  assert.deepEqual(metadata.orderIDExList, ['order-1'])
  assert.equal(metadata.beginTime, '2018-01-01 00:00:00')
  assert.deepEqual(f.calls.slice(-2).map(([n]) => n), ['stop', 'close'])
  assert.ok(f.calls.every(([n]) => ['GetAccList', 'GetHistoryOrderFillList', 'GetHistoryOrderList', 'stop', 'close'].includes(n)))
})
test('Futu does not invent a 90-day explicit range limit', async () => {
  const f = futuFixture()
  const out = await f.fetch({ from: '2018-01-01', to: '2024-01-02' })
  assert.equal(out.rows.length, 1)
  assert.equal(f.calls.filter(([n]) => n === 'GetHistoryOrderFillList').length, 1)
})
test('Futu today overlap deduplicates IDs and partial fills never multiply order charges', async () => {
  const f = futuFixture()
  f.data.GetOrderFillList.orderFillList = [{ ...f.fill }, { ...f.fill, fillID: '22', qty: 3, createTime: '2024-01-02 10:02:03' }]
  const out = await f.fetch(range, undefined, { now: () => Date.parse('2024-01-02T08:00:00Z') })
  assert.equal(out.rows.length, 2)
  assert.deepEqual(out.rows.map(r => [r.fee, r.cashAmount]), [[null, null], [null, null]])
  assert.equal(f.calls.filter(([n]) => n === 'GetHistoryOrderList').length, 1)
  assert.equal(f.calls.filter(([n]) => n === 'GetOrderFillList').length, 1)
})
test('Futu falls back to current orders for matching missing history metadata', async () => {
  const f = futuFixture(); f.data.GetHistoryOrderList.orderList = []
  assert.equal((await f.fetch()).rows[0].currency, 'HKD')
  assert.deepEqual(f.calls.find(([n]) => n === 'GetOrderList')[1].c2s.filterConditions, { orderIDExList: ['order-1'] })
})
test('Futu rejects unavailable or mismatching order metadata instead of using reporting currency', async () => {
  for (const mutate of [f => { f.data.GetHistoryOrderList.orderList = []; f.data.GetOrderList.orderList = [] }, f => { f.order.currency = 0 }, f => { f.order.code = '00005' }, f => { delete f.fill.orderIDEx }, f => { f.order.orderIDEx = 'other' }]) {
    const f = futuFixture(); mutate(f)
    await assert.rejects(f.fetch(), /currency|identity|orderIDEx|unrequested/)
    assert.equal(f.calls.at(-1)[0], 'close')
  }
})
test('Futu validates every response account, environment, and market header', async () => {
  for (const name of ['GetHistoryOrderFillList', 'GetOrderFillList', 'GetHistoryOrderList', 'GetOrderList']) {
    const f = futuFixture()
    if (name === 'GetOrderList') f.data.GetHistoryOrderList.orderList = []
    f.data[name].header = { ...f.header, accID: '123' }
    await assert.rejects(f.fetch(range, undefined, { now: () => Date.parse('2024-01-02T08:00:00Z') }), /does not match/)
  }
  for (const patch of [{ trdEnv: 0 }, { trdMarket: 2 }]) {
    const f = futuFixture(); f.data.GetHistoryOrderFillList.header = { ...f.header, ...patch }
    await assert.rejects(f.fetch(), /does not match/)
  }
})
test('Futu selected remote account and market must be authorized before querying fills', async () => {
  for (const mutate of [f => { f.data.GetAccList.accList[0].accID = '1' }, f => { f.data.GetAccList.accList[0].trdEnv = 0 }, f => { f.data.GetAccList.accList[0].trdMarketAuthList = [2] }]) {
    const f = futuFixture(); mutate(f)
    await assert.rejects(f.fetch(), /not authorized/)
    assert.equal(f.calls.filter(([n]) => n === 'GetHistoryOrderFillList').length, 0)
  }
  const f = futuFixture(); f.source.tradeEnvironment = 'SIMULATE'
  await assert.rejects(f.fetch(), /paper history is unsupported/)
  assert.equal(f.calls.length, 0)
})
test('Futu rejects shorts, corrections, derivatives, unknown markets and unsafe uint64 execution numbers', async () => {
  for (const patch of [{ trdSide: 3 }, { trdSide: 4 }, { status: 1 }, { status: 2 }, { status: 3 }, { code: '10001' }, { secMarket: 3 }, { fillID: Number(FILL) }, { qty: 0 }, { price: null }, { createTime: '2024-02-30 10:00:00' }]) {
    const f = futuFixture(); Object.assign(f.fill, patch)
    await assert.rejects(f.fetch())
    assert.equal(f.calls.at(-1)[0], 'close')
  }
})
test('Futu CN security market uses 31/32 while request trade market remains 3, and currency is CNH', async () => {
  const f = futuFixture(); f.source.tradeMarket = 'CN'; f.data.GetAccList.accList[0].trdMarketAuthList = [3]; f.header.trdMarket = 3
  Object.assign(f.fill, { code: '600000', secMarket: 31 }); Object.assign(f.order, { code: '600000', secMarket: 31, currency: 3 })
  const out = await f.fetch()
  assert.equal(out.rows[0].market, 'CN'); assert.equal(out.rows[0].currency, 'CNH')
  assert.match(out.rows[0].note, /Asia\/Shanghai/)
})
test('Futu enforces per-account 10 calls / 30 sec and metadata batching', async () => {
  const f = futuFixture()
  for (let i = 0; i < 3; i++) await f.fetch()
  await assert.rejects(f.fetch(), /10 requests per 30 seconds/)
  assert.equal(f.calls.filter(([n]) => n.startsWith('Get')).length, 10)
  const g = futuFixture()
  g.data.GetHistoryOrderFillList.orderFillList = Array.from({ length: 151 }, (_, i) => ({ ...g.fill, fillID: String(i + 1), orderIDEx: `order-${i}` }))
  await assert.rejects(g.fetch(), /150 distinct orders/)
  assert.equal(g.calls.filter(([n]) => n === 'GetHistoryOrderList').length, 0)
})

test('Futu batches currency metadata in at most 50 explicit order IDs', async () => {
  const f = futuFixture()
  f.data.GetHistoryOrderFillList.orderFillList = Array.from({ length: 51 }, (_, i) => ({ ...f.fill, fillID: String(i + 1), orderIDEx: `order-${i}` }))
  f.data.GetHistoryOrderList = request => ({ header: f.header, orderList: request.c2s.filterConditions.orderIDExList.map(orderIDEx => ({ ...f.order, orderIDEx })) })
  assert.equal((await f.fetch()).rows.length, 51)
  assert.deepEqual(f.calls.filter(([n]) => n === 'GetHistoryOrderList').map(([, r]) => r.c2s.filterConditions.orderIDExList.length), [50, 1])
})
test('empty broker archives remain explicit incomplete coverage without order calls', async () => {
  const f = futuFixture(); f.data.GetHistoryOrderFillList.orderFillList = []
  const out = await f.fetch(); assert.deepEqual(out.rows, []); assert.equal(out.coverage.complete, false)
  assert.equal(f.calls.filter(([n]) => n === 'GetHistoryOrderList').length, 0)
  const g = longbridgeFixture(); g.data.historyExecutions = []
  assert.deepEqual((await g.fetch()).rows, []); assert.equal(g.calls.filter(([n]) => n === 'orderDetail').length, 0)
})

test('Longbridge joins side/currency by cached order detail and uses New York market date, not UTC/host date', async () => {
  const f = longbridgeFixture(), out = await f.fetch()
  assert.equal(out.rows[0].date, '2024-01-02'); assert.equal(out.rows[0].time, '20:02:03.123')
  assert.equal(out.rows[0].currency, 'USD'); assert.equal(out.rows[0].kind, 'buy')
  assert.equal(out.rows[0].qty, 1.5); assert.equal(out.rows[0].grossAmount, 150.375)
  assert.equal(out.rows[0].externalId, 'trade-1'); assert.equal(out.rows[0].fee, null); assert.equal(out.rows[0].cashAmount, null)
  assert.match(out.rows[0].note, /America\/New_York/)
  const request = f.calls.find(([n]) => n === 'historyExecutions')[1]
  assert.equal(request.startAt.toISOString(), '2024-01-01T00:00:00.000Z')
  assert.equal(request.endAt.toISOString(), '2024-01-03T23:59:59.000Z')
  assert.deepEqual(f.calls.find(([n]) => n === 'orderDetail'), ['orderDetail', 'order-1'])
  assert.equal(f.calls.at(-1)[0], 'close')
  assert.equal(out.coverage.complete, false)
})
test('Longbridge reads non-enumerable SDK getters, preserves multiplicity by trade ID and never allocates order fees', async () => {
  const f = longbridgeFixture(), native = {}
  for (const [key, value] of Object.entries(f.execution)) Object.defineProperty(native, key, { get: () => value })
  f.data.historyExecutions = [native, { ...f.execution, tradeId: 'trade-2' }]
  const out = await f.fetch()
  assert.equal(out.rows.length, 2); assert.equal(f.calls.filter(([n]) => n === 'orderDetail').length, 1)
  assert.deepEqual(out.rows.map(r => r.fee), [null, null])
})
test('Longbridge adds todayExecutions when any current market day is covered and deduplicates overlap', async () => {
  const f = longbridgeFixture()
  f.data.todayExecutions = [{ ...f.execution }, { ...f.execution, tradeId: 'today-only' }]
  const out = await f.fetch(range, undefined, { now: () => Date.parse('2024-01-03T01:00:00Z') })
  assert.equal(out.rows.length, 2)
  assert.deepEqual(f.calls.find(([n]) => n === 'todayExecutions'), ['todayExecutions', {}])
  assert.equal(f.calls.filter(([n]) => n === 'orderDetail').length, 1)
})
test('Longbridge rejects channel ambiguity and missing selection without history requests or leaks', async () => {
  for (const mutate of [f => { f.source.brokerAccountId = 'other' }, f => { f.data.fundPositions.channels = [{ accountChannel: 'margin', positions: [] }] }]) {
    const f = longbridgeFixture(); mutate(f)
    await assert.rejects(f.fetch(), /not returned|Ambiguous/)
    assert.equal(f.calls.filter(([n]) => n === 'historyExecutions').length, 0)
    assert.equal(f.calls.at(-1)[0], 'close')
  }
})
test('Longbridge converts HK/CN local dates and US daylight saving time before date filtering', async () => {
  for (const [symbol, stamp, expected, zone] of [['700.HK', '2024-01-01T16:00:00.001Z', '00:00:00.001', 'Asia/Hong_Kong'], ['600000.SH', '2024-01-01T16:00:00.000Z', '00:00:00', 'Asia/Shanghai'], ['AAPL.US', '2024-07-03T00:01:00Z', '20:01:00', 'America/New_York']]) {
    const f = longbridgeFixture(); f.execution.symbol = symbol; f.detail.symbol = symbol; f.execution.tradeDoneAt = new Date(stamp)
    const requested = symbol === 'AAPL.US' ? { from: '2024-07-02', to: '2024-07-02' } : range
    const row = (await f.fetch(requested)).rows[0]
    assert.equal(row.time, expected); assert.equal(row.date, requested.from); assert.ok(row.note.includes(zone))
    f.execution.tradeDoneAt = new Date(`${requested.to}T23:59:59Z`)
    if (symbol !== 'AAPL.US') assert.equal((await f.fetch(requested)).rows.length, 0)
  }
})

test('Longbridge a full 1000-record page splits recursively and boundary IDs deduplicate', async () => {
  const f = longbridgeFixture(); let requests = 0
  f.data.historyExecutions = () => ++requests === 1 ? Array(1000).fill(f.execution) : [f.execution]
  const out = await f.fetch()
  assert.equal(out.rows.length, 1); assert.equal(requests, 3)
  const [parent, left, right] = f.calls.filter(([n]) => n === 'historyExecutions').map(c => c[1])
  assert.equal(left.startAt.getTime(), parent.startAt.getTime())
  assert.equal(right.endAt.getTime(), parent.endAt.getTime())
  assert.equal(left.endAt.getTime(), right.startAt.getTime())
})
test('Longbridge full pages down to one second fail rather than silently accepting SDK truncation', async () => {
  const f = longbridgeFixture(); f.data.historyExecutions = Array(1000).fill(f.execution)
  await assert.rejects(f.fetch(), /one-second execution cap/)
  assert.ok(f.calls.filter(([n]) => n === 'historyExecutions').length <= 64)
  assert.equal(f.calls.filter(([n]) => n === 'orderDetail').length, 0)
  assert.equal(f.calls.at(-1)[0], 'close')
})
test('Longbridge split request budget stops a dense archive at 64 calls', async () => {
  const f = longbridgeFixture()
  f.data.historyExecutions = ({ startAt, endAt }) => endAt - startAt <= 1000 ? [] : Array(1000).fill(f.execution)
  await assert.rejects(f.fetch(), /request budget of 64/)
  assert.equal(f.calls.filter(([n]) => n === 'historyExecutions').length, 64)
})
test('Longbridge bounds distinct order lookups and total records', async () => {
  const f = longbridgeFixture()
  f.data.historyExecutions = Array.from({ length: 301 }, (_, i) => ({ ...f.execution, tradeId: `t${i}`, orderId: `o${i}` }))
  await assert.rejects(f.fetch(), /missing too many orders/)
  assert.equal(f.calls.filter(([n]) => n === 'orderDetail').length, 0)
  // Bulk historyOrders replaces per-order orderDetail calls (rate limited by the broker).
  const b = longbridgeFixture()
  b.data.historyExecutions = Array.from({ length: 40 }, (_, i) => ({ ...b.execution, tradeId: `t${i}`, orderId: `o${i}` }))
  b.data.historyOrders = Array.from({ length: 40 }, (_, i) => ({ ...b.detail, orderId: `o${i}` }))
  assert.equal((await b.fetch()).rows.length, 40)
  assert.equal(b.calls.filter(([n]) => n === 'orderDetail').length, 0)
  const g = longbridgeFixture(); g.data.historyExecutions = []; g.data.todayExecutions = Array.from({ length: 25001 }, (_, i) => ({ ...g.execution, tradeId: `t${i}` }))
  await assert.rejects(g.fetch(range, undefined, { now: () => Date.parse('2024-01-02T12:00:00Z') }), /25000 records/)
})
test('Longbridge malformed executions and incomplete/wrong order details reject the whole preview', async () => {
  for (const mutate of [f => { f.detail.side = 0 }, f => { f.detail.side = 'Short' }, f => { f.detail.currency = '' }, f => { f.detail.orderId = 'other' }, f => { f.detail.symbol = 'MSFT.US' }, f => { f.execution.quantity = decimal('-1') }, f => { f.execution.tradeDoneAt = '2024-01-02T10:00:00Z' }]) {
    const f = longbridgeFixture(); mutate(f)
    await assert.rejects(f.fetch())
    assert.equal(f.calls.at(-1)[0], 'close')
  }
  // Options, warrants and corrections are skipped with a visible notice instead of aborting everything.
  for (const mutate of [f => { f.execution.symbol = 'AAPL240119C00150000.US' }, f => { f.execution.symbol = '10001.HK' }, f => { f.execution.isCorrection = true }]) {
    const f = longbridgeFixture(); mutate(f)
    const out = await f.fetch()
    assert.equal(out.rows.length, 0)
    assert.ok(out.warnings.some(w => /已跳过/.test(w.message)))
  }
})
test('Longbridge numeric Sell and string Buy/Sell enum fixtures normalize explicitly', async () => {
  for (const [side, kind] of [[2, 'sell'], ['Buy', 'buy'], ['Sell', 'sell']]) {
    const f = longbridgeFixture(); f.detail.side = side
    assert.equal((await f.fetch()).rows[0].kind, kind)
  }
})
test('conflicting execution IDs fail rather than silently dropping corrections', async () => {
  const f = longbridgeFixture(); f.data.historyExecutions.push({ ...f.execution, quantity: decimal('2') })
  await assert.rejects(f.fetch(), /Conflicting records/)
  const g = futuFixture(); g.data.GetHistoryOrderFillList.orderFillList.push({ ...g.fill, qty: 3 })
  await assert.rejects(g.fetch(), /Conflicting records/)
})
test('both transports abort, time out, sanitize SDK failures and release resources', async () => {
  const f = futuFixture(), controller = new AbortController()
  f.data.GetHistoryOrderFillList = () => { controller.abort(new Error('request aborted')); return new Promise(() => {}) }
  await assert.rejects(f.fetch(range, controller.signal), /aborted/); assert.equal(f.calls.at(-1)[0], 'close')
  const g = longbridgeFixture(); g.data.historyExecutions = () => new Promise(() => {})
  await assert.rejects(g.fetch(range, undefined, { timeoutMs: 5 }), /timed out/); assert.equal(g.calls.at(-1)[0], 'close')
  const h = longbridgeFixture(); h.data.historyExecutions = new Error('fixture-token fixture-secret')
  await assert.rejects(h.fetch(), error => /historyExecutions failed/.test(error.message) && !/fixture-token|fixture-secret/.test(error.message))
  const j = futuFixture(); j.data.GetHistoryOrderFillList = () => { throw new Error('fixture-secret') }
  await assert.rejects(j.fetch(), error => /GetHistoryOrderFillList failed/.test(error.message) && !/fixture-secret/.test(error.message))
})
test('invalid range, unsupported sources, paper accounts and pre-aborted signals never create connections', async () => {
  const f = futuFixture()
  for (const requested of [{ from: '2024-02-30', to: '2024-03-01' }, { from: '2024-02-01', to: '2024-01-01' }, {}]) await assert.rejects(f.fetch(requested))
  const controller = new AbortController(); controller.abort(new Error('request aborted'))
  await assert.rejects(f.fetch(range, controller.signal), /aborted/)
  await assert.rejects(fetchNativeHistory({ connector: 'ib', transport: 'native' }, {}, range), /unavailable/)
  assert.equal(f.calls.length, 0)
})
test('THS connector routes to money-history and maps fund-book rows with signed cash', async () => {
  const source = { connector: 'ths', transport: 'native', portfolioId: '100108832246', thsBookType: 'ijj' }
  const list = [
    { account_type: '5', code: '001257', op: '0', op_name: '申购', entry_date: '2026-10-09', entry_time: '00:00:00', entry_money: '1000', entry_count: '620.12', entry_price: '1.6127', fee_total: '1.5', vid: '' },
    { account_type: '5', code: '001257', op: '2', op_name: '现金分红', entry_date: '2026-10-19', entry_time: '00:00:00', entry_money: '35.6', entry_count: '0', entry_price: '', fee_total: '', vid: '' },
  ]
  const deps = { fetch: async (url) => url.endsWith('get_money_history')
    ? { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: { list, total: 2, max_page: 1, page: 1, count: 200 } }) }
    : { ok: true, status: 200, json: async () => ({ error_code: '0', ex_data: {} }) } }
  const out = await fetchNativeHistory(source, { cookie: 'userid=123; v=fixture' }, { from: '2026-10-01', to: '2026-11-07' }, undefined, deps)
  assert.equal(out.rows.length, 2)
  const byKind = Object.fromEntries(out.rows.map(r => [r.kind, r]))
  assert.equal(byKind.buy.cashAmount, -1000); assert.equal(byKind.buy.fee, 1.5)
  assert.equal(byKind.dividend.cashAmount, 35.6)
  assert.ok(out.rows.every(r => r.externalId.startsWith('weak:')))
  assert.match(out.coverage.note, /基金账本/)
  assert.equal(out.coverage.complete, false)
})
