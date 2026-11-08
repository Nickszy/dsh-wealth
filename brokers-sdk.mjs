// Standalone read-only official SDK adapters. Verified npm tarballs:
// futu-api@10.12.7208 (main.js, proto.js); longport@4.3.7 (index.d.ts).
// No environment credential loading, SDK subscriptions, unlocks, or order calls.
export const BROKER_SDK_VERSIONS = Object.freeze({ 'futu-api': '10.12.7208', longport: '4.3.7' })
const fail = (message) => { throw new Error(message) }
function text(v, field) { if (typeof v !== 'string' || !v.trim()) fail(`${field} is required`); return v.trim() }
function array(v, field) { if (!Array.isArray(v)) fail(`${field} must be an array`); return v }
function numeric(v, field, signed = false) {
  // Native Longport Decimal is deliberately converted via toString, never valueOf.
  if (v != null && typeof v === 'object' && typeof v.toString === 'function') v = v.toString()
  if ((typeof v !== 'number' && typeof v !== 'string') || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(v))) fail(`${field} is unknown or invalid`)
  const n = Number(v)
  if (!Number.isFinite(n) || (!signed && n < 0) || (n === 0 && /[1-9]/.test(String(v).split(/[eE]/)[0]))) fail(`${field} is unsupported (negative, nonfinite, or underflow)`)
  return n
}
function currency(v, field = 'currency') { const c = text(v, field).toUpperCase(); if (!/^[A-Z]{3}$/.test(c)) fail(`${field} must be a three-letter currency`); return c }
function uint64(v, field = 'account ID') {
  if (typeof v === 'number' && !Number.isSafeInteger(v)) fail(`${field} is an unsafe number; pass a decimal string`)
  const s = typeof v === 'object' && v !== null ? v.toString() : String(v)
  if (!/^\d+$/.test(s) || BigInt(s) > 18446744073709551615n || BigInt(s) === 0n) fail(`${field} must be a positive uint64 decimal string`)
  return BigInt(s).toString()
}
function snapshot(holdings, warnings, complete, deps) {
  const keys = new Set()
  for (const h of holdings) { const key = JSON.stringify([h.market, h.symbol, h.currency]); if (keys.has(key)) fail(`Duplicate holding ${h.symbol}/${h.currency}`); keys.add(key) }
  return { holdings, complete, warnings, queriedAt: new Date(deps.now?.() ?? Date.now()).toISOString(), uploadedAt: null, quoteDate: null }
}
function cash(c, qty) { return { symbol: `CASH:${c}`, name: `${c} cash`, market: 'CASH', assetClass: 'cash', currency: c, qty: numeric(qty, `${c} cash (margin liabilities unsupported)`), avgCost: 1, manualPrice: 1 } }
function deadline(signal, deps) {
  const controller = new AbortController(), ms = deps.timeoutMs ?? 30000
  if (!Number.isFinite(ms) || ms <= 0) fail('timeoutMs must be positive')
  const abort = () => controller.abort(signal.reason ?? new Error('Broker request aborted'))
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new Error('Broker request timed out')), ms)
  return {
    async run(fn) {
      controller.signal.throwIfAborted()
      let handler
      const canceled = new Promise((_, reject) => { handler = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', handler, { once: true }) })
      try { return await Promise.race([Promise.resolve().then(() => { controller.signal.throwIfAborted(); return fn() }), canceled]) }
      finally { controller.signal.removeEventListener('abort', handler) }
    },
    dispose() { clearTimeout(timer); signal?.removeEventListener('abort', abort) },
  }
}
async function load(name, deps) {
  try { return await (deps.loadSdk ?? ((n) => n === 'futu-api' ? import('./vendor/futu/main.js') : import(n)))(name) }
  catch { fail(`Official ${name} SDK unavailable; install ${name}@${BROKER_SDK_VERSIONS[name]} in dsh-portfolio (and verify Node compatibility)`) }
}
function cleanFutu(client) {
  if (!client) return
  client.onlogin = null
  // 10.12.7208 base.rejectAll iterates indices rather than pending values;
  // explicitly clear its request timers so cancellation does not keep Node alive.
  for (const pending of Object.values(client.websock?.promisePool ?? {})) {
    if (pending?.timer != null) clearTimeout(pending.timer)
    pending?.reject?.(new Error('Futu request closed'))
  }
  try { client.stop?.() } finally { client.websock?.close?.() }
}
export async function withFutu(config, secrets, signal, deps, fn) {
  const d = deadline(signal, deps)
  let client, ended = false
  try {
    const host = text(config?.host ?? '127.0.0.1', 'Futu host'), port = config?.port ?? 33333, tls = config?.tls ?? false
    if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof tls !== 'boolean') fail('Invalid Futu port/tls')
    if (secrets?.websocketKey != null && typeof secrets.websocketKey !== 'string') fail('websocketKey must be a string')
    await d.run(async () => {
      let created
      if (deps.createFutuClient) created = await deps.createFutuClient()
      else { const sdk = await load('futu-api', deps); if (ended) return; created = new (sdk.default ?? sdk.ftWebsocket)() }
      if (ended) cleanFutu(created)
      else client = created
    })
    await d.run(() => new Promise((resolve, reject) => {
      client.onlogin = (ret) => ret === true ? resolve() : reject(new Error('Futu OpenD WebSocket handshake failed; check host, port, TLS and websocket key'))
      try { client.start(host, port, tls, secrets?.websocketKey ?? '') } catch { reject(new Error('Futu OpenD WebSocket connection failed')) }
    }))
    const call = async (method, c2s) => {
      let response
      try { response = await d.run(() => client[method]({ c2s })) }
      catch (error) { if (/timed out|abort/i.test(error?.message ?? '')) throw error; fail(`Futu ${method} failed; check OpenD permissions and selected account`) }
      if (response?.retType !== 0 || !response.s2c) fail(`Futu ${method} returned an unsuccessful response`)
      return response.s2c
    }
    return await fn(call)
  } finally { ended = true; try { cleanFutu(client) } finally { d.dispose() } }
}
const FT_MARKETS = { 1: 'HK', 2: 'US', 3: 'CN', 4: 'CN', 31: 'CN', 32: 'CN' }
const FT_CURRENCIES = { 1: 'HKD', 2: 'USD', 3: 'CNH', 4: 'JPY', 5: 'SGD', 6: 'AUD', 7: 'CAD', 8: 'MYR', 9: 'NZD' }
function ftCurrency(v) { return FT_CURRENCIES[v] ?? fail('Futu returned an unknown currency; cannot infer denomination') }
function accounts(data) {
  const result = array(data.accList, 'Futu accList').map((a) => {
    if (![0, 1].includes(a.trdEnv)) fail('Futu returned unknown trade environment')
    return { id: uint64(a.accID), name: typeof a.cardNum === 'string' && a.cardNum ? a.cardNum : uint64(a.accID), tradeEnvironment: a.trdEnv === 1 ? 'REAL' : 'SIMULATE', tradeMarkets: [...new Set(array(a.trdMarketAuthList, 'trdMarketAuthList').map((v) => FT_MARKETS[v]).filter(Boolean))] }
  })
  if (new Set(result.map((a) => `${a.id}:${a.tradeEnvironment}`)).size !== result.length) fail('Duplicate Futu account IDs')
  return result
}
export async function listFutuAccounts(config, secrets, signal, deps = {}) {
  return withFutu(config, secrets, signal, deps, async (call) => ({ accounts: accounts(await call('GetAccList', { userID: 0 })), warnings: [] }))
}
export async function fetchFutuSnapshot(source, secrets, signal, deps = {}) {
  const id = uint64(source?.brokerAccountId, 'source.brokerAccountId')
  const env = { REAL: 1, SIMULATE: 0 }[source?.tradeEnvironment], market = { HK: 1, US: 2, CN: 3 }[source?.tradeMarket]
  if (env === undefined || market === undefined) fail('Futu requires explicit tradeEnvironment REAL/SIMULATE and tradeMarket HK/US/CN')
  const c = currency(source.currency, 'source.currency'), cNum = Number(Object.keys(FT_CURRENCIES).find((key) => FT_CURRENCIES[key] === c))
  if (!cNum) fail('Futu source.currency is unsupported (use CNH for offshore RMB)')
  return withFutu(source, secrets, signal, deps, async (call) => {
    const acc = accounts(await call('GetAccList', { userID: 0 })).find((a) => a.id === id && a.tradeEnvironment === source.tradeEnvironment)
    if (!acc || !acc.tradeMarkets.includes(source.tradeMarket)) fail('Selected Futu account/environment/market was not authorized by GetAccList')
    // protobufjs uint64 writer accepts decimal strings; never round via Number.
    const header = { trdEnv: env, accID: id, trdMarket: market }
    const positions = await call('GetPositionList', { header })
    const fundsResponse = await call('GetFunds', { header, currency: cNum })
    for (const response of [positions, fundsResponse]) {
      const h = response.header
      if (!h || uint64(h.accID) !== id || h.trdEnv !== env || h.trdMarket !== market) fail('Futu response account/environment/market does not match selection')
    }
    const funds = fundsResponse.funds
    if (!funds || ftCurrency(funds.currency) !== c) fail('Futu funds currency does not match source.currency')
    for (const key of ['debtCash', 'shortMv']) if (funds[key] != null && numeric(funds[key], key, true) !== 0) fail('Futu margin liabilities or short positions are unsupported')
    const warnings = ['QUOTE_TIME_UNAVAILABLE: Futu position prices have no quote timestamp'], holdings = []
    for (const p of array(positions.positionList, 'Futu positionList')) {
      if (p.positionSide !== 0) fail('Futu short/unknown position side is unsupported')
      const qty = numeric(p.qty, 'Futu position quantity')
      if (qty === 0) continue
      const m = FT_MARKETS[p.trdMarket ?? p.secMarket]
      if (!m) fail('Futu position market is unknown or unsupported')
      // Invalid/missing costs cannot be represented by the ledger's nonnullable avgCost.
      if (p.costPriceValid === false || p.costPriceValid === 0 || p.averageCostPriceValid === false || !Object.hasOwn(p, 'costPrice')) fail('Futu position cost is unknown/invalid; refusing to substitute zero')
      const symbol = text(p.code, 'Futu position code')
      if (!/^[A-Z0-9.\-]+$/i.test(symbol) || /\d{6}[CP]\d/i.test(symbol)) fail('Futu derivative position is unsupported')
      holdings.push({ symbol, name: typeof p.name === 'string' && p.name.trim() ? p.name : symbol, market: m, assetClass: 'stock', currency: ftCurrency(p.currency), qty, avgCost: numeric(p.costPrice, 'Futu position cost'), manualPrice: p.price == null ? null : numeric(p.price, 'Futu position price') })
    }
    let complete = true
    if (Array.isArray(funds.cashInfoList) && funds.cashInfoList.length) {
      for (const info of funds.cashInfoList) holdings.push(cash(ftCurrency(info.currency), info.cash))
    } else { complete = false; warnings.push('CASH_UNAVAILABLE: native-currency cash details unavailable; converted funds.cash is not a native balance; existing cash must not be pruned') }
    const out = snapshot(holdings, warnings, complete, deps)
    out.sourceTotals = { totalAsset: numeric(funds.totalAssets, 'Futu totalAssets') }
    return out
  })
}
export async function withLongbridge(secrets, signal, deps, fn) {
  const d = deadline(signal, deps)
  let context, ended = false
  const release = async (c) => { if (c?.close) await c.close(); else if (c?.dispose) await c.dispose() }
  try {
    const appKey = text(secrets?.appKey, 'Longbridge appKey'), appSecret = text(secrets?.appSecret, 'Longbridge appSecret'), token = text(secrets?.accessToken, 'Longbridge accessToken')
    await d.run(async () => {
      let created
      if (deps.createLongbridgeContext) created = await deps.createLongbridgeContext({ appKey, appSecret, accessToken: token })
      else { const sdk = await load('longport', deps), api = sdk.Config ? sdk : sdk.default; if (ended) return; created = await api.TradeContext.new(api.Config.fromApikey(appKey, appSecret, token)) }
      if (ended) await release(created)
      else context = created
    })
    const call = async (name, ...args) => {
      try { return await d.run(() => context[name](...args)) }
      catch (error) { if (/timed out|abort/i.test(error?.message ?? '')) throw error; let detail = String(error?.message ?? error); for (const s of [appKey, appSecret, token]) detail = detail.split(s).join('[hidden]'); const code = /code=\d+[^)]*/.exec(detail)?.[0]; fail(`Longbridge ${name} failed; verify API access and account region${code ? ` (${code.slice(0, 160)})` : ''}`) }
    }
    return await fn(call)
  } finally {
    // 4.3.7 has no close/dispose method; no push subscriptions are created.
    ended = true
    try { await release(context) } finally { d.dispose() }
  }
}
function lbChannels(response, field) {
  const result = array(response?.channels, `${field}.channels`)
  const ids = new Set()
  for (const channel of result) { const id = text(channel.accountChannel, 'accountChannel'); if (ids.has(id)) fail(`Duplicate ${field} channel`); ids.add(id); array(channel.positions, `${field}.positions`) }
  return result
}
export async function listLongbridgeAccounts(config, secrets, signal, deps = {}) {
  return withLongbridge(secrets, signal, deps, async (call) => {
    const stocks = lbChannels(await call('stockPositions'), 'stocks'), funds = lbChannels(await call('fundPositions'), 'funds')
    const ids = [...new Set([...stocks, ...funds].map((c) => c.accountChannel))]
    return { accounts: ids.map((id) => ({ id, name: id, accountChannel: id })), warnings: ids.length > 1 ? ['AMBIGUOUS_CASH_SCOPE: accountBalance has no channel identifier; snapshot requires a single channel'] : [] }
  })
}
export async function fetchLongbridgeSnapshot(source, secrets, signal, deps = {}) {
  const id = text(source?.brokerAccountId, 'source.brokerAccountId (accountChannel)')
  return withLongbridge(secrets, signal, deps, async (call) => {
    const stocks = lbChannels(await call('stockPositions'), 'stocks'), funds = lbChannels(await call('fundPositions'), 'funds')
    const ids = new Set([...stocks, ...funds].map((c) => c.accountChannel))
    if (!ids.has(id)) fail('Selected Longbridge accountChannel was not returned by positions APIs')
    if (ids.size !== 1) fail('Ambiguous Longbridge channels: native cash balances cannot be attributed to the selected accountChannel')
    const holdings = [], warnings = ['QUOTE_DATE_UNAVAILABLE: provider snapshot contains no common quote date']
    for (const p of stocks.find((c) => c.accountChannel === id)?.positions ?? []) {
      const qty = numeric(p.quantity, 'Longbridge stock quantity (shorts unsupported)')
      if (qty === 0) continue
      const market = ({ 1: 'US', 2: 'HK', 3: 'CN', 4: 'SG' })[p.market] ?? (['HK', 'US', 'CN', 'SG'].includes(p.market) ? p.market : null)
      if (!market) fail('Longbridge stock market is unknown or unsupported')
      const symbol = text(p.symbol, 'Longbridge symbol')
      if (/\d{6}[CP]\d/i.test(symbol)) fail('Longbridge option positions are unsupported')
      holdings.push({ symbol, name: typeof p.symbolName === 'string' && p.symbolName.trim() ? p.symbolName : symbol, market, assetClass: 'stock', currency: currency(p.currency), qty, avgCost: numeric(p.costPrice, 'Longbridge stock cost'), manualPrice: null })
    }
    if (holdings.length) warnings.push('PRICE_UNAVAILABLE: stockPositions provides no quote; valuation may use a cost estimate until a quote is supplied')
    for (const p of funds.find((c) => c.accountChannel === id)?.positions ?? []) {
      const qty = numeric(p.holdingUnits, 'Longbridge fund holdingUnits')
      if (qty === 0) continue
      const symbol = text(p.symbol, 'Longbridge fund symbol')
      holdings.push({ symbol, name: typeof p.symbolName === 'string' && p.symbolName.trim() ? p.symbolName : symbol, market: 'FUND', assetClass: 'fund', currency: currency(p.currency), qty, avgCost: numeric(p.costNetAssetValue, 'Longbridge fund cost'), manualPrice: p.currentNetAssetValue == null ? null : numeric(p.currentNetAssetValue, 'Longbridge fund NAV') })
    }
    const balances = array(await call('accountBalance'), 'Longbridge accountBalance'), nativeCash = new Map()
    let complete = balances.length > 0
    for (const b of balances) {
      currency(b.currency, 'balance currency')
      if (b.marginCall != null && numeric(b.marginCall, 'marginCall', true) !== 0) fail('Longbridge margin liabilities are unsupported')
      numeric(b.totalCash, 'totalCash (negative cash/margin unsupported)')
      const infos = array(b.cashInfos, 'balance.cashInfos')
      if (!infos.length) complete = false
      for (const info of infos) {
        const c = currency(info.currency), available = numeric(info.availableCash, 'availableCash (margin liabilities unsupported)'), frozen = numeric(info.frozenCash, 'frozenCash'), settling = numeric(info.settlingCash, 'settlingCash', true)
        // withdrawCash is an availability subset, not an additional cash asset.
        const qty = numeric(available + frozen + settling, 'native cash (margin liabilities unsupported)')
        if (nativeCash.has(c) && nativeCash.get(c) !== qty) fail(`Conflicting native cash balances for ${c}`)
        nativeCash.set(c, qty)
      }
    }
    for (const [c, qty] of nativeCash) holdings.push(cash(c, qty))
    if (!complete) warnings.push('CASH_UNAVAILABLE: native cash details missing; existing holdings must not be pruned')
    // totalCash/netAssets are converted reporting totals; never add to components.
    return snapshot(holdings, warnings, complete, deps)
  })
}
