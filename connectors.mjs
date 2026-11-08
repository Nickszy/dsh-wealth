// Native adapters and pure snapshot validation. No credentials, network, or storage here.
import { normalizeSymbol } from './symbols.mjs'
const CLASSES = new Set(['stock', 'fund', 'etf', 'cash', 'bond', 'crypto', 'other'])
const SAFE_PARTIAL = new Set(['NAME_LOOKUP_UNAVAILABLE', 'UPLOAD_TIME_UNAVAILABLE', 'QUOTE_DATE_UNAVAILABLE', 'QUOTE_TIME_UNAVAILABLE'])
const fail = (message) => { throw new Error(message) }
function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${field} must be an object`)
  return value
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} must be a nonempty string`)
  return value.trim()
}
function number(value, field, signed = false) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) fail(`${field} must be a finite number`)
  const n = Number(value)
  if (!Number.isFinite(n) || (!signed && n < 0)) fail(`${field} must be finite and nonnegative`)
  return n
}
function strings(value, field) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) fail(`${field} must be an array of strings`)
  return [...value]
}
function date(value, field, nullable = false) {
  if (nullable && value == null) return null
  const v = text(value, field)
  const match = /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(v)
  if (!match || !Number.isFinite(Date.parse(v)) || new Date(match[1] + 'T00:00:00Z').toISOString().slice(0, 10) !== match[1]) fail(`${field} must be a valid ISO date`)
  return v
}
function identity(row, field) {
  // 统一交易代码：各券商对港股/美股的写法不同（2549.HK、HK.02549、02549），
  // 入库前收敛为一种，保证同一只证券只有一条身份、只查一份历史行情。
  const normalized = normalizeSymbol(text(row.symbol, `${field}.symbol`), text(row.market, `${field}.market`))
  const result = {
    symbol: normalized.symbol,
    name: text(row.name, `${field}.name`),
    market: normalized.market,
    assetClass: text(row.assetClass, `${field}.assetClass`).toLowerCase(),
    currency: text(row.currency, `${field}.currency`).toUpperCase(),
  }
  if (!CLASSES.has(result.assetClass)) fail(`${field}.assetClass is unsupported`)
  if (!/^[A-Z]{3}$/.test(result.currency)) fail(`${field}.currency must be a three-letter code`)
  if (row.externalId !== undefined) result.externalId = text(row.externalId, `${field}.externalId`)
  return result
}
const TOTAL_KEYS = ['cash', 'totalValue', 'totalAsset', 'totalCost', 'totalLiability', 'investedPct', 'holdingProfit', 'dayProfit']

/** Validate the whole snapshot before returning a detached, allowlisted value. */
export function normalizeSnapshot(snapshot) {
  const input = object(snapshot, 'snapshot')
  if (!Array.isArray(input.holdings)) fail('snapshot.holdings must be an array')
  if (typeof input.complete !== 'boolean') fail('snapshot.complete must be boolean')
  const keys = new Set()
  const holdings = input.holdings.map((raw, i) => {
    const field = `holdings[${i}]`, row = object(raw, field), out = identity(row, field)
    const key = JSON.stringify([out.market, out.symbol, out.currency])
    if (keys.has(key)) fail(`duplicate holding: ${out.market}/${out.symbol}/${out.currency}`)
    keys.add(key)
    out.qty = number(row.qty, `${field}.qty`)
    // Diluted average cost may be negative once dividends exceed invested capital.
    out.avgCost = number(row.avgCost, `${field}.avgCost`, true)
    out.manualPrice = row.manualPrice === null ? null : number(row.manualPrice, `${field}.manualPrice`)
    return out
  })
  const result = {
    holdings, complete: input.complete,
    warnings: strings(input.warnings ?? [], 'snapshot.warnings'),
    queriedAt: date(input.queriedAt, 'snapshot.queriedAt'),
    uploadedAt: date(input.uploadedAt, 'snapshot.uploadedAt', true),
    quoteDate: date(input.quoteDate, 'snapshot.quoteDate', true),
  }
  if (input.trades !== undefined) {
    if (!Array.isArray(input.trades)) fail('snapshot.trades must be an array')
    result.trades = input.trades.map((raw, i) => {
      const field = `trades[${i}]`, row = object(raw, field), out = identity(row, field)
      out.side = text(row.side, `${field}.side`).toLowerCase()
      if (!['buy', 'sell'].includes(out.side)) fail(`${field}.side must be buy or sell`)
      out.qty = number(row.qty, `${field}.qty`)
      out.price = number(row.price, `${field}.price`)
      out.date = date(row.date, `${field}.date`)
      if (row.fee !== undefined) out.fee = number(row.fee, `${field}.fee`)
      return out
    })
  }
  if (input.sourceTotals !== undefined) {
    const totals = object(input.sourceTotals, 'snapshot.sourceTotals')
    result.sourceTotals = {}
    for (const key of TOTAL_KEYS) if (totals[key] !== undefined) {
      result.sourceTotals[key] = totals[key] === null ? null : number(totals[key], `sourceTotals.${key}`, ['holdingProfit', 'dayProfit'].includes(key))
    }
  }
  return result
}
export function getConnectorStatus(ctx) {
  return [
    { id:'ths',label:'同花顺投资账本',available:true,transport:'native',description:'插件独立登录并读取人民币股票、ETF 和现金，无需安装其他插件。' },
    { id:'futu',label:'富途',available:true,transport:'native',description:'官方 OpenD JavaScript 只读连接；请运行并登录 OpenD，启用 WebSocket。' },
    { id:'longbridge',label:'长桥',available:true,transport:'native',description:'官方 Longport SDK，使用自己的 App Key、Secret 和 Access Token。' },
    { id:'ib',label:'Interactive Brokers',available:true,transport:'native',description:'IB 官方 Client Portal Gateway；需要在官方网关完成登录。' },
    { id:'custom',label:'通用 API / MCP',available:true,transport:'bridge',description:'高级选项：标准持仓快照 API 或已配置的 MCP 读工具。' },
  ]
}
