// 历史净值回补：每日持仓（timeline 逆推）× 当日行情（klines）→ 账户净值曲线、
// 区间涨跌与最大回撤。口径是「市值」，不是收益率——出入金会造成台阶，界面须注明。
// 没有行情的标的按当前价格水平平推并明确告警，绝不用缺失价格算涨跌。
import { maxDrawdown } from './analytics.mjs'
import { valuationPrice } from './quotes.mjs'
import { klineTarget, loadDailyCloses } from './klines.mjs'
import { reconstructTimeline, mergeTimelines } from './timeline.mjs'

const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
const round2 = (n) => Number(n.toFixed(2))

/** 把 klines 的 Map<targetKey, [[date, price]]> 转成 Map<instrumentId, {rows, map}>。 */
export function pricesByInstrument(instruments, prices) {
  const out = new Map()
  for (const ins of instruments || []) {
    const target = klineTarget(ins)
    if (!target) continue
    const rows = prices.get(target.key)
    if (!Array.isArray(rows) || !rows.length) continue
    out.set(ins.id, { rows, map: new Map(rows) })
  }
  return out
}

/**
 * 计算回补净值序列。
 * timeline 来自 reconstructTimeline；prices 为 pricesByInstrument 的结果；
 * fx 为账本汇率表。返回 { series, metrics, warnings, from, to }。
 */
export function buildPerformance(db, timeline, { prices, fx, baseCurrency = db.baseCurrency || 'CNY', days = 1095, today } = {}) {
  const rates = { ...fx, [baseCurrency]: 1 }
  const todayISO = today || new Date().toISOString().slice(0, 10)
  const warnings = []
  if (!timeline?.events?.length || !timeline?.states?.length) {
    return { baseCurrency, from: null, to: todayISO, series: [], metrics: null, warnings: ['PERF_NO_FLOW_HISTORY'] }
  }
  const fromLimit = addDays(todayISO, -Math.max(7, days))
  const from = timeline.from > fromLimit ? timeline.from : fromLimit
  const insById = new Map((db.instruments || []).map((i) => [i.id, i]))
  const holdingById = new Map((db.holdings || []).map((h) => [h.instrumentId, h]))
  // 无行情标的：有当前价格（手填/行情/成本）按平推价处理并告警；
  // 完全无法定价的标的（如美股期权）整段不计入曲线，避免把 0 当作市值。
  const flat = new Map(), unknown = new Set()
  for (const id of new Set(timeline.states.flatMap((s) => Object.keys(s.positions)))) {
    if (prices.has(id)) continue
    const h = holdingById.get(id), ins = insById.get(id)
    const price = h ? valuationPrice(h) ?? null : null
    if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
      flat.set(id, price)
      warnings.push('PERF_FLAT_PRICE:' + (ins?.symbol || id))
    } else {
      unknown.add(id)
      warnings.push('PERF_NO_PRICE:' + (ins?.symbol || id))
    }
  }
  // 交易日：行情日期并集 ∪ 持仓变化日。
  const dateSet = new Set()
  for (const { rows } of prices.values()) for (const [d] of rows) if (d >= from && d <= todayISO) dateSet.add(d)
  for (const s of timeline.states) if (s.date >= from && s.date <= todayISO) dateSet.add(s.date)
  const dates = [...dateSet].sort()
  if (!dates.length) return { baseCurrency, from, to: todayISO, series: [], metrics: null, warnings: [...warnings, 'PERF_NO_TRADING_DAYS'] }

  // 每标的的价格指针：随日期单调前进。
  const pointers = new Map()
  for (const [id, series] of prices) pointers.set(id, { rows: series.rows, index: -1 })
  const priceAt = (id, date) => {
    if (flat.has(id)) return flat.get(id)
    const pointer = pointers.get(id)
    if (!pointer) return null
    while (pointer.index + 1 < pointer.rows.length && pointer.rows[pointer.index + 1][0] <= date) pointer.index++
    return pointer.index >= 0 ? pointer.rows[pointer.index][1] : null
  }

  const raw = []
  let stateIndex = -1, unpriced = 0
  for (const date of dates) {
    while (stateIndex + 1 < timeline.states.length && timeline.states[stateIndex + 1].date <= date) stateIndex++
    const state = timeline.states[Math.max(0, stateIndex)]
    // stateIndex 为 -1 时用起始状态（第一笔流水之前）。
    const positions = stateIndex < 0 ? timeline.start.positions : state.positions
    const cash = stateIndex < 0 ? timeline.start.cash : state.cash
    let securities = 0, cashValue = 0, priced = true
    for (const [id, qty] of Object.entries(positions)) {
      if (!qty || unknown.has(id)) continue
      const price = priceAt(id, date)
      if (price === null) { priced = false; continue }
      const ins = insById.get(id), h = holdingById.get(id)
      const currency = h?.currency || ins?.currency || baseCurrency
      const rate = rates[currency]
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) { warnings.push('PERF_MISSING_FX:' + currency); priced = false; continue }
      securities += qty * price * rate
    }
    for (const [currency, amount] of Object.entries(cash)) {
      if (!amount) continue
      const rate = rates[currency]
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) { warnings.push('PERF_MISSING_FX:' + currency); continue }
      cashValue += amount * rate
    }
    if (!priced) unpriced++
    raw.push({ date, securities: round2(securities), cash: round2(cashValue) })
  }
  if (unpriced) warnings.push('PERF_UNPRICED_DAYS:' + unpriced)
  // 现金由流水逆推；券商侧银证转账往往不在流水里，现金会转负。负值按「推定入金」修复到 0，
  // 否则每次卖出都会让净值假摔。修复天数如实上报，口径是估算而非记账事实。
  const negativeCash = raw.filter((r) => r.cash < -0.01)
  const cashEstimated = negativeCash.length > 0
  if (cashEstimated) warnings.push('PERF_CASH_ESTIMATED:' + negativeCash.length)
  const series = raw.map((r) => {
    const cash = Math.max(0, r.cash)
    return { date: r.date, securities: r.securities, cash, totalValueBase: round2(r.securities + cash) }
  })
  const values = series.map((s) => s.totalValueBase)
  const startValue = values[0], endValue = values[values.length - 1]
  const change = endValue - startValue
  const drawdown = maxDrawdown(series)
  let best = null, worst = null
  for (let i = 1; i < series.length; i++) {
    const diff = values[i] - values[i - 1]
    if (!best || diff > best.change) best = { date: series[i].date, change: round2(diff) }
    if (!worst || diff < worst.change) worst = { date: series[i].date, change: round2(diff) }
  }
  return {
    baseCurrency, from: series[0].date, to: series[series.length - 1].date,
    series,
    metrics: {
      startValue: round2(startValue), endValue: round2(endValue),
      change: round2(change), changePct: startValue > 0 ? Number((change / startValue * 100).toFixed(2)) : null,
      maxDrawdown: drawdown && drawdown.value !== null ? drawdown : null,
      bestDay: best, worstDay: worst, days: series.length, unpricedDays: unpriced,
      cashEstimated,
    },
    warnings: [...new Set(warnings)],
    coverage: { firstEvent: timeline.from, events: timeline.events.length, states: timeline.states.length },
  }
}

/**
 * 编排：逆推时间线 + 拉取日线 + 计算净值。供 host 路由与 CLI 共用。
 * accountIds 为空表示全部账户合并。
 */
export async function computePerformance(db, { accountIds = [], days = 1095, fetch: fetchImpl, cachePath, now = Date.now, dataToken, westockToken } = {}) {
  const todayISO = new Date(now()).toISOString().slice(0, 10)
  const ids = [...new Set((accountIds || []).map(String).filter(Boolean))]
  const timelines = ids.length
    ? ids.map((id) => reconstructTimeline(db, { accountId: id, today: new Date(now()) }))
    : [reconstructTimeline(db, { today: new Date(now()) })]
  const timeline = timelines.length > 1 ? mergeTimelines(timelines) : timelines[0]
  const involved = new Set()
  for (const st of [timeline.start, ...timeline.states]) for (const id of Object.keys(st.positions)) involved.add(id)
  const instruments = [
    ...(db.instruments || []).filter((i) => involved.has(i.id)),
    ...(timeline.syntheticInstruments || []).filter((i) => involved.has(i.id)),
  ]
  const from = addDays(todayISO, -Math.max(7, days))
  const kline = await loadDailyCloses(instruments, { from, fetch: fetchImpl, cachePath, now, dataToken, westockToken })
  const perf = buildPerformance(db, timeline, {
    prices: pricesByInstrument(instruments, kline.prices), fx: db.fx, baseCurrency: db.baseCurrency, days, today: todayISO,
  })
  return {
    ...perf,
    warnings: [...new Set([...(timeline.warnings || []), ...kline.warnings, ...perf.warnings])],
    klines: { fetched: kline.fetched, cached: kline.cached },
    accountIds: ids,
    coverage: { ...perf.coverage, instruments: instruments.length, flows: timeline.coverage?.flows ?? null },
  }
}
