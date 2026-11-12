// analytics.mjs — 分析层：只读、纯函数、绝不修改账本。
//
// 设计来源（见 DATA-MODEL.md「分析层」）：
// - 双口径收益：TWR（时间加权，跨出入金可比）+ XIRR（资金加权，个人真实收益），
//   借鉴 Portfolio Performance / Ghostfolio 同时展示 TTROR 与 IRR 的做法。
// - 出入金是外部现金流，股息/利息/费用/税是内部现金流：只有外部现金流进入收益分母，
//   否则入金会被误读为「收益」。
// - 数据质量先于结论：缺价、缺汇率、流水覆盖不完整时，指标带 complete=false 与原因，
//   绝不填 0 或伪造（Beancount 的 assertion 思路）。
// - 不重建历史净值：只用已保存的快照；快照不足时明说样本不足。
import { summarize } from './store.mjs'
import { KIND_NAMES, FLOW_KINDS, cashSignOf, kindLabel } from './model.mjs'

const round = (n, digits = 2) => (typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(digits)) : null)
const dayNumber = (date) => Date.parse(date + 'T00:00:00Z') / 86400000

// 外部现金流：真正进出账户的钱。内部现金流（分红/利息/费用/税）不改变投入本金。
export function isExternalFlow(kind) { return kind === 'deposit' || kind === 'withdrawal' }
export function isInternalFlow(kind) {
  return ['dividend', 'interest', 'fee', 'tax'].includes(kind)
}

// 把账本裁剪到指定账户子集（只读副本）：持仓/流水按账户过滤，快照用 snapshot.accounts 重新汇总。
export function scopeLedger(db, accountIds) {
  const ids = new Set((accountIds || []).map(String).filter(Boolean))
  if (!ids.size) return db
  const keep = (x) => x && ids.has(String(x.accountId))
  const sum = (list, key) => list.reduce((s, a) => s + (typeof a[key] === 'number' && Number.isFinite(a[key]) ? a[key] : 0), 0)
  const snapshots = (db.snapshots || []).flatMap((s) => {
    if (!Array.isArray(s.accounts)) return []
    const acc = s.accounts.filter(keep)
    if (!acc.length) return []
    return [{ ...s, accounts: acc, totalValueBase: sum(acc, 'valueBase'), totalCostBase: sum(acc, 'costBase'), totalPnlBase: sum(acc, 'pnlBase'), assetClasses: undefined, currencies: undefined }]
  })
  return {
    ...db,
    accounts: (db.accounts || []).filter((a) => ids.has(String(a.id))),
    holdings: (db.holdings || []).filter(keep),
    trades: (db.trades || []).filter(keep),
    historyEvents: (db.historyEvents || []).filter(keep),
    historyBatches: (db.historyBatches || []).filter(keep),
    snapshots,
  }
}

function snapshotSeries(db) {
  const base = db.baseCurrency || 'CNY'
  const byDate = new Map()
  for (const s of db.snapshots || []) {
    if ((s.baseCurrency || base) !== base) continue
    if (typeof s.totalValueBase !== 'number' || !Number.isFinite(s.totalValueBase)) continue
    byDate.set(String(s.date), s) // 同日多次保存时后者覆盖（store 已按日归一）
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

// 把历史归档流水与旧版 trades 统一成 {date, kind, cashAmount, currency, accountId} 视图。
function flowRows(db) {
  const rows = []
  for (const e of db.historyEvents || []) {
    if (!e || !e.date) continue
    rows.push({
      date: String(e.date), kind: e.kind || 'other', currency: e.currency || null, accountId: e.accountId || null,
      cashAmount: typeof e.cashAmount === 'number' && Number.isFinite(e.cashAmount) ? e.cashAmount : null,
      fee: typeof e.fee === 'number' && Number.isFinite(e.fee) ? e.fee : null,
      batchId: e.batchId || null,
    })
  }
  for (const t of db.trades || []) {
    const side = String(t.side || '').toLowerCase()
    if (side !== 'buy' && side !== 'sell') continue
    const gross = Number(t.qty) * Number(t.price)
    rows.push({
      date: String(t.date || ''), kind: side, currency: t.currency || null, accountId: t.accountId || null,
      cashAmount: null, gross: Number.isFinite(gross) && gross > 0 ? gross : null,
      fee: typeof t.fee === 'number' && Number.isFinite(t.fee) ? t.fee : null, batchId: null,
    })
  }
  return rows.filter((r) => r.date)
}

export function flowSummary(rows) {
  const byKind = new Map()
  const byYear = new Map()
  const totals = { externalIn: 0, externalOut: 0, netExternal: 0, dividends: 0, interest: 0, fees: 0, taxes: 0 }
  let unknownCash = 0
  for (const r of rows) {
    const agg = byKind.get(r.kind) || { kind: r.kind, label: kindLabel(r.kind), count: 0, cash: 0, unknownCash: 0 }
    agg.count++
    if (r.cashAmount == null) { agg.unknownCash++; unknownCash++ } else agg.cash += r.cashAmount
    byKind.set(r.kind, agg)
    const year = r.date.slice(0, 4)
    const bucket = byYear.get(year) || { year, externalIn: 0, externalOut: 0, buy: 0, sell: 0, dividends: 0, interest: 0, fees: 0, taxes: 0, other: 0 }
    // 买卖成交没有现金字段时用成交额（gross），否则「其他」会把整年的交易都吞掉。
    const amount = r.cashAmount != null ? Math.abs(r.cashAmount) : ['buy', 'sell'].includes(r.kind) ? (r.gross || 0) : 0
    if (r.kind === 'deposit') { bucket.externalIn += amount; totals.externalIn += amount }
    else if (r.kind === 'withdrawal') { bucket.externalOut += amount; totals.externalOut += amount }
    else if (r.kind === 'buy') bucket.buy += amount
    else if (r.kind === 'sell') bucket.sell += amount
    else if (r.kind === 'dividend') { bucket.dividends += amount; totals.dividends += amount }
    else if (r.kind === 'interest') { bucket.interest += amount; totals.interest += amount }
    else if (r.kind === 'fee') { bucket.fees += amount; totals.fees += amount }
    else if (r.kind === 'tax') { bucket.taxes += amount; totals.taxes += amount }
    else bucket.other += amount
    byYear.set(year, bucket)
  }
  totals.netExternal = totals.externalIn - totals.externalOut
  const rounding = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v]))
  return {
    byKind: [...byKind.values()].map((a) => ({ ...a, cash: round(a.cash) })).sort((a, b) => b.count - a.count),
    byYear: [...byYear.values()].map(rounding).sort((a, b) => a.year.localeCompare(b.year)),
    totals: rounding(totals),
    unknownCashRows: unknownCash,
  }
}

// TWR：按两个快照之间的区间计算 (V1 - V0 - F) / (V0 + F)，
// F 为该区间净外部现金流（按日初计入，近似 Modified Dietz），再链式相乘。
export function timeWeightedReturn(series, rows) {
  if (series.length < 2) return { value: null, complete: false, periods: 0, reason: '快照不足两个，无法计算时间加权收益' }
  let factor = 1, periods = 0, unknownCashPeriods = 0
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1], cur = series[i]
    const from = String(prev.date), to = String(cur.date)
    const inRange = rows.filter((r) => r.date > from && r.date <= to && isExternalFlow(r.kind))
    const known = inRange.reduce((sum, r) => sum + (r.cashAmount == null ? 0 : r.cashAmount), 0)
    if (inRange.some((r) => r.cashAmount == null)) unknownCashPeriods++
    const v0 = prev.totalValueBase, v1 = cur.totalValueBase, base = v0 + known
    if (!(base > 0)) continue
    // Modified Dietz with the flow counted at period start: 1 + r = V1 / (V0 + F).
    factor *= v1 / base
    periods++
  }
  if (!periods) return { value: null, complete: false, periods: 0, reason: '没有可计算的区间（快照起点资产为零或缺少有效快照）' }
  return {
    value: round((factor - 1) * 100, 2),
    factor: round(factor, 6),
    periods,
    complete: unknownCashPeriods === 0,
    reason: unknownCashPeriods ? '部分出入金没有金额，收益为下限估算' : null,
  }
}

// XIRR（资金加权）：求 sum(cf_i / (1+r)^(days_i/365)) = 0。
// 期初市值视为一次性投入，区间内出入金为外部现金流，期末市值为最终回收。
export function xirr(series, rows, { guess = 0.1 } = {}) {
  if (series.length < 1) return { value: null, complete: false, reason: '没有快照，无法计算资金加权收益' }
  const first = series[0], last = series[series.length - 1]
  const t0 = dayNumber(String(first.date)), t1 = dayNumber(String(last.date))
  if (!(t1 > t0)) return { value: null, complete: false, reason: '快照区间不足一天，无法计算资金加权收益' }
  const flows = [{ t: 0, amount: -first.totalValueBase }]
  let unknown = 0
  for (const r of rows) {
    if (!isExternalFlow(r.kind)) continue
    const t = dayNumber(r.date) - t0
    if (!(t > 0 && t <= t1 - t0)) continue
    if (r.cashAmount == null) { unknown++; continue }
    // 入金对投资者是现金流出（负数），出金是现金流入（正数）；cashAmount 存的是账户视角的符号，故取反。
    flows.push({ t, amount: -r.cashAmount })
  }
  flows.push({ t: t1 - t0, amount: last.totalValueBase })
  if (flows.length < 3) return { value: null, complete: false, reason: '区间内没有出入金，资金加权收益与时间加权收益等价，无需单独计算' }
  const npv = (rate) => flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, f.t / 365), 0)
  let lo = -0.9999, hi = 10
  let flo = npv(lo), fhi = npv(hi)
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) {
    return { value: null, complete: false, reason: '现金流分布不支持求解资金加权收益率' }
  }
  let rate = guess
  for (let i = 0; i < 200; i++) {
    rate = (lo + hi) / 2
    const value = npv(rate)
    if (!Number.isFinite(value)) break
    if (Math.abs(value) < 1e-9) break
    if (value * flo > 0) { lo = rate; flo = value } else { hi = rate; fhi = value }
  }
  return {
    value: round(rate * 100, 2), complete: unknown === 0,
    reason: unknown ? '部分出入金没有金额，结果仅为估算' : null,
    cashFlows: flows.length,
  }
}

export function maxDrawdown(series) {
  if (series.length < 2) return { value: null, peakDate: null, troughDate: null, reason: '快照不足两个' }
  let peak = series[0], worst = 0, troughDate = null, peakAtTrough = series[0]
  for (const s of series) {
    if (s.totalValueBase > peak.totalValueBase) peak = s
    const dd = peak.totalValueBase > 0 ? (s.totalValueBase - peak.totalValueBase) / peak.totalValueBase : 0
    if (dd < worst) { worst = dd; troughDate = s.date; peakAtTrough = peak }
  }
  // peakDate 是「造成最大回撤的那个峰值」的日期，不是全序列最后的峰值。
  return { value: round(worst * 100, 2), peakDate: peakAtTrough.date, troughDate, reason: null }
}

export function concentration(items) {
  const weights = (items || []).map((i) => (typeof i.weight === 'number' ? i.weight : 0)).filter((w) => w > 0)
  if (!weights.length) return { hhi: null, top1: null, top3: null, count: 0 }
  const sorted = [...weights].sort((a, b) => b - a)
  return {
    hhi: round(sorted.reduce((sum, w) => sum + w * w, 0), 4),
    top1: round(sorted[0] * 100, 2),
    top3: round(sorted.slice(0, 3).reduce((s, w) => s + w, 0) * 100, 2),
    count: sorted.length,
  }
}

export function analyze(db, options = {}) {
  const summary = summarize(db)
  const series = snapshotSeries(db)
  const rows = flowRows(db)
  const flows = flowSummary(rows)
  const first = series[0] || null, last = series[series.length - 1] || null
  const change = first && last ? last.totalValueBase - first.totalValueBase : null
  const changePct = first && first.totalValueBase > 0 && change != null ? (change / first.totalValueBase) * 100 : null

  // 数据质量：缺价、缺汇率、流水覆盖不完整都进入 quality，而不是静默通过。
  // unpriced 只统计「没有任何现价（手填/行情/券商），但成本已知」的持仓——它们按成本估值。
  // 完全无法定价的行由 summarize 排除（reason='no-price'），单独提示，不混进成本估值。
  const unpriced = (db.holdings || []).filter((h) => h.qty > 0 && h.manualPrice == null && h.quotePrice == null && h.sourcePrice == null && h.avgCost != null).length
  const noPriceExcluded = (summary.excludedHoldings || []).filter((h) => h.reason === 'no-price').length
  const otherExcluded = (summary.excludedCount || 0) - noPriceExcluded
  const batches = db.historyBatches || []
  const incompleteBatches = batches.filter((b) => b?.coverage && b.coverage.complete === false)
  const warnings = []
  if (!series.length) warnings.push('还没有保存过快照，趋势与收益需要至少一天的历史')
  else if (series.length < 2) warnings.push('只有一天快照，趋势与收益暂不可计算')
  if (unpriced) warnings.push(`${unpriced} 条持仓没有现价，按成本估值`)
  if (otherExcluded) warnings.push(`${otherExcluded} 条持仓因缺少汇率或数值无效未计入总额`)
  if (noPriceExcluded) warnings.push(`${noPriceExcluded} 条持仓没有任何价格且成本未知，未计入总额`)
  if (flows.unknownCashRows) warnings.push(`${flows.unknownCashRows} 条流水没有金额，收益与现金流汇总为下限估算`)
  if (incompleteBatches.length) warnings.push(`${incompleteBatches.length} 个历史批次的覆盖不完整（如缺少银证转账）`)

  const twr = timeWeightedReturn(series, rows)
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    baseCurrency: summary.baseCurrency,
    netWorth: {
      series: series.map((s) => ({ date: s.date, totalValueBase: round(s.totalValueBase), totalCostBase: round(s.totalCostBase), totalPnlBase: round(s.totalPnlBase), excludedCount: s.excludedCount ?? 0 })),
      first: first ? { date: first.date, totalValueBase: round(first.totalValueBase) } : null,
      last: last ? { date: last.date, totalValueBase: round(last.totalValueBase) } : null,
      change: round(change), changePct: round(changePct, 2),
      snapshotCount: series.length,
      spanDays: series.length > 1 ? Math.round(dayNumber(String(last.date)) - dayNumber(String(first.date))) : 0,
    },
    allocation: {
      byClass: summary.assetClasses, byAccount: summary.accounts, byCurrency: summary.currencies,
      bySector: summary.sectors, byStyle: summary.styles,
      concentration: concentration(summary.assetClasses),
      sectorConcentration: concentration(summary.sectors),
      styleConcentration: concentration(summary.styles),
    },
    flows,
    performance: {
      twr,
      xirr: xirr(series, rows),
      maxDrawdown: maxDrawdown(series),
      note: 'TWR 按快照区间链式计算，出入金按日初计入（近似 Modified Dietz）；XIRR 为资金加权年化。两者都需要完整出入金记录，覆盖不全时仅作参考。',
    },
    quality: {
      snapshotCount: series.length, unpricedHoldings: unpriced,
      excludedHoldings: summary.excludedCount, unknownCashFlows: flows.unknownCashRows,
      historyBatches: batches.length, incompleteBatches: incompleteBatches.length,
      warnings,
    },
    catalog: {
      kinds: KIND_NAMES.map((k) => ({ kind: k, label: kindLabel(k), category: FLOW_KINDS[k].category, cashSign: cashSignOf(k) })),
      categories: [...new Set(KIND_NAMES.map((k) => FLOW_KINDS[k].category))],
    },
  }
}
