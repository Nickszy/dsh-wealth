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
  const Holdings = new Function('React', 'h', 'T', 'assetLabel', 'fmtMoney', 'Modal', 'currencyOptions', 'identityKeyOf', `${extractFunction(src, 'Holdings')}\nreturn Holdings`)(
    React, h, T, (cls) => cls || '', () => '0', () => null, () => [], (ins) => (ins ? ins.market + '|' + ins.symbol : ''),
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
  const React = {
    useState(init) {
      const value = typeof init === 'function' ? init() : init
      return [value, () => {}]
    },
    createElement(type, props, ...children) { return { type, props: props || {}, children } },
  }
  const h = (type, props, ...children) => ({ type, props: props || {}, children })
  const T = { th: (c) => c, td: (c) => c, btn: () => ({}), input: () => ({}), card: () => ({}), label: () => ({}) }
  return new Function('React', 'h', 'T', 'assetLabel', 'fmtMoney', 'Modal', 'currencyOptions', 'identityKeyOf', `${extractFunction(src, 'Holdings')}\nreturn Holdings`)(
    React, h, T, (cls) => cls || '', (n) => String(n ?? '—'), () => null, () => [], (ins) => (ins ? ins.market + '|' + ins.symbol : ''),
  )
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
  const Holdings = makeHoldings()
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
