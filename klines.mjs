// 历史日线行情：东方财富公开接口（沪深股票/ETF、港股）与场外基金净值。
// 配置了同花顺金融数据 API Key 时优先用它（沪深股票 / ETF / 场外基金），失败再回落东财。
// 无密钥也能工作；磁盘缓存保留全部历史，之后只增量补齐尾部数据。
// 解析失败或网络失败只产生警告，绝不返回编造的价格。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { normalizeSymbol } from './symbols.mjs'
import { fetchThsSeries } from './ths-data.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'
const FUND_URL = 'https://api.fund.eastmoney.com/f10/lsjz'
const MAX_FUND_PAGES = 25

const upper = (v) => String(v || '').trim().toUpperCase()
const lower = (v) => String(v || '').trim().toLowerCase()

/**
 * 行情标的映射：返回 { key, kind, id, symbol, market, assetClass } 或 null（无公开日线的资产类别）。
 * key 同时用作缓存键和去重键；symbol/market/assetClass 供可选数据源（同花顺）判断覆盖范围。
 */
export function klineTarget(instrument = {}) {
  // 统一代码：2549.HK / HK.02549 / 02549 都查到同一条日线。
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const market = normalized.market, symbol = normalized.symbol, assetClass = lower(instrument.assetClass)
  if (!symbol || !['stock', 'etf', 'fund', 'bond'].includes(assetClass)) return null
  const meta = { symbol, market, assetClass }
  if (assetClass === 'fund' && /^\d{6}$/.test(symbol) && (market === 'FUND' || market === 'CN')) return { key: 'fund:' + symbol, kind: 'fund', id: symbol, ...meta }
  if (!['stock', 'etf', 'bond'].includes(assetClass)) return null
  if (market === 'CN' && /^\d{6}$/.test(symbol)) return { key: 'em:' + (/^[569]/.test(symbol) ? '1.' : '0.') + symbol, kind: 'eastmoney', id: (/^[569]/.test(symbol) ? '1.' : '0.') + symbol, ...meta }
  if (market === 'HK' && /^\d{3,5}$/.test(symbol)) return { key: 'em:116.' + symbol.padStart(5, '0'), kind: 'eastmoney', id: '116.' + symbol.padStart(5, '0'), ...meta }
  return null
}

const day = (value) => {
  const text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}
const price = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 东财 K 线响应 → 按日期升序的 [date, close] 列表。 */
export function parseEastmoneyKline(json) {
  const rows = json?.data?.klines
  if (!Array.isArray(rows)) return []
  const out = []
  for (const line of rows) {
    const [date, close] = String(line || '').split(',')
    const d = day(date), p = price(close)
    if (d && p !== null) out.push([d, p])
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}

/** 场外基金净值响应 → 按日期升序的 [date, nav] 列表。 */
export function parseFundNav(json) {
  const rows = json?.Data?.LSJZList
  if (!Array.isArray(rows)) return []
  const out = []
  for (const row of rows) {
    const d = day(row?.FSRQ), p = price(row?.DWJZ)
    if (d && p !== null) out.push([d, p])
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}

async function getJson(url, headers, fetchImpl, timeoutMs) {
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json, text/plain, */*', 'user-agent': UA, ...headers },
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  return response.json()
}

/** 拉取单个标的的日线（不缓存）。from / to 形如 2023-01-01。 */
export async function fetchKline(target, { from = '2015-01-01', to, fetch: fetchImpl = globalThis.fetch, timeoutMs = 20000, thsToken } = {}) {
  if (!target) return []
  // 同花顺金融数据是本机密钥来源，覆盖不到或出错时静默回落东财。
  if (thsToken) {
    try {
      const rows = await fetchThsSeries(target, { from, to, token: thsToken, fetch: fetchImpl, timeoutMs })
      if (rows.length) return rows
    } catch { /* fall through to the keyless source */ }
  }
  if (target.kind === 'eastmoney') {
    const beg = String(from).replaceAll('-', '')
    const url = `${KLINE_URL}?secid=${target.id}&fields1=f1,f2,f3,f4&fields2=f51,f53&klt=101&fqt=1&beg=${beg}&end=20500101`
    return parseEastmoneyKline(await getJson(url, { referer: 'https://quote.eastmoney.com/' }, fetchImpl, timeoutMs))
  }
  if (target.kind === 'fund') {
    const closes = []
    for (let page = 1; page <= MAX_FUND_PAGES; page++) {
      const url = `${FUND_URL}?fundCode=${target.id}&pageIndex=${page}&pageSize=200&startDate=&endDate=`
      const part = parseFundNav(await getJson(url, { referer: 'https://fundf10.eastmoney.com/' }, fetchImpl, timeoutMs))
      if (!part.length) break
      closes.push(...part)
      if (part[0][0] <= from) break
    }
    const unique = new Map(closes.map(([d, p]) => [d, p]))
    return [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }
  return []
}

// 并发上限：东方财富对突发请求敏感，一次只放 4 个。
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      out[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return out
}

export function readKlineCache(path) {
  try { if (!existsSync(path)) return { version: 1, entries: {} }; const data = JSON.parse(readFileSync(path, 'utf8')); return { version: 1, entries: data?.entries && typeof data.entries === 'object' ? data.entries : {} } } catch { return { version: 1, entries: {} } }
}
export function writeKlineCache(path, cache) {
  try { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(cache), 'utf8'); return true } catch { return false }
}

const shiftDay = (date, delta) => {
  const d = new Date(String(date) + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return date
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/**
 * 为一批标的取得日线。
 * 缓存保留全部历史：当天已同步过直接复用；跨天只补最后一条之后的尾部（回溯 5 天以吸收净值/复权修正），
 * 只有首次拉取或请求更早起始日时才整段重拉。
 * 返回 { prices: Map<targetKey, [[date, price],...]>, warnings, fetched, cached }。
 */
export async function loadDailyCloses(instruments, { from = '2015-01-01', fetch: fetchImpl = globalThis.fetch, cachePath, now = Date.now, refresh = false, dataToken } = {}) {
  const today = new Date(now()).toISOString().slice(0, 10)
  const cache = cachePath ? readKlineCache(cachePath) : { version: 1, entries: {} }
  const targets = new Map()
  for (const instrument of instruments || []) {
    const target = klineTarget(instrument)
    if (target && !targets.has(target.key)) targets.set(target.key, target)
  }
  const warnings = []
  let fetched = 0, cached = 0, dirty = false
  await mapLimit([...targets.values()], 4, async (target) => {
    const entry = cache.entries[target.key]
    const closes0 = Array.isArray(entry?.closes) ? entry.closes : []
    const hasHistory = closes0.length > 0 && String(entry.from || '9999') <= from
    const syncedToday = hasHistory && String(entry.updatedOn || entry.fetchedOn || '') === today
    if (syncedToday && !refresh) { cached++; return }
    const lastDate = closes0.reduce((max, [date]) => (date > max ? date : max), '')
    // 增量：只拉最后缓存日之前 5 天到今天；首次或请求更长历史时才从 from 开始。
    const tailFrom = hasHistory && !refresh && lastDate ? (shiftDay(lastDate, -5) > from ? shiftDay(lastDate, -5) : from) : from
    let closes = null, lastError = null
    for (let attempt = 0; attempt < 2 && closes === null; attempt++) {
      try {
        closes = await fetchKline(target, { from: tailFrom, to: today, fetch: fetchImpl, timeoutMs: 20000, thsToken: dataToken })
      } catch (error) {
        lastError = error
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
    // 合成标的只凭代码推断类别：股票接口为空时，6 位 CN 代码再试一次场外基金净值。
    if (closes && closes.length === 0 && target.kind === 'eastmoney') {
      const code = String(target.id).replace(/^[01]\./, '')
      if (/^\d{6}$/.test(code)) {
        const fundTarget = { key: 'fund:' + code, kind: 'fund', id: code, symbol: code, market: 'CN', assetClass: 'fund' }
        try { closes = await fetchKline(fundTarget, { from: tailFrom, to: today, fetch: fetchImpl, timeoutMs: 20000, thsToken: dataToken }) } catch { /* keep empty */ }
      }
    }
    if (closes === null) {
      if (entry?.closes?.length) { cached++; warnings.push('KLINE_STALE:' + target.key) }
      else warnings.push('KLINE_FAILED:' + target.key + ':' + String(lastError?.message || lastError).slice(0, 60))
      return
    }
    if (!closes.length) {
      // 尾部没有新数据（周末 / 停牌 / 新品未成立）：保留的历史照用，并记下今天已尝试过。
      if (hasHistory) { cache.entries[target.key] = { ...entry, updatedOn: today }; cached++; dirty = true }
      else warnings.push('KLINE_EMPTY:' + target.key)
      return
    }
    // 合并旧缓存，保留更长历史。
    const merged = new Map(closes0.map(([d, p]) => [d, p]))
    for (const [d, p] of closes) merged.set(d, p)
    // from 记录「曾被请求过的起始日」，用于判断缓存覆盖范围；不能记数据首日（可能晚于请求日）。
    const coveredFrom = entry?.from && entry.from < from ? entry.from : from
    cache.entries[target.key] = { fetchedOn: today, updatedOn: today, from: coveredFrom, closes: [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0])) }
    fetched++; dirty = true
  })
  if (cachePath && dirty) writeKlineCache(cachePath, cache)
  const prices = new Map()
  for (const target of targets.values()) if (cache.entries[target.key]?.closes) prices.set(target.key, cache.entries[target.key].closes)
  return { prices, warnings, fetched, cached }
}
