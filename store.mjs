// dsh-portfolio — shared data store (used by host plugin index.js and by cli.mjs)
// Plain JSON file, atomic writes, keeps a .bak of the previous version.
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { isFlowKind, KIND_NAMES, normalizeStyle, isLifeCategory, LIFE_CATEGORIES, canonicalMarket } from './model.mjs'
import { normalizeSymbol, identityKey } from './symbols.mjs'

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
  budgets: [],
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
  const rawSymbol = String(ref.symbol || '').trim()
  if (!rawSymbol) throw new OpError('bad-request', '缺少标的代码 symbol')
  // 统一交易代码：同一只证券在各来源的写法（2549.HK / HK.02549 / 02549）收敛为一种，
  // 否则历史行情与估值会按不同身份各查一次，产生重复持仓。
  const normalized = normalizeSymbol(rawSymbol, ref.market || '')
  const symbol = normalized.symbol || rawSymbol
  const market = String(ref.market || '').trim().toUpperCase()
  // 按统一身份查找：旧写法（2549.HK / HK.02549）也能挂到已有记录上，不再产生第三条重复。
  const existing = db.instruments.find((i) => {
    const n = normalizeSymbol(i.symbol, i.market)
    return n.symbol === symbol && (market === '' || n.market === market)
  })
  if (existing) return existing
  if (!create) throw new OpError('not-found', '标的不存在: ' + symbol)
  const instrument = {
    id: uid('INS'),
    symbol,
    name: String(ref.name || symbol).trim(),
    market: canonicalMarket(market || 'CN'),
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
      // 摊薄成本可以为负（分红超过投入）；null 表示成本未知（v2），与真实的 0 成本区分。
      const avgCost = numeric(p.avgCost, 'avgCost', { optional: true, nullable: true, signed: true })
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
          qty: qty ?? 0, avgCost: avgCost === undefined ? 0 : avgCost,
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

    // 重写标的代码：用于把历史导入的旧写法（2549.HK）收敛到统一代码（02549）。
    case 'instrument.rename': {
      const p = payload
      const instrument = findInstrument(db, String(p.id || ''))
      if (!instrument) throw new OpError('not-found', '标的不存在: ' + p.id)
      const symbol = p.symbol !== undefined ? normalizeSymbol(String(p.symbol), p.market || instrument.market).symbol : instrument.symbol
      const market = p.market !== undefined ? canonicalMarket(String(p.market)) : instrument.market
      if (!symbol) throw new OpError('bad-request', '缺少标的代码 symbol')
      if (db.instruments.some((i) => i.id !== instrument.id && i.symbol === symbol && i.market === market)) {
        throw new OpError('bad-request', '统一代码冲突：已存在 ' + market + '|' + symbol)
      }
      instrument.symbol = symbol
      instrument.market = market
      if (p.name !== undefined && p.name !== null) instrument.name = String(p.name)
      return { instrument }
    }

    // 合并同一只证券的重复标的记录：把 dropId 的持仓改挂到 keepId 后删除 dropId。
    // 同一账户下已有同币种持仓时拒绝（可能重复导入，需人工核对），避免数量被覆盖。
    case 'instrument.merge': {
      const p = payload
      const keep = findInstrument(db, String(p.keepId || ''))
      const drop = findInstrument(db, String(p.dropId || ''))
      if (!keep || !drop) throw new OpError('not-found', '标的不存在')
      if (keep.id === drop.id) throw new OpError('bad-request', 'keepId 与 dropId 不能相同')
      const moved = db.holdings.filter((h) => h.instrumentId === drop.id)
      for (const holding of moved) {
        const clash = db.holdings.find((h) => h.accountId === holding.accountId && h.instrumentId === keep.id && h.currency === holding.currency)
        if (clash) throw new OpError('bad-request', '账户「' + holding.accountId + '」同时持有两个重复标的，请先人工核对再合并')
      }
      for (const holding of moved) holding.instrumentId = keep.id
      db.instruments = db.instruments.filter((i) => i.id !== drop.id)
      if (!keep.name && drop.name) keep.name = drop.name
      if (!keep.sector && drop.sector) keep.sector = drop.sector
      if (!keep.style && drop.style) keep.style = drop.style
      return { instrument: keep, movedHoldings: moved.length, removed: drop.id }
    }

    // 月度生活预算：每个分类一条；monthly 为 null 表示删除该分类预算。
    case 'budget.set': {
      const p = payload
      const category = String(p.category || '').trim()
      if (!isLifeCategory(category)) throw new OpError('bad-request', '未知的生活账单分类: ' + category + '（可用: ' + Object.keys(LIFE_CATEGORIES).join('/') + '）')
      db.budgets ||= []
      const index = db.budgets.findIndex((b) => b.category === category)
      if (p.monthly === null || p.monthly === undefined || p.monthly === '') {
        if (index >= 0) db.budgets.splice(index, 1)
        return { removed: true, category }
      }
      const monthly = numeric(p.monthly, 'monthly', { positive: true })
      const budget = { id: db.budgets[index]?.id || uid('BUD'), category, monthly, updatedAt: nowISO() }
      if (index >= 0) db.budgets[index] = budget
      else db.budgets.push(budget)
      return { budget }
    }

    // 批量归档微信 / 支付宝账单：一文件一批次，按 externalId 去重，未识别行如实计数。
    case 'bills.import': {
      const p = payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      const account = findAccount(db, p.accountId)
      if (!account) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      if (!Array.isArray(p.rows) || !p.rows.length) throw new OpError('bad-request', '没有可导入的账单行')
      if (p.rows.length > 5000) throw new OpError('bad-request', '单次最多导入 5000 行')
      db.historyEvents ||= []
      const existing = new Set(db.historyEvents.filter((e) => e.accountId === p.accountId && e.externalId).map((e) => e.externalId))
      const batchId = uid('HIST'), importedAt = nowISO()
      const provider = String(p.provider || p.source || 'bill').slice(0, 32)
      const added = []
      let duplicates = 0, skipped = 0
      for (const row of p.rows) {
        const date = String(row?.date || '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) { skipped++; continue }
        const amount = numeric(row.amount, 'amount', { positive: true })
        const direction = row.direction
        if (direction !== 'out' && direction !== 'in') { skipped++; continue }
        const category = row.category === undefined || row.category === null || row.category === '' ? null : String(row.category).trim()
        if (category !== null && !isLifeCategory(category)) throw new OpError('bad-request', '未知的生活账单分类: ' + category)
        const externalId = row.externalId ? String(row.externalId) : null
        if (externalId && existing.has(externalId)) { duplicates++; continue }
        const event = {
          id: uid('EVT'), accountId: account.id, kind: direction === 'in' ? 'deposit' : 'withdrawal',
          date, cashAmount: direction === 'in' ? amount : -amount,
          currency: normCurrency(row.currency, account.currency || db.baseCurrency),
          ...(category ? { category } : {}),
          ...(row.time ? { time: String(row.time) } : {}),
          note: String(row.note || ''), source: 'bill-import:' + provider,
          ...(externalId ? { externalId } : {}),
          batchId, importedAt, archiveOnly: true, observedAt: importedAt,
        }
        if (externalId) existing.add(externalId)
        db.historyEvents.push(event)
        added.push(event)
      }
      if (added.length) {
        db.historyBatches ||= []
        db.historyBatches.push({
          id: batchId, accountId: account.id, importedAt, imported: added.length, duplicates, skipped, outside: 0,
          method: 'bills', provider,
          coverage: { method: 'bills', complete: false, note: '微信 / 支付宝账单导入，仅覆盖文件内可见记录。' },
          byKind: added.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] || 0) + 1; return acc }, {}),
        })
      }
      return { batchId, imported: added.length, duplicates, skipped }
    }

    // 批量归档银证转账（来源：asset_change 按日回扫）。一扫描一批次；同一账户里
    // 已有同日同方向同金额的记录（手工补录 / 券商导入）一律跳过，避免重复计数。
    case 'transfers.import': {
      const p = payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      const account = findAccount(db, p.accountId)
      if (!account) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      if (!Array.isArray(p.rows) || !p.rows.length) throw new OpError('bad-request', '没有可归档的转账行')
      if (p.rows.length > 2000) throw new OpError('bad-request', '单次最多归档 2000 行')
      db.historyEvents ||= []
      const existingIds = new Set(db.historyEvents.filter((e) => e.accountId === p.accountId && e.externalId).map((e) => e.externalId))
      const existingDay = new Set(db.historyEvents.filter((e) => e.accountId === p.accountId && (e.kind === 'deposit' || e.kind === 'withdrawal')).map((e) => [e.date, e.kind, e.cashAmount].join('|')))
      const batchId = uid('HIST'), importedAt = nowISO()
      const added = []
      let duplicates = 0, skipped = 0
      for (const row of p.rows) {
        const date = String(row?.date || '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) { skipped++; continue }
        const direction = row.direction
        if (direction !== 'in' && direction !== 'out') { skipped++; continue }
        const amount = numeric(row.amount, 'amount', { positive: true })
        const kind = direction === 'in' ? 'deposit' : 'withdrawal'
        const externalId = `ths-ac:${date}:${direction}`
        if (existingIds.has(externalId) || existingDay.has([date, kind, direction === 'in' ? amount : -amount].join('|'))) { duplicates++; continue }
        const event = {
          id: uid('EVT'), accountId: account.id, kind, date,
          cashAmount: direction === 'in' ? amount : -amount,
          currency: normCurrency(row.currency, account.currency || db.baseCurrency),
          note: String(row.note || '同花顺资金流动按日回扫（区间总额定位到日）'), source: 'ths-asset-change',
          externalId, batchId, importedAt, archiveOnly: true, observedAt: importedAt,
        }
        existingIds.add(externalId)
        existingDay.add([date, kind, event.cashAmount].join('|'))
        db.historyEvents.push(event)
        added.push(event)
      }
      // 扫描游标：coveredFrom 取更早者（覆盖面只增不减），complete 一旦成立保持成立。
      const cursor = p.cursor && typeof p.cursor === 'object' ? p.cursor : {}
      const prev = account.transferScan || {}
      account.transferScan = {
        coveredFrom: [prev.coveredFrom, cursor.coveredFrom].filter(Boolean).sort()[0] || cursor.coveredFrom || null,
        complete: Boolean(prev.complete || cursor.complete),
        lastScannedAt: cursor.scannedAt || importedAt,
        lastRequests: Number(cursor.requests) || 0,
        lastImported: added.length,
      }
      if (added.length) {
        db.historyBatches ||= []
        db.historyBatches.push({
          id: batchId, accountId: account.id, importedAt, imported: added.length, duplicates, skipped, outside: 0,
          method: 'transfer-scan',
          coverage: { method: 'transfer-scan', complete: Boolean(cursor.complete), note: '同花顺「资金流动」区间总额按二分定位到日；金额与方向为券商口径，不含单笔流水号。' },
          byKind: added.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] || 0) + 1; return acc }, {}),
        })
      }
      return { batchId, imported: added.length, duplicates, skipped, transferScan: account.transferScan }
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
  const aggregate = (metadata) => ({ ...metadata, valueBase: 0, costBase: 0, pnlBase: 0, holdings: 0, excludedHoldings: 0 })
  const byAccount = new Map(db.accounts.map((a) => [a.id, aggregate({ ...a, accountId: a.id })]))
  const byClass = new Map()
  const byCurrency = new Map()
  const bySector = new Map()
  const byStyle = new Map()
  const warnings = [], excludedHoldings = []
  let totalBase = 0, totalCost = 0, totalPnl = 0, holdingsWithoutCost = 0
  // 同一只证券可能存在多条历史记录（每个来源一条）：统计按统一身份取首条元数据，
  // 记录本身保持分开，汇总与分类归并到同一身份下。
  const canonical = new Map()
  for (const ins of db.instruments) {
    const key = identityKey(ins)
    if (!canonical.has(key)) canonical.set(key, ins)
  }
  const instrumentOf = (id) => {
    const ins = db.instruments.find((i) => i.id === id)
    return ins ? (canonical.get(identityKey(ins)) || ins) : null
  }
  const exclude = (h, currency, reason, message) => {
    excludedHoldings.push({ holdingId: h.id, accountId: h.accountId, instrumentId: h.instrumentId, currency, reason })
    warnings.push({ code: reason, message, holdingId: h.id, currency })
    const account = byAccount.get(h.accountId)
    if (account) account.excludedHoldings++
  }
  for (const h of db.holdings) {
    const ins = instrumentOf(h.instrumentId)
    const cur = h.currency || ins?.currency || base
    if (!ins) { exclude(h, cur, 'missing-instrument', '持仓标的不存在'); continue }
    if (!byAccount.has(h.accountId)) { exclude(h, cur, 'missing-account', '持仓账户不存在'); continue }
    // 估值优先级：手填价 > 行情价 > 券商快照价 > 平均成本；全部缺失时不估值（绝不按 0 计）。
    const price = h.manualPrice ?? h.quotePrice ?? h.sourcePrice ?? h.avgCost
    if (price == null) { exclude(h, cur, 'no-price', '没有价格且成本未知，无法估值'); continue }
    const rate = fx[cur]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      exclude(h, cur, 'missing-fx', '缺少有效汇率: ' + cur); continue
    }
    const valueBase = h.qty * price * rate
    // 成本未知（null）时只计入市值，不进入成本与盈亏；0 是真实的零成本。
    const hasCost = h.avgCost != null
    const costBase = hasCost ? h.qty * h.avgCost * rate : null
    const pnlBase = hasCost ? valueBase - costBase : null
    // 负平均成本是合法状态（累计分红超过投入），仅要求有限数值；数量与价格仍须非负。
    const finiteNonNegative = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
    if (!finiteNonNegative(h.qty) || !finiteNonNegative(price) || (hasCost && !Number.isFinite(h.avgCost)) || !Number.isFinite(valueBase) || (hasCost && (!Number.isFinite(costBase) || !Number.isFinite(totalPnl + pnlBase))) || !Number.isFinite(totalBase + valueBase) || (hasCost && !Number.isFinite(totalCost + costBase))) {
      exclude(h, cur, 'invalid-valuation', '持仓数值无效或超出可计算范围'); continue
    }
    if (h.manualPrice == null && h.quotePrice == null && h.sourcePrice == null && h.qty > 0) warnings.push({ code: 'cost-estimate-price', message: '未设置现价，使用平均成本估值', holdingId: h.id, currency: cur })
    totalBase += valueBase
    if (hasCost) {
      totalCost += costBase
      totalPnl += pnlBase
    } else {
      holdingsWithoutCost++
      warnings.push({ code: 'unknown-cost', message: '成本未知，未计入成本与盈亏', holdingId: h.id, currency: cur })
    }
    const cls = ins.assetClass || 'other'
    if (!byClass.has(cls)) byClass.set(cls, aggregate({ assetClass: cls }))
    if (!byCurrency.has(cur)) byCurrency.set(cur, aggregate({ currency: cur }))
    // 行业 / 风格：缺失时归入「未分类」，分类数据只来自用户或来源，不猜测。
    const sectorKey = String(ins.sector || '').trim() || '未分类'
    const styleKey = ins.style || '未分类'
    if (!bySector.has(sectorKey)) bySector.set(sectorKey, aggregate({ sector: sectorKey }))
    if (!byStyle.has(styleKey)) byStyle.set(styleKey, aggregate({ style: styleKey }))
    for (const agg of [byAccount.get(h.accountId), byClass.get(cls), byCurrency.get(cur), bySector.get(sectorKey), byStyle.get(styleKey)]) {
      agg.valueBase += valueBase; agg.holdings++
      if (hasCost) { agg.costBase += costBase; agg.pnlBase += pnlBase }
    }
  }
  const round = (n) => Number(n.toFixed(2))
  const finish = (agg) => ({ ...agg, valueBase: round(agg.valueBase), costBase: round(agg.costBase), pnlBase: round(agg.pnlBase), weight: totalBase ? agg.valueBase / totalBase : 0 })
  return {
    baseCurrency: base, fx, totalValueBase: round(totalBase), totalCostBase: round(totalCost), totalPnlBase: round(totalPnl), holdingsWithoutCost,
    accounts: [...byAccount.values()].map(finish), assetClasses: [...byClass.values()].map(finish), currencies: [...byCurrency.values()].map(finish),
    sectors: [...bySector.values()].map(finish), styles: [...byStyle.values()].map(finish),
    history: [...(db.snapshots || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.baseCurrency).localeCompare(String(b.baseCurrency))),
    warnings, excludedHoldings, excludedCount: excludedHoldings.length,
  }
}
