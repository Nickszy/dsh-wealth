// Market quotes via Tencent's public batch endpoint. Read-only, one GET per refresh,
// no keys, no redirects; failures degrade to per-symbol warnings, never to fake prices.
// GBK text lines: v_sz002432="51~九安医疗~002432~57.65~..."; field 3 is the last price,
// field 30 is the stamp, field 32 is today's change in percent (10 means +10%).
import { normalizeSymbol } from './symbols.mjs'
const QUOTES_URL = 'https://qt.gtimg.cn/q='
const MARKET_CURRENCY = { sh: 'CNY', sz: 'CNY', hk: 'HKD', us: 'USD' }
const number = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
const signed = (value) => {
  if (value == null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
/**
 * Field 30 is the exchange stamp. Live payloads use YYYYMMDDHHmmss (CN),
 * YYYY/MM/DD HH:mm:ss (HK) or YYYY-MM-DD HH:mm:ss (US); field 31/32 are then
 * the change and the percent. The older YYYYMMDD plus a clock in field 31
 * has no change columns.
 */
function quoteStamp(fields) {
  const stamp = String(fields[30] || '').trim()
  const next = String(fields[31] || '').trim()
  const clock = /^(\d{2}):(\d{2}):(\d{2})$/.exec(next)
  let quotedAt = null
  let match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(stamp)
  if (match) quotedAt = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
  else {
    match = /^(\d{4})[/-](\d{2})[/-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/.exec(stamp)
    if (match) quotedAt = `${match[1]}-${match[2]}-${match[3]}` + (match[4] ? `T${match[4]}:${match[5]}:${match[6]}` : '')
    else {
      match = /^(\d{4})(\d{2})(\d{2})$/.exec(stamp)
      if (match) quotedAt = `${match[1]}-${match[2]}-${match[3]}` + (clock ? `T${clock[1]}:${clock[2]}:${clock[3]}` : '')
    }
  }
  return { quotedAt, changePct: clock ? null : signed(fields[32]) }
}
/** True when manualPrice is just the broker snapshot copied into the hand-price slot. */
export function brokerCopiedManual(holding = {}) {
  const manual = holding.manualPrice
  const source = holding.sourcePrice
  return manual != null && source != null && Number(manual) === Number(source)
}
/** 手填价 > 行情价 > 券商快照价 > 平均成本。与券商价相同的手填价不是用户覆盖。 */
export function valuationPrice(holding = {}) {
  const hand = holding.manualPrice != null && !brokerCopiedManual(holding) ? holding.manualPrice : null
  return hand ?? holding.quotePrice ?? holding.sourcePrice ?? holding.avgCost
}
/**
 * Today's move in the holding currency. changePct is (price-prev)/prev*100,
 * so the move is qty * quotePrice * pct/(100+pct). Null when the quote has no change.
 */
export function dayChange(holding = {}) {
  const pct = holding.quoteChangePct
  const price = holding.quotePrice
  const qty = holding.qty
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= -100) return null
  if (typeof price !== 'number' || !(price > 0)) return null
  if (typeof qty !== 'number' || !Number.isFinite(qty)) return null
  return qty * price * (pct / (100 + pct))
}
/** Exchange prefix for an instrument, or null when no public quote is expected. */
export function quoteKey(instrument = {}) {
  // 统一代码：各来源写法（2549.HK / HK.02549）都映射到同一个行情键。
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const market = normalized.market
  const symbol = normalized.symbol
  const assetClass = String(instrument.assetClass || '').toLowerCase()
  if (!symbol || !['stock', 'etf'].includes(assetClass)) return null
  if (market === 'CN') {
    const prefix = /^(6|9|5)/.test(symbol) ? 'sh' : /^(0|1|2|3)/.test(symbol) ? 'sz' : null
    return prefix ? prefix + symbol : null
  }
  if (market === 'HK') return /^\d{3,5}$/.test(symbol) ? 'hk' + symbol.padStart(5, '0') : null
  if (market === 'US') {
    const us = symbol.toUpperCase()
    return /^[A-Z][A-Z.]{0,9}$/.test(us) ? 'us' + us : null
  }
  return null
}
/** 场外基金 6 位代码。货币基金经常没有单位净值，调用方会当成无行情而保留原值。 */
export function fundQuoteKey(instrument = {}) {
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const assetClass = String(instrument.assetClass || '').toLowerCase()
  if (assetClass !== 'fund' || !/^\d{6}$/.test(normalized.symbol)) return null
  return 'jj' + normalized.symbol
}
/**
 * 基金行与股票行字段不同：v_jj012709="代码~名称~估~估~~单位净值~累计净值~涨跌幅~日期".
 * 单位净值为 0（常见于货币基金）不当成价格。
 */
export function parseTencentFundQuotes(text) {
  const quotes = new Map(), warnings = []
  for (const line of String(text || '').split(';')) {
    const match = /^\s*v_jj(\d{6})="([^"]*)"\s*$/i.exec(line)
    if (!match) continue
    const [, code, payload] = match
    const fields = payload.split('~')
    const price = number(fields[5])
    if (price === null) { warnings.push(`QUOTE_UNAVAILABLE:jj${code}`); continue }
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fields[8] || '').trim())
    quotes.set('jj' + code, {
      symbol: code, market: 'jj', name: String(fields[1] || '').trim(), currency: 'CNY',
      price, quotedAt: date ? `${date[1]}-${date[2]}-${date[3]}T00:00:00` : null,
      changePct: signed(fields[7]),
    })
  }
  return { quotes, warnings }
}
/** Parse a qt.gtimg.cn payload; unknown/failed lines are skipped and reported. */
export function parseTencentQuotes(text) {
  const quotes = new Map(), warnings = []
  let body = String(text || '')
  for (const line of body.split(';')) {
    const match = /^\s*v_(sh|sz|hk|us)([A-Za-z0-9.]+)="([^"]*)"\s*$/i.exec(line)
    if (!match) continue
    const [, prefix, code, payload] = match
    const fields = payload.split('~')
    const price = number(fields[3])
    const name = String(fields[1] || '').trim()
    if (price === null) { warnings.push(`QUOTE_UNAVAILABLE:${prefix}${code}`); continue }
    const { quotedAt, changePct } = quoteStamp(fields)
    quotes.set(`${prefix}${code}`.toLowerCase(), {
      symbol: code, market: prefix.toLowerCase(), name, currency: MARKET_CURRENCY[prefix.toLowerCase()],
      price, quotedAt, changePct,
    })
  }
  return { quotes, warnings }
}
/**
 * Fetch quotes for the given quote keys. Returns { quotes, warnings }; network or
 * transport failures surface as warnings — the caller keeps existing valuations.
 */
export async function fetchQuotes(keys, { fetch = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const list = [...new Set((keys || []).map(k => String(k || '').toLowerCase()).filter(k => /^(sh|sz|hk|us)[A-Za-z0-9.]+$/.test(k)))]
  const quotes = new Map(), warnings = []
  if (!list.length) return { quotes, warnings }
  let response
  try {
    response = await fetch(QUOTES_URL + list.join(','), {
      method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'text/plain,*/*' },
    })
  } catch (error) {
    warnings.push('QUOTES_NETWORK:' + (error?.name === 'TimeoutError' ? 'timeout' : 'unavailable'))
    return { quotes, warnings }
  }
  if (!response.ok) { warnings.push('QUOTES_HTTP:' + response.status); return { quotes, warnings } }
  const bytes = await response.arrayBuffer()
  let text
  try { text = new TextDecoder('gbk').decode(bytes) } catch { text = new TextDecoder('latin1').decode(bytes) }
  const parsed = parseTencentQuotes(text)
  warnings.push(...parsed.warnings)
  for (const [key, quote] of parsed.quotes) quotes.set(key, quote)
  for (const key of list) if (!quotes.has(key)) warnings.push('QUOTE_MISSING:' + key)
  return { quotes, warnings }
}
/** 场外基金净值，与股票行情同一个批量接口，字段布局不同。 */
export async function fetchFundQuotes(keys, { fetch = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const list = [...new Set((keys || []).map(k => String(k || '').toLowerCase()).filter(k => /^jj\d{6}$/.test(k)))]
  const quotes = new Map(), warnings = []
  if (!list.length) return { quotes, warnings }
  let response
  try {
    response = await fetch(QUOTES_URL + list.join(','), {
      method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'text/plain,*/*' },
    })
  } catch (error) {
    warnings.push('QUOTES_NETWORK:' + (error?.name === 'TimeoutError' ? 'timeout' : 'unavailable'))
    return { quotes, warnings }
  }
  if (!response.ok) { warnings.push('QUOTES_HTTP:' + response.status); return { quotes, warnings } }
  const bytes = await response.arrayBuffer()
  let text
  try { text = new TextDecoder('gbk').decode(bytes) } catch { text = new TextDecoder('latin1').decode(bytes) }
  const parsed = parseTencentFundQuotes(text)
  warnings.push(...parsed.warnings)
  for (const [key, quote] of parsed.quotes) quotes.set(key, quote)
  for (const key of list) if (!quotes.has(key)) warnings.push('QUOTE_MISSING:' + key)
  return { quotes, warnings }
}
const nearPrice = (left, right) => Number.isFinite(left) && Number.isFinite(right) && right !== 0 && Math.abs(left - right) / Math.abs(right) <= 0.05
const longDecimal = (value) => (String(value).split('.')[1] || '').replace(/0+$/, '').length >= 5
/**
 * Refresh quotePrice for all holdings whose instrument has a public quote.
 * A real hand price still wins; a broker snapshot copied into manualPrice does not.
 * Pure given a ledger clone; the caller persists and returns counts/warnings.
 */
export function refreshQuotes(db, { fetch, timeoutMs } = {}) {
  const insMap = new Map((db.instruments || []).map(i => [i.id, i]))
  const byKey = new Map()
  for (const holding of db.holdings || []) {
    const instrument = insMap.get(holding.instrumentId) || {}
    const key = quoteKey(instrument) || fundQuoteKey(instrument)
    if (!key) continue
    // quoteKey keeps US tickers uppercase; the fetch map is lowercase.
    const id = key.toLowerCase()
    if (!byKey.has(id)) byKey.set(id, [])
    byKey.get(id).push(holding)
  }
  const keys = [...byKey.keys()]
  return Promise.all([fetchQuotes(keys, { fetch, timeoutMs }), fetchFundQuotes(keys, { fetch, timeoutMs })]).then(([stocks, funds]) => {
    const quotes = new Map([...stocks.quotes, ...funds.quotes])
    const warnings = [...stocks.warnings, ...funds.warnings]
    let updated = 0
    const applied = []
    for (const [key, quote] of quotes) {
      for (const holding of byKey.get(key) || []) {
        const previous = holding.quotePrice
        holding.quotePrice = quote.price
        holding.quoteAt = quote.quotedAt ? new Date(quote.quotedAt + 'Z').toISOString().replace(/\.\d{3}Z$/, 'Z') : null
        holding.quoteSource = quote.market === 'jj' ? 'tencent-fund' : 'tencent'
        holding.quoteChangePct = quote.changePct
        // 同步曾经把券商价写进 manualPrice。基金净值还常带着长小数，或与快照相差几个交易日。
        const manual = Number(holding.manualPrice)
        const fundSnapshot = quote.market === 'jj' && (longDecimal(holding.manualPrice) || nearPrice(manual, Number(holding.sourcePrice)) || nearPrice(manual, quote.price))
        if (brokerCopiedManual(holding) || fundSnapshot) holding.manualPrice = null
        updated++
        applied.push({ holdingId: holding.id, symbol: quote.symbol, market: quote.market, name: quote.name, currency: quote.currency, price: quote.price, changePct: quote.changePct, changed: previous !== quote.price })
      }
    }
    // 附着汇率快照，便于核对当日折算来源。
    return { updated, applied, warnings, fx: { ...(db.fx || {}) } }
  })
}
