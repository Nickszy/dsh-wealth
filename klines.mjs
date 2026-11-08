// 历史日线行情：东方财富公开接口（沪深股票/ETF、港股）与场外基金净值。
// 无密钥、只读、单次批量按标的请求；磁盘缓存避免重复拉取。
// 解析失败或网络失败只产生警告，绝不返回编造的价格。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { normalizeSymbol } from './symbols.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'
const FUND_URL = 'https://api.fund.eastmoney.com/f10/lsjz'
const MAX_FUND_PAGES = 25

const upper = (v) => String(v || '').trim().toUpperCase()
const lower = (v) => String(v || '').trim().toLowerCase()

/**
 * 行情标的映射：返回 { key, kind, id } 或 null（无公开日线的资产类别）。
 * key 同时用作缓存键和去重键。
 */
export function klineTarget(instrument = {}) {
  // 统一代码：2549.HK / HK.02549 / 02549 都查到同一条日线。
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const market = normalized.market, symbol = normalized.symbol, assetClass = lower(instrument.assetClass)
  if (!symbol || !['stock', 'etf', 'fund', 'bond'].includes(assetClass)) return null
  if (assetClass === 'fund' && /^\d{6}$/.test(symbol) && (market === 'FUND' || market === 'CN')) return { key: 'fund:' + symbol, kind: 'fund', id: symbol }
  if (!['stock', 'etf', 'bond'].includes(assetClass)) return null
  if (market === 'CN' && /^\d{6}$/.test(symbol)) return { key: 'em:' + (/^[569]/.test(symbol) ? '1.' : '0.') + symbol, kind: 'eastmoney', id: (/^[569]/.test(symbol) ? '1.' : '0.') + symbol }
  if (market === 'HK' && /^\d{3,5}$/.test(symbol)) return { key: 'em:116.' + symbol.padStart(5, '0'), kind: 'eastmoney', id: '116.' + symbol.padStart(5, '0') }
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

/** 拉取单个标的的完整日线（不缓存）。from 形如 2023-01-01。 */
export async function fetchKline(target, { from = '2015-01-01', fetch: fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  if (!target) return []
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

/**
 * 为一批标的取得日线：命中缓存（当日已拉取且覆盖起始日）直接复用，否则拉取并写回。
 * 返回 { prices: Map<targetKey, [[date, price],...]>, warnings, fetched, cached }。
 */
export async function loadDailyCloses(instruments, { from = '2015-01-01', fetch: fetchImpl = globalThis.fetch, cachePath, now = Date.now, refresh = false } = {}) {
  const today = new Date(now()).toISOString().slice(0, 10)
  const cache = cachePath ? readKlineCache(cachePath) : { version: 1, entries: {} }
  const targets = new Map()
  for (const instrument of instruments || []) {
    const target = klineTarget(instrument)
    if (target && !targets.has(target.key)) targets.set(target.key, target)
  }
  const warnings = []
  let fetched = 0, cached = 0
  await mapLimit([...targets.values()], 4, async (target) => {
    const entry = cache.entries[target.key]
    const covered = entry && Array.isArray(entry.closes) && entry.closes.length
      && String(entry.fetchedOn || '') === today && String(entry.from || '9999') <= from
    if (covered && !refresh) { cached++; return }
    let closes = null, lastError = null
    for (let attempt = 0; attempt < 2 && closes === null; attempt++) {
      try {
        closes = await fetchKline(target, { from, fetch: fetchImpl, timeoutMs: 20000 })
      } catch (error) {
        lastError = error
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
    // 合成标的只凭代码推断类别：股票接口为空时，6 位 CN 代码再试一次场外基金净值。
    if (closes && closes.length === 0 && target.kind === 'eastmoney') {
      const code = String(target.id).replace(/^[01]\./, '')
      if (/^\d{6}$/.test(code)) {
        try { closes = await fetchKline({ key: 'fund:' + code, kind: 'fund', id: code }, { from, fetch: fetchImpl, timeoutMs: 20000 }) } catch { /* keep empty */ }
      }
    }
    if (closes === null) {
      if (entry?.closes?.length) { cached++; warnings.push('KLINE_STALE:' + target.key) }
      else warnings.push('KLINE_FAILED:' + target.key + ':' + String(lastError?.message || lastError).slice(0, 60))
      return
    }
    if (!closes.length) { warnings.push('KLINE_EMPTY:' + target.key); return }
    // 合并旧缓存，保留更长历史。
    const merged = new Map((entry?.closes || []).map(([d, p]) => [d, p]))
    for (const [d, p] of closes) merged.set(d, p)
    // from 记录「曾被请求过的起始日」，用于判断缓存覆盖范围；不能记数据首日（可能晚于请求日）。
    const coveredFrom = entry?.from && entry.from < from ? entry.from : from
    cache.entries[target.key] = { fetchedOn: today, from: coveredFrom, closes: [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0])) }
    fetched++
  })
  if (cachePath && fetched) writeKlineCache(cachePath, cache)
  const prices = new Map()
  for (const target of targets.values()) if (cache.entries[target.key]?.closes) prices.set(target.key, cache.entries[target.key].closes)
  return { prices, warnings, fetched, cached }
}
