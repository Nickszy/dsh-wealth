// 且慢 / 盈米 MCP adapter (Streamable HTTP, read-only).
// Docs: https://qieman.com/mcp/mcp-market
//   OAuth endpoint  https://stargate-partner.yingmi.com/mcp/v2/oauth/qieman
//   API key endpoint https://stargate.yingmi.com/mcp/v2   header x-api-key
// The API key is long-lived (applied once at ai.yingmi.com); no refresh needed.
//
// 且慢 is a fund/投顾 platform, so this is a snapshot-only source: funds under one
// account, no trade ledger. The MCP tool names are resolved at runtime because the
// market exposes Chinese names while the docs list the English function names.
import { createHash } from 'node:crypto'
import { createMcpHttpClient, mcpAuthHeaders, pickTool } from './mcp-http.mjs'

export const QIEMAN_DEFAULT_ENDPOINT = 'https://stargate.yingmi.com/mcp/v2'
export const QIEMAN_OAUTH_ENDPOINT = 'https://stargate-partner.yingmi.com/mcp/v2/oauth/qieman'

const ACCOUNT_TOOLS = ['GetUserAccountsAndProducts', 'get_user_accounts_and_products']
const FUND_DETAIL_TOOLS = ['GetUserM4FundDetail', 'get_user_m4_fund_detail']
const ASSET_TREE_TOOLS = ['GetUserAssetTree', 'get_user_asset_tree']
const ASSET_ANALYSIS_TOOLS = ['GetUserAssetAnalysis', 'get_user_asset_analysis']

const CODE_FIELDS = ['fundCode', 'fund_code', 'fundcode', 'code', 'productCode', 'product_code', 'symbol']
const NAME_FIELDS = ['fundName', 'fund_name', 'productName', 'product_name', 'name', 'shortName']
const SHARE_FIELDS = ['holdShare', 'holdShares', 'hold_shares', 'shares', 'share', 'totalShare', 'totalShares', 'quantity', 'holdQuantity', 'units', 'holdUnits']
const AMOUNT_FIELDS = ['holdAmount', 'hold_amount', 'amount', 'marketValue', 'market_value', 'assetAmount', 'asset_amount', 'totalAmount', 'value', 'holdValue']
const PROFIT_FIELDS = ['holdProfit', 'hold_profit', 'profit', 'totalProfit', 'total_profit', 'accumProfit', 'accumulatedProfit', 'income', 'holdIncome']
const NAV_FIELDS = ['nav', 'netValue', 'net_value', 'unitNav', 'unit_nav', 'unitNetValue', 'latestNav', 'price']
const CURRENCY_FIELDS = ['currency', 'currencyCode', 'currency_code']
const TOTAL_FIELDS = ['totalAsset', 'total_asset', 'totalAssets', 'totalAmount', 'assetAmount', 'netAsset', 'netAssets', 'totalValue', 'total_value']
const DAY_PROFIT_FIELDS = ['dayProfit', 'day_profit', 'todayProfit', 'today_profit', 'dailyProfit']
const NESTED_ROW_KEYS = ['fund', 'fundInfo', 'fund_info', 'product', 'productInfo', 'product_info', 'asset', 'item']

const fail = (message) => { throw new Error(message) }
const MAX_DEPTH = 12

function text(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s ? s : null
}

function number(value) {
  if (value == null) return null
  if (typeof value === 'object') {
    // Some responses wrap scalars: { value: 12.3 } or { amount: '12.3' }.
    for (const key of ['value', 'amount', 'num', 'val']) if (value[key] != null) return number(value[key])
    return null
  }
  const raw = String(value).trim().replace(/[,%¥$元份]/g, '')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function pick(row, fields) {
  for (const field of fields) {
    if (row && Object.prototype.hasOwnProperty.call(row, field)) {
      const value = row[field]
      if (value !== null && value !== undefined && value !== '') return value
    }
  }
  return null
}

/** Flatten one level of common wrappers so field lookup works on either shape. */
function flatten(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row
  let out = row
  for (const key of NESTED_ROW_KEYS) {
    const nested = row[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) out = { ...nested, ...out }
  }
  return out
}

/** Visit every array inside a response, at most MAX_DEPTH deep. */
function eachArray(value, visit, depth = 0) {
  if (value == null || depth > MAX_DEPTH) return
  if (Array.isArray(value)) {
    if (value.length) visit(value)
    for (const item of value) eachArray(item, visit, depth + 1)
    return
  }
  if (typeof value !== 'object') return
  for (const child of Object.values(value)) eachArray(child, visit, depth + 1)
}

function looksLikeFund(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  const flat = flatten(row)
  return !!text(pick(flat, CODE_FIELDS)) && (
    number(pick(flat, SHARE_FIELDS)) !== null ||
    number(pick(flat, AMOUNT_FIELDS)) !== null ||
    number(pick(flat, NAV_FIELDS)) !== null
  )
}

function collectFundRows(payload) {
  const rows = []
  eachArray(payload, (list) => {
    for (const item of list) if (looksLikeFund(item)) rows.push(flatten(item))
  })
  return rows
}

/** Find the largest plausible total asset value in the response tree. */
function findTotalAsset(payload) {
  let best = null
  const walk = (value, depth) => {
    if (value == null || depth > MAX_DEPTH) return
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (TOTAL_FIELDS.includes(key)) {
        const n = number(child)
        if (n !== null && n >= 0 && (best === null || n > best)) best = n
      }
      walk(child, depth + 1)
    }
  }
  walk(payload, 0)
  return best
}

function findDayProfit(payload) {
  let total = 0, found = false
  const walk = (value, depth) => {
    if (value == null || depth > MAX_DEPTH) return
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (DAY_PROFIT_FIELDS.includes(key)) {
        const n = number(child)
        if (n !== null) { total += n; found = true }
      }
      walk(child, depth + 1)
    }
  }
  walk(payload, 0)
  return found ? total : null
}

function createClient(source, secrets, signal, deps) {
  const endpoint = source?.mcpEndpoint || QIEMAN_DEFAULT_ENDPOINT
  const auth = mcpAuthHeaders({ apiKey: secrets.apiKey, bearerToken: secrets.bearerToken })
  return createMcpHttpClient({ endpoint, headers: auth, signal, deps })
}

async function resolveTool(mcp, candidates, label, warnings) {
  const tools = await mcp.listTools()
  const found = pickTool(tools, candidates)
  if (found) return found.name
  const available = tools.map((t) => t?.name).filter(Boolean).slice(0, 12).join(', ')
  warnings.push(`且慢 MCP 未找到「${label}」工具；账户可能未开通该权限。可用工具：${available || '无'}`)
  return null
}

async function callWithArgs(mcp, tool, argsCandidates) {
  let lastError = null
  for (const args of argsCandidates) {
    try { return await mcp.call(tool, args) } catch (error) {
      lastError = error
      // Only parameter/argument errors are worth retrying with another shape.
      if (!/参数|parameter|argument|missing|required|invalid/i.test(String(error?.message || ''))) throw error
    }
  }
  throw lastError
}

function fundRowToHolding(row, warnings) {
  const code = text(pick(row, CODE_FIELDS))
  if (!code) return null
  const name = text(pick(row, NAME_FIELDS)) || code
  const currency = (text(pick(row, CURRENCY_FIELDS)) || 'CNY').toUpperCase()
  let shares = number(pick(row, SHARE_FIELDS))
  let amount = number(pick(row, AMOUNT_FIELDS))
  let profit = number(pick(row, PROFIT_FIELDS))
  let nav = number(pick(row, NAV_FIELDS))

  if ((shares === null || shares <= 0) && amount !== null && nav !== null && nav > 0) shares = amount / nav
  if (shares === null || !(shares > 0)) { warnings.push(`QIEMAN_ZERO_SHARES:${code} 份额为 0 或缺失，已跳过`); return null }
  if (nav === null && amount !== null) nav = amount / shares
  if (nav !== null && !(nav > 0)) nav = null

  let avgCost = null
  if (amount !== null && profit !== null) avgCost = (amount - profit) / shares
  if (avgCost === null && nav !== null) {
    avgCost = nav
    warnings.push(`QIEMAN_COST_ASSUMED:${code} 来源未提供成本，按当前净值暂估`)
  }
  if (avgCost === null) { warnings.push(`QIEMAN_COST_UNAVAILABLE:${code} 成本未知，已跳过`); return null }

  return {
    symbol: code,
    name,
    market: 'FUND',
    assetClass: 'fund',
    currency,
    qty: shares,
    avgCost,
    manualPrice: nav,
    externalId: code,
  }
}

export async function listQiemanAccounts(source, secrets, signal, deps = {}) {
  const mcp = createClient(source, secrets, signal, deps)
  try {
    const warnings = []
    // tools/list doubles as the credential check; a bad key fails here loudly.
    const tool = await resolveTool(mcp, ACCOUNT_TOOLS, '获取账户与产品清单', warnings)
    if (tool) {
      try { await callWithArgs(mcp, tool, [{}, { accountId: 'main' }]) } catch (error) {
        if (/认证|授权|401|403|expired|unauthor/i.test(String(error?.message || error))) throw error
        warnings.push('且慢账户清单接口返回错误：' + String(error?.message || error))
      }
    }
    return { accounts: [{ id: 'main', name: '且慢账户 · MCP', currency: 'CNY' }], warnings }
  } finally { await mcp.dispose() }
}

export async function fetchQiemanSnapshot(source, secrets, signal, deps = {}) {
  const mcp = createClient(source, secrets, signal, deps)
  try {
    const warnings = []
    const fundTool = await resolveTool(mcp, FUND_DETAIL_TOOLS, '查看四笔钱持仓明细', warnings)
    const treeTool = await resolveTool(mcp, ASSET_TREE_TOOLS, '获取用户资产树', warnings)
    const analysisTool = await resolveTool(mcp, ASSET_ANALYSIS_TOOLS, '获取资产分析结果', warnings)
    if (!fundTool && !treeTool) fail('且慢 MCP 没有提供持仓读取工具，请确认 API Key 已开通「账户与资产」权限')

    let payload = null
    if (fundTool) {
      payload = await callWithArgs(mcp, fundTool, [{}, { accountId: 'main' }])
    }
    let rows = payload ? collectFundRows(payload) : []
    if (!rows.length && treeTool) {
      const tree = await callWithArgs(mcp, treeTool, [{}, { accountId: 'main' }])
      rows = collectFundRows(tree)
      if (!payload) payload = tree
      else payload = [payload, tree]
    }
    if (!rows.length && analysisTool) {
      const analysis = await callWithArgs(mcp, analysisTool, [{}])
      const analyzed = collectFundRows(analysis)
      if (analyzed.length) rows = analyzed
      else warnings.push('且慢资产分析接口没有返回可识别的基金持仓')
    }

    const seen = new Set()
    const holdings = []
    for (const row of rows) {
      const holding = fundRowToHolding(row, warnings)
      if (!holding) continue
      const key = holding.symbol + ':' + holding.currency
      if (seen.has(key)) continue
      seen.add(key)
      holdings.push(holding)
    }
    if (!holdings.length) fail('且慢 MCP 没有返回任何基金持仓；请确认账户内有资产且 API Key 已授权账户与资产权限')

    const reportedTotal = findTotalAsset(payload)
    const holdingsTotal = holdings.reduce((sum, h) => sum + (h.manualPrice != null ? h.manualPrice : h.avgCost) * h.qty, 0)
    const totalAsset = reportedTotal ?? (holdingsTotal || null)
    const dayProfit = findDayProfit(payload)
    const holdingProfit = holdings.reduce((sum, h) => sum + ((h.manualPrice != null ? h.manualPrice : h.avgCost) - h.avgCost) * h.qty, 0)
    const sourceTotals = {}
    if (totalAsset !== null) sourceTotals.totalAsset = totalAsset
    if (holdingProfit) sourceTotals.holdingProfit = holdingProfit
    if (dayProfit !== null) sourceTotals.dayProfit = dayProfit

    // 且慢 tracks fund shares, not a cash account; 盈米宝 is itself a fund product.
    const complete = holdings.every((h) => h.manualPrice != null)
    if (!complete) warnings.push('部分基金缺少最新净值，按要求成本暂估')

    return {
      holdings,
      complete,
      warnings,
      queriedAt: new Date(deps.now?.() ?? Date.now()).toISOString(),
      uploadedAt: null,
      quoteDate: null,
      ...(Object.keys(sourceTotals).length ? { sourceTotals } : {}),
    }
  } finally { await mcp.dispose() }
}

/** 且慢 MCP exposes no per-trade ledger; history must come from statement files. */
export async function fetchQiemanHistory() {
  fail('且慢 MCP 不提供逐笔交易流水，请使用账单文件补录历史记录')
}

export function qiemanMcpFingerprintPart(secrets = {}) {
  const value = String(secrets.apiKey || secrets.bearerToken || '')
  return value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : ''
}
