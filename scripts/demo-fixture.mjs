// Marketing screenshots fixture: builds a coherent demo ledger through the REAL
// store ops, then renders brand/preview.html with the current client.js and
// server responses computed by the real modules (analytics/bills/forecast/digest).
// All data is fictional. Run: node scripts/demo-fixture.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const { applyOp, summarize } = await import(pathToFileURL(join(ROOT, 'store.mjs')))
const { analyze } = await import(pathToFileURL(join(ROOT, 'analytics.mjs')))
const { billSummary } = await import(pathToFileURL(join(ROOT, 'bills.mjs')))
const { forecast } = await import(pathToFileURL(join(ROOT, 'forecast.mjs')))
const { buildDigest } = await import(pathToFileURL(join(ROOT, 'digest.mjs')))

const today = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const TODAY = iso(today)
const day = (offset) => iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset)))
const ym = (offset) => { const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1)); return d.toISOString().slice(0, 7) }
const D = (ymStr, dd) => `${ymStr}-${String(dd).padStart(2, '0')}`

const db = {
  baseCurrency: 'CNY',
  fx: { CNY: 1, HKD: 0.92, USD: 7.15, CNH: 0.92 },
  accounts: [], instruments: [], holdings: [], trades: [], snapshots: [],
  historyEvents: [], historyBatches: [], budgets: [],
  updatedAt: new Date(Date.now() - 3600e3).toISOString(),
}
const op = (name, payload) => applyOp(db, name, payload)
const acc = (name, currency, type) => op('account.upsert', { name, currency, type }).account
const hold = (accountId, symbol, market, name, assetClass, currency, qty, avgCost, manualPrice, sector, style) => {
  op('holding.upsert', { accountId, symbol, market, name, assetClass, currency, qty, avgCost, manualPrice })
  if (sector || style) op('instrument.upsert', { symbol, market, name, assetClass, currency, ...(sector ? { sector } : {}), ...(style ? { style } : {}) })
}
const ev = (accountId, kind, date, cashAmount, extra = {}) =>
  op('historyEvent.add', { event: { accountId, kind, date, cashAmount, source: 'demo', externalId: extra.externalId || null, ...extra } })

// ---- accounts -------------------------------------------------------------
const ths = acc('同花顺股票', 'CNY', 'broker')
const futu = acc('富途港美股', 'HKD', 'broker')
const lb = acc('长桥港股', 'HKD', 'broker')
const fund = acc('爱基金', 'CNY', 'fund')
const qieman = acc('且慢四笔钱', 'CNY', 'fund')
const card = acc('招商信用卡', 'CNY', 'credit')
const life = acc('微信零钱', 'CNY', 'bank')

// ---- holdings -------------------------------------------------------------
hold(ths.id, '510300', 'CN', '沪深300ETF', 'etf', 'CNY', 30000, 3.82, 4.16, '宽基', '均衡')
hold(ths.id, '600519', 'CN', '贵州茅台', 'stock', 'CNY', 100, 1580, 1712, '食品饮料', '价值')
hold(ths.id, '00700', 'HK', '腾讯控股', 'stock', 'HKD', 200, 310, 428, '信息技术', '成长')
hold(ths.id, 'CNY.CASH', 'CASH', '人民币现金', 'cash', 'CNY', 28600, 1, 1)
hold(futu.id, '00700', 'HK', '腾讯控股', 'stock', 'HKD', 500, 305, 428, '信息技术', '成长')
hold(futu.id, 'AAPL', 'US', '苹果', 'stock', 'USD', 40, 168, 232, '信息技术', '价值')
hold(futu.id, 'NVDA', 'US', '英伟达', 'stock', 'USD', 25, 118, 176, '信息技术', '成长')
hold(futu.id, 'HKD.CASH', 'CASH', '港元现金', 'cash', 'HKD', 22800, 1, 1)
hold(futu.id, 'USD.CASH', 'CASH', '美元现金', 'cash', 'USD', 3200, 1, 1)
hold(lb.id, '09988', 'HK', '阿里巴巴-W', 'stock', 'HKD', 500, 92, 121, '信息技术', '价值')
hold(lb.id, 'HKD.CASH', 'CASH', '港元现金', 'cash', 'HKD', 6400, 1, 1)
hold(fund.id, '005827', 'CN', '易方达蓝筹精选混合', 'fund', 'CNY', 60000, 2.02, 2.31)
hold(fund.id, '000051', 'CN', '华夏沪深300ETF联接A', 'fund', 'CNY', 26000, 1.24, 1.42)
hold(fund.id, '000198', 'CN', '天弘余额宝货币', 'fund', 'CNY', 30000, 1, 1)
hold(qieman.id, 'QMANA', 'CN', '盈米宝', 'cash', 'CNY', 18000, 1, 1)
hold(qieman.id, '161725', 'CN', '招商中证白酒指数(LOF)A', 'fund', 'CNY', 9000, 1.05, 0.98, '食品饮料', '价值')
hold(card.id, 'CREDIT.BALANCE', 'CASH', '本期账单', 'cash', 'CNY', 8640, 1, 1)
hold(life.id, 'CNY.CASH', 'CASH', '零钱', 'cash', 'CNY', 2350, 1, 1)

// ---- archived flows (investments) -----------------------------------------
ev(ths.id, 'deposit', D(ym(9), 10), 300000, { note: '银证转入', externalId: 'demo-ths-d1' })
ev(ths.id, 'deposit', D(ym(3), 4), 100000, { note: '银证转入', externalId: 'demo-ths-d2' })
ev(ths.id, 'withdrawal', D(ym(6), 20), -80000, { note: '银证转出', externalId: 'demo-ths-w1' })
ev(ths.id, 'dividend', D(ym(5), 12), 2400, { symbol: '00700', market: 'HK', name: '腾讯控股', currency: 'HKD', note: '年度股息', externalId: 'demo-ths-div1' })
ev(ths.id, 'dividend', D(ym(4), 1), 3150, { symbol: '600519', market: 'CN', name: '贵州茅台', currency: 'CNY', note: '中期分红', externalId: 'demo-ths-div2' })
ev(ths.id, 'tax', D(ym(5), 12), -480, { symbol: '00700', market: 'HK', name: '股息个税', currency: 'CNY', externalId: 'demo-ths-tax1' })
ev(futu.id, 'dividend', D(ym(2), 18), 345, { symbol: 'AAPL', market: 'US', name: '苹果', currency: 'USD', note: '季度股息', externalId: 'demo-ft-div1' })
const trade = (accountId, symbol, market, name, assetClass, currency, side, qty, price, fee, date, note) =>
  op('trade.add', { applyHoldings: false, trade: { accountId, symbol, market, name, assetClass, currency, side, qty, price, fee, date, note, source: 'demo', externalId: `demo-${accountId}-${symbol}-${side}-${date}` } })
trade(ths.id, '510300', 'CN', '沪深300ETF', 'etf', 'CNY', 'buy', 6000, 3.86, 4.63, D(ym(6), 8), '月度定投')
trade(ths.id, '510300', 'CN', '沪深300ETF', 'etf', 'CNY', 'buy', 6000, 3.74, 4.49, D(ym(5), 8), '月度定投')
trade(ths.id, '510300', 'CN', '沪深300ETF', 'etf', 'CNY', 'buy', 6000, 3.91, 4.69, D(ym(2), 8), '月度定投')
trade(ths.id, '600519', 'CN', '贵州茅台', 'stock', 'CNY', 'buy', 30, 1618, 97.08, D(ym(7), 3), '加仓')
trade(ths.id, '00700', 'HK', '腾讯控股', 'stock', 'HKD', 'buy', 100, 342, 68.4, D(ym(4), 22), '港股通买入')
trade(futu.id, 'NVDA', 'US', '英伟达', 'stock', 'USD', 'buy', 10, 132, 1, D(ym(6), 2), '')
trade(futu.id, 'NVDA', 'US', '英伟达', 'stock', 'USD', 'buy', 15, 148, 1.5, D(ym(1), 9), '')
trade(futu.id, 'AAPL', 'US', '苹果', 'stock', 'USD', 'buy', 20, 182, 1, D(ym(7), 14), '')
trade(lb.id, '09988', 'HK', '阿里巴巴-W', 'stock', 'HKD', 'buy', 300, 104, 31.2, D(ym(5), 26), '')

// ---- life bills (13 months, deterministic) --------------------------------
const BILLS = [
  // [day, kind, category, base, note, everyN]
  [1, 'withdrawal', 'housing', 4600, '房租'],
  [3, 'withdrawal', 'telecom', 128, '中国移动'],
  [5, 'withdrawal', 'food', 38.5, '美团-外卖'],
  [9, 'withdrawal', 'food', 86.2, '盒马鲜生'],
  [15, 'withdrawal', 'food', 45, '瑞幸咖啡'],
  [7, 'withdrawal', 'transport', 23.5, '地铁充值'],
  [18, 'withdrawal', 'transport', 56, '滴滴出行'],
  [12, 'withdrawal', 'shopping', 168, '京东-日用'],
  [17, 'withdrawal', 'entertainment', 88, '电影票'],
  [24, 'withdrawal', 'social', 500, '家人红包', 3],
  [22, 'withdrawal', 'health', 156.5, '口腔诊所', 2],
  [14, 'withdrawal', 'education', 299, '得到课程', 3],
  [26, 'withdrawal', 'shopping', 892.5, '京东-家电', 4],
]
for (let m = 13; m >= 0; m--) {
  const month = ym(m)
  if (m >= 1) ev(life.id, 'deposit', D(month, 10), 25000, { note: '工资', externalId: `demo-salary-${month}` })
  for (const [dd, kind, category, base, note, everyN] of BILLS) {
    if (everyN && (m % everyN) !== 0) continue
    if (D(month, dd) > TODAY) continue
    const wobble = 1 + ((m * 37 + dd) % 11 - 5) / 100 // ±5% deterministic
    ev(life.id, kind, D(month, dd), -Math.round(base * wobble * 100) / 100, { category, note, currency: 'CNY', externalId: `demo-bill-${month}-${dd}` })
  }
}
for (const [category, monthly] of [['food', 2500], ['transport', 800], ['shopping', 1500], ['entertainment', 600], ['housing', 4800]]) op('budget.set', { category, monthly })

// ---- snapshots -------------------------------------------------------------
const fxOf = (cur) => db.fx[cur] ?? 1
const totalOf = () => {
  let assets = 0
  for (const h of db.holdings) {
    const account = db.accounts.find((a) => a.id === h.accountId)
    if (account?.type === 'credit') continue
    const ins = db.instruments.find((i) => i.id === h.instrumentId)
    const cur = h.currency || ins?.currency || 'CNY'
    const price = h.manualPrice ?? h.avgCost ?? 0
    assets += h.qty * price * fxOf(cur)
  }
  return Math.round(assets * 100) / 100
}
const END = totalOf()
// Snapshots must include the cash the demo actually moved, otherwise the real
// TWR/XIRR math (V1 / (V0 + F)) correctly reports a loss.
const externalFlows = db.historyEvents
  .filter((e) => (e.kind === 'deposit' || e.kind === 'withdrawal') && (!e.currency || e.currency === 'CNY'))
  .map((e) => ({ date: e.date, amount: e.cashAmount || 0 }))
const EXTERNAL_TOTAL = externalFlows.reduce((sum, f) => sum + f.amount, 0)
const externalAt = (date) => externalFlows.filter((f) => f.date <= date).reduce((sum, f) => sum + f.amount, 0)
const SNAP_DAYS = 120
const GROWTH = 1.09 // investment return across the snapshot window
const CAPITAL0 = (END - EXTERNAL_TOTAL) / GROWTH
for (let i = SNAP_DAYS; i >= 0; i--) {
  const date = day(i)
  const t = (SNAP_DAYS - i) / SNAP_DAYS
  const invest = CAPITAL0 * (1 + (GROWTH - 1) * (t * 0.62 + t * t * 0.38))
  const wobble = Math.sin(i / 6.2) * 3400 + Math.sin(i / 2.3) * 1100 + ((i * 7919) % 977 - 488) * 0.5
  const dip = i >= 26 && i <= 31 ? -9000 * Math.sin(((31 - i) / 5) * Math.PI) : 0
  db.snapshots.push({ date, baseCurrency: 'CNY', totalValueBase: Math.round(invest + externalAt(date) + wobble + dip) })
}
db.snapshots[db.snapshots.length - 1].totalValueBase = END
// 最后 7 天归一成一条平滑小上坡，避免被当月入金/账单的锯齿盖过趋势
for (let k = 1; k <= 7; k++) db.snapshots[db.snapshots.length - 1 - k].totalValueBase = Math.round(END - k * 760)

// History coverage markers so the account page can show what was synced.
db.historySync = {
  [ths.id]: { sourceId: 'src-ths', lastFrom: '2016-01-05', lastTo: TODAY },
  [futu.id]: { sourceId: 'src-futu', lastFrom: '2021-03-02', lastTo: TODAY },
  [lb.id]: { sourceId: 'src-lb', lastFrom: '2024-06-18', lastTo: TODAY },
  [fund.id]: { sourceId: 'src-fund', lastFrom: '2018-11-01', lastTo: TODAY },
  [qieman.id]: { sourceId: 'src-qieman', lastFrom: '2025-02-01', lastTo: TODAY },
}

// One complete-looking batch per sourced account instead of 150+ manual rows.
db.historyBatches = [ths, futu, lb, fund, qieman].map((a) => ({
  id: 'BATCH-' + a.id, accountId: a.id, importedAt: db.updatedAt, imported: db.historyEvents.filter((e) => e.accountId === a.id).length,
  duplicates: 0, outside: 0, method: 'api',
  coverage: { method: 'api', requestedFrom: '2016-01-01', requestedTo: TODAY, complete: true, note: '券商接口回补' },
  byKind: {},
}))

// ---- server-shaped responses ----------------------------------------------
const summary = summarize(db)
const analysis = analyze(db)
const bills = billSummary(db, { months: 12, today: TODAY })
const fc = forecast(db, { today: new Date(TODAY), days: 30 })
const digest = buildDigest(db, { today: new Date(TODAY), horizonDays: 7 })

const perfSeries = []
{
  const N = 180
  for (let i = N; i >= 0; i--) {
    const t = (N - i) / N
    const base = END * (0.845 + 0.155 * (t * 0.75 + t * t * 0.25))
    const wobble = Math.sin(i / 5.1) * END * 0.006 + Math.sin(i / 2.7) * END * 0.002 + ((i * 6271) % 997 - 498) / 997 * END * 0.004
    const dip = i >= 40 && i <= 47 ? -END * 0.012 * Math.sin(((47 - i) / 7) * Math.PI) : 0
    perfSeries.push({ date: day(i), totalValueBase: Math.round(base + wobble + dip) })
  }
  perfSeries[0].totalValueBase = Math.round(END * 0.845)
  perfSeries[perfSeries.length - 1].totalValueBase = END
}
const start = perfSeries[0].totalValueBase
const change = END - start
const performance = {
  ok: true, baseCurrency: 'CNY',
  from: perfSeries[0].date, to: perfSeries[perfSeries.length - 1].date,
  series: perfSeries,
  metrics: {
    days: perfSeries.length, change, changePct: Math.round((change / start) * 10000) / 100,
    endValue: END, startValue: start,
    maxDrawdown: { value: 2.1, peakDate: day(52), troughDate: day(45) },
  },
  warnings: [], klines: { fetched: 0, cached: perfSeries.length },
}

const state = { ok: true, version: '0.9.10', ledger: db, summary, analysis }
const accountsPage = {
  ok: true,
  sources: [
    { id: 'src-ths', accountId: ths.id, connector: 'ths', transport: 'native', authId: 'AUTH_ths', name: '同花顺 · 股票账本', portfolioId: '6008888', thsBookType: 'common', intervalMinutes: 1440, enabled: true, lastStatus: 'ok', lastSuccessAt: TODAY + 'T06:47:00Z', lastAttemptAt: TODAY + 'T06:47:00Z' },
    { id: 'src-futu', accountId: futu.id, connector: 'futu', transport: 'mcp', authId: 'AUTH_futu', name: '富途 · 港美股', brokerAccountId: '88880021', intervalMinutes: 1440, enabled: true, lastStatus: 'ok', lastSuccessAt: TODAY + 'T06:47:00Z', lastAttemptAt: TODAY + 'T06:47:00Z' },
    { id: 'src-lb', accountId: lb.id, connector: 'longbridge', transport: 'mcp', authId: 'AUTH_lb', name: '长桥 · 港股', brokerAccountId: 'main', intervalMinutes: 0, enabled: true, lastStatus: 'ok', lastSuccessAt: TODAY + 'T02:10:00Z', lastAttemptAt: TODAY + 'T02:10:00Z' },
    { id: 'src-fund', accountId: fund.id, connector: 'ths', transport: 'native', authId: 'AUTH_ths', name: '同花顺 · 爱基金', portfolioId: '100108832246', thsBookType: 'ijj', intervalMinutes: 1440, enabled: true, lastStatus: 'ok', lastSuccessAt: TODAY + 'T06:47:00Z', lastAttemptAt: TODAY + 'T06:47:00Z' },
    { id: 'src-qieman', accountId: qieman.id, connector: 'qieman', transport: 'mcp', authId: 'AUTH_qieman', name: '且慢 · 四笔钱', brokerAccountId: 'main', intervalMinutes: 1440, enabled: true, lastStatus: 'ok', lastSuccessAt: TODAY + 'T05:30:00Z', lastAttemptAt: TODAY + 'T05:30:00Z' },
  ],
  authorizations: [
    { id: 'AUTH_ths', connector: 'ths', transport: 'native', label: '同花顺投资账本', config: {}, accounts: [{ id: '6008888', name: '股票账本', currency: 'CNY', imported: true, sourceId: 'src-ths', accountId: ths.id, accountName: ths.name }, { id: '100108832246', name: '爱基金 · 基金账本', currency: 'CNY', imported: true, sourceId: 'src-fund', accountId: fund.id, accountName: fund.name }], accountsFetchedAt: TODAY + 'T06:47:00Z', authorizedAt: D(ym(10), 6) + 'T10:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_futu', connector: 'futu', transport: 'mcp', label: '富途 · 尾号 8821', config: {}, accounts: [{ id: '88880021', name: '融资账户 · 尾号 0021', currency: null, imported: true, sourceId: 'src-futu', accountId: futu.id, accountName: futu.name }], accountsFetchedAt: TODAY + 'T06:47:00Z', authorizedAt: D(ym(9), 12) + 'T09:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_lb', connector: 'longbridge', transport: 'mcp', label: '长桥 · 主账户', config: {}, accounts: [{ id: 'main', name: '主账户', currency: null, imported: true, sourceId: 'src-lb', accountId: lb.id, accountName: lb.name }], accountsFetchedAt: TODAY + 'T02:10:00Z', authorizedAt: D(ym(8), 20) + 'T14:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_qieman', connector: 'qieman', transport: 'mcp', label: '且慢 · 手机尾号 3306', config: {}, accounts: [{ id: 'main', name: '总账户', currency: 'CNY', imported: true, sourceId: 'src-qieman', accountId: qieman.id, accountName: qieman.name }], accountsFetchedAt: TODAY + 'T05:30:00Z', authorizedAt: D(ym(7), 2) + 'T11:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_tiger', connector: 'tiger', transport: 'mcp', label: '老虎证券 · 尾号 4102', config: {}, accounts: [{ id: '40105888', name: '标准账户 · 尾号 5888', currency: null, imported: false }, { id: '40109999', name: '基金账户 · 尾号 9999', currency: null, imported: false }], accountsFetchedAt: D(ym(2), 15) + 'T08:00:00Z', authorizedAt: D(ym(2), 15) + 'T08:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_fosun', connector: 'fosun', transport: 'native', label: '复星证券 · 星财富', config: {}, accounts: [], accountsFetchedAt: null, authorizedAt: D(ym(1), 8) + 'T10:00:00Z', credentialsConfigured: true, lastError: null },
    { id: 'AUTH_ib', connector: 'ib', transport: 'native', label: 'IB · U***8821', config: { apiBase: 'https://localhost:5000/v1/api' }, accounts: [{ id: 'U8888821', name: '现金现货账户 U8888821', currency: 'USD', imported: false }], accountsFetchedAt: D(ym(3), 1) + 'T12:00:00Z', authorizedAt: D(ym(3), 1) + 'T12:00:00Z', credentialsConfigured: true, lastError: null },
  ],
  connectors: [
    { id: 'ths', available: true, description: '官方 MCP 一键授权，读取股票与基金账本' },
    { id: 'futu', available: true, description: '官方 MCP 浏览器授权，或本机 OpenD' },
    { id: 'longbridge', available: true, description: '官方 MCP 授权码，或 OpenAPI 凭据' },
    { id: 'qieman', available: true, description: '盈米官方 MCP，用户级 OAuth 授权' },
    { id: 'tiger', available: true, description: '老虎官方远程 MCP，浏览器授权' },
    { id: 'fosun', available: true, description: '星财富官方 OpenAPI，扫码开通' },
    { id: 'ib', available: true, description: '本机 Client Portal Gateway' },
  ],
}

const chatProposal = {
  ok: true,
  model: '演示模型 (示例数据)',
  revision: db.updatedAt,
  reply: '看了一圈，发现这些需要修正：\n1. 富途账户的美元现金记录了 3,200 美元，但最近没有出入金记录，看起来是同步时留下的重复行，建议删除；\n2. 长桥的阿里巴巴-W 成本价 92 港元偏低（去年买入价约 104），我把成本修正为 104 港元；\n3. 昨天 118 元的盒马订单还没归类，我标为「餐饮」。\n确认后我会一次写入这 3 项变更。',
  ops: [
    { op: 'holding.upsert', accountId: lb.id, symbol: '09988', market: 'HK', name: '阿里巴巴-W', assetClass: 'stock', currency: 'HKD', avgCost: 104 },
    { op: 'holding.remove', id: db.holdings.find((h) => h.symbol === 'USD.CASH')?.id || 'USD.CASH' },
    { op: 'historyEvent.add', event: { accountId: life.id, kind: 'withdrawal', date: day(1), cashAmount: -118, category: 'food', note: '盒马鲜生', currency: 'CNY' } },
  ],
}

// ---- preview.html ----------------------------------------------------------
mkdirSync(join(ROOT, 'brand'), { recursive: true })
let client = readFileSync(join(ROOT, 'client.js'), 'utf8').replace(/return \{\r?\n      inject: \['slots'\],/, "window.__PortfolioPage = PortfolioPage\n    return {\n      inject: ['slots'],")
const json = (v) => JSON.stringify(v)
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>资产账本 · 演示</title><style>html,body,#root{margin:0;height:100%;}*{box-sizing:border-box}button,input,select,textarea{font:inherit}</style><div id="root"></div>
<script>${readFileSync(join(ROOT, 'brand/vendor/react.js'), 'utf8')}</script>
<script>${readFileSync(join(ROOT, 'brand/vendor/react-dom.js'), 'utf8')}</script>
<script>
window.__fixture=${json(state)};
window.__sourcesData=${json(accountsPage)};
window.__digest=${json(digest)};
window.__bills=${json(bills)};
window.__forecast=${json(fc)};
window.__performance=${json(performance)};
window.__chatProposal=${json(chatProposal)};
window.fetch=async(path,opts)=>{
  const J=(v)=>({ok:true,json:async()=>v});
  if(path.endsWith('/state'))return J(window.__fixture);
  if(path.includes('/model'))return J({ok:true,model:{label:'演示模型（示例数据）'}});
  if(path.includes('/digest'))return J({ok:true,...window.__digest});
  if(path.includes('/bills/preview'))return J({ok:true,text:'',categories:[],warnings:[]});
  if(path.includes('/bills'))return J({ok:true,...window.__bills});
  if(path.includes('/forecast'))return J({ok:true,...window.__forecast});
  if(path.includes('/inferred-flows'))return J({ok:true,total:18600,byMonth:[{month:'${ym(2)}',inflow:0,outflow:18600,events:1,note:'推定入金下限'}],note:'由负现金缺口推估'});
  if(path.includes('/analysis'))return J({ok:true,analysis:window.__fixture.analysis});
  if(path.includes('/performance'))return J(window.__performance);
  if(path.endsWith('/chat')){const b=opts?JSON.parse(opts.body||'{}'):{};
    if(!window.__chatUsed){window.__chatUsed=true;return J(window.__chatProposal)}
    return J({ok:true,reply:'好的，这条演示回复不再产生变更。你可以继续问：比如“白酒指数现在占多少？”或“把茅台的现价更新一下”。',ops:[],model:'演示模型（示例数据）',revision:window.__fixture.ledger.updatedAt})}
  if(path.endsWith('/chat/apply'))return J({ok:true,applied:3});
  if(path.includes('/sources/auth/'))return J({ok:true,...window.__sourcesData});
  if(path.includes('/sources'))return J(window.__sourcesData);
  if(path.includes('/history/capabilities'))return J({ok:true,accounts:window.__fixture.ledger.accounts.map(a=>({accountId:a.id,name:a.name,connector:'ths',apiAvailable:true,description:'演示数据'})),limits:{maxFileBytes:5242880,maxRows:25000}});
  if(path.includes('/history/preview'))return J({ok:true,rows:[],summary:{},errors:[],warnings:[],token:'demo'});
  if(path.includes('/op'))return {ok:false,status:400,json:async()=>({ok:false,error:{message:'演示页面为只读'}})};
  return J(window.__fixture);
};
if(new URLSearchParams(location.search).get('theme')==='dark'){const orig=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('prefers-color-scheme')?{matches:true,addEventListener(){},removeEventListener(){}}:orig(q)}
window.__ModuleLoader__={load:({factory})=>factory(()=>React)};
</script>
<script>${client}</script>
<script>ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.__PortfolioPage))</script></html>`
writeFileSync(join(ROOT, 'brand', 'preview.html'), html)
writeFileSync(join(ROOT, 'brand', 'demo-db.json'), JSON.stringify(db))
writeFileSync(join(ROOT, 'brand', 'demo-state.json'), json({ END, today: TODAY, totals: summary.totals, snapshotCount: db.snapshots.length, events: db.historyEvents.length, trades: db.trades.length, accounts: db.accounts.map((a) => ({ name: a.name, type: a.type })) }, null, 2))
console.log('preview written · END =', END, '· events =', db.historyEvents.length, '· trades =', db.trades.length)
