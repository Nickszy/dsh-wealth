// 复星 OpenAPI adapter tests: full ECDH+ECDSA+HMAC+AES-GCM protocol over a fake
// gateway, so both cryptography directions are exercised without any network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createCipheriv, createDecipheriv, createHash, createHmac, createPublicKey,
  diffieHellman, generateKeyPairSync, hkdfSync, randomBytes, sign,
} from 'node:crypto'
import { listFosunAccounts, fetchFosunSnapshot, fetchFosunHistory, generateFosunClientKey, fosunTicketCreate, checkFosunApiKey } from './fosun-client.mjs'
import { assertSnapshotContract } from './snapshot-contract.mjs'

const GATEWAY = 'https://gateway.example.com'

function pemPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp384r1' })
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey,
  }
}
const identity = pemPair()
const serverIdentity = pemPair()

const SECRETS = { apiKey: '{{SECRET_t3opcnij}}', privateKey: identity.privatePem, serverPublicKey: identity.publicPem }

function jwkPoint(jwk) {
  return Buffer.concat([Buffer.from([0x04]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])
}

function pointToJwk(point) {
  const body = point[0] === 0x04 ? point.subarray(1) : point
  return { kty: 'EC', crv: 'P-384', x: body.subarray(0, 48).toString('base64url'), y: body.subarray(48).toString('base64url') }
}

function encryptBody(key, payload, aad) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(aad)
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')), cipher.final()])
  return { encrypted: true, iv: iv.toString('base64'), content: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

function decryptBody(key, body, aad) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(body.iv, 'base64'))
  decipher.setAAD(aad)
  decipher.setAuthTag(Buffer.from(body.tag, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body.content, 'base64')), decipher.final()]).toString('utf8'))
}

/** Emulates the gateway: handshake then signed+encrypted POST endpoints. */
function gatewayDeps(responder) {
  const calls = []
  const state = { encKey: null, macKey: null, sessionId: null }
  return {
    calls, state, timeoutMs: 5000,
    fetch: async (url, init) => {
      const path = new URL(url).pathname
      calls.push({ path, headers: init.headers, body: init.body })
      const replyJson = (payload, headers = {}) => ({ ok: true, status: 200, headers: { get: h => h === 'content-type' ? 'application/json' : (headers[h] ?? null) }, text: async () => JSON.stringify(payload) })
      if (path === '/api/v1/auth/SessionCreate') {
        const request = JSON.parse(init.body)
        const clientNonce = init.headers['X-Nonce']
        const temp = generateKeyPairSync('ec', { namedCurve: 'secp384r1' })
        const serverPoint = jwkPoint(temp.publicKey.export({ format: 'jwk' }))
        const serverNonce = randomBytes(32).toString('base64')
        const signature = sign('sha256', Buffer.concat([serverPoint, Buffer.from(serverNonce, 'base64')]), identity.privateKey).toString('base64')
        const shared = diffieHellman({ privateKey: temp.privateKey, publicKey: createPublicKey({ key: pointToJwk(Buffer.from(request.clientTempPublicKey, 'base64')), format: 'jwk' }) })
        const derived = Buffer.from(hkdfSync('sha256', shared, Buffer.concat([Buffer.from(clientNonce, 'base64'), Buffer.from(serverNonce, 'base64')]), Buffer.from('session-derivation'), 64))
        state.macKey = derived.subarray(0, 32)
        state.encKey = derived.subarray(32)
        state.sessionId = 'sess-fs-1'
        return replyJson({ encrypted: false, content: { code: 0, message: 'ok', data: { sessionId: state.sessionId, serverTempPublicKey: serverPoint.toString('base64'), expiresAt: Date.now() + 300000 } } }, { 'x-signature': signature, 'x-nonce': serverNonce })
      }
      const sessionId = init.headers['X-session']
      assert.equal(sessionId, state.sessionId)
      const timestamp = init.headers['X-Timestamp'], nonce = init.headers['X-Nonce']
      const aad = Buffer.from(`X-session:${sessionId}|X-timestamp:${timestamp}|X-nonce:${nonce}`, 'utf8')
      const bodyJson = JSON.parse(init.body)
      assert.equal(bodyJson.encrypted, true)
      decryptBody(state.encKey, bodyJson, aad)
      const expected = createHmac('sha256', state.macKey)
        .update(`POST\n${path}\n\n${timestamp}\n${nonce}\n${createHash('sha256').update(init.body).digest('hex')}`, 'utf8')
        .digest('base64')
      assert.equal(init.headers['X-Signature'], expected, 'request signature must verify')
      const data = responder(path, { code: 0, message: 'ok', data: responder.data })
      return replyJson(encryptBody(state.encKey, data, aad))
    },
  }
}

test('复星 handshake authenticates the server and accounts parse', async () => {
  const deps = gatewayDeps(() => ({ code: 0, message: 'ok', data: { accounts: [
    { subAccountId: 'S1', accountName: '环球账户', currency: 'HKD', broker: 'FOSUN' },
    { subAccountId: 'S2', accountName: '美股账户', currency: 'USD' },
  ] } }))
  const result = await listFosunAccounts({ gatewayUrl: GATEWAY }, SECRETS, undefined, deps)
  assert.deepEqual(result.accounts.map(a => a.id), ['S1', 'S2'])
  assert.equal(result.accounts[0].currency, 'HKD')
  assert.equal(deps.calls[0].path, '/api/v1/auth/SessionCreate')
  assert.equal(deps.calls[0].headers['X-API-Key'], '{{SECRET_t3opcnij}}')
  assert.equal(deps.calls.filter(c => c.path === '/api/v1/auth/SessionCreate').length, 1)
})

test('复星 snapshot maps holdings, cash and totals', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return { code: 0, data: { currency: 'HKD', cash: '8888.88', totalAsset: '20000', holdingProfit: '1200.5' } }
    if (path === '/api/v1/portfolio/Holdings') return { code: 0, data: { holdings: [
      { symbol: '00700', stockName: '腾讯控股', market: 'HK', quantity: '100', averageCost: '350', marketPrice: '365', currency: 'HKD' },
      { symbol: 'AAPL', stockName: 'Apple', market: 'US', quantity: '10', averageCost: '180', marketPrice: '185', currency: 'USD' },
    ] } }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const symbols = snapshot.holdings.map(h => h.symbol)
  assert.deepEqual(symbols, ['00700', 'AAPL', 'CASH:HKD'])
  const tencent = snapshot.holdings[0]
  assert.deepEqual([tencent.market, tencent.currency, tencent.avgCost, tencent.manualPrice], ['HK', 'HKD', 350, 365])
  assert.equal(snapshot.sourceTotals.totalAsset, 20000)
  assert.equal(snapshot.sourceTotals.cash, 8888.88)
  const normalized = assertSnapshotContract(snapshot, { complete: true })
  assert.deepEqual(normalized.coverage, { stock: 'full', fund: 'full', cash: 'full' })
})

test('复星 history classifies cash flows and keeps original labels', async () => {
  const deps = gatewayDeps((path) => {
    assert.equal(path, '/api/v1/trade/CashFlows')
    return { code: 0, data: { flows: [
      { flowId: 'F1', businessTypeName: '入金', amount: '10000', currency: 'HKD', tradeDate: '2026-11-02' },
      { flowId: 'F2', businessTypeName: '出金', amount: '500', currency: 'HKD', tradeDate: '2026-11-03' },
      { flowId: 'F3', businessTypeName: '股息收入', amount: '120', currency: 'HKD', tradeDate: '2026-11-04' },
      { flowId: 'F4', businessTypeName: '买入', stockCode: '00700', stockName: '腾讯控股', market: 'HK', amount: '3650', quantity: '10', price: '365', currency: 'HKD', tradeDate: '2026-11-05' },
      { flowId: 'F5', businessTypeName: '卖出', stockCode: 'AAPL', market: 'US', amount: '1850', quantity: '10', price: '185', currency: 'USD', tradeDate: '2026-11-06' },
      { flowId: 'F6', businessTypeName: '神秘活动', amount: '66', currency: 'HKD', tradeDate: '2026-11-06' },
    ] } }
  })
  const result = await fetchFosunHistory({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, { from: '2026-11-01', to: '2026-11-07' }, undefined, deps)
  const kinds = result.rows.map(r => r.kind)
  assert.deepEqual(kinds, ['deposit', 'withdrawal', 'dividend', 'buy', 'sell', 'other'])
  assert.equal(result.rows[0].cashAmount, 10000)
  const sell = result.rows.find(r => r.symbol === 'AAPL')
  assert.equal(sell.cashAmount, 1850)
  const other = result.rows.at(-1)
  assert.equal(other.originalType, '神秘活动')
  assert.equal(other.cashAmount, 66)
})

test('复星 rejects a mismatched server public key', async () => {
  const other = pemPair()
  const bad = { ...SECRETS, serverPublicKey: other.publicPem }
  const deps = gatewayDeps(() => ({ code: 0, data: { accounts: [] } }))
  await assert.rejects(() => listFosunAccounts({ gatewayUrl: GATEWAY }, bad, undefined, deps), /签名校验失败/)
})

test('复星 TicketCreate onboarding: pending then bound, plus key generation', async () => {
  const { createPublicKey } = await import('node:crypto')
  const calls = []
  let bound = false
  const deps = {
    timeoutMs: 5000,
    fetch: async (url, init) => {
      const path = new URL(url).pathname
      calls.push({ path, body: JSON.parse(init.body) })
      const data = path === '/api/v1/auth/TicketCreate'
        ? (bound
          ? { apiKey: 'ak_abcdef1234567890abcdef', serverPubKey: '-----BEGIN PUBLIC KEY-----\nX\n-----END PUBLIC KEY-----', ticket: 'T2', url: 'https://h5.fosunxcz.com/open', expireTime: 1794144000 }
          : { ticket: 'T1', url: 'https://h5.fosunxcz.com/open', expireTime: 1794140400 })
        : path === '/api/v1/auth/APIKeyCheck'
          ? { status: 'valid', expiresAt: 1799999999 }
          : (() => { throw new Error('unexpected ' + path) })()
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ code: 0, message: 'ok', data }) }
    },
  }
  const key = generateFosunClientKey()
  assert.match(key.privatePem, /BEGIN PRIVATE KEY/)
  assert.match(key.publicPem, /BEGIN PUBLIC KEY/)
  createPublicKey(key.publicPem) // must parse

  const pending = await fosunTicketCreate({ gatewayUrl: GATEWAY, clientPubKey: key.publicPem, macId: 'mac1', deps })
  assert.equal(pending.ticket, 'T1')
  assert.equal(pending.apiKey, null)
  assert.equal(calls[0].body.macId, 'mac1')
  assert.equal(calls[0].body.clientPubKey, key.publicPem)

  bound = true
  const done = await fosunTicketCreate({ gatewayUrl: GATEWAY, clientPubKey: key.publicPem, macId: 'mac1', deps })
  assert.match(done.apiKey, /^ak_/)
  assert.match(done.serverPubKey, /BEGIN PUBLIC KEY/)
  const check = await checkFosunApiKey({ gatewayUrl: GATEWAY, apiKey: done.apiKey, deps })
  assert.equal(check.status, 'valid')

  await assert.rejects(() => fosunTicketCreate({ gatewayUrl: GATEWAY, clientPubKey: key.publicPem, macId: 'm', deps: { fetch: async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ code: 500, message: 'boom', data: {} }) }) } }), /boom/)
})

test('APIKeyCheck maps numeric status: 0 invalid, 1 valid, others unknown', async () => {
  const check = (status) => checkFosunApiKey({
    gatewayUrl: GATEWAY, apiKey: 'ak_x',
    deps: { fetch: async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ encrypted: false, content: { code: 0, data: { status, expiresAt: 0 }, message: 'success' } }) }) },
  })
  // 未绑定/无效 Key 实测返回 status: 0（与乱造 key 完全一致），不能当成可用凭据。
  assert.equal((await check(0)).status, 'invalid')
  assert.equal((await check(1)).status, 'valid')
  assert.equal((await check(7)).status, 'unknown')
  assert.equal((await check(0)).rawStatus, 0)
})

const CASH_SUMMARY = { code: 0, data: { currency: 'HKD', cash: '1000', totalAsset: '5000' } }
const GOOD_HOLDING = { symbol: 'AAPL', stockName: 'Apple', market: 'US', quantity: '10', averageCost: '180', marketPrice: '185', currency: 'USD' }

test('复星 snapshot contract: missing price only warns and stays complete', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return CASH_SUMMARY
    if (path === '/api/v1/portfolio/Holdings') return { code: 0, data: { holdings: [{ ...GOOD_HOLDING, marketPrice: undefined }] } }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  assertSnapshotContract(snapshot, { complete: true })
  assert.equal(snapshot.holdings.find((h) => h.symbol === 'AAPL').manualPrice, null)
})

test('复星 snapshot contract: unknown cost imports the row with null avgCost and stays complete', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return CASH_SUMMARY
    if (path === '/api/v1/portfolio/Holdings') return { code: 0, data: { holdings: [
      GOOD_HOLDING,
      { symbol: 'MSFT', market: 'US', quantity: '5', currency: 'USD' },
    ] } }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const normalized = assertSnapshotContract(snapshot, { complete: true })
  assert.equal(normalized.holdings.find((h) => h.symbol === 'MSFT').avgCost, null)
  assert.ok(!snapshot.warnings.some((w) => /FOSUN_COST_/.test(w)), '缺成本不再伪造或跳过')
  assert.deepEqual(normalized.coverage, { stock: 'full', fund: 'full', cash: 'full' })
})

test('复星 snapshot contract: CashSummary failure marks incomplete', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') throw new Error('boom')
    if (path === '/api/v1/portfolio/Holdings') return { code: 0, data: { holdings: [GOOD_HOLDING] } }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const normalized = assertSnapshotContract(snapshot, { complete: false, warning: /FOSUN_CASH_SUMMARY_UNAVAILABLE/ })
  assert.equal(normalized.coverage.cash, 'failed')
  assert.equal(normalized.coverage.stock, 'full')
  assert.ok(!snapshot.holdings.some((h) => h.assetClass === 'cash'))
})

test('复星 snapshot contract: Holdings failure keeps cash but marks incomplete', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return CASH_SUMMARY
    if (path === '/api/v1/portfolio/Holdings') throw new Error('boom')
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const normalized = assertSnapshotContract(snapshot, { complete: false, warning: /FOSUN_HOLDINGS_UNAVAILABLE/ })
  assert.equal(normalized.coverage.stock, 'failed')
  assert.equal(normalized.coverage.fund, 'failed')
  assert.equal(normalized.coverage.cash, 'full')
  assert.deepEqual(snapshot.holdings.map((h) => h.symbol), ['CASH:HKD'])
})

test('复星 snapshot contract: a missing cash balance marks incomplete', async () => {
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return { code: 0, data: { currency: 'HKD', totalAsset: '5000' } }
    if (path === '/api/v1/portfolio/Holdings') return { code: 0, data: { holdings: [GOOD_HOLDING] } }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const normalized = assertSnapshotContract(snapshot, { complete: false, warning: /FOSUN_CASH_UNAVAILABLE/ })
  assert.equal(normalized.coverage.cash, 'failed')
})

test('复星 snapshot contract: hitting the 20-page limit marks incomplete', async () => {
  let page = 0
  const deps = gatewayDeps((path) => {
    if (path === '/api/v1/portfolio/CashSummary') return CASH_SUMMARY
    if (path === '/api/v1/portfolio/Holdings') {
      page++
      return { code: 0, data: { holdings: Array.from({ length: 100 }, (_, i) => ({ ...GOOD_HOLDING, symbol: `P${page}_${i}` })) } }
    }
    throw new Error('unexpected ' + path)
  })
  const snapshot = await fetchFosunSnapshot({ gatewayUrl: GATEWAY, brokerAccountId: 'S1' }, SECRETS, undefined, deps)
  const normalized = assertSnapshotContract(snapshot, { complete: false, warning: /FOSUN_POSITIONS_PAGE_LIMIT/ })
  assert.equal(normalized.coverage.stock, 'partial')
  assert.equal(normalized.coverage.fund, 'partial')
})
