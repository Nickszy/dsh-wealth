// Standalone, read-only IBKR Client Portal Gateway adapter. No plugin or MCP.
// Official v1 docs (verified 2026-11-07):
// https://www.interactivebrokers.com/docs/web-api/v1/endpoints/portfolio/portfolio-accounts
// https://www.interactivebrokers.com/docs/web-api/v1/endpoints/portfolio/positions
// https://www.interactivebrokers.com/docs/web-api/v1/endpoints/portfolio/portfolio-ledger
// Gateway setup evidence:
// https://www.interactivebrokers.com/campus/trading-lessons/launching-and-authenticating-the-gateway/
// Setup: run IBKR's Client Portal Gateway and manually log in (including 2FA)
// in its browser UI. The gateway session handles authentication. No password,
// bearer-token assumption, SSO, login, reauthentication, tickle, or order calls.
// Tiered advisor structures needing /portfolio/subaccounts are not supported.
import http from 'node:http'
import https from 'node:https'

const DEFAULT_TIMEOUT = 30000
const MAX_PAGES = 100
const MAX_BYTES = 8 * 1024 * 1024
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
class IbError extends Error {}
const fail = message => { throw new IbError(message) }
const nonempty = value => typeof value === 'string' && value.trim().length > 0
function numeric(value, field) {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())))) fail(`IB ${field} is missing or invalid`)
  const result = Number(value)
  if (!Number.isFinite(result) || result < 0) fail(`IB ${field} must be finite and nonnegative; short positions and margin debt are unsupported`)
  return result
}
function currency(value) {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) fail('IB currency is missing or invalid')
  return value
}
function configuration(source, secrets, deps) {
  const config = plain(source?.config) ? source.config : source
  if (!plain(config)) fail('IB source configuration is required')
  let base
  try { base = new URL(config.gatewayUrl) } catch { fail('IB gatewayUrl must be a valid URL') }
  const host = base.hostname.toLowerCase()
  const loopback = host === 'localhost' || host === '[::1]' || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)
  if (base.username || base.password || base.search || base.hash) fail('IB gatewayUrl cannot contain credentials, query parameters or fragments')
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) fail('IB gatewayUrl requires HTTPS, or HTTP on loopback only')
  if (base.pathname.replace(/\/$/, '') !== '/v1/api') fail('IB gatewayUrl must end in /v1/api')
  if (config.trustLocalGateway !== undefined && typeof config.trustLocalGateway !== 'boolean') fail('IB trustLocalGateway must be boolean')
  if (config.trustLocalGateway && !loopback) fail('IB trustLocalGateway is permitted only for loopback gateways')
  // A generic bearer token is not documented for the local Gateway session.
  // Reject rather than silently dropping credentials or claiming OAuth support.
  if (secrets != null && (!plain(secrets) || Object.keys(secrets).length)) fail('IB local Gateway uses a manually authenticated gateway session; additional credentials are unsupported')
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) fail('IB timeoutMs must be between 1 and 120000')
  const maxPages = deps.maxPages ?? MAX_PAGES
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > MAX_PAGES) fail('IB maxPages must be between 1 and 100')
  return { config, base: base.href.replace(/\/$/, ''), rejectUnauthorized: !(config.trustLocalGateway && loopback), timeoutMs, maxPages }
}

// Every TLS choice is per request. Never changes NODE_TLS_REJECT_UNAUTHORIZED,
// global agents or process-wide settings. No redirects/cookies/body logging.
function defaultRequest(url, options) {
  return new Promise((resolve, reject) => {
    const transport = new URL(url).protocol === 'https:' ? https : http
    const req = transport.request(url, { method: 'GET', headers: options.headers, signal: options.signal, rejectUnauthorized: options.rejectUnauthorized, agent: false }, res => {
      const status = res.statusCode ?? 0
      if (status < 200 || status >= 300) {
        res.resume()
        reject(new IbError(status === 401 || status === 403
          ? 'IB Gateway authentication required; complete manual browser login and 2FA, then retry'
          : `IB Gateway request failed (HTTP ${status}); no snapshot returned`))
        return
      }
      const chunks = []
      let size = 0
      res.on('data', chunk => {
        size += chunk.length
        if (size > MAX_BYTES) { reject(new IbError('IB Gateway response exceeds size limit')); res.destroy(); req.destroy(); return }
        chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch { reject(new IbError('IB Gateway returned invalid JSON; verify manual browser login and gateway availability')) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function operation(source, secrets, signal, deps, work) {
  const settings = configuration(source, secrets, deps)
  const controller = new AbortController()
  let timedOut = false
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) controller.abort()
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, settings.timeoutMs)
  const request = deps.request ?? defaultRequest
  const get = async path => {
    if (controller.signal.aborted) fail(timedOut ? 'IB Gateway request timed out' : 'IB Gateway request cancelled')
    let abortHandler
    try {
      return await Promise.race([
        Promise.resolve().then(() => request(settings.base + path, {
          method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal,
          rejectUnauthorized: settings.rejectUnauthorized,
        })),
        new Promise((_, reject) => {
          abortHandler = () => reject(new IbError(timedOut ? 'IB Gateway request timed out' : 'IB Gateway request cancelled'))
          controller.signal.addEventListener('abort', abortHandler, { once: true })
        }),
      ])
    } catch (error) {
      if (controller.signal.aborted) fail(timedOut ? 'IB Gateway request timed out' : 'IB Gateway request cancelled')
      if (error instanceof IbError) throw error
      fail('IB Gateway request failed; verify gateway availability, TLS trust and manual browser login')
    } finally { if (abortHandler) controller.signal.removeEventListener('abort', abortHandler) }
  }
  try { return await work(get, settings) }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); controller.abort() }
}

async function accountsFrom(get) {
  const response = await get('/portfolio/accounts')
  if (!Array.isArray(response)) fail('IB accounts response must be an array; verify manual Gateway login')
  const seen = new Set()
  return response.map(row => {
    if (!plain(row)) fail('IB accounts contains an invalid account')
    const id = row.id ?? row.accountId
    if (!nonempty(id) || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || (row.accountId != null && row.accountId !== id)) fail('IB accounts contains an invalid account identity')
    if (seen.has(id)) fail('IB accounts contains duplicate account identities')
    seen.add(id)
    if (row.tradingType != null && typeof row.tradingType !== 'string') fail('IB account tradingType is invalid')
    return {
      id, name: [row.accountAlias, row.accountTitle, row.displayName, id].find(nonempty).trim(),
      currency: currency(row.currency), tradingType: row.tradingType ?? null,
    }
  })
}

/** Returns {accounts:[{id,name,currency,tradingType}], warnings:[]}.
 * deps.request(url, {method,headers,signal,rejectUnauthorized}) returns parsed JSON.
 * deps.timeoutMs (default 30000) covers the whole operation, even injected mocks.
 */
export async function listIbAccounts(source, secrets = {}, signal, deps = {}) {
  return operation(source, secrets, signal, deps, async get => ({ accounts: await accountsFrom(get), warnings: [] }))
}

function position(row, accountId, warnings) {
  if (!plain(row)) fail('IB positions contains an invalid row')
  if (row.acctId != null && row.acctId !== accountId) fail('IB position account does not match the selected account')
  const qty = numeric(row.position, 'position quantity')
  if (qty === 0) return null
  const conid = numeric(row.conid, 'position conid')
  if (!Number.isSafeInteger(conid) || conid < 1) fail('IB position conid must be a positive safe integer')
  const classes = { STK: 'stock', ETF: 'etf', FUND: 'fund' }
  if (!Object.hasOwn(classes, row.assetClass)) fail('IB position assetClass is unsupported; only long cash stocks, ETFs and funds are supported')
  if (row.multiplier != null && numeric(row.multiplier, 'position multiplier') !== 1) fail('IB position multiplier is unsupported')
  const symbol = nonempty(row.ticker) ? row.ticker.trim() : `CONID-${conid}`
  const avgCost = numeric(row.avgCost, 'position average cost')
  const manualPrice = row.mktPrice == null ? null : numeric(row.mktPrice, 'position market price')
  if (manualPrice === null) warnings.push(`PRICE_UNAVAILABLE: IBKR:${conid}; current market price is unavailable`)
  return {
    symbol, name: [row.name, row.contractDesc, symbol].find(nonempty).trim(),
    // Currency is not geography. Preserve broker identity until a verified
    // exchange mapping is available, rather than guessing a domestic market.
    market: 'IBKR', assetClass: classes[row.assetClass], currency: currency(row.currency),
    qty, avgCost, manualPrice, externalId: `IBKR:${conid}`,
  }
}

const unsupportedLedger = ['commoditymarketvalue', 'futuremarketvalue', 'corporatebondsmarketvalue', 'warrantsmarketvalue', 'issueroptionsmarketvalue', 'stockoptionmarketvalue', 'futureoptionmarketvalue', 'tbondsmarketvalue', 'tbillsmarketvalue']
function cashFrom(response, accountId) {
  if (!plain(response) || !Object.keys(response).some(key => key !== 'BASE')) fail('IB ledger native currency balances are missing')
  const holdings = []
  for (const [code, row] of Object.entries(response)) {
    if (code === 'BASE') continue
    currency(code)
    if (!plain(row)) fail('IB ledger currency data is missing')
    if (row.currency != null && row.currency !== code) fail('IB ledger currency does not match its key')
    if (row.acctcode != null && row.acctcode !== accountId) fail('IB ledger account does not match the selected account')
    for (const field of unsupportedLedger) if (row[field] != null) {
      if (numeric(row[field], 'unsupported ledger exposure') !== 0) fail('IB ledger contains unsupported derivative, commodity or bond exposure')
    }
    for (const field of ['marginDebit', 'marginbalance', 'borrowed', 'totalLiability']) if (row[field] != null && numeric(row[field], 'margin debt') !== 0) fail('IB ledger contains margin debt')
    holdings.push({ symbol: `CASH:${code}`, name: `${code} cash`, market: 'CASH', assetClass: 'cash', currency: code, qty: numeric(row.cashbalance, 'ledger cashbalance'), avgCost: 1, manualPrice: 1, externalId: `cash:${code}` })
  }
  return holdings
}

/** Fails closed on unsupported/missing financial data; never returns truncated
 * complete snapshots. Pages start at zero, 100 rows/page, ending on <100 rows.
 * deps.maxPages can lower the hard 100-page bound for tests/deployment limits.
 */
export async function fetchIbSnapshot(source, secrets = {}, signal, deps = {}) {
  return operation(source, secrets, signal, deps, async (get, settings) => {
    const accountId = settings.config.brokerAccountId
    if (!nonempty(accountId) || !/^[A-Za-z0-9_-]{1,80}$/.test(accountId)) fail('IB brokerAccountId must explicitly select an account')
    const accounts = await accountsFrom(get)
    const account = accounts.find(item => item.id === accountId)
    if (!account) fail('IB selected account was not returned by /portfolio/accounts')
    if (/MRGN|MARGIN/i.test(account.tradingType ?? '')) fail('IB margin accounts are unsupported; select a cash account')
    const holdings = [], warnings = [], ids = new Set(), keys = new Set()
    let finished = false
    for (let page = 0; page < settings.maxPages; page++) {
      const rows = await get(`/portfolio/${encodeURIComponent(accountId)}/positions/${page}`)
      if (!Array.isArray(rows) || rows.length > 100) fail('IB positions response must be an array of at most 100 positions')
      for (const row of rows) {
        const holding = position(row, accountId, warnings)
        if (!holding) continue
        const key = JSON.stringify([holding.market, holding.symbol, holding.currency])
        if (ids.has(holding.externalId) || keys.has(key)) fail('IB positions contain duplicate contracts or ambiguous tickers; no snapshot returned')
        ids.add(holding.externalId); keys.add(key); holdings.push(holding)
      }
      if (rows.length < 100) { finished = true; break }
    }
    if (!finished) fail('IB positions page limit reached; no truncated snapshot returned')
    holdings.push(...cashFrom(await get(`/portfolio/${encodeURIComponent(accountId)}/ledger`), accountId))
    return { holdings, complete: true, warnings, queriedAt: new Date().toISOString(), uploadedAt: null, quoteDate: null }
  })
}
