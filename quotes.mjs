// Market quotes via Tencent's public batch endpoint. Read-only, one GET per refresh,
// no keys, no redirects; failures degrade to per-symbol warnings, never to fake prices.
// GBK text lines: v_sh600000="1~浦发银行~600000~10.86~..."; field 3 is the last price.
const QUOTES_URL = 'https://qt.gtimg.cn/q='
const MARKET_CURRENCY = { sh: 'CNY', sz: 'CNY', hk: 'HKD', us: 'USD' }
const number = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
/** Exchange prefix for an instrument, or null when no public quote is expected. */
export function quoteKey(instrument = {}) {
  const market = String(instrument.market || '').toUpperCase()
  const symbol = String(instrument.symbol || '').trim()
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
    const stamp = String(fields[30] || '').trim(), time = String(fields[31] || '').trim()
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(stamp)
    const quotedAt = date ? `${date[1]}-${date[2]}-${date[3]}` + (time ? 'T' + time : '') : null
    quotes.set(`${prefix}${code}`.toLowerCase(), {
      symbol: code, market: prefix.toLowerCase(), name, currency: MARKET_CURRENCY[prefix.toLowerCase()],
      price, quotedAt,
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
/**
 * Refresh quotePrice for all holdings whose instrument has a public quote.
 * manualPrice (user override) always wins; quotePrice only fills the gap below it.
 * Pure given a ledger clone; the caller persists and returns counts/warnings.
 */
export function refreshQuotes(db, { fetch, timeoutMs } = {}) {
  const insMap = new Map((db.instruments || []).map(i => [i.id, i]))
  const byKey = new Map()
  for (const holding of db.holdings || []) {
    const instrument = insMap.get(holding.instrumentId)
    const key = quoteKey(instrument || {})
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(holding)
  }
  return fetchQuotes([...byKey.keys()], { fetch, timeoutMs }).then(({ quotes, warnings }) => {
    let updated = 0
    const applied = []
    for (const [key, quote] of quotes) {
      for (const holding of byKey.get(key) || []) {
        const previous = holding.quotePrice
        holding.quotePrice = quote.price
        holding.quoteAt = quote.quotedAt ? new Date(quote.quotedAt + 'Z').toISOString().replace(/\.\d{3}Z$/, 'Z') : null
        holding.quoteSource = 'tencent'
        updated++
        applied.push({ holdingId: holding.id, symbol: quote.symbol, market: quote.market, name: quote.name, currency: quote.currency, price: quote.price, changed: previous !== quote.price })
      }
    }
    // 附着汇率快照，便于核对当日折算来源。
    return { updated, applied, warnings, fx: { ...(db.fx || {}) } }
  })
}
