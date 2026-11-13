// 预览版构建：把当前 client.js 包进一个自包含页面，配一份演示账本和只读 mock API，
// 输出到 preview/public/index.html，由 dsh-wealth-preview 插件挂到 /portfolio-preview。
//
// 演示数据来自 brand/demo-db.json（demo-fixture 生成的虚构账本）；没有就先跑
// node scripts/demo-fixture.mjs。演示账本上额外挂两条「待确认标的」，用来展示
// 证券目录核验、候选采用、重新查询的完整流程。
//
// 页面里的交互（确认标的、编辑/添加持仓、改价格）只改浏览器内存中的演示账本，
// 不发起任何真实请求，也绝不触碰 ~/.dsh/data/dsh-portfolio。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const load = (f) => import(pathToFileURL(join(ROOT, f)))
const { applyOp, summarize } = await load('store.mjs')
const { analyze } = await load('analytics.mjs')
const { billSummary } = await load('bills.mjs')
const { forecast } = await load('forecast.mjs')
const { buildDigest } = await load('digest.mjs')

const DEMO_DB = join(ROOT, 'brand', 'demo-db.json')
if (!existsSync(DEMO_DB)) {
  console.log('brand/demo-db.json 不存在，先运行 scripts/demo-fixture.mjs 生成演示账本…')
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'demo-fixture.mjs')], { stdio: 'inherit' })
}
const db = JSON.parse(readFileSync(DEMO_DB, 'utf8'))

// ---- 演示数据：两条「入库时没核对上身份」的标的 ---------------------------
const fundAcc = db.accounts.find((a) => a.type === 'fund') || db.accounts[0]
const hkAcc = db.accounts.find((a) => a.currency === 'HKD') || db.accounts[0]
const at = db.updatedAt || new Date().toISOString()

// ① 券商把场外基金报成六位代码：公开目录里 000001 只有平安银行的股票档 → 身份冲突。
applyOp(db, 'holding.upsert', { accountId: fundAcc.id, symbol: '000001', market: 'FUND', name: '000001', assetClass: 'fund', currency: 'CNY', qty: 12000, avgCost: 1.02 })
const pendingFund = db.instruments.find((i) => i.symbol === '000001' && i.assetClass === 'fund')
pendingFund.verification = {
  status: 'pending', source: 'eastmoney', at,
  reason: '公开目录里 000001 是「平安银行」（A股），和券商报的场外基金对不上',
  candidates: [{ symbol: '000001', market: 'CN', name: '平安银行', securityType: 'A股', assetClass: 'stock', provider: 'eastmoney' }],
}

// ② 查询超时：身份没核上，但给出了唯一候选。
applyOp(db, 'holding.upsert', { accountId: hkAcc.id, symbol: '02549', market: 'HK', name: '02549', assetClass: 'stock', currency: 'HKD', qty: 800, avgCost: 34.2 })
const pendingHk = db.instruments.find((i) => i.symbol === '02549')
pendingHk.verification = {
  status: 'pending', source: 'eastmoney', at,
  reason: '核验查询失败：timeout',
  candidates: [{ symbol: '02549', market: 'HK', name: '卡罗特', securityType: '港股', assetClass: 'stock', provider: 'eastmoney' }],
}

// ---- 服务端形态的演示响应（真的走一遍摘要 / 分析 / 账单 / 预测 / 日报） ----
const today = new Date()
const TODAY = today.toISOString().slice(0, 10)
const summary = summarize(db)
const analysis = analyze(db)
const bills = billSummary(db, { months: 12, today: TODAY })
const fc = forecast(db, { today: new Date(TODAY), days: 30 })
const digest = buildDigest(db, { today: new Date(TODAY), horizonDays: 7 })
const series = (db.snapshots || []).slice(-180).map((s) => ({ date: s.date, totalValueBase: s.totalValueBase }))
const startValue = series[0]?.totalValueBase ?? 0
const endValue = series[series.length - 1]?.totalValueBase ?? 0
const performance = {
  ok: true, baseCurrency: db.baseCurrency,
  from: series[0]?.date ?? null, to: series[series.length - 1]?.date ?? null,
  series,
  metrics: { days: series.length, startValue, endValue, change: endValue - startValue, changePct: startValue ? Math.round(((endValue - startValue) / startValue) * 10000) / 100 : 0, maxDrawdown: null },
  warnings: [], klines: { fetched: 0, cached: series.length },
}
const sources = {
  ok: true,
  sources: db.accounts.filter((a) => a.type === 'broker' || a.type === 'fund').slice(0, 5).map((a, i) => ({
    id: 'src-demo-' + i, accountId: a.id, connector: ['ths', 'futu', 'longbridge', 'qieman'][i % 4], transport: 'mcp',
    name: a.name + ' · 演示连接', intervalMinutes: 1440, enabled: true, lastStatus: 'ok',
    lastSuccessAt: at, lastAttemptAt: at,
  })),
  authorizations: [], connectors: [],
}
// 设置页要读 state.dataSource.thsData / westock，保存 Key 后还要读响应里的 thsData。
const dataSource = {
  thsData: { configured: false, adminUrl: 'https://fuyao.aicubes.cn/admin' },
  westock: { configured: false, authUrl: '' },
}

// ---- 生成页面 -------------------------------------------------------------
const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  .replace(/return \{\r?\n      inject: \['slots'\],/, "window.__PortfolioPage = PortfolioPage\n    return {\n      inject: ['slots'],")
const json = (v) => JSON.stringify(v)
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>资产账本 · 预览</title>
<style>html,body,#root{margin:0;height:100%;background:#f7f8fb;}*{box-sizing:border-box}button,input,select,textarea{font:inherit}</style>
<div id="root"></div>
<script>${readFileSync(join(ROOT, 'brand/vendor/react.js'), 'utf8')}</script>
<script>${readFileSync(join(ROOT, 'brand/vendor/react-dom.js'), 'utf8')}</script>
<script>
window.__demo = ${json({ ledger: db, responses: { summary, analysis, bills, forecast: fc, digest, performance, sources, dataSource } })};

// ---------- 演示账本上的交互式 mock（不联网、不读写真实数据） ----------
const DB = window.__demo.ledger, RES = window.__demo.responses
const J = (v) => ({ ok: true, json: async () => v })
const bad = (msg) => ({ ok: false, status: 400, json: async () => ({ ok: false, error: { code: 'bad-request', message: msg } }) })
const norm = (s, market) => {
  const raw = String(s || '').trim()
  if (market === 'HK') { const c = raw.replace(/^HK[.:]?/i, '').replace(/\\.HK$/i, '').replace(/^0+/, ''); return /^\\d{1,5}$/.test(c) ? c.padStart(5, '0') : raw.toUpperCase() }
  if (market === 'CN' || market === 'FUND') { const c = raw.replace(/^(SH|SZ|BJ)[.:]?/i, '').replace(/\\.(SH|SZ|BJ|OF)$/i, ''); return /^\\d{6}$/.test(c) ? c : raw }
  return raw.toUpperCase()
}
const isFund = (i) => i.market === 'FUND' || String(i.assetClass || '').toLowerCase() === 'fund'
const sameIdentity = (a, b) => {
  const six = /^\\d{6}$/.test(norm(a.symbol, a.market)) && ['CN', 'FUND'].includes(a.market) && ['CN', 'FUND'].includes(b.market)
  if (norm(a.symbol, a.market) !== norm(b.symbol, b.market)) return false
  return six ? isFund(a) === isFund(b) : a.market === b.market
}
const touched = () => { DB.updatedAt = new Date().toISOString() }
const ledgerResponse = (result) => ({ ok: true, result, ledger: DB, summary: RES.summary, analysis: RES.analysis })

function findOrCreateInstrument(p) {
  const found = DB.instruments.find((i) => sameIdentity(i, p))
  if (found) return found
  const ins = { id: 'INS_DEMO_' + Math.random().toString(36).slice(2, 8).toUpperCase(), symbol: norm(p.symbol, p.market), name: p.name || p.symbol, market: p.market || 'CN', assetClass: p.assetClass || 'stock', currency: p.currency || (p.market === 'HK' ? 'HKD' : p.market === 'US' ? 'USD' : 'CNY'), createdAt: new Date().toISOString() }
  DB.instruments.push(ins)
  return ins
}

function confirmInstrument(p) {
  const ins = DB.instruments.find((i) => i.id === p.id)
  if (!ins) throw new Error('标的不存在')
  if (p.symbol) ins.symbol = norm(p.symbol, p.market || ins.market)
  if (p.market) ins.market = p.market
  if (p.assetClass) ins.assetClass = p.assetClass
  if (p.name) ins.name = p.name
  if (p.securityType !== undefined) ins.securityType = p.securityType
  ins.verification = { status: 'verified', source: p.source || 'user', at: new Date().toISOString() }
  // 身份撞车 → 演示里做同样的并账
  const clash = DB.instruments.find((i) => i.id !== ins.id && sameIdentity(i, ins))
  if (clash) {
    for (const h of DB.holdings) if (h.instrumentId === ins.id) h.instrumentId = clash.id
    DB.instruments = DB.instruments.filter((i) => i.id !== ins.id)
    return { instrument: clash, mergedInto: clash.id }
  }
  return { instrument: ins }
}

function upsertHolding(p) {
  if (!p.accountId) throw new Error('缺少 accountId')
  const ins = findOrCreateInstrument(p)
  let holding = p.id ? DB.holdings.find((h) => h.id === p.id) : DB.holdings.find((h) => h.accountId === p.accountId && h.instrumentId === ins.id)
  if (!holding) {
    holding = { id: 'POS_DEMO_' + Math.random().toString(36).slice(2, 8).toUpperCase(), accountId: p.accountId, instrumentId: ins.id, qty: 0, avgCost: null, currency: p.currency || ins.currency, manualPrice: null, quotePrice: null }
    DB.holdings.push(holding)
  }
  const num = (v) => v === '' || v === undefined || v === null ? undefined : Number(v)
  if (num(p.qty) !== undefined) holding.qty = num(p.qty)
  if (num(p.avgCost) !== undefined) holding.avgCost = num(p.avgCost)
  if (p.manualPrice !== undefined) holding.manualPrice = num(p.manualPrice) ?? null
  return { holding }
}

// 脚本化的「重新查询」：代码+市场+类别都能对上的候选 → 核验通过；否则仍是待确认。
function verifyScripted(ins) {
  const candidates = (ins.verification && ins.verification.candidates) || []
  const wantFund = isFund(ins)
  const exact = candidates.find((c) => norm(c.symbol, c.market) === norm(ins.symbol, ins.market) && (c.assetClass ? (c.assetClass === 'fund') === wantFund : c.market === ins.market))
  if (exact) {
    const placeholder = !ins.name || ins.name === ins.symbol
    if (exact.name && placeholder) ins.name = exact.name
    if (exact.securityType && !ins.securityType) ins.securityType = exact.securityType
    ins.verification = { status: 'verified', source: 'eastmoney', at: new Date().toISOString(), securityType: exact.securityType || null }
    return 'verified'
  }
  ins.verification = { status: 'pending', source: 'eastmoney', at: new Date().toISOString(), reason: '公开目录候选与当前声明的市场或类别不一致', candidates }
  return 'pending'
}

const CANNED = [
  { symbol: '600519', market: 'CN', name: '贵州茅台', securityType: 'A股', assetClass: 'stock', provider: 'eastmoney' },
  { symbol: '00700', market: 'HK', name: '腾讯控股', securityType: '港股', assetClass: 'stock', provider: 'eastmoney' },
  { symbol: '000001', market: 'CN', name: '平安银行', securityType: 'A股', assetClass: 'stock', provider: 'eastmoney' },
  { symbol: '000001', market: 'FUND', name: '华夏成长混合', securityType: '基金 · 混合型-灵活', assetClass: 'fund', provider: 'eastmoney' },
  { symbol: 'AAPL', market: 'US', name: '苹果', securityType: '美股', assetClass: 'stock', provider: 'eastmoney' },
]

// 演示行情：只有这两只有公开行情的标的能被「⟳ 更新行情」刷出价——正好演示
// 「确认身份之后，行情才补得上；估值提示随之消失」。其余持仓沿用生成时的价格。
const DEMO_QUOTES = {
  sz000001: { price: 12.05, changePct: 0.42, name: '平安银行', currency: 'CNY', source: 'tencent' },
  hk02549: { price: 35.6, changePct: 1.15, name: '卡罗特', currency: 'HKD', source: 'tencent' },
}

window.fetch = async (path, opts) => {
  const url = String(path)
  const body = opts && opts.body ? JSON.parse(opts.body) : {}
  if (url.endsWith('/state')) return J({ ok: true, version: '0.0.0-preview', ledger: DB, summary: RES.summary, analysis: RES.analysis, dataSource: RES.dataSource })
  if (url.includes('settings/data-source')) {
    // 演示里不保存任何 Key，只切换「已配置」状态，让设置页的提示文案可走通。
    RES.dataSource.thsData = { ...RES.dataSource.thsData, configured: Boolean(body.token) }
    return J({ ok: true, thsData: RES.dataSource.thsData })
  }
  if (url.includes('/instruments/search')) {
    const q = decodeURIComponent((url.split('q=')[1] || '').split('&')[0] || '').trim().toLowerCase()
    const hits = CANNED.filter((c) => c.symbol.toLowerCase().startsWith(q) || c.name.includes(q) || q.includes(c.name.toLowerCase()))
    return J({ ok: true, candidates: hits.slice(0, 3) })
  }
  if (url.includes('/instruments/verify')) {
    const ins = DB.instruments.find((i) => i.id === body.id)
    if (!ins) return bad('标的不存在')
    const status = verifyScripted(ins)
    touched()
    return J({ ok: true, instrument: ins, status, ledger: DB, summary: RES.summary, analysis: RES.analysis })
  }
  if (url.endsWith('/op')) {
    try {
      let result
      switch (body.op) {
        case 'instrument.confirm': result = confirmInstrument(body); break
        case 'holding.upsert': result = upsertHolding(body.holding || body); break
        case 'holding.remove': result = { removed: body.id }; DB.holdings = DB.holdings.filter((h) => h.id !== body.id); break
        case 'price.set': { const h = DB.holdings.find((x) => x.id === body.holdingId) || DB.holdings.find((x) => x.instrumentId === body.instrumentId); if (h) h.manualPrice = body.price == null ? null : Number(body.price); result = { holding: h }; break }
        case 'instrument.upsert': { const ins = body.instrument || body; const found = DB.instruments.find((i) => i.id === (ins.id || body.instrumentId)); if (found) Object.assign(found, { ...(ins.name ? { name: ins.name } : {}), ...(ins.assetClass ? { assetClass: ins.assetClass } : {}), ...(ins.sector !== undefined ? { sector: ins.sector } : {}), ...(ins.style !== undefined ? { style: ins.style } : {}) }); result = { instrument: found }; break }
        case 'budget.set': result = { budget: { category: body.category, monthly: body.monthly } }; break
        default: result = { ok: true }
      }
      touched()
      return J(ledgerResponse(result))
    } catch (error) { return bad(error.message) }
  }
  if (url.endsWith('/quotes/refresh')) {
    // 与 quotes.mjs 的 quoteKey / fundQuoteKey 同规则（演示只覆盖股票/ETF 键）。
    const keyOf = (i) => {
      const m = String(i.market || '').toUpperCase(), s = String(i.symbol || '').trim()
      const cls = String(i.assetClass || '').toLowerCase()
      if (!s || !['stock', 'etf'].includes(cls)) return ''
      if (m === 'CN') return /^(6|9|5)/.test(s) ? 'sh' + s : (/^(0|1|2|3)/.test(s) ? 'sz' + s : '')
      if (m === 'HK') return /^\\d{3,5}$/.test(s) ? 'hk' + s.padStart(5, '0') : ''
      if (m === 'US') return /^[A-Z][A-Z.]{0,9}$/.test(s.toUpperCase()) ? 'us' + s.toUpperCase() : ''
      return ''
    }
    const now = new Date().toISOString()
    const priced = new Set()
    for (const h of DB.holdings) {
      const i = DB.instruments.find((x) => x.id === h.instrumentId)
      const q = i ? DEMO_QUOTES[keyOf(i)] : null
      if (!q) continue
      h.quotePrice = q.price
      h.quoteAt = now
      h.quoteSource = q.source
      h.quoteChangePct = q.changePct
      priced.add(h.id)
    }
    // 有价之后，估值提示里的对应条目跟着消失（真实后端是重算摘要，这里等价模拟）。
    RES.summary.warnings = (RES.summary.warnings || []).filter((w) => !priced.has(w.holdingId))
    touched()
    return J({ ok: true, updated: priced.size, warnings: [], fx: {}, summary: RES.summary, analysis: RES.analysis })
  }
  if (url.includes('/model')) return J({ ok: true, model: { label: '演示模型（示例数据）' } })
  if (url.includes('/digest')) return J({ ok: true, ...RES.digest })
  if (url.includes('/bills/preview')) return J({ ok: true, text: '', categories: [], warnings: [] })
  if (url.includes('/bills')) return J({ ok: true, ...RES.bills })
  if (url.includes('/forecast')) return J({ ok: true, ...RES.forecast })
  if (url.includes('/inferred-flows')) return J({ ok: true, total: 0, byMonth: [], note: '演示数据' })
  if (url.includes('/analysis')) return J({ ok: true, analysis: RES.analysis })
  if (url.includes('/performance')) return J(RES.performance)
  if (url.endsWith('/chat')) return J({ ok: true, reply: '预览版只演示证券目录与待确认流程；对话写入请在正式版里试用。', ops: [], model: '演示模型', revision: DB.updatedAt })
  if (url.endsWith('/chat/apply')) return J({ ok: true, applied: 0 })
  if (url.includes('/sources/auth/')) return J({ ok: true, ...RES.sources })
  if (url.includes('/sources')) return J(RES.sources)
  if (url.includes('/history/capabilities')) return J({ ok: true, accounts: [], limits: { maxFileBytes: 5242880, maxRows: 25000 } })
  if (url.includes('/history/preview')) return J({ ok: true, rows: [], summary: {}, errors: [], warnings: [], token: 'demo' })
  return J({ ok: true })
}
if (new URLSearchParams(location.search).get('theme') === 'dark') { const orig = window.matchMedia.bind(window); window.matchMedia = (q) => q.includes('prefers-color-scheme') ? { matches: true, addEventListener() {}, removeEventListener() {} } : orig(q) }
window.__ModuleLoader__ = { load: ({ factory }) => factory(() => React) }
</script>
<script>${client}</script>
<script>
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.__PortfolioPage))
const badge = document.createElement('div')
badge.textContent = '预览模式 · 演示数据 · 不读写真实账本'
badge.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;background:#1c2c49;color:#f5f3ee;font:600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.02em;padding:8px 12px;border-radius:999px;opacity:.9;pointer-events:none;box-shadow:0 8px 24px rgba(20,30,55,.28)'
document.body.appendChild(badge)
</script></html>`

mkdirSync(join(ROOT, 'preview', 'public'), { recursive: true })
writeFileSync(join(ROOT, 'preview', 'public', 'index.html'), html)
console.log('preview page written · holdings =', db.holdings.length, '· pending =', db.instruments.filter((i) => i.verification?.status === 'pending').length)
