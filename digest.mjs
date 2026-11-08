// 每日摘要：把净资产、快照变化、近期到期支出、本月生活账单与数据提示汇总成
// 一段可直接展示 / 交给 AI 复述的文字。只读账本，不推断缺失数据。
import { summarize } from './store.mjs'
import { forecast } from './forecast.mjs'
import { billSummary } from './bills.mjs'

const DAY = 86400000
const round2 = (n) => Number(n.toFixed(2))
const fmt = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : '—')
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)

/**
 * 生成每日摘要。horizonDays 控制"近期到期"窗口（默认 7 天）。
 * 返回 { date, baseCurrency, netWorth, totalValue, snapshotChange, upcoming,
 *        bills, quality, lines, text }。
 */
export function buildDigest(db, { today = new Date(), horizonDays = 7 } = {}) {
  const todayISO = (today instanceof Date ? today : new Date(today)).toISOString().slice(0, 10)
  const summary = summarize(db)
  const base = summary.baseCurrency
  const accounts = summary.accounts || []
  const assets = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + Math.max(0, a.valueBase || 0), 0)
  const liabilities = accounts.filter((a) => a.type === 'credit').reduce((s, a) => s + Math.abs(a.valueBase || 0), 0)
  const history = (summary.history || []).filter((s) => s.baseCurrency === base && Number.isFinite(s.totalValueBase))
  const latest = history.at(-1) || null
  const previous = history.length > 1 ? history[history.length - 2] : null
  const snapshotChange = latest && previous ? round2(latest.totalValueBase - previous.totalValueBase) : null
  const forecastResult = forecast(db, { today: new Date(todayISO), days: 30 })
  const horizonEnd = addDays(todayISO, horizonDays)
  const upcoming = forecastResult.series
    .flatMap((s) => (s.dueDates || []).filter((d) => d >= todayISO && d <= horizonEnd).map((d) => ({ date: d, label: s.label, amountBase: s.medianAmountBase, inflow: s.inflow })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label))
  const bills = billSummary(db, { months: 1, today: todayISO })
  const quality = {
    priceWarnings: (summary.warnings || []).length,
    excluded: summary.excludedCount || 0,
    uncategorized: bills.uncategorized || 0,
  }
  const lines = []
  const netWorth = round2(assets - liabilities)
  lines.push('净资产 ' + fmt(netWorth) + ' ' + base + (snapshotChange !== null ? '，较上次快照 ' + (snapshotChange >= 0 ? '+' : '') + fmt(snapshotChange) : '，尚无对比快照'))
  const dueOut = upcoming.filter((u) => !u.inflow)
  if (dueOut.length) lines.push(horizonDays + ' 天内预计支出 ' + fmt(dueOut.reduce((s, u) => s + Math.abs(u.amountBase), 0)) + ' ' + base + '：' + dueOut.map((u) => u.label + ' ' + u.date.slice(5) + ' ' + fmt(Math.abs(u.amountBase))).join('、'))
  else lines.push(horizonDays + ' 天内没有识别到周期性支出')
  if (bills.totals.count) lines.push('本月生活账单支出 ' + fmt(bills.totals.out) + '、收入 ' + fmt(bills.totals.in) + '，共 ' + bills.totals.count + ' 笔')
  if (quality.uncategorized) lines.push('还有 ' + quality.uncategorized + ' 笔生活流水未归类')
  if (quality.priceWarnings || quality.excluded) lines.push('数据提示：' + quality.priceWarnings + ' 项价格或汇率需要核对' + (quality.excluded ? '，' + quality.excluded + ' 条持仓暂未计入' : ''))
  return {
    date: todayISO, baseCurrency: base,
    netWorth, totalValue: summary.totalValueBase, snapshotChange,
    upcoming,
    bills: { out: bills.totals.out, in: bills.totals.in, net: bills.totals.net, count: bills.totals.count, uncategorized: bills.uncategorized },
    quality, lines,
    text: lines.join('；') + '。',
  }
}
