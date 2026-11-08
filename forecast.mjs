// 预计支出：从已归档流水（historyEvents + trades）中识别周期性收支，
// 推算未来 N 天的预计支出/收入。只承认有证据的规律（≥3 次、间隔一致、方向一致、
// 币种一致），识别不出的序列宁可不报——绝不编造周期或金额。
// 纯函数模块：给定账本 db 与选项，不读盘、不落盘、不发请求。
import { cashSignOf, kindLabel } from './model.mjs'

const DAY = 86400000
const CADENCES = [
  { key: 'weekly', label: '每周', days: 7, medianRange: [5, 9], tolerance: 3 },
  { key: 'monthly', label: '每月', days: 30.44, medianRange: [25, 35], tolerance: 6 },
  { key: 'quarterly', label: '每季度', days: 91.31, medianRange: [80, 100], tolerance: 10 },
  { key: 'annual', label: '每年', days: 365.25, medianRange: [350, 380], tolerance: 14 },
]
// cashSign 为 0 或 null 的类型没有真实现金方向，不参与预计支出。
const EXCLUDED_KINDS = new Set(['security_in', 'security_out', 'ipo'])

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 识别一组排序日期的节奏；不匹配任何已知周期时返回 null。 */
export function detectCadence(dates) {
  if (!Array.isArray(dates) || dates.length < 3) return null
  const stamps = dates.map((d) => Date.parse(d + 'T00:00:00Z'))
  if (stamps.some((t) => !Number.isFinite(t))) return null
  const gaps = stamps.slice(1).map((t, i) => Math.round((t - stamps[i]) / DAY))
  const m = median(gaps)
  for (const cad of CADENCES) {
    const [lo, hi] = cad.medianRange
    if (m < lo || m > hi) continue
    if (gaps.every((g) => Math.abs(g - m) <= cad.tolerance)) return { ...cad, medianGap: m, gaps }
  }
  return null
}

/** 归一化的现金流列表：只保留有金额、有日期、方向可判定的行。 */
export function forecastFlows(db) {
  const insMap = new Map((db.instruments || []).map((i) => [i.id, i]))
  const rows = []
  for (const e of db.historyEvents || []) {
    if (EXCLUDED_KINDS.has(e.kind)) continue
    if (typeof e.cashAmount !== 'number' || !Number.isFinite(e.cashAmount) || e.cashAmount === 0) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) continue
    const ins = e.instrumentId ? insMap.get(e.instrumentId) : null
    rows.push({
      accountId: e.accountId, kind: e.kind, date: e.date, amount: e.cashAmount,
      currency: e.currency || 'CNY', label: String(e.note || '').trim() || (ins ? ins.name || ins.symbol : kindLabel(e.kind)),
      source: 'historyEvent', sourceId: e.id,
    })
  }
  for (const t of db.trades || []) {
    const sign = t.side === 'sell' ? 1 : t.side === 'buy' ? -1 : 0
    if (!sign) continue
    const gross = typeof t.grossAmount === 'number' && Number.isFinite(t.grossAmount) ? t.grossAmount : Number(t.qty) * Number(t.price)
    if (!Number.isFinite(gross) || gross <= 0) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))) continue
    const ins = t.instrumentId ? insMap.get(t.instrumentId) : null
    rows.push({
      accountId: t.accountId, kind: t.side === 'sell' ? 'sell' : 'buy', date: t.date, amount: sign * gross,
      currency: t.currency || ins?.currency || 'CNY', label: ins ? (ins.name ? `${ins.name} ${ins.symbol}` : ins.symbol) : (t.symbol || t.side),
      source: 'trade', sourceId: t.id,
    })
  }
  return rows
}

function advance(dateISO, gapDays, todayISO, cap = 400) {
  let t = Date.parse(dateISO + 'T00:00:00Z'), today = Date.parse(todayISO + 'T00:00:00Z')
  for (let i = 0; i < cap && t < today; i++) t += Math.round(gapDays * DAY)
  return t
}

/**
 * 识别周期性收支并推算未来 days 天的预计支出/收入。
 * 返回 { baseCurrency, horizonDays, series, projection, warnings }；
 * series 只含通过全部证据门槛的序列，金额为本位币中位数估算并注明区间。
 */
export function forecast(db, { today, days = 30 } = {}) {
  const base = db.baseCurrency || 'CNY'
  const fx = { ...db.fx, [base]: 1 }
  const todayISO = (today instanceof Date ? today : new Date()).toISOString().slice(0, 10)
  const horizonEnd = Date.parse(todayISO + 'T00:00:00Z') + days * DAY
  const warnings = []
  const skip = (code, n) => { if (n) warnings.push(code + ':' + n) }

  const groups = new Map()
  for (const row of forecastFlows(db)) {
    const key = `${row.accountId}|${row.kind}|${row.label}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  const accountNames = new Map((db.accounts || []).map((a) => [a.id, a.name]))
  const series = []
  let skippedMixedSign = 0, skippedMixedCurrency = 0, skippedMissingFx = 0, skippedNoCadence = 0
  for (const [key, rows] of groups) {
    if (rows.length < 3) continue
    const positive = rows.filter((r) => r.amount > 0).length
    if (positive !== 0 && positive !== rows.length) { skippedMixedSign++; continue }
    const currencies = new Set(rows.map((r) => r.currency))
    if (currencies.size !== 1) { skippedMixedCurrency++; continue }
    const currency = rows[0].currency
    const rate = fx[currency]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) { skippedMissingFx++; continue }
    const byDate = new Map()
    for (const r of rows) byDate.set(r.date, (byDate.get(r.date) || 0) + r.amount)
    const dates = [...byDate.keys()].sort()
    if (dates.length < 3) continue
    const cadence = detectCadence(dates)
    if (!cadence) { skippedNoCadence++; continue }
    const amounts = [...byDate.values()]
    const medianAmount = median(amounts)
    if (medianAmount === 0) continue
    const amountsBase = amounts.map((a) => a * rate)
    const medianBase = median(amountsBase)
    // 从最后一次出现推进到今天之后的下一次到期日。
    const nextStamp = advance(dates[dates.length - 1], cadence.medianGap, todayISO)
    let dueStamps = []
    for (let t = nextStamp, i = 0; t <= horizonEnd && i < 400; t += Math.round(cadence.medianGap * DAY), i++) dueStamps.push(t)
    series.push({
      key,
      accountId: rows[0].accountId, accountName: accountNames.get(rows[0].accountId) || rows[0].accountId,
      kind: rows[0].kind, kindName: kindLabel(rows[0].kind), label: rows[0].label,
      cadence: cadence.key, cadenceLabel: cadence.label, medianGapDays: cadence.medianGap,
      occurrences: dates.length, firstDate: dates[0], lastDate: dates[dates.length - 1],
      currency, rate,
      medianAmount: Number(medianAmount.toFixed(2)), minAmount: Number(Math.min(...amounts).toFixed(2)), maxAmount: Number(Math.max(...amounts).toFixed(2)),
      medianAmountBase: Number(medianBase.toFixed(2)),
      inflow: medianAmount > 0,
      nextDue: new Date(nextStamp).toISOString().slice(0, 10),
      dueInHorizon: dueStamps.length,
      dueAmountBase: Number((medianBase * dueStamps.length).toFixed(2)),
      dueDates: dueStamps.map((t) => new Date(t).toISOString().slice(0, 10)),
    })
  }
  skip('FORECAST_SKIPPED:mixed-sign', skippedMixedSign)
  skip('FORECAST_SKIPPED:mixed-currency', skippedMixedCurrency)
  skip('FORECAST_SKIPPED:missing-fx', skippedMissingFx)
  skip('FORECAST_SKIPPED:no-cadence', skippedNoCadence)
  series.sort((a, b) => String(a.nextDue).localeCompare(String(b.nextDue)) || b.dueAmountBase - a.dueAmountBase)
  const outBase = series.filter((s) => !s.inflow).reduce((sum, s) => sum + s.dueAmountBase, 0)
  const inBase = series.filter((s) => s.inflow).reduce((sum, s) => sum + s.dueAmountBase, 0)
  return {
    baseCurrency: base, horizonDays: days, generatedFor: todayISO,
    series,
    projection: {
      outBase: Number(Math.abs(outBase).toFixed(2)),
      inBase: Number(inBase.toFixed(2)),
      netBase: Number((inBase - Math.abs(outBase)).toFixed(2)),
      count: series.reduce((n, s) => n + s.dueInHorizon, 0),
    },
    warnings,
  }
}
// cashSignOf re-exported for callers that want the direction registry without importing model.mjs twice.
export { cashSignOf }
