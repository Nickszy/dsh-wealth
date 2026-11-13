// Pure snapshot schema (v1+v2): validation, allowlisting and normalization.
// Leaf module — no registry, adapter or status imports; connectors.mjs and the
// adapters import from here directly so no import cycle can form.
import { normalizeSymbol } from './symbols.mjs'
const CLASSES = new Set(['stock', 'fund', 'etf', 'cash', 'bond', 'crypto', 'other'])
// v2.3：这些只属于数据质量、不影响同步状态的警告码，由适配器标注 severity 'info'。
export const SAFE_PARTIAL = new Set(['NAME_LOOKUP_UNAVAILABLE', 'UPLOAD_TIME_UNAVAILABLE', 'QUOTE_DATE_UNAVAILABLE', 'QUOTE_TIME_UNAVAILABLE'])
// v2 分段覆盖：segment 使用资产类别键（etf 归入 stock/fund 由适配器决定，不单列）。
const COVERAGE_SEGMENTS = new Set(['stock', 'fund', 'cash', 'bond', 'crypto', 'other'])
const COVERAGE_STATES = new Set(['full', 'partial', 'failed'])
const WARNING_SEVERITIES = new Set(['info', 'degraded'])
const WARNING_CODE_MAX = 40
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
// v1 警告是字符串；v2 允许 { code, severity?, message? }。这里同时产出展示字符串与结构化明细。
function warningCode(value) {
  const prefix = value.includes(':') ? value.slice(0, value.indexOf(':')) : value.slice(0, WARNING_CODE_MAX)
  return prefix.trim().toUpperCase() || 'WARNING'
}
function warnings(value, field) {
  if (!Array.isArray(value)) fail(`${field} must be an array of strings`)
  return value.map((item, i) => {
    if (typeof item === 'string') return { text: item, detail: { code: warningCode(item), severity: 'degraded', message: item } }
    const row = object(item, `${field}[${i}]`)
    const code = text(row.code, `${field}[${i}].code`)
    const severity = row.severity === undefined ? 'degraded' : text(row.severity, `${field}[${i}].severity`)
    if (!WARNING_SEVERITIES.has(severity)) fail(`${field}[${i}].severity must be info or degraded`)
    const message = row.message === undefined ? code : text(row.message, `${field}[${i}].message`)
    return { text: row.message === undefined ? code : message, detail: { code, severity, message } }
  })
}
// 已规范化的快照再规范化一次（同花顺适配器内部先跑一次，sync.mjs / 契约工具还会再跑）
// 时以 warningDetails 为准；否则 info 级警告会被当作 v1 字符串压回 degraded，丢失分级。
function normalizedDetails(value) {
  if (!Array.isArray(value)) fail('snapshot.warningDetails must be an array')
  return value.map((item, i) => {
    const field = `snapshot.warningDetails[${i}]`, row = object(item, field)
    const code = text(row.code, `${field}.code`)
    const severity = text(row.severity, `${field}.severity`)
    if (!WARNING_SEVERITIES.has(severity)) fail(`${field}.severity must be info or degraded`)
    const message = text(row.message, `${field}.message`)
    return { text: message, detail: { code, severity, message } }
  })
}
function coverage(value, field) {
  const input = object(value, field), out = {}
  for (const [segment, state] of Object.entries(input)) {
    if (!COVERAGE_SEGMENTS.has(segment)) fail(`${field}.${segment} is an unsupported segment`)
    if (!COVERAGE_STATES.has(state)) fail(`${field}.${segment} must be full, partial or failed`)
    out[segment] = state
  }
  return out
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
  const rawSymbol = text(row.symbol, `${field}.symbol`)
  const normalized = normalizeSymbol(rawSymbol, text(row.market, `${field}.market`))
  // 来源原始写法（700.HK / HK.00700 / hk00700）：只用于留档排查，不参与身份匹配。
  // 快照可能被再次归一化（适配器一次、同步一次）；已经带 sourceSymbol 时必须保留，
  // 否则第二次处理会把 700.HK 丢成 00700。
  const declaredSource = row.sourceSymbol === undefined || row.sourceSymbol === null ? '' : text(row.sourceSymbol, `${field}.sourceSymbol`).trim()
  if (declaredSource.length > 64) fail(`${field}.sourceSymbol must be at most 64 characters`)
  const sourceSymbol = declaredSource || (rawSymbol !== normalized.symbol ? rawSymbol : '')
  const result = {
    symbol: normalized.symbol,
    name: text(row.name, `${field}.name`),
    market: normalized.market,
    assetClass: text(row.assetClass, `${field}.assetClass`).toLowerCase(),
    currency: text(row.currency, `${field}.currency`).toUpperCase(),
    ...(sourceSymbol ? { sourceSymbol } : {}),
  }
  if (!CLASSES.has(result.assetClass)) fail(`${field}.assetClass is unsupported`)
  if (!/^[A-Z]{3}$/.test(result.currency)) fail(`${field}.currency must be a three-letter code`)
  if (row.externalId !== undefined) result.externalId = text(row.externalId, `${field}.externalId`)
  return result
}
const TOTAL_KEYS = ['cash', 'totalValue', 'totalAsset', 'netAssets', 'totalCost', 'totalLiability', 'investedPct', 'holdingProfit', 'dayProfit', 'transferIn', 'transferOut', 'assetProfit', 'assetBonus', 'assetStart', 'assetEnd']
// 转账统计的区间说明来自来源接口本身，按文本保留（不是金额字段）。
const TOTAL_TEXT_KEYS = ['transferFrom', 'transferTo']

/** Validate the whole snapshot before returning a detached, allowlisted value. */
export function normalizeSnapshot(snapshot) {
  const input = object(snapshot, 'snapshot')
  if (!Array.isArray(input.holdings)) fail('snapshot.holdings must be an array')
  const hasCoverage = input.coverage !== undefined
  // v1 必须有 complete；v2 给出 coverage 时由分段派生，显式 complete 若存在仍须为布尔值。
  if (!hasCoverage && typeof input.complete !== 'boolean') fail('snapshot.complete must be boolean')
  if (hasCoverage && input.complete !== undefined && typeof input.complete !== 'boolean') fail('snapshot.complete must be boolean')
  const keys = new Set()
  const holdings = input.holdings.map((raw, i) => {
    const field = `holdings[${i}]`, row = object(raw, field), out = identity(row, field)
    const key = JSON.stringify([out.market, out.symbol, out.currency])
    if (keys.has(key)) fail(`duplicate holding: ${out.market}/${out.symbol}/${out.currency}`)
    keys.add(key)
    out.qty = number(row.qty, `${field}.qty`)
    // 摊薄成本可为负；null 表示未知成本（v2），与真实的 0 成本区分，绝不伪造。
    out.avgCost = row.avgCost === null ? null : number(row.avgCost, `${field}.avgCost`, true)
    out.manualPrice = row.manualPrice === null ? null : number(row.manualPrice, `${field}.manualPrice`)
    return out
  })
  const warningRows = Array.isArray(input.warningDetails)
    ? normalizedDetails(input.warningDetails)
    : warnings(input.warnings ?? [], 'snapshot.warnings')
  const coverageValue = hasCoverage ? coverage(input.coverage, 'snapshot.coverage') : undefined
  const result = {
    holdings,
    complete: hasCoverage ? Object.values(coverageValue).every((state) => state === 'full') : input.complete,
    warnings: warningRows.map((w) => w.text),
    warningDetails: warningRows.map((w) => w.detail),
    queriedAt: date(input.queriedAt, 'snapshot.queriedAt'),
    uploadedAt: date(input.uploadedAt, 'snapshot.uploadedAt', true),
    quoteDate: date(input.quoteDate, 'snapshot.quoteDate', true),
  }
  if (coverageValue) result.coverage = coverageValue
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
      result.sourceTotals[key] = totals[key] === null ? null : number(totals[key], `sourceTotals.${key}`, ['holdingProfit', 'dayProfit', 'assetProfit'].includes(key))
    }
    for (const key of TOTAL_TEXT_KEYS) if (totals[key] !== undefined) {
      result.sourceTotals[key] = totals[key] === null ? null : text(totals[key], `sourceTotals.${key}`)
    }
  }
  return result
}
