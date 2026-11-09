// Read-only execution archives; never a complete cash ledger or a position snapshot.
import { withFutu, withLongbridge } from './brokers-sdk.mjs'
import { getConnector } from './connector-registry.mjs'

const fail = message => { throw new Error(message) }
const fallback = message => fail(`${message}; narrow the date range or import an official broker statement file`)
const MAX_ROWS = 25000
const ZONES = { HK: 'Asia/Hong_Kong', US: 'America/New_York', CN: 'Asia/Shanghai' }
const FT_CURRENCIES = { 1: 'HKD', 2: 'USD', 3: 'CNH', 4: 'JPY', 5: 'SGD', 6: 'AUD', 7: 'CAD', 8: 'MYR', 9: 'NZD' }
const futuBudgets = new Map()
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} is required`)
  return value.trim()
}
function array(value, field) { if (!Array.isArray(value)) fail(`${field} must be an array`); return value }
function uint64(value, field) {
  // All uint64 identifiers stay strings, including protobuf Long objects.
  if (typeof value === 'number' && !Number.isSafeInteger(value)) fail(`${field} is an unsafe number; require a uint64 string`)
  const s = value != null && typeof value === 'object' ? value.toString() : String(value)
  if (!/^\d+$/.test(s) || BigInt(s) <= 0n || BigInt(s) > 18446744073709551615n) fail(`${field} must be a positive uint64 string`)
  return BigInt(s).toString()
}
function numeric(value, field, positive = false) {
  if (value != null && typeof value === 'object') value = value.toString()
  if (!['number', 'string'].includes(typeof value) || !/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value))) fail(`${field} is unknown, negative or invalid`)
  const n = Number(value)
  if (!Number.isFinite(n) || (positive && n <= 0) || (n === 0 && /[1-9]/.test(String(value).split(/[eE]/)[0]))) fail(`${field} is invalid or underflows`)
  return n
}
function currency(value) {
  const c = text(value, 'Execution order currency').toUpperCase()
  if (!/^[A-Z]{3}$/.test(c)) fail('Execution order currency is unknown')
  return c
}
function day(value, field = 'Date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(`${field} must be YYYY-MM-DD`)
  return value
}
function localDateTime(date, market) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) fail('Execution tradeDoneAt must be a valid SDK Date')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONES[market], year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]))
  const ms = date.getUTCMilliseconds()
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}${ms ? '.' + String(ms).padStart(3, '0') : ''}` }
}
function futuDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T]((?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?)$/.exec(value)
  if (!match) fail('Futu execution createTime is invalid; require market-local date and time')
  return { date: day(match[1], 'Futu execution date'), time: match[2] }
}
function instrument(symbol, market) {
  // Only unambiguous cash-equity/ETF code shapes are supported. HK warrants,
  // CBBCs, US OCC option codes, mainland options and futures fail explicitly.
  const valid = market === 'US' ? /^[A-Z][A-Z0-9]*(?:[.\-][A-Z0-9]+)?$/.test(symbol) && !/\d{6}[CP]\d/i.test(symbol)
    : market === 'HK' ? /^\d{1,5}$/.test(symbol) && +symbol > 0 && (+symbol < 10000 || (+symbol >= 80000 && +symbol < 90000))
      : market === 'CN' ? /^\d{6}$/.test(symbol) : false
  if (!valid) fail('Derivative or unknown execution instrument is unsupported')
}
function unsupportedFlags(value) {
  if (value?.isShort === true || value?.shortSale === true || value?.isCorrection === true || value?.isCancelled === true || (value?.comboLegs?.length ?? 0) > 0) fail('Short, derivative, cancelled or corrected executions are unsupported')
}
function canonical(base, qtyValue, priceValue) {
  const qty = numeric(qtyValue, 'Execution quantity', true), price = numeric(priceValue, 'Execution price')
  const grossAmount = numeric(qty * price, 'Execution gross amount')
  if (qty > 0 && price > 0 && grossAmount === 0) fail('Execution gross amount underflows')
  return { ...base, qty, price, grossAmount, cashAmount: null, fee: null }
}
function addUnique(map, row) {
  const previous = map.get(row.externalId)
  if (previous && JSON.stringify(previous) !== JSON.stringify(row)) fail('Conflicting records for the same execution ID; corrections are unsupported')
  map.set(row.externalId, row)
  if (map.size > MAX_ROWS) fallback('Execution archive exceeds 25000 records')
}
function result(rows, from, to, extra = []) {
  return { rows: [...rows].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || a.externalId.localeCompare(b.externalId)), errors: [], warnings: [{ message: '仅含成交记录：费用与净现金未知；出入金、分红等非成交记录需用账单文件补录。' }, ...extra.map(message => ({ message }))], coverage: { complete: false, note: `Requested executions for ${from} through ${to}; API date bounds do not prove broker retention or full ledger coverage. Cash, dividends, fees and other non-trade events are not covered.` } }
}
function inRange(date, range) { return date >= range.from && date <= range.to }
function futuBudget(id) {
  // Futu limits follow the remote account, even across sources/endpoints.
  const key = id
  return () => {
    const now = Date.now()
    for (const [k, timestamps] of futuBudgets) { const active = timestamps.filter(t => now - t < 30000); if (active.length) futuBudgets.set(k, active); else futuBudgets.delete(k) }
    const used = futuBudgets.get(key) ?? []
    if (used.length >= 10) fallback('Futu per-account budget of 10 requests per 30 seconds reached; wait 30 seconds before retrying')
    used.push(now); futuBudgets.set(key, used)
  }
}
// 导出供连接器注册表引用；本模块只在函数体内使用注册表，函数声明的提升保证循环引用安全。
export async function futuHistory(source, secrets, range, signal, deps, now) {
  const id = uint64(source.brokerAccountId, 'source.brokerAccountId'), marketNum = { HK: 1, US: 2, CN: 3 }[source.tradeMarket]
  if (source.tradeEnvironment !== 'REAL') fail('Futu history supports only REAL accounts; paper history is unsupported')
  if (!['HK', 'US', 'CN'].includes(source.tradeMarket)) fail('Futu history requires tradeMarket HK/US/CN')
  const header = { trdEnv: 1, accID: id, trdMarket: marketNum }, reserve = futuBudget(id)
  const today = localDateTime(now, source.tradeMarket).date
  return withFutu(source, secrets, signal, deps, async rawCall => {
    let calls = 0
    const call = async (name, args, checkHeader = true) => {
      if (++calls > 10) fallback('Futu preview request budget reached')
      reserve()
      const response = await rawCall(name, args)
      if (checkHeader) {
        const h = response.header
        if (!h || uint64(h.accID, 'Futu response account ID') !== id || h.trdEnv !== 1 || h.trdMarket !== marketNum) fail('Futu response account/environment/market does not match selected source')
      }
      if (response.hasMore === true || response.has_more === true) fallback('Futu response signals incomplete results')
      return response
    }
    const accounts = array((await call('GetAccList', { userID: 0 }, false)).accList, 'Futu accList')
    const matching = accounts.filter(a => uint64(a.accID, 'Futu account ID') === id && a.trdEnv === 1)
    if (matching.length !== 1 || !array(matching[0].trdMarketAuthList, 'Futu tradeMarketAuthList').includes(marketNum)) fail('Selected Futu account/environment/market was not authorized by GetAccList')
    const history = await call('GetHistoryOrderFillList', { header, filterConditions: { beginTime: `${range.from} 00:00:00`, endTime: `${range.to} 23:59:59.999` } })
    const fills = [...array(history.orderFillList, 'Futu history orderFillList')]
    if (inRange(today, range)) fills.push(...array((await call('GetOrderFillList', { header })).orderFillList, 'Futu today orderFillList'))
    if (fills.length > MAX_ROWS * 2) fallback('Futu execution response is too large')
    const unique = new Map()
    for (const fill of fills) {
      unsupportedFlags(fill)
      if (fill.status != null && fill.status !== 0) fail('Futu cancelled, changed or payout fills are unsupported; entire preview rejected')
      if (![1, 2].includes(fill.trdSide)) fail('Futu short, buyback or unknown execution side is unsupported')
      const market = { 1: 'HK', 2: 'US', 31: 'CN', 32: 'CN' }[fill.secMarket]
      if (market !== source.tradeMarket) fail('Futu fill security market does not match selected trade market')
      const symbol = text(fill.code, 'Futu execution code'); instrument(symbol, market)
      const stamp = futuDateTime(fill.createTime), executionId = uint64(fill.fillID, 'Futu fillID')
      const row = canonical({ ...stamp, kind: fill.trdSide === 1 ? 'buy' : 'sell', originalType: fill.trdSide === 1 ? 'Buy' : 'Sell', symbol, name: text(fill.name, 'Futu execution name'), market, currency: null, externalId: executionId,
        note: `Futu market-local time (${ZONES[market]}); orderIDEx=${fill.orderIDEx ?? ''}; orderID=${fill.orderID == null ? '' : uint64(fill.orderID, 'Futu orderID')}; fillIDEx diagnostic=${fill.fillIDEx ?? ''}` }, fill.qty, fill.price)
      if (!inRange(row.date, range)) continue
      const orderId = text(fill.orderIDEx, 'Futu fill orderIDEx needed for currency lookup; import an official broker statement file if unavailable')
      addUnique(unique, { ...row, orderId })
    }
    const ids = [...new Set([...unique.values()].map(row => row.orderId))]
    if (ids.length > 150) fallback('Futu currency lookup exceeds 150 distinct orders per preview')
    const orders = new Map()
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const remember = response => {
        for (const order of array(response.orderList, 'Futu metadata orderList')) {
          const key = text(order.orderIDEx, 'Futu metadata orderIDEx')
          if (!batch.includes(key)) fail('Futu order lookup returned an unrequested order')
          unsupportedFlags(order)
          const c = Number.isInteger(order.currency) ? FT_CURRENCIES[order.currency] : null
          if (!c) fallback('Futu order currency is unknown; source reporting currency cannot be substituted')
          const value = { currency: c, code: order.code, trdSide: order.trdSide, secMarket: order.secMarket }
          if (orders.has(key) && JSON.stringify(orders.get(key)) !== JSON.stringify(value)) fail('Futu order metadata is conflicting')
          orders.set(key, value)
        }
      }
      // An order may have been placed long before its fill date. A wide metadata
      // window is intentional; missing older metadata causes a file fallback.
      remember(await call('GetHistoryOrderList', { header, filterConditions: { beginTime: `${range.from < '2018-01-01' ? range.from : '2018-01-01'} 00:00:00`, endTime: `${range.to > today ? range.to : today} 23:59:59.999`, orderIDExList: batch } }))
      const missing = batch.filter(key => !orders.has(key))
      if (missing.length) remember(await call('GetOrderList', { header, filterConditions: { orderIDExList: missing } }))
      if (batch.some(key => !orders.has(key))) fallback('Futu order currency lookup is incomplete (order may predate available history)')
    }
    const rows = []
    for (const row of unique.values()) {
      const order = orders.get(row.orderId)
      if (order.code !== row.symbol || order.trdSide !== (row.kind === 'buy' ? 1 : 2) || (order.secMarket != null && ({ 1: 'HK', 2: 'US', 31: 'CN', 32: 'CN' })[order.secMarket] !== row.market)) fail('Futu execution/order metadata identity does not match')
      const { orderId, ...canonicalRow } = row
      rows.push({ ...canonicalRow, currency: order.currency })
    }
    return result(rows, range.from, range.to)
  })
}
function channels(value, field) {
  const list = array(value?.channels, `${field}.channels`), ids = new Set()
  for (const c of list) { const id = text(c.accountChannel, 'Longbridge accountChannel'); if (ids.has(id)) fail('Duplicate Longbridge accountChannel'); ids.add(id); array(c.positions, `${field}.positions`) }
  return [...ids]
}
function lbInstrument(value) {
  const symbol = text(value, 'Longbridge execution symbol'), match = /^(.+)\.(HK|US|SH|SZ)$/.exec(symbol)
  if (!match) fail('Longbridge derivative or unknown execution symbol is unsupported')
  const market = { HK: 'HK', US: 'US', SH: 'CN', SZ: 'CN' }[match[2]]
  instrument(match[1], market)
  return { symbol, market }
}
export async function longbridgeHistory(source, secrets, range, signal, deps, now) {
  const id = text(source.brokerAccountId, 'source.brokerAccountId (accountChannel)')
  return withLongbridge(secrets, signal, { ...deps, timeoutMs: deps.timeoutMs ?? 170000 }, async call => {
    const ids = new Set([...channels(await call('stockPositions'), 'stocks'), ...channels(await call('fundPositions'), 'funds')])
    if (!ids.has(id)) fail('Selected Longbridge accountChannel was not returned by positions APIs')
    if (ids.size !== 1) fail('Ambiguous Longbridge account channels: execution history cannot attribute fills to the selected channel')
    let historyCalls = 0
    const raw = new Map(), skipped = new Map()
    const remember = executions => {
      for (const execution of executions) {
        let symbol, market
        try {
          unsupportedFlags(execution)
          ;({ symbol, market } = lbInstrument(execution.symbol))
        } catch {
          // Options, warrants and other derivatives are outside the spot ledger:
          // skip them visibly instead of aborting the whole account history.
          const key = String(execution?.symbol || '未知标的')
          skipped.set(key, (skipped.get(key) || 0) + 1)
          continue
        }
        const orderId = text(execution.orderId, 'Longbridge execution orderId'), externalId = text(execution.tradeId, 'Longbridge execution tradeId')
        // Read SDK getters explicitly: native objects have non-enumerable fields.
        addUnique(raw, canonical({ ...localDateTime(execution.tradeDoneAt, market), symbol, market, orderId, externalId }, execution.quantity, execution.price))
      }
    }
    const fetchSlice = async (start, end) => {
      if (++historyCalls > 64) fallback('Longbridge history request budget of 64 reached; complete retrieval cannot be proven')
      const executions = array(await call('historyExecutions', { startAt: new Date(start), endAt: new Date(end) }), 'Longbridge historyExecutions')
      if (executions.length > 1000) fallback('Longbridge history response exceeds documented 1000 record cap')
      if (executions.length < 1000) { remember(executions); return }
      // 4.3.7 discards has_more. A full page must be subdivided, never trusted.
      if (end - start <= 1000) fallback('Longbridge one-second execution cap reached; complete retrieval cannot be proven')
      const middle = start + Math.floor((end - start) / 2000) * 1000
      await fetchSlice(start, middle)
      // Shared boundary seconds prevent gaps when the SDK rounds Date bounds.
      // Never use zero-width intervals; IDs deduplicate overlap and today's API.
      await fetchSlice(middle, end)
    }
    // UTC-padded bounds cover all supported market dates, independent of host TZ.
    await fetchSlice(Date.parse(`${range.from}T00:00:00Z`) - 86400000, Date.parse(`${range.to}T00:00:00Z`) + 2 * 86400000 - 1000)
    if (Object.keys(ZONES).some(m => inRange(localDateTime(now, m).date, range))) remember(array(await call('todayExecutions', {}), 'Longbridge todayExecutions'))
    const selected = [...raw.values()].filter(row => inRange(row.date, range)), orderIds = [...new Set(selected.map(row => row.orderId))]
    const orders = new Map()
    // Bulk order lookup: one historyOrders call per window instead of one
    // rate-limited orderDetail call per order (429002 after ~30 calls/30s).
    const bulk = new Map()
    if (selected.length) {
      const dates = selected.map(r => r.date).sort()
      let orderCalls = 0
      const fetchOrders = async (start, end) => {
        if (++orderCalls > 64) return
        let list
        try { list = await call('historyOrders', { startAt: new Date(start), endAt: new Date(end) }) } catch { return }
        if (!Array.isArray(list)) return
        if (list.length >= 1000 && end - start > 86400000) {
          const middle = start + Math.floor((end - start) / 2000) * 1000
          await fetchOrders(start, middle); await fetchOrders(middle, end); return
        }
        for (const o of list) if (o?.orderId) bulk.set(String(o.orderId), o)
      }
      await fetchOrders(Date.parse(`${dates[0]}T00:00:00Z`) - 86400000, Math.min(Date.parse(`${dates.at(-1)}T00:00:00Z`) + 2 * 86400000, now.getTime()))
      try { for (const o of array(await call('todayOrders', {}), 'Longbridge todayOrders')) if (o?.orderId) bulk.set(String(o.orderId), o) } catch {}
    }
    const missing = orderIds.filter(id => !bulk.has(id))
    if (missing.length > 300) fallback('Longbridge order lookup missing too many orders')
    let detailCalls = 0
    for (const orderId of orderIds) {
      let detail = bulk.get(orderId)
      if (!detail) {
        // Stay under the 30-calls-per-30-seconds order API limit.
        if (detailCalls++ && detailCalls % 25 === 0) await new Promise(r => setTimeout(r, deps.orderDetailPauseMs ?? 31000))
        detail = await call('orderDetail', orderId)
      }
      unsupportedFlags(detail)
      if (!detail || detail.orderId !== orderId) fail('Longbridge order detail ID does not match execution')
      if (![1, 2, 'Buy', 'Sell'].includes(detail.side)) fail('Longbridge short or unknown order side is unsupported')
      const kind = detail.side === 1 || detail.side === 'Buy' ? 'buy' : 'sell'
      orders.set(orderId, { symbol: text(detail.symbol, 'Longbridge order symbol'), currency: currency(detail.currency), kind, name: typeof detail.stockName === 'string' && detail.stockName.trim() ? detail.stockName : detail.symbol })
    }
    const rows = selected.map(row => {
      const detail = orders.get(row.orderId)
      if (detail.symbol !== row.symbol) fail('Longbridge execution and order symbols do not match')
      const { orderId, ...canonicalRow } = row
      return { ...canonicalRow, name: detail.name, currency: detail.currency, kind: detail.kind, originalType: detail.kind === 'buy' ? 'Buy' : 'Sell', note: `Longbridge execution time (${ZONES[row.market]}); orderId=${orderId}` }
    })
    const extra = skipped.size ? [`已跳过期权、窝轮等衍生品或无法识别的成交 ${[...skipped.values()].reduce((a, b) => a + b, 0)} 笔：${[...skipped].map(([s, n]) => `${s}×${n}`).slice(0, 10).join('、')}${skipped.size > 10 ? ' 等' : ''}`] : []
    return result(rows, range.from, range.to, extra)
  })
}

export async function fetchNativeHistory(source, secrets, range, signal, deps = {}) {
  const from = day(range?.from, 'from'), to = day(range?.to, 'to')
  if (from > to) fail('from must not be after to')
  const transport = getConnector(source?.connector)?.transports[source?.transport]
  // 原生 SDK 历史以本地时间定位交易日，分发前统一做时间基准与中止检查。
  if (transport?.fetchHistory && transport.usesLocalNow) {
    const now = new Date(deps.now?.() ?? Date.now())
    if (!Number.isFinite(now.getTime())) fail('Invalid current time')
    signal?.throwIfAborted()
    return transport.fetchHistory(source, secrets, { from, to }, signal, deps, now)
  }
  if (transport?.fetchHistory) return transport.fetchHistory(source, secrets, { from, to }, signal, deps)
  if (source?.transport !== 'native') fail('Native history requires a native source')
  const now = new Date(deps.now?.() ?? Date.now())
  if (!Number.isFinite(now.getTime())) fail('Invalid current time')
  signal?.throwIfAborted()
  fail('Native execution history is unavailable for this connector; import an official broker statement file')
}
