// 生活账单汇总：只统计带 category 的归档流水，按月份与分类给出收支。
// 与投资流水共用 historyEvents；不推断分类，未标注的流水如实计入「未分类」计数。
import { LIFE_CATEGORIES, lifeCategoryLabel, cashSignOf } from './model.mjs'

const round2 = (n) => Number(n.toFixed(2))
const monthOf = (date) => String(date || '').slice(0, 7)
const amountOf = (event) => (typeof event.cashAmount === 'number' && Number.isFinite(event.cashAmount) ? event.cashAmount : null)

/** 可选月份列表（最近 n 个月，截止到账本最新日期或今天）。 */
function recentMonths(n, endISO) {
  const [year, month] = endISO.split('-').map(Number)
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1))
    out.push(d.toISOString().slice(0, 7))
  }
  return out
}

/**
 * 生活账单汇总。months 为统计窗口（默认 12 个月）。
 * 返回 { baseCurrency, months: [{month, out, in, net, count, byCategory}], totals, categories, uncategorized, latest }
 */
export function billSummary(db, { months = 12, today } = {}) {
  const base = db.baseCurrency || 'CNY'
  const events = (db.historyEvents || []).filter((e) => e && e.category && LIFE_CATEGORIES[e.category])
  const end = today || events.map((e) => e.date).sort().at(-1) || new Date().toISOString().slice(0, 10)
  const window = recentMonths(Math.max(1, Math.min(60, months)), String(end).slice(0, 7) + '-01')
  const set = new Set(window)
  // 汇率：账单可能来自不同币种，统一折回本位币；缺汇率的行单独计数，不混入总额。
  const fx = { ...(db.fx || {}), [base]: 1 }
  let missingFx = 0
  const byMonth = new Map(window.map((m) => [m, { month: m, out: 0, in: 0, net: 0, count: 0, byCategory: new Map() }]))
  const byCategory = new Map(Object.keys(LIFE_CATEGORIES).map((c) => [c, { category: c, label: lifeCategoryLabel(c), out: 0, in: 0, count: 0 }]))
  for (const event of events) {
    const month = monthOf(event.date)
    if (!set.has(month)) continue
    const amount = amountOf(event)
    if (amount === null) continue
    const rate = fx[event.currency || base]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) { missingFx++; continue }
    const value = amount * rate
    // 方向以业务类型为准（出金为支出），与 cashSign 保持一致；金额符号作为兜底。
    const sign = cashSignOf(event.kind)
    const direction = typeof sign === 'number' ? sign : Math.sign(value)
    const bucket = byMonth.get(month)
    const cat = byCategory.get(event.category)
    bucket.count++
    cat.count++
    if (direction < 0) { bucket.out += Math.abs(value); cat.out += Math.abs(value) }
    else if (direction > 0) { bucket.in += value; cat.in += value }
    const catBucket = bucket.byCategory.get(event.category) || { category: event.category, label: lifeCategoryLabel(event.category), out: 0, in: 0 }
    if (direction < 0) catBucket.out += Math.abs(value)
    else if (direction > 0) catBucket.in += value
    bucket.byCategory.set(event.category, catBucket)
  }
  const monthsOut = window.map((m) => {
    const b = byMonth.get(m)
    return {
      month: m, out: round2(b.out), in: round2(b.in), net: round2(b.in - b.out), count: b.count,
      byCategory: [...b.byCategory.values()].map((c) => ({ category: c.category, label: c.label, out: round2(c.out), in: round2(c.in) })).sort((a, b2) => b2.out - a.out),
    }
  })
  const totalOut = monthsOut.reduce((s, m) => s + m.out, 0)
  const totalIn = monthsOut.reduce((s, m) => s + m.in, 0)
  // 有收支但未分类的流水：提示补分类，不擅自归类。
  const uncategorized = (db.historyEvents || []).filter((e) => {
    if (e.category) return false
    if (!['deposit', 'withdrawal'].includes(e.kind)) return false
    return set.has(monthOf(e.date)) && amountOf(e) !== null
  }).length
  const warnings = []
  if (missingFx) warnings.push('BILLS_MISSING_FX:' + missingFx)
  if (uncategorized) warnings.push('BILLS_UNCATEGORIZED:' + uncategorized)
  return {
    baseCurrency: base,
    window: { from: window[0], to: window[window.length - 1], months: window.length },
    months: monthsOut,
    totals: { out: round2(totalOut), in: round2(totalIn), net: round2(totalIn - totalOut), count: monthsOut.reduce((s, m) => s + m.count, 0) },
    categories: [...byCategory.values()].filter((c) => c.count).map((c) => ({ ...c, out: round2(c.out), in: round2(c.in) })).sort((a, b2) => b2.out - a.out),
    uncategorized,
    warnings,
  }
}
