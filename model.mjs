// Canonical data model for dsh-wealth: one vocabulary shared by every source adapter,
// the ledger, the history archive and the analysis layer. See DATA-MODEL.md.
//
// This module is intentionally dependency-free and side-effect-free: it is the single
// source of truth for enums, so adapters (ths-client, lb-mcp, brokers-sdk, ib-client,
// history-file) cannot drift apart in naming or cash-sign conventions.

/** Target model version. Bumped only with a documented migration in DATA-MODEL.md. */
export const MODEL_VERSION = 2

/** Markets. Adapters must map source-specific codes into this set (SH/SZ -> CN). */
export const MARKETS = Object.freeze({
  CN: '中国内地',
  HK: '香港',
  US: '美国',
  SG: '新加坡',
  FUND: '场外基金',
  CASH: '现金',
  OTHER: '其他',
})

/** Asset classes. Fixed list: the dashboard groups by these keys. */
export const ASSET_CLASSES = Object.freeze(['stock', 'fund', 'etf', 'cash', 'bond', 'crypto', 'other'])

/**
 * Style buckets for instruments (growth / value …). Free-form `sector` carries the
 * industry; style is a small closed set so analysis can aggregate without guessing.
 */
export const INSTRUMENT_STYLES = Object.freeze({ growth: '成长', value: '价值', blend: '均衡', other: '其他' })
export const STYLE_KEYS = Object.freeze(Object.keys(INSTRUMENT_STYLES))
export function normalizeStyle(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return null
  if (STYLE_KEYS.includes(raw)) return raw
  const byLabel = Object.entries(INSTRUMENT_STYLES).find(([, label]) => value === label || value.startsWith(label))
  return byLabel ? byLabel[0] : null
}

/**
 * Flow taxonomy. Every archived event, every imported trade and every source-side
 * cash movement maps to exactly one kind.
 *
 * category     trade | cash | fee | transfer | corporate | other
 * cashSign     +1 money into the account, -1 out, 0 no cash movement, null unknown
 * requiresSymbol  the record must carry an instrument (symbol + quantity + price rules)
 */
export const FLOW_KINDS = Object.freeze({
  buy:          { label: '买入',     category: 'trade',     cashSign: -1, requiresSymbol: true },
  sell:         { label: '卖出',     category: 'trade',     cashSign: 1,  requiresSymbol: true },
  repo_open:    { label: '回购融出', category: 'trade',     cashSign: -1, requiresSymbol: true },
  repo_close:   { label: '回购购回', category: 'trade',     cashSign: 1,  requiresSymbol: true },
  ipo:          { label: '新股入账', category: 'corporate', cashSign: 0,  requiresSymbol: true },
  security_in:  { label: '证券转入', category: 'transfer',  cashSign: 0,  requiresSymbol: true },
  security_out: { label: '证券转出', category: 'transfer',  cashSign: 0,  requiresSymbol: true },
  dividend:     { label: '分红派息', category: 'cash',      cashSign: 1,  requiresSymbol: false },
  interest:     { label: '利息',     category: 'cash',      cashSign: 1,  requiresSymbol: false },
  deposit:      { label: '入金',     category: 'cash',      cashSign: 1,  requiresSymbol: false },
  withdrawal:   { label: '出金',     category: 'cash',      cashSign: -1, requiresSymbol: false },
  fee:          { label: '费用',     category: 'fee',       cashSign: -1, requiresSymbol: false },
  tax:          { label: '税费',     category: 'fee',       cashSign: -1, requiresSymbol: false },
  other:        { label: '其他',     category: 'other',     cashSign: null, requiresSymbol: false },
})

export const KIND_NAMES = Object.freeze(Object.keys(FLOW_KINDS))
const KIND_SET = new Set(KIND_NAMES)

export const CATEGORIES = Object.freeze(['trade', 'cash', 'fee', 'transfer', 'corporate', 'other'])

export function isFlowKind(kind) { return KIND_SET.has(kind) }

/** Metadata for one kind, or null when the adapter produced an unknown name. */
export function flowKind(kind) { return KIND_SET.has(kind) ? { kind, ...FLOW_KINDS[kind] } : null }

/** +1 / -1 / 0 / null — the cash direction implied by the kind, never by the amount sign. */
export function cashSignOf(kind) { return KIND_SET.has(kind) ? FLOW_KINDS[kind].cashSign : null }

export function isTradeKind(kind) { return KIND_SET.has(kind) && FLOW_KINDS[kind].category === 'trade' }

export function kindLabel(kind) { return KIND_SET.has(kind) ? FLOW_KINDS[kind].label : String(kind) }

/** Serialisable registry for the capabilities API, the chat prompt and future analysis. */
export function flowKindList() {
  return KIND_NAMES.map(kind => ({ kind, ...FLOW_KINDS[kind] }))
}

/** Market normalization shared by adapters: source aliases collapse to canonical ids. */
export function canonicalMarket(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'SH' || raw === 'SZ' || raw === 'CN') return 'CN'
  if (raw === 'HK' || raw === 'HKEX') return 'HK'
  if (raw === 'US' || raw === 'NASDAQ' || raw === 'NYSE') return 'US'
  if (raw === 'SG' || raw === 'SGX') return 'SG'
  if (raw === 'FUND' || raw === 'OF' || raw === 'OTC') return 'FUND'
  if (raw === 'CASH') return 'CASH'
  return raw && MARKETS[raw] ? raw : 'OTHER'
}

/** Default settlement currency of a market; never used to convert, only to fill a blank. */
export function marketCurrency(market) {
  return { CN: 'CNY', HK: 'HKD', US: 'USD', SG: 'SGD' }[canonicalMarket(market)] || null
}

/** True when the row is a cash balance row stored in the v1 holdings collection. */
export function isCashRow(instrument) {
  return !!instrument && (instrument.assetClass === 'cash' || instrument.market === 'CASH')
}
