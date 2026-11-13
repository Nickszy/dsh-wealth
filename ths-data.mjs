// 同花顺金融数据 API（fuyao.aicubes.cn）——可选的历史行情 / 基金净值来源。
// 仅在用户在「设置」里配置 API Key 后启用；任何失败都由调用方回落到东方财富公开接口。
// 接口契约见 https://fuyao.aicubes.cn/llms-full.txt：鉴权头 X-api-key，响应信封 { code, message, data }。

export const THS_BASE = 'https://fuyao.aicubes.cn'
export const THS_ADMIN_URL = THS_BASE + '/admin'
const A_SHARE_PRICES = '/api/a-share/prices/historical'
const FUND_MARKET = '/api/fund/market/historical'
const FUND_NAV = '/api/fund/performance/nav'
const TICKER_SEARCH = '/api/meta/tickers/search'

const DAY_MS = 86_400_000
// 接口上限（10 年 / 5 年）留一天余量，避免窗口被判越界。
const TEN_YEARS_MS = 3653 * DAY_MS
const FIVE_YEARS_MS = 1826 * DAY_MS
const MAX_TOKEN_LENGTH = 512

// 标的在该来源下没有数据：按空结果处理，而不是连接错误。
const NO_DATA_CODES = new Set([3001, 3002, 3004])
const ERROR_TEXT = {
  2001: '同花顺数据 API Key 无效或已过期，请在设置中重新填写',
  2003: '同花顺数据 API Key 无权访问该数据，请到 API Key 管理页开通',
  1001: '同花顺数据接口缺少必填参数',
  1002: '同花顺数据接口参数格式错误',
  1003: '同花顺数据接口参数越界',
  4001: '同花顺数据接口调用过于频繁，请稍后再试',
}

export class ThsDataError extends Error {
  constructor(code, message) { super(message); this.name = 'ThsDataError'; this.code = code }
}

const price = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
// 接口时间戳是 Asia/Shanghai 零点，按 UTC 直接切日期会退一天。
const shanghaiDay = (ms) => {
  const n = Number(ms)
  return Number.isFinite(n) && n > 0 ? new Date(n + 8 * 3600_000).toISOString().slice(0, 10) : null
}
const shanghaiMs = (date) => {
  const text = String(date || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const n = Date.parse(text + 'T00:00:00+08:00')
  return Number.isFinite(n) ? n : null
}
const byDate = (rows) => {
  const unique = new Map(rows.map(([d, p]) => [d, p]))
  return [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/** K 线响应 data.item[] → 按日期升序的 [date, close] 列表。 */
export function parseThsBars(json) {
  const rows = json?.data?.item
  if (!Array.isArray(rows)) return []
  const out = []
  for (const row of rows) {
    const d = shanghaiDay(row?.date_ms), p = price(row?.close_price)
    if (d && p !== null) out.push([d, p])
  }
  return byDate(out)
}

/** 基金净值响应 data.item[] → 按日期升序的 [date, unit nav] 列表。 */
export function parseThsNav(json) {
  const rows = json?.data?.item
  if (!Array.isArray(rows)) return []
  const out = []
  for (const row of rows) {
    const d = shanghaiDay(row?.nav_date), p = price(row?.unit_nav)
    if (d && p !== null) out.push([d, p])
  }
  return byDate(out)
}

/**
 * 行情标的 → 同花顺完整 thscode。港股与其它市场没有覆盖，返回 null（走东方财富）。
 * ETF 与场外基金使用不同接口，因此保留 kind 区分。
 */
export function thsTarget(target) {
  if (!target) return null
  const symbol = String(target.symbol || '').trim()
  if (target.kind === 'fund' && /^\d{6}$/.test(symbol)) return { kind: 'fund', thscode: symbol + '.OF' }
  if (target.kind !== 'eastmoney' || target.market !== 'CN' || !/^\d{6}$/.test(symbol)) return null
  const suffix = /^[569]/.test(symbol) ? '.SH' : '.SZ'
  return { kind: target.assetClass === 'etf' ? 'etf' : 'stock', thscode: symbol + suffix }
}

/** 净值接口没有 start/end，只能用固定区间；按需要补的天数选最短够用的区间。 */
export function thsNavRange(from, to = Date.now()) {
  const a = typeof from === 'number' ? from : shanghaiMs(from) ?? Date.now()
  const b = typeof to === 'number' ? to : shanghaiMs(to) ?? Date.now()
  const gap = Math.max(0, Math.round((b - a) / DAY_MS))
  if (gap <= 7) return 'week'
  if (gap <= 31) return 'month'
  if (gap <= 92) return 'tmonth'
  if (gap <= 183) return 'hyear'
  if (gap <= 366) return 'year'
  if (gap <= 731) return 'twoyear'
  if (gap <= 1096) return 'tyear'
  return 'fyear'
}

async function thsRequest(path, params, { token, fetch: fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const url = new URL(path, THS_BASE)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  const response = await fetchImpl(url.toString(), {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json', 'x-api-key': token },
  })
  if (response.status === 429) throw new ThsDataError('rate-limit', ERROR_TEXT[4001])
  if (!response.ok) throw new ThsDataError('http-' + response.status, '同花顺数据接口暂时不可用（HTTP ' + response.status + '）')
  const json = await response.json().catch(() => null)
  if (!json || typeof json !== 'object') throw new ThsDataError('invalid-response', '同花顺数据接口返回格式异常')
  const code = Number(json.code)
  if (code === 0) return json
  if (NO_DATA_CODES.has(code)) return { code, data: null }
  throw new ThsDataError(code, ERROR_TEXT[code] || String(json.message || '同花顺数据接口返回错误 code=' + code))
}

// 行情快照：A股一个接口，场内基金（ETF/LOF）另一个；都没有港股 / 美股快照。
const A_SHARE_SNAPSHOT = '/api/a-share/prices/snapshot'
const FUND_SNAPSHOT = '/api/fund/market/snapshot'

/** 快照响应 → 与腾讯行情同形的 { symbol, market, price, quotedAt, changePct, source }。 */
function parseSnapshotQuotes(json) {
  const rows = json?.data?.item
  const quotes = new Map()
  if (!Array.isArray(rows)) return quotes
  const stamp = Number(json?.data?.timestamp)
  for (const row of rows) {
    const thscode = String(row?.thscode || '').trim().toUpperCase()
    const symbol = String(row?.ticker || '').trim()
    const price = Number(row?.last_price)
    if (!symbol || !Number.isFinite(price) || price <= 0) continue
    // 行情键要和腾讯那边同形（sh/sz 前缀 + 代码），快照按 thscode 后缀给交易所。
    const suffix = (thscode.split('.').pop() || '').toLowerCase()
    const key = (suffix === 'sh' || suffix === 'sz' ? suffix : 'sh') + symbol
    const pct = Number(row?.price_change_ratio_pct)
    // 与腾讯口径一致：存上海墙钟时间，调用方统一按 UTC 加 Z 落库。
    const quotedAt = Number.isFinite(stamp) && stamp > 0 ? new Date(stamp + 8 * 3600_000).toISOString().slice(0, 19) : null
    quotes.set(key.toLowerCase(), {
      symbol, market: 'cn', name: '', currency: 'CNY', price,
      quotedAt, changePct: Number.isFinite(pct) ? pct : null, source: 'ths',
    })
  }
  return quotes
}

/**
 * 同花顺行情快照（A股 + 场内基金）。targets: [{ key, kind: 'stock'|'etf', thscode }]，
 * key 是腾讯行情键（如 sh600519 / sz161725），thscode 如 600519.SH / 161725.SZ。
 * 失败只产警告、返回空表，由调用方回落腾讯；同花顺没有港股 / 美股快照。
 */
export async function fetchThsQuotes(targets, { token, fetch: fetchImpl, timeoutMs = 15000 } = {}) {
  const list = Array.isArray(targets) ? targets.filter((t) => t && t.key && t.thscode) : []
  const quotes = new Map(), warnings = []
  if (!token || !list.length) return { quotes, warnings }
  const options = { token, fetch: fetchImpl, timeoutMs }
  const groups = [
    { path: A_SHARE_SNAPSHOT, param: 'thscodes', items: list.filter((t) => t.kind === 'stock') },
    { path: FUND_SNAPSHOT, param: 'thscode', items: list.filter((t) => t.kind === 'etf') },
  ]
  await Promise.all(groups.map(async (g) => {
    if (!g.items.length) return
    try {
      const json = await thsRequest(g.path, { [g.param]: g.items.map((t) => t.thscode).join(',') }, options)
      for (const [key, quote] of parseSnapshotQuotes(json)) quotes.set(key, quote)
    } catch (error) {
      warnings.push('THS_QUOTES:' + (error?.code || error?.name || 'unavailable'))
    }
  }))
  return { quotes, warnings }
}

/**
 * 取单个标的的历史收盘 / 净值序列（不缓存）。失败抛错，由调用方决定是否回落。
 * 返回按日期升序的 [date, value] 列表；标的不在该来源覆盖范围内时返回 []。
 */
export async function fetchThsSeries(target, { from = '2015-01-01', to, token, fetch: fetchImpl, timeoutMs } = {}) {
  const sym = thsTarget(target)
  if (!sym || !token) return []
  const options = { token, fetch: fetchImpl, timeoutMs }
  const end = shanghaiMs(to) ?? Date.now()
  const start = shanghaiMs(from)
  if (start === null || start > end) return []

  if (sym.kind === 'fund') {
    const json = await thsRequest(FUND_NAV, { thscode: sym.thscode, range: thsNavRange(start, end), nav_type: 'unit' }, options)
    return parseThsNav(json).filter(([date]) => date >= from)
  }
  if (sym.kind === 'etf') {
    // 场内基金历史只有近 5 年，且口径为前复权。
    const json = await thsRequest(FUND_MARKET, { thscode: sym.thscode, interval: '1d', start: Math.max(start, end - FIVE_YEARS_MS), end }, options)
    return parseThsBars(json)
  }
  const rows = []
  for (let cursor = start; cursor <= end;) {
    const chunkEnd = Math.min(end, cursor + TEN_YEARS_MS)
    // forward(前复权) 与东方财富 fqt=1 口径一致，多个来源合并才不会在接缝处跳价。
    const json = await thsRequest(A_SHARE_PRICES, { thscode: sym.thscode, interval: '1d', start: cursor, end: chunkEnd, adjust: 'forward' }, options)
    rows.push(...parseThsBars(json))
    if (chunkEnd >= end) break
    cursor = chunkEnd + DAY_MS
  }
  return byDate(rows)
}

/** 校验 API Key：能读到标的基础数据即视为有效。失败抛 ThsDataError。 */
export async function checkThsToken(token, { fetch: fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const value = typeof token === 'string' ? token.trim() : ''
  if (!value) throw new ThsDataError('bad-token', '请填写同花顺数据 API Key')
  if (value.length > MAX_TOKEN_LENGTH || /\s/.test(value)) throw new ThsDataError('bad-token', 'API Key 格式无效（不应包含空格或换行）')
  await thsRequest(TICKER_SEARCH, { q: '600519.SH', limit: 1 }, { token: value, fetch: fetchImpl, timeoutMs })
  return true
}
