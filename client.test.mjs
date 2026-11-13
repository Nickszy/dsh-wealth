import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// client.js 由宿主模块加载器执行，Holdings 不导出。抽出函数本体，用桩渲染后点击
// 「更新行情」，锁住 reload 必须在参数里：漏接时 ReferenceError 会被 catch 显示成
// “reload is not defined”，行情其实已经写上、界面却不刷新。

function scan(src, i, onCode) {
  let mode = 'code'
  let quote = ''
  for (; i < src.length; i++) {
    const c = src[i]
    const next = src[i + 1]
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue }
    if (mode === 'block') { if (c === '*' && next === '/') { mode = 'code'; i++ } continue }
    if (mode === 'string') {
      if (c === '\\') { i++; continue }
      if (c === quote) mode = 'code'
      continue
    }
    if (c === '/' && next === '/') { mode = 'line'; i++; continue }
    if (c === '/' && next === '*') { mode = 'block'; i++; continue }
    if (c === '"' || c === "'" || c === '`') { mode = 'string'; quote = c; continue }
    const jump = onCode(c, i)
    if (jump != null) return jump
  }
  return -1
}

function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `missing function ${name}`)
  const parenAt = src.indexOf('(', start)
  let paren = 0
  const paramsEnd = scan(src, parenAt, (c, i) => {
    if (c === '(') paren++
    else if (c === ')') { paren--; if (paren === 0) return i }
    return null
  })
  assert.notEqual(paramsEnd, -1, `unclosed params of ${name}`)
  const bodyAt = src.indexOf('{', paramsEnd)
  let depth = 0
  const bodyEnd = scan(src, bodyAt, (c, i) => {
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
    return null
  })
  assert.notEqual(bodyEnd, -1, `unclosed function ${name}`)
  return src.slice(start, bodyEnd + 1)
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object') return textOf(node.children)
  return ''
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return }
  visit(node)
  walk(node.children, visit)
}

function realClientHelper(name) {
  const src = readFileSync(new URL('./client.js', import.meta.url), 'utf8')
  const deps = name === 'identityKeyOf' ? '' : `${extractFunction(src, 'identityKeyOf')}
`
  return new Function(`${deps}${extractFunction(src, name)}
return ${name}`)()
}

const theme = { sub: '#888', text: '#111', border: '#ddd', card: '#fff', accent: '#36c', accent2: '#258', input: '#fff', shadow: 'none', red: '#c00', green: '#080' }

function renderHoldings(reload) {
  const src = readFileSync(new URL('./client.js', import.meta.url), 'utf8')
  const sets = []
  const React = {
    useState(init) {
      const value = typeof init === 'function' ? init() : init
      return [value, (next) => { sets.push(typeof next === 'function' ? next(value) : next) }]
    },
    createElement(type, props, ...children) { return { type, props: props || {}, children } },
  }
  const h = (type, props, ...children) => ({ type, props: props || {}, children })
  const T = { th: (c) => c, td: (c) => c, btn: () => ({}), input: () => ({}), card: () => ({}), label: () => ({}) }
  const Holdings = new Function('React', 'h', 'T', 'assetLabel', 'fmtMoney', 'Modal', 'currencyOptions', 'identityKeyOf', 'displayCodeOf', 'instrumentOfSavedHolding', `${extractFunction(src, 'Holdings')}\nreturn Holdings`)(
    React, h, T, (cls) => cls || '', () => '0', () => null, () => [], realClientHelper('identityKeyOf'), realClientHelper('displayCodeOf'), () => null,
  )
  const state = {
    ledger: {
      baseCurrency: 'CNY',
      fx: { CNY: 1 },
      accounts: [{ id: 'a1', name: '现金' }],
      instruments: [{ id: 'i1', symbol: '600519', name: '贵州茅台', market: 'CN', assetClass: 'stock' }],
      holdings: [{ id: 'h1', accountId: 'a1', instrumentId: 'i1', qty: 10, avgCost: 1500, currency: 'CNY', manualPrice: null, quotePrice: 1688 }],
    },
  }
  const tree = Holdings({ t: theme, state, call: async () => ({ ok: true, ledger: state.ledger }), busy: false, reload })
  const button = []
  walk(tree, (node) => { if (node.type === 'button' && textOf(node).includes('更新行情')) button.push(node) })
  assert.equal(button.length, 1)
  return { button: button[0], sets }
}

test('updating quotes reloads the ledger instead of reporting reload is not defined', async () => {
  let reloaded = 0
  const { button, sets } = renderHoldings(async () => { reloaded += 1 })
  const previous = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, updated: 1, warnings: [] }) })
  try {
    await button.props.onClick()
  } finally {
    globalThis.fetch = previous
  }
  assert.equal(sets.includes('reload is not defined'), false)
  assert.ok(sets.includes('已更新 1 条行情现价。手填价格仍然优先。'))
  assert.equal(reloaded, 1)
})

// 跨账户合并：同一代码只留一行、数量与加权成本合并、整行只读；
// 选定单个账户后仍逐条可编辑（编辑 / 删除只发生在具体账户里）。
function makeHoldings() {
  const src = readFileSync(new URL('./client.js', import.meta.url), 'utf8')
  const sets = []
  const React = {
    useState(init) {
      const value = typeof init === 'function' ? init() : init
      return [value, (next) => { sets.push(typeof next === 'function' ? next(value) : next) }]
    },
    createElement(type, props, ...children) { return { type, props: props || {}, children } },
  }
  const h = (type, props, ...children) => ({ type, props: props || {}, children })
  const T = { th: (c) => c, td: (c) => c, btn: () => ({}), input: () => ({}), card: () => ({}), label: () => ({}) }
  const Holdings = new Function('React', 'h', 'T', 'assetLabel', 'fmtMoney', 'Modal', 'currencyOptions', 'identityKeyOf', 'displayCodeOf', 'instrumentOfSavedHolding', `${extractFunction(src, 'Holdings')}\nreturn Holdings`)(
    React, h, T, (cls) => cls || '', (n) => String(n ?? '—'), () => null, () => [], realClientHelper('identityKeyOf'), realClientHelper('displayCodeOf'), () => null,
  )
  return { Holdings, sets }
}

const mergedFixture = () => ({
  ledger: {
    baseCurrency: 'CNY',
    fx: { CNY: 1 },
    accounts: [{ id: 'a1', name: '银河' }, { id: 'a2', name: '银河证券' }],
    instruments: [{ id: 'i1', symbol: '002432', name: '九安医疗', market: 'CN', assetClass: 'stock' }],
    holdings: [
      { id: 'h1', accountId: 'a1', instrumentId: 'i1', qty: 1900, avgCost: 54.06, currency: 'CNY', manualPrice: null, quotePrice: 56.92, quoteChangePct: -4.4 },
      { id: 'h2', accountId: 'a2', instrumentId: 'i1', qty: 900, avgCost: 66.64, currency: 'CNY', manualPrice: null, quotePrice: 56.92, quoteChangePct: -4.4 },
    ],
  },
})

test('all-accounts view merges same-code holdings into one read-only row', () => {
  const { Holdings } = makeHoldings()
  const tree = Holdings({ t: theme, state: mergedFixture(), call: async () => ({ ok: true }), busy: false })
  const text = textOf(tree)
  const rows = []
  walk(tree, (node) => { if (node.type === 'tr' && textOf(node).includes('九安医疗')) rows.push(node) })
  assert.equal(rows.length, 1, 'same-code holdings must render as one merged row')
  assert.ok(text.includes('2800'), 'quantities are summed')
  assert.ok(text.includes('合并自 2 条'), 'header discloses the merge')
  assert.ok(text.includes('58.1'), 'unit cost is quantity-weighted: (1900*54.06+900*66.64)/2800 = 58.1036')
  assert.ok(text.includes('只读 · 到账户中编辑'), 'merged rows expose no edit actions')
  const actionButtons = []
  walk(tree, (node) => { if (node.type === 'button' && ['编辑', '删除'].some((t2) => textOf(node).includes(t2))) actionButtons.push(node) })
  assert.equal(actionButtons.length, 0, 'no edit/delete buttons in merged view (the hint sentence mentions them)')
})

test('metadata updates follow the saved holding, not the first matching code', () => {
  const pick = realClientHelper('instrumentOfSavedHolding')
  const ledger = {
    instruments: [
      { id: 'INS_STOCK', symbol: '000001', market: 'CN', assetClass: 'stock' },
      { id: 'INS_FUND', symbol: '000001', market: 'FUND', assetClass: 'fund' },
    ],
  }
  assert.equal(pick(ledger, { instrumentId: 'INS_FUND' }).id, 'INS_FUND', 'same-code stock must not shadow the saved fund')
  assert.equal(pick(ledger, { instrumentId: 'INS_STOCK' }).id, 'INS_STOCK')
  assert.equal(pick(ledger, { instrumentId: 'missing' }), null)
  assert.equal(pick(ledger, null), null)
})

test('displayCodeOf renders the agreed full local code in the holdings table', () => {
  const code = realClientHelper('displayCodeOf')
  assert.equal(code({ symbol: '600519', market: 'CN', assetClass: 'stock' }), '600519.SH')
  assert.equal(code({ symbol: '000001', market: 'CN', assetClass: 'stock' }), '000001.SZ')
  assert.equal(code({ symbol: '430047', market: 'CN', assetClass: 'stock' }), '430047.BJ')
  assert.equal(code({ symbol: '510300', market: 'CN', assetClass: 'etf' }), '510300.SH')
  assert.equal(code({ symbol: '700.HK', market: 'HK', assetClass: 'stock' }), '00700.HK')
  assert.equal(code({ symbol: 'AAPL', market: 'US', assetClass: 'stock' }), 'AAPL.US')
  assert.equal(code({ symbol: 'BRK.B', market: 'US', assetClass: 'stock' }), 'BRK.B.US')
  assert.equal(code({ symbol: '000001', market: 'FUND', assetClass: 'fund' }), '000001.OF')
  assert.equal(code({ symbol: 'CNY.CASH', market: 'CASH', assetClass: 'cash' }), 'CASH:CNY')
  assert.equal(code({ symbol: 'CREDIT.BALANCE', market: 'CASH', assetClass: 'cash', currency: 'CNY' }), 'CREDIT.BALANCE')
  assert.equal(code(null), '')
})

test('merged rows flag mixed currencies and holdings without a price', () => {
  const { Holdings } = makeHoldings()
  const state = {
    ledger: {
      baseCurrency: 'CNY',
      fx: { CNY: 1, USD: 7 },
      accounts: [{ id: 'a1', name: 'A' }, { id: 'a2', name: 'B' }],
      instruments: [{ id: 'i1', symbol: 'AAPL', name: '苹果', market: 'US', assetClass: 'stock', currency: 'USD' }],
      holdings: [
        { id: 'h1', accountId: 'a1', instrumentId: 'i1', qty: 10, avgCost: 180, currency: 'USD', manualPrice: null, quotePrice: 200 },
        { id: 'h2', accountId: 'a2', instrumentId: 'i1', qty: 5, avgCost: 180, currency: 'CNY', manualPrice: null, quotePrice: 1400 },
        { id: 'h3', accountId: 'a2', instrumentId: 'i1', qty: 2, avgCost: null, currency: 'USD', manualPrice: null, quotePrice: null },
      ],
    },
  }
  const text = textOf(Holdings({ t: theme, state, call: async () => ({ ok: true }), busy: false }))
  assert.ok(text.includes('多币种'), 'mixed-currency merge is labelled')
  assert.ok(text.includes('另有 1 条无价'), 'partially valued merge discloses the unpriced rows')
  assert.ok(text.includes('苹果 AAPL.US'), 'display code is used in the table')
})

// 入库核验：待确认标的有独立面板，且绝不与已确认的同代码标的合并成一行。
const pendingFixture = () => ({
  ledger: {
    baseCurrency: 'CNY', fx: { CNY: 1, HKD: 0.9 },
    accounts: [{ id: 'a1', name: 'A' }, { id: 'a2', name: 'B' }],
    instruments: [
      { id: 'i1', symbol: '00700', name: '腾讯控股', market: 'HK', assetClass: 'stock', currency: 'HKD' },
      { id: 'i2', symbol: '00700', name: '00700', market: 'HK', assetClass: 'stock', currency: 'HKD', verification: { status: 'pending', reason: '核验查询失败：catalog offline', candidates: [{ symbol: '00700', market: 'HK', name: '腾讯控股', securityType: '港股', assetClass: 'stock', provider: 'eastmoney' }] } },
    ],
    holdings: [
      { id: 'h1', accountId: 'a1', instrumentId: 'i1', qty: 100, avgCost: 300, currency: 'HKD', manualPrice: null, quotePrice: 400, quoteChangePct: 1.2 },
      { id: 'h2', accountId: 'a2', instrumentId: 'i2', qty: 200, avgCost: 310, currency: 'HKD', manualPrice: null, quotePrice: 400, quoteChangePct: 1.2 },
    ],
  },
})

function findButtons(tree, label) {
  const hits = []
  walk(tree, (node) => { if (node.type === 'button' && textOf(node).includes(label)) hits.push(node) })
  return hits
}

test('pending instruments get a confirmation panel and stay split from confirmed same-code rows', () => {
  const { Holdings } = makeHoldings()
  const calls = []
  const tree = Holdings({ t: theme, state: pendingFixture(), call: async (op, payload) => { calls.push({ op, payload }); return { ok: true, result: {} } }, busy: false })
  const text = textOf(tree)
  assert.ok(text.includes('待确认标的 · 1'), 'the pending panel renders')
  assert.ok(text.includes('核验查询失败'), 'the pending reason is shown')
  assert.ok(text.includes('影响 1 条持仓'), 'impact is disclosed')
  assert.ok(text.includes('腾讯控股 · 00700.HK · 港股'), 'candidates render with name, code and type')
  // 同一代码的两条持仓（一条已确认、一条待确认）不得合并成一行。
  const rows = []
  walk(tree, (node) => { if (node.type === 'tr' && (textOf(node).includes('100') || textOf(node).includes('200'))) rows.push(node) })
  const mergedRows = rows.filter((node) => textOf(node).includes('300') && textOf(node).includes('310'))
  assert.equal(mergedRows.length, 0, 'confirmed and pending same-code rows must not share one merged row')
  const tags = []
  walk(tree, (node) => { if (node.type === 'small' && textOf(node) === '待确认') tags.push(node) })
  assert.equal(tags.length, 1, 'the pending row carries the 待确认 tag')
})

test('adopting a candidate confirms via instrument.confirm; keep-as-is sends no identity fields', async () => {
  const { Holdings } = makeHoldings()
  const calls = []
  const tree = Holdings({ t: theme, state: pendingFixture(), call: async (op, payload) => { calls.push({ op, payload }); return { ok: true, result: {} } }, busy: false })
  const adopt = findButtons(tree, '采用所选候选')
  assert.equal(adopt.length, 1)
  await adopt[0].props.onClick()
  assert.deepEqual(calls[0], {
    op: 'instrument.confirm',
    payload: { id: 'i2', confirm: true, symbol: '00700', market: 'HK', name: '腾讯控股', assetClass: 'stock', securityType: '港股' },
  }, 'adoption pins the candidate identity — including its asset class — with confirm:true')
  const keep = findButtons(tree, '保留现状')
  assert.equal(keep.length, 1)
  await keep[0].props.onClick()
  assert.deepEqual(calls[1], { op: 'instrument.confirm', payload: { id: 'i2', confirm: true } }, 'keep-as-is only marks the entry verified')
})

test('adopting a stock candidate for a pending fund also fixes the asset class', async () => {
  const state = pendingFixture()
  // 同花顺报错身份的典型场景：待确认条目是 FUND/000001，候选是平安银行股票档。
  state.ledger.instruments = [
    { id: 'i2', symbol: '000001', name: '000001', market: 'FUND', assetClass: 'fund', currency: 'CNY', verification: { status: 'pending', reason: '公开目录候选与快照声明的市场或类别不一致', candidates: [{ symbol: '000001', market: 'CN', name: '平安银行', securityType: 'A股', assetClass: 'stock', provider: 'eastmoney' }] } },
  ]
  state.ledger.holdings = [{ id: 'h2', accountId: 'a1', instrumentId: 'i2', qty: 3, avgCost: 1.2, currency: 'CNY', manualPrice: null, quotePrice: 1.5 }]
  const { Holdings } = makeHoldings()
  const calls = []
  const tree = Holdings({ t: theme, state, call: async (op, payload) => { calls.push({ op, payload }); return { ok: true, result: {} } }, busy: false })
  const adopt = findButtons(tree, '采用所选候选')
  await adopt[0].props.onClick()
  assert.deepEqual(calls[0].payload, {
    id: 'i2', confirm: true, symbol: '000001', market: 'CN', name: '平安银行', assetClass: 'stock', securityType: 'A股',
  }, 'the stock candidate carries assetClass stock so the confirmed entry is valued as a stock')
})

test('editing a holding binds its id so an edit cannot spill onto a same-code sibling', async () => {
  const state = {
    ledger: {
      baseCurrency: 'CNY', fx: { CNY: 1 },
      accounts: [{ id: 'a1', name: 'A' }],
      instruments: [
        { id: 'STOCK', symbol: '000001', name: '平安银行', market: 'CN', assetClass: 'stock', currency: 'CNY' },
        { id: 'FUND', symbol: '000001', name: '华夏成长', market: 'CN', assetClass: 'fund', currency: 'CNY' },
      ],
      holdings: [
        { id: 'h1', accountId: 'a1', instrumentId: 'STOCK', qty: 100, avgCost: 10, currency: 'CNY', manualPrice: null, quotePrice: 11 },
        { id: 'h2', accountId: 'a1', instrumentId: 'FUND', qty: 3, avgCost: 1.2, currency: 'CNY', manualPrice: null, quotePrice: 1.5 },
      ],
    },
  }
  const { Holdings, sets } = makeHoldings()
  const tree = Holdings({ t: theme, state, call: async () => ({ ok: true }), busy: false, accountId: 'a1' })
  const edit = findButtons(tree, '编辑')
  assert.equal(edit.length, 2, 'both rows are editable in the single-account view')
  await edit[0].props.onClick()
  const form = sets.find((s) => s && typeof s === 'object' && s.symbol === '000001' && s.assetClass === 'stock')
  assert.ok(form, 'the edit form state is opened')
  assert.equal(form.id, 'h1', 'the edit form is bound to the saved holding id')
  assert.equal(form.assetClass, 'stock', 'identity fields come from the original row, not a sibling')
})

test('holdings split into per-class tabs: stock, ETF, fund and cash stay apart', async () => {
  const state = {
    ledger: {
      baseCurrency: 'CNY', fx: { CNY: 1 },
      accounts: [{ id: 'a1', name: 'A' }],
      instruments: [
        { id: 'S', symbol: '600519', name: '贵州茅台', market: 'CN', assetClass: 'stock', currency: 'CNY' },
        { id: 'E', symbol: '510300', name: '沪深300ETF', market: 'CN', assetClass: 'etf', currency: 'CNY' },
        { id: 'F', symbol: '005827', name: '易方达蓝筹', market: 'FUND', assetClass: 'fund', currency: 'CNY' },
        { id: 'C', symbol: 'CNY.CASH', name: '人民币现金', market: 'CASH', assetClass: 'cash', currency: 'CNY' },
      ],
      holdings: [
        { id: 'h1', accountId: 'a1', instrumentId: 'S', qty: 1, avgCost: 1500, currency: 'CNY', manualPrice: null, quotePrice: 1688 },
        { id: 'h2', accountId: 'a1', instrumentId: 'E', qty: 100, avgCost: 3.9, currency: 'CNY', manualPrice: null, quotePrice: 4.1 },
        { id: 'h3', accountId: 'a1', instrumentId: 'F', qty: 10, avgCost: 2, currency: 'CNY', manualPrice: null, quotePrice: 2.3 },
        { id: 'h4', accountId: 'a1', instrumentId: 'C', qty: 1000, avgCost: null, currency: 'CNY', manualPrice: 1, quotePrice: null },
      ],
    },
  }
  const { Holdings, sets } = makeHoldings()
  const tree = Holdings({ t: theme, state, call: async () => ({ ok: true }), busy: false, accountId: 'a1' })
  const tabs = []
  walk(tree, (node) => { if (node.type === 'button' && node.props.role === 'tab') tabs.push(node) })
  const labels = tabs.map((b) => textOf(b))
  assert.deepEqual(labels, ['全部 · 4', '股票 · 1', 'ETF · 1', '基金 · 1', '现金 · 1'], 'one tab per class that exists, with counts')
  assert.ok(tabs[0].props['aria-selected'], 'the all view is selected by default')
  const fundTab = tabs.find((b) => textOf(b).startsWith('基金'))
  fundTab.props.onClick()
  assert.ok(sets.includes('fund'), 'clicking a tab switches the class filter')
})
