// 统一交易代码：把各来源的写法收敛成同一种标准形式，使历史行情、持仓身份与
// 估值都按同一个代码查询。纯函数 + 一个外部查询（东财公开搜索接口）。
import { canonicalMarket } from './model.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const SUGGEST_URL = 'https://searchapi.eastmoney.com/api/suggest/get'
// 东财网页端公开搜索 token（非用户凭据）。
const SUGGEST_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8'
const MKT_MARKET = { '1': 'CN', '0': 'CN', '116': 'HK', '105': 'US', '106': 'US', '107': 'US' }

/**
 * 规范化代码写法（不改变证券身份）：
 *  HK: 02549 / 2549.HK / HK.02549 / HKEX.2549 → 02549
 *  CN: SH.600519 / sz000001 → 600519 / 000001
 *  US: US.AAPL / aapl → AAPL（带到期日的期权代码保持大写原样）
 */
export function normalizeSymbol(symbol, market) {
  const raw = String(symbol || '').trim()
  const m = canonicalMarket(market)
  if (!raw) return { symbol: '', market: m }
  if (m === 'HK') {
    const code = raw.replace(/^HK(EX)?[.:]/i, '').replace(/\.HK$/i, '').replace(/^0+/, '')
    return { symbol: /^\d{1,5}$/.test(code) ? code.padStart(5, '0') : raw.toUpperCase(), market: m }
  }
  if (m === 'CN' || m === 'FUND') {
    // 长桥/同花顺会把交易所写进代码（600519.SH、000001.SZ、430047.BJ、000001.OF）；
    // 身份只认六位代码，交易所由后端按代码前缀推导，避免同一只证券因写法不同各建一条。
    const code = raw.replace(/^(SH|SZ|BJ)[.:]?/i, '').replace(/\.(SH|SZ|BJ|OF)$/i, '')
    return { symbol: /^\d{6}$/.test(code) ? code : raw, market: m }
  }
  if (m === 'US') {
    // 只去掉市场前后缀（US.AAPL / AAPL.US），保留股份类别里的点（BRK.B ≠ BRKB，ADR 与普通股也不同档）。
    return { symbol: raw.replace(/^US[.:]/i, '').replace(/\.US$/i, '').toUpperCase(), market: m }
  }
  return { symbol: raw.toUpperCase(), market: m }
}

/** 场外基金身份：market=FUND 或 assetClass=fund。股票与基金即使六位代码相同也必须分开建档。 */
export function isFundLike(instrument = {}) {
  const m = canonicalMarket(instrument.market)
  return m === 'FUND' || String(instrument.assetClass || '').toLowerCase() === 'fund'
}

// A 股交易所由代码前缀推导（沪深北）。债券等特殊品种仍按前缀尽力而为，不保证覆盖全部品种。
function cnExchange(code) {
  if (/^(43|83|87|88|92)/.test(code)) return 'BJ'
  if (/^(5|6|9)/.test(code)) return 'SH'
  if (/^(0|1|2|3)/.test(code)) return 'SZ'
  return null
}

/**
 * 本地展示用的完整证券代码（项目约定，不是任何接口的入参格式）：
 *   600519.SH / 000001.SZ / 430047.BJ / 00700.HK / AAPL.US / 000001.OF / CASH:CNY
 * 存储仍用 symbol + market + assetClass；展示时由本函数推导，避免同一只证券出现多种写法。
 */
export function canonicalDisplayCode(instrument = {}) {
  const raw = String(instrument.symbol || '').trim()
  if (!raw) return ''
  const m = canonicalMarket(instrument.market)
  const cls = String(instrument.assetClass || '').toLowerCase()
  if (m === 'CASH' || /^[A-Z]{3}\.CASH$/i.test(raw)) {
    const cur = /^([A-Z]{3})\.CASH$/i.exec(raw)?.[1] || instrument.currency || 'CNY'
    return 'CASH:' + String(cur).toUpperCase()
  }
  const normalized = normalizeSymbol(raw, m).symbol
  if (m === 'FUND' || (cls === 'fund' && /^\d{6}$/.test(normalized))) {
    return /^\d{6}$/.test(normalized) ? normalized + '.OF' : raw
  }
  if (m === 'CN') {
    if (!/^\d{6}$/.test(normalized)) return normalized
    const ex = cnExchange(normalized)
    return ex ? normalized + '.' + ex : normalized
  }
  if (m === 'HK') return (/^\d{1,5}$/.test(normalized) ? normalized.padStart(5, '0') : normalized) + '.HK'
  if (m === 'US') return normalized + '.US'
  if (m === 'SG') return normalized + '.SG'
  return normalized
}

/** 统一身份键：用于判断两个标的记录是否同一只证券（不含币种与资产类别）。 */
export function identityKey({ symbol, market }) {
  const normalized = normalizeSymbol(symbol, market)
  return normalized.market + '|' + normalized.symbol
}

/**
 * 用东财公开搜索把「名称或错写代码」解析为统一代码。
 * 返回 { symbol, market, name, quoteId } 或 null；网络失败抛出，由调用方决定降级。
 */
export async function resolveSecurity(query, { fetch: fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const input = String(query || '').trim()
  if (!input) return null
  const url = `${SUGGEST_URL}?input=${encodeURIComponent(input)}&type=14&token=${SUGGEST_TOKEN}`
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json, text/plain, */*', 'user-agent': UA },
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  const json = await response.json()
  const rows = json?.QuotationCodeTable?.Data
  if (!Array.isArray(rows) || !rows.length) return null
  // 只接受可持仓的证券类型；指数、期货、期权等不参与账户估值。
  const typeOk = (row) => /(A股|港股|美股|基金|债券|ETF|LOF|REITs)/.test(String(row.SecurityTypeName || ''))
  const row = rows.find(typeOk) || null
  if (!row) return null
  const market = MKT_MARKET[String(row.MktNum)] || null
  if (!market) return null
  const normalized = normalizeSymbol(row.Code, market)
  return { symbol: normalized.symbol, market: normalized.market, name: String(row.Name || '').trim() || null, quoteId: String(row.QuoteID || '') || null, securityType: String(row.SecurityTypeName || '') || null }
}
