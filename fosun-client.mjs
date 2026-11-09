// 复星证券 / 星财富 OpenAPI adapter (native, read-only).
// Official SDK: https://github.com/fosunwealth/openapi-python-sdk
// The gateway base URL and API key are issued by the Fosun open platform.
// Protocol: ECDH P-384 handshake + ECDSA identity signature, then every request
// is HMAC-SHA256 signed and AES-256-GCM encrypted. Credentials are long-lived:
// the API key and key pair do not expire; sessions are recreated automatically.
import {
  createCipheriv, createDecipheriv, createHash, createHmac, createPrivateKey,
  createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes, randomUUID, sign, verify,
} from 'node:crypto'

import { cashSignOf, isFlowKind } from './model.mjs'

const fail = (message) => { throw new Error(message) }
const text = (value) => {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}
const number = (value) => {
  if (value == null || typeof value === 'boolean') return null
  if (typeof value === 'object') {
    for (const key of ['value', 'amount', 'num']) if (value[key] != null) return number(value[key])
    return null
  }
  const raw = String(value).replace(/,/g, '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
const pick = (row, fields) => {
  for (const field of fields) {
    if (row && row[field] !== null && row[field] !== undefined && row[field] !== '') return row[field]
  }
  return null
}
const eachArray = (value, visit, depth = 0) => {
  if (value == null || depth > 12) return
  if (Array.isArray(value)) { if (value.length) visit(value); for (const item of value) eachArray(item, visit, depth + 1); return }
  if (typeof value !== 'object') return
  for (const child of Object.values(value)) eachArray(child, visit, depth + 1)
}

const CODE_FIELDS = ['symbol', 'stockCode', 'stock_code', 'code', 'securityCode']
const NAME_FIELDS = ['stockName', 'stock_name', 'name', 'securityName']
const QTY_FIELDS = ['quantity', 'position', 'qty', 'holdQuantity', 'holdingQuantity']
const COST_FIELDS = ['averageCost', 'average_cost', 'costPrice', 'cost_price', 'avgCost']
const PRICE_FIELDS = ['marketPrice', 'market_price', 'lastPrice', 'last_price', 'price']
const VALUE_FIELDS = ['marketValue', 'market_value', 'value', 'positionValue']
const CURRENCY_FIELDS = ['currency', 'currencyCode', 'currency_code']
const ACCOUNT_ID_FIELDS = ['subAccountId', 'sub_account_id', 'accountId', 'account_id', 'id']
const ACCOUNT_NAME_FIELDS = ['accountName', 'account_name', 'name', 'alias']
const CASH_FIELDS = ['cash', 'totalCash', 'total_cash', 'availableCash', 'available_cash', 'cashBalance', 'cash_balance']
const TOTAL_FIELDS = ['totalAsset', 'total_asset', 'netAsset', 'net_asset', 'netLiquidation', 'net_liquidation', 'totalAssets', 'equity']
const PROFIT_FIELDS = ['holdingProfit', 'holding_profit', 'unrealizedPnl', 'unrealized_profit', 'profit']
const MARKET_BY_CODE = { US: 'US', HK: 'HK', CN: 'CN', SH: 'CN', SZ: 'CN', FUND: 'FUND' }
const CURRENCY_BY_MARKET = { US: 'USD', HK: 'HKD', CN: 'CNY', FUND: 'CNY' }

export const FOSUN_DEFAULT_GATEWAY = 'https://openapi.fosunxcz.com'

function baseUrlOf(source) {
  // Official gateway from the Fosun OpenAPI onboarding (fw-tradings skill default).
  const raw = text(source?.gatewayUrl) || text(source?.config?.gatewayUrl) || FOSUN_DEFAULT_GATEWAY
  let url
  try { url = new URL(raw) } catch { fail('复星 OpenAPI 网关地址须为有效的 https:// URL') }
  if (url.protocol !== 'https:') fail('复星 OpenAPI 网关须使用 HTTPS')
  if (url.username || url.password || url.hash) fail('复星 OpenAPI 网关地址不能包含凭据或片段')
  return { origin: url.origin, basePath: url.pathname.replace(/\/+$/, '') }
}

function loadCredentials(secrets = {}) {
  const apiKey = text(secrets.apiKey)
  const privatePem = text(secrets.privateKey)
  const serverPem = text(secrets.serverPublicKey)
  if (!apiKey) fail('请填写复星 OpenAPI Key')
  if (!privatePem) fail('请填写复星客户端私钥（PEM）')
  if (!serverPem) fail('请填写复星服务端公钥（PEM）')
  let privateKey, serverPublicKey
  try { privateKey = createPrivateKey(privatePem) } catch { fail('复星客户端私钥不是有效的 PEM') }
  try { serverPublicKey = createPublicKey(serverPem) } catch { fail('复星服务端公钥不是有效的 PEM') }
  return { apiKey, privateKey, serverPublicKey }
}

function publicPointJwk(publicKey) {
  const jwk = publicKey.export({ format: 'jwk' })
  return { kty: 'EC', crv: 'P-384', x: jwk.x, y: jwk.y }
}

function pointFromBase64(value) {
  const bytes = Buffer.from(String(value || ''), 'base64')
  const body = bytes[0] === 0x04 ? bytes.subarray(1) : bytes
  if (body.length !== 96) fail('复星服务端临时公钥格式无效')
  return { kty: 'EC', crv: 'P-384', x: body.subarray(0, 48).toString('base64url'), y: body.subarray(48).toString('base64url') }
}

function generateEphemeral() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp384r1' })
  const jwk = publicKey.export({ format: 'jwk' })
  const point = Buffer.concat([Buffer.from([0x04]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])
  return { privateKey, publicPoint: point.toString('base64') }
}

function deriveKeys(privateKey, serverTempPublicKey, clientNonce, serverNonce) {
  const serverKey = createPublicKey({ key: pointFromBase64(serverTempPublicKey), format: 'jwk' })
  const shared = diffieHellman({ privateKey, publicKey: serverKey })
  const salt = Buffer.concat([Buffer.from(clientNonce, 'base64'), Buffer.from(serverNonce, 'base64')])
  const derived = Buffer.from(hkdfSync('sha256', shared, salt, Buffer.from('session-derivation'), 64))
  return { macKey: derived.subarray(0, 32), encKey: derived.subarray(32) }
}

function aadFor(sessionId, timestamp, nonce) {
  return Buffer.from(`X-session:${sessionId}|X-timestamp:${timestamp}|X-nonce:${nonce}`, 'utf8')
}

function encrypt(encKey, plaintext, aad) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encKey, iv)
  cipher.setAAD(aad)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return { iv: iv.toString('base64'), content: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

function decrypt(encKey, payload, aad) {
  const decipher = createDecipheriv('aes-256-gcm', encKey, Buffer.from(payload.iv || '', 'base64'))
  decipher.setAAD(aad)
  decipher.setAuthTag(Buffer.from(payload.tag || '', 'base64'))
  try {
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.content || '', 'base64')), decipher.final()]).toString('utf8'))
  } catch { fail('复星响应解密失败，请检查密钥是否匹配') }
}

async function requestJson(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('复星 OpenAPI 请求超时')), timeoutMs)
  const onAbort = () => controller.abort(options.signal?.reason ?? new Error('复星 OpenAPI 请求已中止'))
  options.signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal, redirect: 'error' })
    const raw = await response.text()
    let payload = null
    try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
    return { response, raw, payload }
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) fail('复星 OpenAPI 请求超时')
    throw error
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', onAbort) }
}

/**
 * Open one signed session and return a caller with post(path, data).
 * Sessions are cheap; each snapshot/history read creates its own.
 */
async function openSession(source, secrets, signal, deps = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch
  const timeoutMs = deps.timeoutMs ?? 30000
  const { origin, basePath } = baseUrlOf(source)
  const { apiKey, privateKey, serverPublicKey } = loadCredentials(secrets)
  const apiPrefix = '/api'
  const ephemeral = generateEphemeral()
  const clientNonce = randomBytes(32).toString('base64')
  const signature = sign('sha256', Buffer.concat([Buffer.from(ephemeral.publicPoint, 'base64'), Buffer.from(clientNonce, 'base64')]), privateKey).toString('base64')
  const timestamp = String(Date.now())
  const requestId = randomUUID()
  const url = origin + basePath + apiPrefix + '/v1/auth/SessionCreate'
  const { response, raw, payload } = await requestJson(fetchImpl, url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'X-API-Key': apiKey,
      'X-Request-Id': requestId,
      'X-Request-Client': 'dsh-wealth',
      'X-timestamp': timestamp,
      'X-source': 'dsh-wealth',
      'X-product': 'plugin',
      'X-Nonce': clientNonce,
      'X-Signature': signature,
    },
    body: JSON.stringify({ apiKey, clientTempPublicKey: ephemeral.publicPoint }),
    signal,
  }, timeoutMs)
  if (!response.ok) fail('复星 OpenAPI 握手返回 HTTP ' + response.status)
  if (!payload) fail('复星 OpenAPI 握手返回了无法解析的响应')
  const data = payload.content && typeof payload.content === 'object' ? payload.content : payload
  if (data.code !== 0) fail('复星 OpenAPI 握手失败：' + (data.message || 'unknown'))
  const session = data.data || {}
  const sessionId = text(session.sessionId)
  const serverTempPublicKey = text(session.serverTempPublicKey)
  const serverSignature = response.headers.get('x-signature')
  const serverNonce = response.headers.get('x-nonce')
  if (!sessionId || !serverTempPublicKey) fail('复星 OpenAPI 握手响应缺少会话信息')
  if (!serverSignature || !serverNonce) fail('复星 OpenAPI 握手响应缺少服务端签名')
  const verified = verify(
    'sha256',
    Buffer.concat([Buffer.from(serverTempPublicKey, 'base64'), Buffer.from(serverNonce, 'base64')]),
    serverPublicKey,
    Buffer.from(serverSignature, 'base64'),
  )
  if (!verified) fail('复星 OpenAPI 服务端签名校验失败，请确认服务端公钥正确')
  const keys = deriveKeys(ephemeral.privateKey, serverTempPublicKey, clientNonce, serverNonce)

  async function post(path, data = {}) {
    const requestPath = apiPrefix + (path.startsWith('/') ? path : '/' + path)
    const requestTimestamp = String(Date.now())
    const nonce = randomUUID().replace(/-/g, '')
    const aad = aadFor(sessionId, requestTimestamp, nonce)
    const plaintext = Buffer.from(JSON.stringify(data), 'utf8')
    const encrypted = encrypt(keys.encKey, plaintext, aad)
    const body = JSON.stringify({ encrypted: true, iv: encrypted.iv, tag: encrypted.tag, content: encrypted.content })
    const canonical = `POST\n${basePath}${requestPath}\n\n${requestTimestamp}\n${nonce}\n${createHash('sha256').update(body).digest('hex')}`
    const requestSignature = createHmac('sha256', keys.macKey).update(canonical, 'utf8').digest('base64')
    const { response: res, payload: resPayload } = await requestJson(fetchImpl, origin + basePath + requestPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'X-API-Key': apiKey,
        'X-session': sessionId,
        'X-Request-Id': randomUUID(),
        'X-Request-Client': 'dsh-wealth',
        'X-Timestamp': requestTimestamp,
        'X-Nonce': nonce,
        'X-Signature': requestSignature,
      },
      body,
      signal,
    }, timeoutMs)
    if (!res.ok) fail('复星 OpenAPI 返回 HTTP ' + res.status)
    if (!resPayload) fail('复星 OpenAPI 返回了无法解析的响应')
    let result = resPayload
    if (Object.prototype.hasOwnProperty.call(resPayload, 'encrypted')) {
      result = resPayload.encrypted ? decrypt(keys.encKey, resPayload, aad) : resPayload.content
    }
    if (result && typeof result === 'object' && result.code !== undefined && result.code !== 0) {
      fail('复星 OpenAPI 调用失败：' + (result.message || result.code))
    }
    return result?.data !== undefined ? result.data : result
  }

  return { post, sessionId }
}

// ---------- accounts ----------

export async function listFosunAccounts(source, secrets, signal, deps = {}) {
  const session = await openSession(source, secrets, signal, deps)
  const payload = await session.post('/v1/account/Accounts', {})
  const warnings = []
  const accounts = []
  const consider = (row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return
    const id = text(pick(row, ACCOUNT_ID_FIELDS))
    if (!id) return
    if (accounts.some((a) => a.id === id)) return
    accounts.push({
      id,
      name: text(pick(row, ACCOUNT_NAME_FIELDS)) || ('复星账户 ' + id),
      currency: text(pick(row, CURRENCY_FIELDS))?.toUpperCase() || null,
      broker: text(pick(row, ['broker', 'brokerName', 'marketName'])) || 'Fosun',
    })
  }
  eachArray(payload, (list) => { for (const row of list) consider(row) })
  if (Array.isArray(payload)) payload.forEach(consider)
  else if (payload && typeof payload === 'object') consider(payload)
  if (!accounts.length) fail('复星 OpenAPI 没有返回交易账户，请确认 API Key 权限与账户绑定')
  return { accounts, warnings }
}

// ---------- snapshot ----------

function flattenHolding(row) {
  if (!row || typeof row !== 'object') return row
  let out = row
  for (const key of ['stock', 'security', 'instrument', 'position']) {
    if (row[key] && typeof row[key] === 'object' && !Array.isArray(row[key])) out = { ...row[key], ...out }
  }
  return out
}

function findNumberFields(payload, fields, { sum = false } = {}) {
  let total = 0, best = null
  const walk = (value, depth) => {
    if (value == null || depth > 10) return
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (fields.includes(key)) {
        const n = number(child)
        if (n !== null) { total += n; if (best === null || n > best) best = n }
      }
      walk(child, depth + 1)
    }
  }
  walk(payload, 0)
  return sum ? (best === null ? null : total) : best
}

function marketOf(row) {
  const raw = text(pick(row, ['market', 'marketCode', 'market_code', 'secMarket']))
  if (!raw) return null
  return MARKET_BY_CODE[raw.toUpperCase()] || null
}

export async function fetchFosunSnapshot(source, secrets, signal, deps = {}) {
  const accountId = text(source?.brokerAccountId)
  if (!accountId) fail('请选择复星交易账户')
  const session = await openSession(source, secrets, signal, deps)
  const warnings = []
  // v2 分段覆盖：Holdings 一次调用同时提供股票与基金，失败/截断同时影响两段。
  const coverage = { stock: 'full', fund: 'full', cash: 'full' }
  const authError = (error) => /认证|授权|401|403|expired|unauthor/i.test(String(error?.message || error))

  const summary = await session.post('/v1/portfolio/CashSummary', { subAccountId: accountId }).catch((error) => {
    if (authError(error)) throw error
    coverage.cash = 'failed'
    warnings.push('FOSUN_CASH_SUMMARY_UNAVAILABLE:复星资金汇总读取失败：' + String(error?.message || error))
    return null
  })

  const holdings = []
  const seen = new Set()
  let truncated = false
  try {
    let start = 0
    for (let page = 0; page < 20; page++) {
      const payload = await session.post('/v1/portfolio/Holdings', {
        subAccountId: accountId, start, count: 100,
        productTypes: [], currencies: [], symbols: [],
        useUsPre: false, useUsPost: false, useUsNight: false,
      })
      const rows = []
      eachArray(payload, (list) => {
        for (const item of list) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) continue
          if (text(pick(flattenHolding(item), CODE_FIELDS))) rows.push(flattenHolding(item))
        }
      })
      if (Array.isArray(payload)) payload.forEach((item) => { if (item && text(pick(flattenHolding(item), CODE_FIELDS))) rows.push(flattenHolding(item)) })
      for (const row of rows) {
        const symbol = text(pick(row, CODE_FIELDS))
        const qty = number(pick(row, QTY_FIELDS))
        if (!symbol || qty === null || !(qty > 0)) continue
        const market = marketOf(row)
        const currency = (text(pick(row, CURRENCY_FIELDS)) || CURRENCY_BY_MARKET[market] || 'HKD').toUpperCase()
        const price = number(pick(row, PRICE_FIELDS))
        // 未知成本保留为 null，不伪造、也不跳过该行。
        const cost = number(pick(row, COST_FIELDS))
        const key = market + ':' + symbol + ':' + currency
        if (seen.has(key)) continue
        seen.add(key)
        holdings.push({
          symbol,
          name: text(pick(row, NAME_FIELDS)) || symbol,
          market: market || 'HK',
          assetClass: market === 'FUND' ? 'fund' : 'stock',
          currency, qty, avgCost: cost, manualPrice: price, externalId: symbol,
        })
      }
      if (rows.length < 100) break
      start += 100
      if (page === 19) truncated = true
    }
  } catch (error) {
    if (authError(error)) throw error
    coverage.stock = 'failed'
    coverage.fund = 'failed'
    warnings.push('FOSUN_HOLDINGS_UNAVAILABLE:复星持仓读取失败：' + String(error?.message || error))
  }
  if (truncated) {
    coverage.stock = 'partial'
    coverage.fund = 'partial'
    warnings.push('FOSUN_POSITIONS_PAGE_LIMIT:持仓分页达到 20 页上限，可能被截断')
  }

  const cash = findNumberFields(summary, CASH_FIELDS)
  const currency = (text(pick(summary || {}, CURRENCY_FIELDS)) || 'HKD').toUpperCase()
  if (cash !== null && cash > 0) {
    holdings.push({ symbol: 'CASH:' + currency, name: currency + ' cash', market: 'CASH', assetClass: 'cash', currency, qty: cash, avgCost: 1, manualPrice: 1, externalId: 'CASH:' + currency })
  } else if (cash === null) {
    warnings.push('FOSUN_CASH_UNAVAILABLE 未读到现金余额')
    coverage.cash = 'failed'
  }
  if (!holdings.length) fail('复星 OpenAPI 没有返回任何持仓或现金；请确认账户内有资产')

  const sourceTotals = {}
  const total = findNumberFields(summary, TOTAL_FIELDS)
  if (total !== null) sourceTotals.totalAsset = total
  if (cash !== null) sourceTotals.cash = cash
  const profit = findNumberFields(summary, PROFIT_FIELDS)
  if (profit !== null) sourceTotals.holdingProfit = profit
  const priced = holdings.filter((h) => h.market !== 'CASH').every((h) => h.manualPrice != null)
  if (!priced) warnings.push('部分证券缺少现价，按成本暂估')

  return {
    holdings,
    coverage,
    warnings,
    queriedAt: new Date(deps.now?.() ?? Date.now()).toISOString(),
    uploadedAt: null,
    quoteDate: null,
    ...(Object.keys(sourceTotals).length ? { sourceTotals } : {}),
  }
}

// ---------- history ----------

function dayOf(value) {
  const raw = text(value)
  if (!raw) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3]
  if (/^\d{8}$/.test(raw)) return raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8)
  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null
}

function classifyFlow(label) {
  if (/入金|存入|转入|deposit/i.test(label)) return 'deposit'
  if (/出金|取出|转出|withdraw/i.test(label)) return 'withdrawal'
  if (/股息|分红|dividend/i.test(label)) return 'dividend'
  if (/利息|interest/i.test(label)) return 'interest'
  if (/佣金|手续费|费用|fee|commission/i.test(label)) return 'fee'
  if (/税|tax/i.test(label)) return 'tax'
  if (/买入|buy/i.test(label)) return 'buy'
  if (/卖出|sell/i.test(label)) return 'sell'
  return 'other'
}

function mapCashFlow(row, warnings) {
  const date = dayOf(pick(row, ['tradeDate', 'trade_date', 'date', 'businessDate']))
  const label = text(pick(row, ['businessTypeName', 'business_type_name', 'businessType', 'typeName', 'remark', 'description'])) || ''
  const amount = number(pick(row, ['amount', 'cashAmount', 'netAmount', 'money']))
  if (!date || amount === null) { warnings.push('FOSUN_FLOW_INCOMPLETE_ROW'); return null }
  const kind = classifyFlow(label)
  if (!isFlowKind(kind)) return null
  const symbol = text(pick(row, CODE_FIELDS))
  const market = marketOf(row)
  const currency = (text(pick(row, CURRENCY_FIELDS)) || CURRENCY_BY_MARKET[market] || 'HKD').toUpperCase()
  const qty = number(pick(row, QTY_FIELDS))
  const price = number(pick(row, PRICE_FIELDS))
  const sign = cashSignOf(kind)
  const externalId = text(pick(row, ['flowId', 'flow_id', 'id', 'businessId', 'business_id']))
  return {
    date, time: null, kind, originalType: label || null,
    symbol: symbol || null, name: text(pick(row, NAME_FIELDS)) || null, market: market || null, currency,
    qty: qty ?? null, price: price ?? null, grossAmount: qty !== null && price !== null ? qty * price : null,
    cashAmount: sign === null ? amount : sign * Math.abs(amount),
    fee: kind === 'fee' ? Math.abs(amount) : null,
    externalId, note: label || null,
  }
}

export async function fetchFosunHistory(source, secrets, range, signal, deps = {}) {
  const accountId = text(source?.brokerAccountId)
  if (!accountId) fail('请选择复星交易账户')
  const from = String(range?.from || ''), to = String(range?.to || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) fail('开始日期不能晚于结束日期')
  const session = await openSession(source, secrets, signal, deps)
  const warnings = []
  const payload = await session.post('/v1/trade/CashFlows', { subAccountId: accountId, tradeDateFrom: from, tradeDateTo: to })
  const rows = []
  const collect = (list) => {
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const mapped = mapCashFlow(item, warnings)
      if (mapped) rows.push(mapped)
    }
  }
  eachArray(payload, collect)
  if (Array.isArray(payload)) collect(payload)
  const unique = new Map()
  for (const row of rows) {
    const key = row.externalId || JSON.stringify([row.date, row.kind, row.symbol, row.cashAmount, row.qty, row.price])
    if (!unique.has(key)) unique.set(key, row)
  }
  const result = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date))
  return {
    rows: result, errors: [], warnings,
    coverage: {
      complete: false,
      note: `已读取复星 ${from} 至 ${to} 的资金流水；未结算、费用分摊与部分公司行为可能缺失，可用官方对账单补充。`,
      observedFrom: result.length ? result[0].date : null,
      observedTo: result.length ? result[result.length - 1].date : null,
    },
  }
}

export async function verifyFosunCredentials(source, secrets, { signal, deps = {} } = {}) {
  const session = await openSession(source, secrets, signal, deps)
  return session.post('/v1/account/Accounts', {})
}

// ---------- onboarding (TicketCreate 扫码开通) ----------
// Official flow (fw-tradings fosun-env-setup): generate a P-384 client keypair,
// POST /api/v1/auth/TicketCreate {macId, clientPubKey PEM}; the response carries
// the H5 open URL. After the user completes onboarding, calling TicketCreate
// again with the SAME clientPubKey returns apiKey + serverPubKey.

export function generateFosunClientKey() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp384r1' })
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString().trim(),
  }
}

/** 从已保存的私钥推导配对公钥：网关登记的客户端公钥必须与私钥同源。 */
export function fosunClientKeyFromPrivate(privatePem) {
  const key = createPrivateKey({ key: String(privatePem || ''), format: 'pem' })
  return {
    privatePem: String(privatePem).trim(),
    publicPem: createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString().trim(),
  }
}

function unwrapEnvelope(payload) {
  if (!payload || typeof payload !== 'object') fail('复星认证接口返回格式不正确')
  const code = payload.code
  if (code !== undefined && code !== null && code !== 0) fail('复星认证接口调用失败：' + (payload.message || code))
  const content = payload.content
  if (content && typeof content === 'object') return content.data && typeof content.data === 'object' ? content.data : content
  return payload.data && typeof payload.data === 'object' ? payload.data : payload
}

/** One TicketCreate call. After H5 binding the response carries apiKey + serverPubKey. */
export async function fosunTicketCreate({ gatewayUrl, clientPubKey, macId, signal, deps = {} } = {}) {
  const { origin, basePath } = baseUrlOf({ gatewayUrl })
  const fetchImpl = deps.fetch || globalThis.fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('复星 TicketCreate 请求超时')), deps.timeoutMs ?? 20000)
  const onAbort = () => controller.abort(signal?.reason ?? new Error('复星 TicketCreate 已中止'))
  signal?.addEventListener('abort', onAbort, { once: true })
  let response
  try {
    response = await fetchImpl(origin + basePath + '/api/v1/auth/TicketCreate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Request-Id': randomUUID() },
      body: JSON.stringify({ macId: String(macId || ''), clientPubKey: String(clientPubKey || '') }),
      signal: controller.signal,
      redirect: 'error',
    })
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) fail('复星 TicketCreate 请求超时')
    throw error
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
  if (!response.ok) fail('复星 TicketCreate 返回 HTTP ' + response.status)
  const raw = await response.text()
  let payload = null
  try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
  const data = unwrapEnvelope(payload)
  const apiKey = text(pick(data, ['apiKey', 'apiKeyValue']))
  const serverPubKey = text(data.serverPubKey || data.serverPublicKey)
  const ticket = text(data.ticket)
  const url = text(data.url || data.openUrl)
  const expireTime = text(data.expireTime)
  if (!ticket || !url) fail('复星 TicketCreate 返回缺少必要字段（ticket/开通页地址）')
  return { apiKey, serverPubKey, ticket, url, expireTime }
}

/** APIKeyCheck: 'valid' | 'invalid' | 'expired' | 'disabled' | 'unknown'. */
export async function checkFosunApiKey({ gatewayUrl, apiKey, signal, deps = {} } = {}) {
  const { origin, basePath } = baseUrlOf({ gatewayUrl })
  const fetchImpl = deps.fetch || globalThis.fetch
  const response = await fetchImpl(origin + basePath + '/api/v1/auth/APIKeyCheck', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Request-Id': randomUUID() },
    body: JSON.stringify({ apiKey: String(apiKey || '') }),
    signal,
    redirect: 'error',
  })
  if (!response.ok) fail('复星 APIKeyCheck 返回 HTTP ' + response.status)
  const raw = await response.text()
  let payload = null
  try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
  const data = unwrapEnvelope(payload)
  const flag = (value) => value === true || value === 'true' || value === 1 || value === '1' ? 'valid'
    : value === false || value === 'false' || value === 0 || value === '0' ? 'invalid' : null
  const named = String(data.status || '').toLowerCase()
  // 网关对未激活/无效的 Key 返回数值 status: 0（实测乱造 key 与未绑定 key 完全一致）。
  const numeric = Number(data.status)
  const numericStatus = Number.isFinite(numeric) && String(data.status).trim() !== '' && !Number.isNaN(numeric)
    ? (numeric === 1 ? 'valid' : numeric === 0 ? 'invalid' : 'unknown')
    : null
  const status = ['valid', 'invalid', 'expired', 'disabled'].includes(named) ? named
    : flag(data.valid) || flag(data.isValid) || flag(data.active) || numericStatus || 'unknown'
  const expiresAt = Number(data.expiresAt) > 0 ? Number(data.expiresAt) : null
  return { status, expiresAt, rawStatus: data.status ?? null }
}

export function fosunFingerprintPart(secrets = {}) {
  const value = String(secrets.apiKey || '')
  return value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : ''
}
