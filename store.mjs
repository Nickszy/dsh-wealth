// dsh-portfolio — shared data store (used by host plugin index.js and by cli.mjs)
// Plain JSON file, atomic writes, keeps a .bak of the previous version.
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { isFlowKind, KIND_NAMES, normalizeStyle, isLifeCategory, LIFE_CATEGORIES } from './model.mjs'

export const DATA_DIR = process.env.DSH_PORTFOLIO_DIR || join(homedir(), '.dsh', 'data', 'dsh-portfolio')
export const DATA_FILE = join(DATA_DIR, 'ledger.json')

const EMPTY = () => ({
  version: 1,
  baseCurrency: 'CNY',
  fx: { CNY: 1 },
  accounts: [],
  instruments: [],
  holdings: [],
  trades: [],
  historyEvents: [],
  historyBatches: [],
  snapshots: [],
  updatedAt: null,
})

function ensureDir() { mkdirSync(DATA_DIR, { recursive: true }) }

export function load() {
  ensureDir()
  if (!existsSync(DATA_FILE)) return EMPTY()
  try {
    const db = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    // Never invent default rates for currencies absent from an existing ledger.
    return { ...EMPTY(), ...db, fx: db.fx || { [db.baseCurrency || 'CNY']: 1 }, snapshots: db.snapshots || [] }
  } catch (error) {
    // keep the broken file for inspection, start clean
    try { copyFileSync(DATA_FILE, DATA_FILE + '.corrupt-' + Date.now()) } catch { /* ignore */ }
    return EMPTY()
  }
}

export function save(db) {
  ensureDir()
  db.updatedAt = new Date().toISOString()
  const summary = summarize(db)
  const snapshot = {
    date: db.updatedAt.slice(0, 10), recordedAt: db.updatedAt, baseCurrency: summary.baseCurrency,
    totalValueBase: summary.totalValueBase, totalCostBase: summary.totalCostBase,
    totalPnlBase: summary.totalPnlBase, excludedCount: summary.excludedCount,
    warnings: summary.warnings, accounts: summary.accounts,
    assetClasses: summary.assetClasses, currencies: summary.currencies,
    sectors: summary.sectors, styles: summary.styles,
  }
  // A day can contain different reporting currencies; never overwrite another unit.
  db.snapshots ||= []
  const previous = db.snapshots.findIndex((s) => s.date === snapshot.date && s.baseCurrency === snapshot.baseCurrency)
  if (previous < 0) db.snapshots.push(snapshot)
  else db.snapshots[previous] = snapshot
  const tmp = DATA_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  try { if (existsSync(DATA_FILE)) copyFileSync(DATA_FILE, DATA_FILE + '.bak') } catch { /* ignore */ }
  renameSync(tmp, DATA_FILE)
  return db
}

const uid = (prefix) => prefix + '_' + randomUUID().slice(0, 8).toUpperCase()
function numeric(value, field, { optional = false, nullable = false, positive = false, signed = false } = {}) {
  if (value === undefined && optional) return undefined
  if (value === null && nullable) return null
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    throw new OpError('bad-request', field + ' 必须是有效数字')
  }
  const number = Number(value)
  if (!Number.isFinite(number) || (positive ? number <= 0 : !signed && number < 0)) {
    throw new OpError('bad-request', field + (positive ? ' 必须是有限正数' : signed ? ' 必须是有限数字' : ' 必须是有限非负数'))
  }
  return number
}
const ASSET_CLASSES = new Set(['stock', 'fund', 'etf', 'cash', 'bond', 'crypto', 'other'])
function assetClass(value) {
  const normalized = String(value).trim().toLowerCase()
  if (!ASSET_CLASSES.has(normalized)) throw new OpError('bad-request', '不支持的 assetClass: ' + value)
  return normalized
}
function requiredCurrency(value) {
  if (typeof value !== 'string' || !value.trim()) throw new OpError('bad-request', '缺少 currency')
  return value.trim().toUpperCase()
}
function tradeKey(trade) {
  if (trade.externalId !== undefined && trade.externalId !== null && trade.externalId !== '') {
    return JSON.stringify(['external', trade.accountId, trade.source || '', String(trade.externalId)])
  }
  return JSON.stringify(['trade', trade.accountId, trade.instrumentId, trade.side, Number(trade.qty), Number(trade.price), Number(trade.fee || 0), trade.currency, trade.date, trade.source || ''])
}
const nowISO = () => new Date().toISOString()

function normCurrency(c, fallback) {
  const v = typeof c === 'string' && c.trim() !== '' ? c.trim().toUpperCase() : fallback
  return v || 'CNY'
}

function findAccount(db, id) { return db.accounts.find((a) => a.id === id) }
function findInstrument(db, id) { return db.instruments.find((i) => i.id === id) }
function findHolding(db, accountId, instrumentId) {
  return db.holdings.find((h) => h.accountId === accountId && h.instrumentId === instrumentId)
}

// Resolve an instrument by id, or by symbol+market (creating it if allowed).
function resolveInstrument(db, ref, { create = true } = {}) {
  if (!ref) throw new OpError('bad-request', '缺少标的')
  if (ref.instrumentId) {
    const got = findInstrument(db, ref.instrumentId)
    if (!got) throw new OpError('not-found', '标的不存在: ' + ref.instrumentId)
    return got
  }
  const symbol = String(ref.symbol || '').trim()
  if (!symbol) throw new OpError('bad-request', '缺少标的代码 symbol')
  const market = String(ref.market || '').trim().toUpperCase()
  const existing = db.instruments.find((i) => i.symbol === symbol && (market === '' || i.market === market))
  if (existing) return existing
  if (!create) throw new OpError('not-found', '标的不存在: ' + symbol)
  const instrument = {
    id: uid('INS'),
    symbol,
    name: String(ref.name || symbol).trim(),
    market: market || 'CN',
    assetClass: assetClass(ref.assetClass || guessAssetClass(symbol)),
    currency: normCurrency(ref.currency, defaultCurrencyOfMarket(market)),
    note: String(ref.note || ''),
    createdAt: nowISO(),
  }
  db.instruments.push(instrument)
  return instrument
}

function guessAssetClass(symbol, given) {
  if (given) return given
  if (/^\d{6}$/.test(symbol)) return 'stock'
  if (/^[A-Z]{1,5}$/.test(symbol)) return 'stock'
  return 'fund'
}
function defaultCurrencyOfMarket(market) {
  if (market === 'HK') return 'HKD'
  if (market === 'US') return 'USD'
  return 'CNY'
}

// Apply a trade to the matching holding (buy = increase qty & weighted avg cost; sell = decrease qty).
function applyTradeToHolding(db, trade) {
  let holding = findHolding(db, trade.accountId, trade.instrumentId)
  const { qty, price } = trade
  if (trade.side === 'sell' && (!holding || qty > holding.qty)) throw new OpError('bad-request', '卖出数量超过持仓')
  if (holding && holding.currency !== trade.currency) throw new OpError('bad-request', '流水币种必须与持仓币种一致')
  const currentQty = holding ? numeric(holding.qty, 'holding.qty') : 0
  const currentCost = holding ? numeric(holding.avgCost, 'holding.avgCost', { signed: true }) : 0
  const totalQty = currentQty + qty
  const totalCost = currentQty * currentCost + qty * price
  if (trade.side === 'buy' && (!Number.isFinite(totalQty) || !Number.isFinite(totalCost))) throw new OpError('bad-request', '买入后持仓数值超出可计算范围')
  if (!holding) {
    holding = {
      id: uid('POS'), accountId: trade.accountId, instrumentId: trade.instrumentId,
      qty: 0, avgCost: 0, currency: trade.currency, manualPrice: null, note: '', updatedAt: nowISO(),
    }
    db.holdings.push(holding)
  }
  if (trade.side === 'buy') {
    if (totalQty > 0) holding.avgCost = totalCost / totalQty
    holding.qty = totalQty
  } else if (trade.side === 'sell') {
    holding.qty = Math.max(0, holding.qty - qty)
    if (holding.qty === 0) holding.avgCost = 0
  }
  holding.updatedAt = nowISO()
  return holding
}

export class OpError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

// Single dispatcher. Each op mutates `db` and returns a plain result object.
export function applyOp(db, op, payload = {}) {
  switch (op) {
    case 'state':
      return { ledger: db }

    case 'account.upsert': {
      const p = payload.account || payload
      if (!p.name) throw new OpError('bad-request', '账户需要 name')
      let acc = p.id ? findAccount(db, p.id) : null
      if (acc) {
        acc.name = String(p.name)
        acc.type = String(p.type || acc.type || 'broker')
        acc.currency = normCurrency(p.currency, acc.currency)
        if (p.note !== undefined) acc.note = String(p.note)
      } else {
        acc = { id: uid('ACC'), name: String(p.name), type: String(p.type || 'broker'), currency: normCurrency(p.currency, 'CNY'), note: String(p.note || ''), archived: false, createdAt: nowISO() }
        db.accounts.push(acc)
      }
      return { account: acc }
    }

    case 'account.remove': {
      const id = payload.id
      if (!findAccount(db, id)) throw new OpError('not-found', '账户不存在: ' + id)
      db.accounts = db.accounts.filter((a) => a.id !== id)
      db.holdings = db.holdings.filter((h) => h.accountId !== id)
      db.trades = db.trades.filter((t) => t.accountId !== id)
      if (Array.isArray(db.historyEvents)) db.historyEvents = db.historyEvents.filter(e => e.accountId !== id)
      if (Array.isArray(db.historyBatches)) db.historyBatches = db.historyBatches.filter(b => b.accountId !== id)
      if (db.historySync && typeof db.historySync === 'object') delete db.historySync[id]
      return { removed: id }
    }

    case 'instrument.upsert': {
      const p = payload.instrument || payload
      const changes = {}
      if (p.assetClass !== undefined) changes.assetClass = assetClass(p.assetClass)
      if (p.currency !== undefined) changes.currency = requiredCurrency(p.currency)
      if (p.sector !== undefined) {
        // 行业是自由文本（各市场行业表不同），仅做长度与空白约束；空字符串表示清除。
        const sector = String(p.sector).trim()
        if (sector.length > 24) throw new OpError('bad-request', '行业名称过长（≤24 字）')
        changes.sector = sector || null
      }
      if (p.style !== undefined) {
        const style = normalizeStyle(p.style)
        if (p.style && !style) throw new OpError('bad-request', 'style 须为 growth|value|blend|other（成长/价值/均衡/其他）')
        changes.style = style
      }
      for (const key of ['symbol', 'name', 'market', 'note']) {
        if (p[key] !== undefined) {
          const value = String(p[key]).trim()
          if (!value && key !== 'note') throw new OpError('bad-request', key + ' 不能为空')
          changes[key] = key === 'market' ? value.toUpperCase() : value
        }
      }
      const instrument = resolveInstrument(db, { ...p, instrumentId: p.id || p.instrumentId }, { create: true })
      const symbol = changes.symbol ?? instrument.symbol
      const market = changes.market ?? instrument.market
      if (db.instruments.some((i) => i.id !== instrument.id && i.symbol === symbol && i.market === market)) throw new OpError('bad-request', '相同市场已有此标的代码')
      Object.assign(instrument, changes)
      instrument.updatedAt = nowISO()
      return { instrument }
    }

    case 'holding.upsert': {
      const p = payload.holding || payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      if (!findAccount(db, p.accountId)) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      const qty = numeric(p.qty, 'qty', { optional: true })
      // 摊薄成本可以为负（分红超过投入）；数量与估值不允许负值。
      const avgCost = numeric(p.avgCost, 'avgCost', { optional: true, signed: true })
      const manualPrice = numeric(p.manualPrice, 'manualPrice', { optional: true, nullable: true })
      // 行情价由「更新行情」写入；模型与手工路径不应伪造，允许显式清除。
      const quotePrice = numeric(p.quotePrice, 'quotePrice', { optional: true, nullable: true })
      const quoteSource = p.quoteSource === undefined ? undefined : String(p.quoteSource).slice(0, 40) || null
      let quoteAt = p.quoteAt === undefined ? undefined : p.quoteAt === null ? null : String(p.quoteAt)
      if (quoteAt !== undefined && quoteAt !== null && !/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(quoteAt)) throw new OpError('bad-request', 'quoteAt 必须是 ISO 时间或日期')
      if (quotePrice === null && quoteAt === undefined) quoteAt = null
      const instrument = resolveInstrument(db, p, { create: true })
      let holding = p.id ? db.holdings.find((h) => h.id === p.id) : findHolding(db, p.accountId, instrument.id)
      if (p.id && (!holding || holding.accountId !== p.accountId || holding.instrumentId !== instrument.id)) throw new OpError('bad-request', '持仓 id 与账户或标的不匹配')
      if (holding) {
        if (qty !== undefined) holding.qty = qty
        if (avgCost !== undefined) holding.avgCost = avgCost
        if (manualPrice !== undefined) holding.manualPrice = manualPrice
        if (quotePrice !== undefined) holding.quotePrice = quotePrice
        if (quoteAt !== undefined) holding.quoteAt = quoteAt
        if (quoteSource !== undefined) holding.quoteSource = quoteSource
        if (p.currency !== undefined) holding.currency = normCurrency(p.currency, holding.currency)
        if (p.note !== undefined) holding.note = String(p.note)
        holding.updatedAt = nowISO()
      } else {
        holding = {
          id: uid('POS'), accountId: p.accountId, instrumentId: instrument.id,
          qty: qty ?? 0, avgCost: avgCost ?? 0,
          currency: normCurrency(p.currency, instrument.currency),
          manualPrice: manualPrice ?? null, quotePrice: quotePrice ?? null, quoteAt: quoteAt ?? null, quoteSource: quoteSource ?? null,
          note: String(p.note || ''), updatedAt: nowISO(),
        }
        db.holdings.push(holding)
      }
      return { holding }
    }

    case 'holding.remove': {
      const id = payload.id
      if (!db.holdings.some((h) => h.id === id)) throw new OpError('not-found', '持仓不存在: ' + id)
      db.holdings = db.holdings.filter((h) => h.id !== id)
      return { removed: id }
    }

    case 'trade.add': {
      const p = payload.trade || payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      if (!findAccount(db, p.accountId)) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      const side = p.side === undefined ? 'buy' : p.side
      if (side !== 'buy' && side !== 'sell') throw new OpError('bad-request', 'side 必须是 buy 或 sell')
      const qty = numeric(p.qty, 'qty', { positive: true })
      const price = numeric(p.price, 'price')
      const fee = numeric(p.fee === undefined ? 0 : p.fee, 'fee')
      if (!Number.isFinite(qty * price + fee)) throw new OpError('bad-request', '流水金额超出可计算范围')
      if (payload.applyHoldings !== undefined && typeof payload.applyHoldings !== 'boolean') throw new OpError('bad-request', 'applyHoldings 必须为布尔值')
      const date = String(p.date || new Date().toISOString().slice(0, 10))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new OpError('bad-request', 'date 必须为有效 YYYY-MM-DD 日期')
      const instrument = resolveInstrument(db, p, { create: side !== 'sell' || payload.applyHoldings === false })
      const trade = {
        id: uid('TRD'), accountId: p.accountId, instrumentId: instrument.id, side, qty, price, fee,
        currency: normCurrency(p.currency, instrument.currency), date,
        note: String(p.note || ''), createdAt: nowISO(),
        source: String(p.source || ''), ...(p.externalId == null ? {} : { externalId: String(p.externalId) }),
        appliedToHoldings: payload.applyHoldings !== false,
      }
      if (payload.deduplicate) {
        const duplicate = db.trades.find((t) => tradeKey(t) === tradeKey(trade))
        if (duplicate) return { trade: duplicate, holding: findHolding(db, duplicate.accountId, duplicate.instrumentId) || null, duplicate: true }
      }
      const holding = trade.appliedToHoldings ? applyTradeToHolding(db, trade) : null
      db.trades.push(trade)
      return { trade, holding }
    }

    case 'trade.remove': {
      const id = payload.id
      if (!db.trades.some((t) => t.id === id)) throw new OpError('not-found', '流水不存在: ' + id)
      db.trades = db.trades.filter((t) => t.id !== id)
      return { removed: id, note: '已删除流水；持仓数量未自动回算，请手动核对' }
    }

    // 归档一条不改变当前持仓的资金流水：出入金、分红、利息、费税、证券划转，
    // 以及后续的生活账单收支。买卖成交请用 trade.add。
    case 'historyEvent.add': {
      const p = payload.event || payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      const account = findAccount(db, p.accountId)
      if (!account) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      const kind = String(p.kind || '').trim()
      if (!isFlowKind(kind)) throw new OpError('bad-request', 'kind 须为以下之一: ' + KIND_NAMES.join('/'))
      if (['buy', 'sell', 'repo_open', 'repo_close'].includes(kind)) throw new OpError('bad-request', '买卖与回购请用 trade.add 记账；historyEvent.add 只归档不影响持仓的流水')
      const date = String(p.date || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new OpError('bad-request', 'date 必须为有效 YYYY-MM-DD 日期')
      // 账户视角带符号：入金为正、出金为负（文档契约），因此允许负数。
      const cashAmount = numeric(p.cashAmount === undefined ? null : p.cashAmount, 'cashAmount', { nullable: true, signed: true })
      const fee = p.fee === undefined || p.fee === null ? null : numeric(p.fee, 'fee')
      const qty = p.qty === undefined || p.qty === null ? null : numeric(p.qty, 'qty', { positive: true })
      const price = p.price === undefined || p.price === null ? null : numeric(p.price, 'price')
      const currency = normCurrency(p.currency, account.currency || db.baseCurrency)
      // 生活账单分类：只接受注册表内的值；null/空串表示不归类。
      const category = p.category === undefined || p.category === null || p.category === '' ? null : String(p.category).trim()
      if (category !== null && !isLifeCategory(category)) throw new OpError('bad-request', '未知的生活账单分类: ' + category + '（可用: ' + Object.keys(LIFE_CATEGORIES).join('/') + '）')
      const externalId = p.externalId === undefined || p.externalId === null || p.externalId === '' ? null : String(p.externalId)
      db.historyEvents ||= []
      if (externalId) {
        const duplicate = db.historyEvents.find((e) => e.accountId === p.accountId && e.externalId === externalId && (e.kind || '') === kind)
        if (duplicate) return { event: duplicate, duplicate: true }
      }
      let instrumentId = null
      if (p.symbol || p.instrumentId) {
        const instrument = resolveInstrument(db, { ...p, instrumentId: p.instrumentId || undefined }, { create: false })
        instrumentId = instrument.id
      }
      const batchId = uid('HIST')
      const importedAt = nowISO()
      const event = {
        id: uid('EVT'), accountId: p.accountId, kind, date, cashAmount, fee,
        currency, ...(qty != null ? { qty } : {}), ...(price != null ? { price } : {}),
        ...(instrumentId ? { instrumentId } : {}),
        ...(category ? { category } : {}),
        note: String(p.note || ''), source: String(p.source || 'model'),
        ...(externalId ? { externalId } : {}),
        batchId, importedAt, archiveOnly: true, observedAt: importedAt,
      }
      db.historyEvents.push(event)
      db.historyBatches ||= []
      db.historyBatches.push({ id: batchId, accountId: p.accountId, importedAt, imported: 1, duplicates: 0, outside: 0, method: 'model', coverage: { method: 'model', requestedFrom: date, requestedTo: date, complete: false, note: '手工 / AI 逐条录入，不代表完整流水区间。' }, byKind: { [kind]: 1 } })
      return { event, batchId }
    }

    // 修正已归档流水的分类与备注：导入的银行/支付账单可以事后归类，AI 也能纠正错分。
    case 'historyEvent.update': {
      const p = payload.event || payload
      const id = String(p.id || '').trim()
      if (!id) throw new OpError('bad-request', '缺少流水 id')
      db.historyEvents ||= []
      const event = db.historyEvents.find((e) => e.id === id)
      if (!event) throw new OpError('not-found', '流水不存在: ' + id)
      if (p.category !== undefined) {
        const category = p.category === null || p.category === '' ? null : String(p.category).trim()
        if (category !== null && !isLifeCategory(category)) throw new OpError('bad-request', '未知的生活账单分类: ' + category + '（可用: ' + Object.keys(LIFE_CATEGORIES).join('/') + '）')
        if (category === null) delete event.category
        else event.category = category
      }
      if (p.note !== undefined) event.note = String(p.note || '')
      event.updatedAt = nowISO()
      return { event }
    }

    case 'price.set': {
      const p = payload
      const price = numeric(p.price, 'price', { nullable: true })
      if (p.holdingId) {
        const h = db.holdings.find((x) => x.id === p.holdingId)
        if (!h) throw new OpError('not-found', '持仓不存在: ' + p.holdingId)
        h.manualPrice = price; h.updatedAt = nowISO()
        return { holding: h }
      }
      if (p.instrumentId) {
        let n = 0
        for (const h of db.holdings) if (h.instrumentId === p.instrumentId) { h.manualPrice = price; h.updatedAt = nowISO(); n++ }
        if (n === 0) throw new OpError('not-found', '该标的没有持仓')
        return { updated: n }
      }
      throw new OpError('bad-request', 'price.set 需要 holdingId 或 instrumentId')
    }

    case 'fx.set': {
      const cur = requiredCurrency(payload.currency)
      const rate = numeric(payload.rate, 'rate', { positive: true })
      if (cur === db.baseCurrency && rate !== 1) throw new OpError('bad-request', '本位币汇率必须为 1')
      db.fx ||= {}
      db.fx[cur] = rate
      return { fx: db.fx }
    }

    case 'base.set': {
      const cur = requiredCurrency(payload.currency)
      const oldBase = db.baseCurrency || 'CNY'
      const divisor = cur === oldBase ? 1 : db.fx?.[cur]
      if (typeof divisor !== 'number' || !Number.isFinite(divisor) || divisor <= 0) throw new OpError('bad-request', '新本位币缺少有效汇率: ' + cur)
      const rebased = {}
      for (const [currency, rate] of Object.entries({ ...db.fx, [oldBase]: 1 })) {
        const converted = rate / divisor
        if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(converted) || converted <= 0) throw new OpError('bad-request', '无法重设本位币，汇率无效: ' + currency)
        rebased[currency] = converted
      }
      rebased[cur] = 1
      db.fx = rebased
      db.baseCurrency = cur
      return { baseCurrency: cur, fx: db.fx }
    }

    case 'import.holdings': {
      if (!Array.isArray(payload.rows)) throw new OpError('bad-request', 'rows 必须为数组')
      const staged = structuredClone(db)
      const out = payload.rows.map((row) => applyOp(staged, 'holding.upsert', { holding: row }).holding)
      Object.assign(db, staged)
      return { imported: out.length, holdings: out }
    }

    case 'import.trades': {
      if (!Array.isArray(payload.rows)) throw new OpError('bad-request', 'rows 必须为数组')
      if (payload.applyHoldings !== undefined && typeof payload.applyHoldings !== 'boolean') throw new OpError('bad-request', 'applyHoldings 必须为布尔值')
      const staged = structuredClone(db)
      const out = []
      let skipped = 0
      for (const row of payload.rows) {
        const result = applyOp(staged, 'trade.add', { trade: { ...row, source: row.source ?? payload.source }, applyHoldings: payload.applyHoldings, deduplicate: true })
        if (result.duplicate) skipped++
        else out.push(result.trade)
      }
      Object.assign(db, staged)
      return { imported: out.length, skipped, trades: out, applyHoldings: payload.applyHoldings !== false }
    }

    default:
      throw new OpError('bad-request', '未知操作 op: ' + op)
  }
}

// Valuation helper shared by the dashboard and CLI. Only known conversions enter totals.
export function summarize(db) {
  const base = db.baseCurrency || 'CNY'
  const fx = { ...db.fx, [base]: 1 }
  const aggregate = (metadata) => ({ ...metadata, valueBase: 0, costBase: 0, holdings: 0, excludedHoldings: 0 })
  const byAccount = new Map(db.accounts.map((a) => [a.id, aggregate({ ...a, accountId: a.id })]))
  const byClass = new Map()
  const byCurrency = new Map()
  const bySector = new Map()
  const byStyle = new Map()
  const warnings = [], excludedHoldings = []
  let totalBase = 0, totalCost = 0
  const exclude = (h, currency, reason, message) => {
    excludedHoldings.push({ holdingId: h.id, accountId: h.accountId, instrumentId: h.instrumentId, currency, reason })
    warnings.push({ code: reason, message, holdingId: h.id, currency })
    const account = byAccount.get(h.accountId)
    if (account) account.excludedHoldings++
  }
  for (const h of db.holdings) {
    const ins = db.instruments.find((i) => i.id === h.instrumentId)
    const cur = h.currency || ins?.currency || base
    if (!ins) { exclude(h, cur, 'missing-instrument', '持仓标的不存在'); continue }
    if (!byAccount.has(h.accountId)) { exclude(h, cur, 'missing-account', '持仓账户不存在'); continue }
    // 估值优先级：手填价 > 行情价 > 平均成本；前两者都缺时才按成本估值并提示。
    const price = h.manualPrice ?? h.quotePrice ?? h.avgCost ?? 0
    const rate = fx[cur]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      exclude(h, cur, 'missing-fx', '缺少有效汇率: ' + cur); continue
    }
    const valueBase = h.qty * price * rate
    const costBase = h.qty * (h.avgCost ?? 0) * rate
    // 负平均成本是合法状态（累计分红超过投入），仅要求有限数值；数量与价格仍须非负。
    const finiteNonNegative = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
    if (!finiteNonNegative(h.qty) || !finiteNonNegative(price) || (h.avgCost != null && !Number.isFinite(h.avgCost)) || !Number.isFinite(valueBase) || !Number.isFinite(costBase) || !Number.isFinite(totalBase + valueBase) || !Number.isFinite(totalCost + costBase)) {
      exclude(h, cur, 'invalid-valuation', '持仓数值无效或超出可计算范围'); continue
    }
    if (h.manualPrice == null && h.quotePrice == null && h.qty > 0) warnings.push({ code: 'cost-estimate-price', message: '未设置现价，使用平均成本估值', holdingId: h.id, currency: cur })
    totalBase += valueBase
    totalCost += costBase
    const cls = ins.assetClass || 'other'
    if (!byClass.has(cls)) byClass.set(cls, aggregate({ assetClass: cls }))
    if (!byCurrency.has(cur)) byCurrency.set(cur, aggregate({ currency: cur }))
    // 行业 / 风格：缺失时归入「未分类」，分类数据只来自用户或来源，不猜测。
    const sectorKey = String(ins.sector || '').trim() || '未分类'
    const styleKey = ins.style || '未分类'
    if (!bySector.has(sectorKey)) bySector.set(sectorKey, aggregate({ sector: sectorKey }))
    if (!byStyle.has(styleKey)) byStyle.set(styleKey, aggregate({ style: styleKey }))
    for (const agg of [byAccount.get(h.accountId), byClass.get(cls), byCurrency.get(cur), bySector.get(sectorKey), byStyle.get(styleKey)]) {
      agg.valueBase += valueBase; agg.costBase += costBase; agg.holdings++
    }
  }
  const round = (n) => Number(n.toFixed(2))
  const finish = (agg) => ({ ...agg, valueBase: round(agg.valueBase), costBase: round(agg.costBase), pnlBase: round(agg.valueBase - agg.costBase), weight: totalBase ? agg.valueBase / totalBase : 0 })
  return {
    baseCurrency: base, fx, totalValueBase: round(totalBase), totalCostBase: round(totalCost), totalPnlBase: round(totalBase - totalCost),
    accounts: [...byAccount.values()].map(finish), assetClasses: [...byClass.values()].map(finish), currencies: [...byCurrency.values()].map(finish),
    sectors: [...bySector.values()].map(finish), styles: [...byStyle.values()].map(finish),
    history: [...(db.snapshots || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.baseCurrency).localeCompare(String(b.baseCurrency))),
    warnings, excludedHoldings, excludedCount: excludedHoldings.length,
  }
}
