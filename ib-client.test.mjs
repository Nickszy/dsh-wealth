import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { listIbAccounts, fetchIbSnapshot } from './ib-client.mjs'
import { assertSnapshotContract, assertNoCrossCurrencySum } from './snapshot-contract.mjs'

const source = { gatewayUrl: 'https://localhost:5000/v1/api', brokerAccountId: 'U123', trustLocalGateway: true }
const account = { id: 'U123', accountId: 'U123', accountAlias: 'Cash portfolio', currency: 'USD', tradingType: 'CASH' }
const stock = (conid = 1, extra = {}) => ({ acctId: 'U123', conid, ticker: `S${conid}`, contractDesc: 'Stock', position: 2, mktPrice: 12, avgCost: 10, assetClass: 'STK', currency: 'USD', ...extra })
const ledger = { USD: { acctcode: 'U123', currency: 'USD', cashbalance: 123, netliquidationvalue: 999, buyingPower: 2000 }, BASE: { cashbalance: 9999, currency: 'BASE' } }
function fixture({ accounts = [account], pages = [[]], cash = ledger, ...overrides } = {}) {
  const calls = []
  const deps = { request: async (url, options) => {
    calls.push({ url, ...options })
    const path = new URL(url).pathname
    if (path.endsWith('/accounts')) return accounts
    if (path.endsWith('/ledger')) return cash
    return pages[Number(path.split('/').at(-1))]
  }, ...overrides }
  return { calls, deps }
}

test('lists only allowlisted account fields and validates explicit selection before portfolio requests', async () => {
  const f = fixture()
  const result = await listIbAccounts(source, {}, undefined, f.deps)
  assert.equal(result.accounts[0].id, 'U123')
  assert.equal(result.accounts[0].name, 'Cash portfolio')
  assert.equal(f.calls[0].method, 'GET')
  await assert.rejects(fetchIbSnapshot({ ...source, brokerAccountId: 'U999' }, {}, undefined, f.deps), /selected account/i)
  assert.equal(f.calls.length, 2)
  await assert.rejects(fetchIbSnapshot({ gatewayUrl: source.gatewayUrl }, {}, undefined, f.deps), /brokerAccountId/)
})

test('full page followed by empty page completes; only native cashbalance becomes cash', async () => {
  const f = fixture({ pages: [Array.from({ length: 100 }, (_, i) => stock(i + 1)), []], cash: { ...ledger, EUR: { cashbalance: '7.5', currency: 'EUR' } } })
  const result = await fetchIbSnapshot(source, {}, undefined, f.deps)
  assert.equal(result.complete, true)
  assert.equal(result.holdings.length, 102)
  assert.deepEqual(result.holdings.filter(h => h.assetClass === 'cash').map(h => [h.currency, h.qty]), [['USD', 123], ['EUR', 7.5]])
  assert.equal(result.uploadedAt, null)
  assert.equal(result.quoteDate, null)
  assert.ok(Number.isFinite(Date.parse(result.queriedAt)))
  assert.deepEqual(f.calls.map(c => new URL(c.url).pathname), ['/v1/api/portfolio/accounts', '/v1/api/portfolio/U123/positions/0', '/v1/api/portfolio/U123/positions/1', '/v1/api/portfolio/U123/ledger'])
  assert.ok(f.calls.every(c => c.method === 'GET'))
})

test('multiple full pages and a short page are all read', async () => {
  const f = fixture({ pages: [Array.from({ length: 100 }, (_, i) => stock(i + 1)), Array.from({ length: 100 }, (_, i) => stock(i + 101)), [stock(201)]] })
  assert.equal((await fetchIbSnapshot(source, {}, undefined, f.deps)).holdings.length, 202)
})

test('bounded pages never return a prunable truncated snapshot', async () => {
  const f = fixture({ pages: [Array.from({ length: 100 }, (_, i) => stock(i + 1))], maxPages: 1 })
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, f.deps), /page limit/i)
})

test('conid is preserved and missing ticker uses unambiguous contract identity', async () => {
  const f = fixture({ pages: [[stock(123, { ticker: null, mktPrice: null })]] })
  const result = await fetchIbSnapshot(source, {}, undefined, f.deps)
  assert.equal(result.holdings[0].symbol, 'CONID-123')
  assert.equal(result.holdings[0].externalId, 'IBKR:123')
  assert.equal(result.holdings[0].manualPrice, null)
  assert.ok(result.warnings.some(w => /PRICE_UNAVAILABLE/.test(w)))
})

for (const [label, value] of [['null', null], ['object', {}], ['error response', { error: 'private response body' }]]) {
  test(`rejects ${label} accounts and positions without treating them as empty`, async () => {
    await assert.rejects(listIbAccounts(source, {}, undefined, fixture({ accounts: value }).deps), /accounts/i)
    await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages: [value] }).deps), /positions/i)
  })
}

for (const [field, values] of Object.entries({ position: [null, undefined, '', -1, NaN, Infinity, true], avgCost: [null, undefined, '', -1, NaN], conid: [null, 0, -1, 1.5], currency: [null, 'BASE', ''], assetClass: [null, 'OPT', 'FUT', 'BOND', 'CFD'] })) {
  test(`rejects invalid or unsupported ${field} without inventing values`, async () => {
    for (const value of values) await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages: [[stock(1, { [field]: value })]] }).deps))
  })
}

test('rejects short, margin-enabled accounts and non-unit multiplier', async () => {
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ accounts: [{ ...account, tradingType: 'PMRGN' }] }).deps), /margin/i)
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages: [[stock(1, { multiplier: 100 })]] }).deps), /multiplier/i)
})

test('ETF and mutual fund classes are supported; zero positions are ignored', async () => {
  const result = await fetchIbSnapshot(source, {}, undefined, fixture({ pages: [[stock(1, { assetClass: 'ETF' }), stock(2, { assetClass: 'FUND' }), stock(3, { position: 0 })]] }).deps)
  assert.deepEqual(result.holdings.map(h => h.assetClass), ['etf', 'fund', 'cash'])
})

test('duplicate contracts, ticker collisions and wrong account data fail closed', async () => {
  for (const pages of [[[stock(1), stock(1)]], [[stock(1), stock(2, { ticker: 'S1' })]], [[stock(1, { acctId: 'U999' })]]]) {
    await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages }).deps))
  }
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ cash: { USD: { ...ledger.USD, acctcode: 'U999' } } }).deps), /account/i)
})

for (const cash of [null, {}, [], { BASE: ledger.BASE }, { USD: null }, { USD: { cashbalance: null } }, { USD: { cashbalance: -1 } }, { USD: { cashbalance: 1, stockoptionmarketvalue: 20 } }]) {
  test(`invalid, missing, negative or derivative ledger rejects: ${JSON.stringify(cash)}`, async () => {
    await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ cash }).deps))
  })
}

test('timeout and caller abort are enforced even if injected requester ignores signals', async () => {
  const deps = { request: () => new Promise(() => {}), timeoutMs: 15 }
  await assert.rejects(listIbAccounts(source, {}, undefined, deps), /timed out/i)
  const controller = new AbortController()
  const pending = listIbAccounts(source, {}, controller.signal, { ...deps, timeoutMs: 1000 })
  controller.abort(new Error('secret abort reason'))
  await assert.rejects(pending, error => /cancelled/i.test(error.message) && !error.message.includes('secret'))
})

test('already cancelled calls never send requests or expose abort reasons', async () => {
  const controller = new AbortController()
  controller.abort(new Error('private abort reason'))
  const f = fixture()
  await assert.rejects(listIbAccounts(source, {}, controller.signal, f.deps), /cancelled/i)
  assert.equal(f.calls.length, 0)
})

test('invalid prices reject and native cash does not fall back to totals or buying power', async () => {
  for (const mktPrice of [-1, '', true, Infinity]) {
    await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages: [[stock(1, { mktPrice })]] }).deps))
  }
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ cash: { USD: { netliquidationvalue: 999, buyingPower: 2000 } } }).deps), /cashbalance/)
  const original = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  await listIbAccounts(source, {}, undefined, fixture().deps)
  assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED, original)
})

test('network exceptions and response errors never expose secret error bodies', async () => {
  await assert.rejects(listIbAccounts(source, {}, undefined, { request: () => { throw new Error('Authorization secret password') } }), error => !/Authorization|secret|password/.test(error.message))
})

test('gateway URL and TLS trust are validated before any injected request', async () => {
  for (const gatewayUrl of ['http://example.com/v1/api', 'https://user:secret@localhost/v1/api', 'https://localhost/v1/api?token=x', 'https://localhost/v1/api#secret', 'file:///v1/api', 'https://localhost/other', 'https://localhost.evil/v1/api']) {
    const f = fixture()
    await assert.rejects(listIbAccounts({ ...source, gatewayUrl }, {}, undefined, f.deps))
    assert.equal(f.calls.length, 0)
  }
  for (const gatewayUrl of ['https://localhost:5000/v1/api', 'https://127.0.0.2:5000/v1/api', 'https://[::1]:5000/v1/api']) {
    const f = fixture()
    await listIbAccounts({ ...source, gatewayUrl }, {}, undefined, f.deps)
    assert.equal(f.calls[0].rejectUnauthorized, false)
  }
  const strict = fixture()
  await listIbAccounts({ ...source, gatewayUrl: 'https://example.com/v1/api', trustLocalGateway: false }, {}, undefined, strict.deps)
  assert.equal(strict.calls[0].rejectUnauthorized, true)
  const localStrict = fixture()
  await listIbAccounts({ ...source, trustLocalGateway: false }, {}, undefined, localStrict.deps)
  assert.equal(localStrict.calls[0].rejectUnauthorized, true)
})

test('local gateway does not require secrets; unsupported bearer credentials fail clearly', async () => {
  await listIbAccounts(source, undefined, undefined, fixture().deps)
  await assert.rejects(listIbAccounts(source, { bearerToken: 'private-token' }, undefined, fixture().deps), error => /gateway session/i.test(error.message) && !error.message.includes('private-token'))
})

test('default transport parses JSON, rejects redirects and explains manual login without response leakage', async t => {
  let mode = 'json'
  const server = http.createServer((req, res) => {
    if (mode === 'json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify([account])) }
    else if (mode === 'auth') { res.writeHead(401); res.end('private authentication details') }
    else if (mode === 'redirect') { res.writeHead(302, { Location: 'http://external.invalid' }); res.end('private redirect body') }
    else { res.end('private invalid JSON') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const local = { gatewayUrl: `http://127.0.0.1:${server.address().port}/v1/api` }
  assert.equal((await listIbAccounts(local)).accounts[0].id, 'U123')
  mode = 'auth'
  await assert.rejects(listIbAccounts(local), error => /manual.*login/i.test(error.message) && !/private/.test(error.message))
  mode = 'redirect'
  await assert.rejects(listIbAccounts(local), /HTTP 302/)
  mode = 'bad'
  await assert.rejects(listIbAccounts(local), error => /JSON/.test(error.message) && !/private/.test(error.message))
})

// ---- 快照契约（P0-C）----
test('contract: IB snapshot passes the shared contract with multi-currency native cash', async () => {
  const f = fixture({ cash: { ...ledger, EUR: { cashbalance: '7.5', currency: 'EUR' } } })
  const raw = await fetchIbSnapshot(source, {}, undefined, f.deps)
  const normalized = assertSnapshotContract(raw, { complete: true })
  assert.deepEqual(normalized.holdings.filter(h => h.assetClass === 'cash').map(h => [h.currency, h.qty]), [['USD', 123], ['EUR', 7.5]])
  assertNoCrossCurrencySum(raw, ['cash'])
})
test('contract: IB pagination reads every page and never returns a truncated complete snapshot', async () => {
  const f = fixture({ pages: [Array.from({ length: 100 }, (_, i) => stock(i + 1)), Array.from({ length: 100 }, (_, i) => stock(i + 101)), [stock(201)]] })
  const raw = await fetchIbSnapshot(source, {}, undefined, f.deps)
  const normalized = assertSnapshotContract(raw, { complete: true })
  assert.equal(normalized.holdings.filter(h => h.assetClass !== 'cash').length, 201)
  assert.deepEqual(f.calls.map(c => new URL(c.url).pathname).filter(p => p.includes('/positions/')),
    ['/v1/api/portfolio/U123/positions/0', '/v1/api/portfolio/U123/positions/1', '/v1/api/portfolio/U123/positions/2'])
  // 触发页数上限时整体拒绝，不返回可以触发删除的 complete 快照。
  const limited = fixture({ pages: [Array.from({ length: 100 }, (_, i) => stock(i + 1))], maxPages: 1 })
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, limited.deps), /page limit/i)
})
test('contract: IB missing price only warns and keeps coverage complete', async () => {
  const f = fixture({ pages: [[stock(1, { mktPrice: null })]] })
  const raw = await fetchIbSnapshot(source, {}, undefined, f.deps)
  const normalized = assertSnapshotContract(raw, { complete: true, warning: /^PRICE_UNAVAILABLE: IBKR:1/ })
  assert.equal(normalized.holdings[0].manualPrice, null)
})
test('contract: IB missing cost or a failed ledger call returns no snapshot', async () => {
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, fixture({ pages: [[stock(1, { avgCost: null })]] }).deps), /average cost/)
  const failing = { ...fixture().deps, request: async (url) => {
    const path = new URL(url).pathname
    if (path.endsWith('/accounts')) return [account]
    if (path.endsWith('/ledger')) throw new Error('ledger down')
    return []
  } }
  await assert.rejects(fetchIbSnapshot(source, {}, undefined, failing), /request failed/)
})
