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
    const code = raw.replace(/^(SH|SZ)[.:]?/i, '')
    return { symbol: /^\d{6}$/.test(code) ? code : raw, market: m }
  }
  if (m === 'US') return { symbol: raw.replace(/^US[.:]/i, '').toUpperCase(), market: m }
  return { symbol: raw.toUpperCase(), market: m }
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
