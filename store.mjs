// dsh-portfolio — shared data store (used by host plugin index.js and by cli.mjs)
// Plain JSON file, atomic writes, keeps a .bak of the previous version.
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

export const DATA_DIR = process.env.DSH_PORTFOLIO_DIR || join(homedir(), '.dsh', 'data', 'dsh-portfolio')
export const DATA_FILE = join(DATA_DIR, 'ledger.json')

const EMPTY = () => ({
  version: 1,
  baseCurrency: 'CNY',
  fx: { CNY: 1, HKD: 0.92, USD: 7.15 },
  accounts: [],
  instruments: [],
  holdings: [],
  trades: [],
  updatedAt: null,
})

function ensureDir() { mkdirSync(DATA_DIR, { recursive: true }) }

export function load() {
  ensureDir()
  if (!existsSync(DATA_FILE)) return EMPTY()
  try {
    const db = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    return { ...EMPTY(), ...db }
  } catch (error) {
    // keep the broken file for inspection, start clean
    try { copyFileSync(DATA_FILE, DATA_FILE + '.corrupt-' + Date.now()) } catch { /* ignore */ }
    return EMPTY()
  }
}

export function save(db) {
  ensureDir()
  db.updatedAt = new Date().toISOString()
  const tmp = DATA_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  try { if (existsSync(DATA_FILE)) copyFileSync(DATA_FILE, DATA_FILE + '.bak') } catch { /* ignore */ }
  renameSync(tmp, DATA_FILE)
  return db
}

const uid = (prefix) => prefix + '_' + randomUUID().slice(0, 8).toUpperCase()
const toNum = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null }
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
    assetClass: String(ref.assetClass || guessAssetClass(symbol, ref.assetClass)).trim(),
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
  const qty = toNum(trade.qty) || 0
  const price = toNum(trade.price) || 0
  if (!holding) {
    holding = {
      id: uid('POS'), accountId: trade.accountId, instrumentId: trade.instrumentId,
      qty: 0, avgCost: 0, currency: trade.currency, manualPrice: null, note: '', updatedAt: nowISO(),
    }
    db.holdings.push(holding)
  }
  if (trade.side === 'buy') {
    const totalQty = holding.qty + qty
    if (totalQty > 0) holding.avgCost = ((holding.qty * holding.avgCost) + (qty * price)) / totalQty
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
      return { removed: id }
    }

    case 'instrument.upsert': {
      const p = payload.instrument || payload
      const instrument = resolveInstrument(db, { ...p, instrumentId: p.id }, { create: true })
      return { instrument }
    }

    case 'holding.upsert': {
      const p = payload.holding || payload
      if (!p.accountId) throw new OpError('bad-request', '缺少 accountId')
      if (!findAccount(db, p.accountId)) throw new OpError('not-found', '账户不存在: ' + p.accountId)
      const instrument = resolveInstrument(db, p, { create: true })
      let holding = p.id ? db.holdings.find((h) => h.id === p.id) : findHolding(db, p.accountId, instrument.id)
      if (holding) {
        if (p.qty !== undefined) holding.qty = toNum(p.qty) || 0
        if (p.avgCost !== undefined) holding.avgCost = toNum(p.avgCost) || 0
        if (p.manualPrice !== undefined) holding.manualPrice = toNum(p.manualPrice)
        if (p.currency !== undefined) holding.currency = normCurrency(p.currency, holding.currency)
        if (p.note !== undefined) holding.note = String(p.note)
        holding.updatedAt = nowISO()
      } else {
        holding = {
          id: uid('POS'), accountId: p.accountId, instrumentId: instrument.id,
          qty: toNum(p.qty) || 0, avgCost: toNum(p.avgCost) || 0,
          currency: normCurrency(p.currency, instrument.currency),
          manualPrice: toNum(p.manualPrice), note: String(p.note || ''), updatedAt: nowISO(),
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
      const instrument = resolveInstrument(db, p, { create: true })
      const side = (p.side === 'sell' ? 'sell' : 'buy')
      const trade = {
        id: uid('TRD'), accountId: p.accountId, instrumentId: instrument.id, side,
        qty: toNum(p.qty) || 0, price: toNum(p.price) || 0, fee: toNum(p.fee) || 0,
        currency: normCurrency(p.currency, instrument.currency),
        date: String(p.date || new Date().toISOString().slice(0, 10)),
        note: String(p.note || ''), createdAt: nowISO(),
      }
      db.trades.push(trade)
      const holding = applyTradeToHolding(db, trade)
      return { trade, holding }
    }

    case 'trade.remove': {
      const id = payload.id
      if (!db.trades.some((t) => t.id === id)) throw new OpError('not-found', '流水不存在: ' + id)
      db.trades = db.trades.filter((t) => t.id !== id)
      return { removed: id, note: '已删除流水；持仓数量未自动回算，请手动核对' }
    }

    case 'price.set': {
      const p = payload
      if (p.holdingId) {
        const h = db.holdings.find((x) => x.id === p.holdingId)
        if (!h) throw new OpError('not-found', '持仓不存在: ' + p.holdingId)
        h.manualPrice = toNum(p.price); h.updatedAt = nowISO()
        return { holding: h }
      }
      if (p.instrumentId) {
        let n = 0
        for (const h of db.holdings) if (h.instrumentId === p.instrumentId) { h.manualPrice = toNum(p.price); h.updatedAt = nowISO(); n++ }
        if (n === 0) throw new OpError('not-found', '该标的没有持仓')
        return { updated: n }
      }
      throw new OpError('bad-request', 'price.set 需要 holdingId 或 instrumentId')
    }

    case 'fx.set': {
      const cur = normCurrency(payload.currency, null)
      if (!cur) throw new OpError('bad-request', '缺少 currency')
      const rate = toNum(payload.rate)
      if (rate === null || rate <= 0) throw new OpError('bad-request', 'rate 必须是正数（1 单位该币种 = ? 本位币）')
      db.fx[cur] = rate
      return { fx: db.fx }
    }

    case 'base.set': {
      const cur = normCurrency(payload.currency, null)
      if (!cur) throw new OpError('bad-request', '缺少 currency')
      db.baseCurrency = cur
      return { baseCurrency: cur }
    }

    case 'import.holdings': {
      const rows = Array.isArray(payload.rows) ? payload.rows : []
      const out = []
      for (const row of rows) out.push(applyOp(db, 'holding.upsert', { holding: row }).holding)
      return { imported: out.length, holdings: out }
    }

    case 'import.trades': {
      const rows = Array.isArray(payload.rows) ? payload.rows : []
      const out = []
      for (const row of rows) out.push(applyOp(db, 'trade.add', { trade: row }).trade)
      return { imported: out.length, trades: out }
    }

    default:
      throw new OpError('bad-request', '未知操作 op: ' + op)
  }
}

// Valuation helper shared by CLI: convert every holding to base currency.
export function summarize(db) {
  const base = db.baseCurrency || 'CNY'
  const fx = { ...db.fx, [base]: 1 }
  const byAccount = new Map()
  let totalBase = 0
  for (const h of db.holdings) {
    const ins = db.instruments.find((i) => i.id === h.instrumentId)
    if (!ins) continue
    const price = (h.manualPrice ?? h.avgCost ?? 0)
    const cur = h.currency || ins.currency || base
    const rate = fx[cur] ?? 1
    const valueBase = h.qty * price * rate
    const costBase = h.qty * (h.avgCost || 0) * rate
    totalBase += valueBase
    if (!byAccount.has(h.accountId)) byAccount.set(h.accountId, { accountId: h.accountId, valueBase: 0, costBase: 0, holdings: 0 })
    const agg = byAccount.get(h.accountId)
    agg.valueBase += valueBase; agg.costBase += costBase; agg.holdings += 1
  }
  const round = (n) => Math.round(n * 100) / 100
  const accounts = [...byAccount.values()].map((a) => ({ ...a, valueBase: round(a.valueBase), costBase: round(a.costBase), pnlBase: round(a.valueBase - a.costBase) }))
  return { baseCurrency: base, fx, totalValueBase: round(totalBase), totalCostBase: round(accounts.reduce((s, a) => s + a.costBase, 0)), totalPnlBase: round(accounts.reduce((s, a) => s + a.pnlBase, 0)), accounts }
}
