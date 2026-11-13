import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveProfiles, resolveCatalogForSnapshot, applyCatalogResolutions, ensureCatalogEntry,
  verifyInstrument, verifyInstrumentRef, applyVerificationResult, knownCatalogKeys, legacyCashFundTwins, searchCatalog, pendingInstruments,
} from './catalog.mjs'
import { OpError } from './store.mjs'

const json = (data) => ({ ok: true, status: 200, json: async () => data })
const html = (text) => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(text) })

// 按 URL 分子路由的 fetch 桩；返回 calls 方便断言「同一身份只查一次」。
function stubFetch(routes) {
  const calls = []
  const fetch = async (url) => {
    calls.push(String(url))
    for (const [part, handler] of routes) if (String(url).includes(part)) return handler(url)
    throw new Error('unexpected fetch: ' + url)
  }
  return { fetch, calls }
}

const FUND_SEARCH = {
  Datas: [
    { CODE: '000001', NAME: '华夏成长混合', CATEGORYDESC: '基金', FundBaseInfo: { SHORTNAME: '华夏成长混合', FTYPE: '混合型-灵活' } },
    { CODE: '000001', NAME: '平安银行', CATEGORYDESC: '深市', FundBaseInfo: null },
  ],
}
const F10 = `<table class="info"><tr><th>基金全称</th><td style='width:300px;'>华夏成长证券投资基金</td><th>基金简称</th><td>华夏成长混合</td></tr></table>`
const SUGGEST = { QuotationCodeTable: { Data: [{ Code: '02549', Name: '卡罗特', MktNum: '116', SecurityTypeName: '港股', QuoteID: '116.02549' }] } }

function fullProfileFetch() {
  return stubFetch([
    // 000001 同时是「华夏成长」基金与「平安银行」股票；600519 只有股票档。
    ['fundsuggest.eastmoney.com', (url) => json(url.includes('key=600519')
      ? { Datas: [{ CODE: '600519', NAME: '贵州茅台', CATEGORYDESC: '沪市', FundBaseInfo: null }] }
      : FUND_SEARCH)],
    ['fundf10.eastmoney.com', () => html(F10)],
    ['push2.eastmoney.com', () => json({ data: { f127: '银行' } })],
    ['searchapi.eastmoney.com', () => json(SUGGEST)],
  ])
}

const emptyDb = () => ({
  version: 1, baseCurrency: 'CNY', fx: { CNY: 1 },
  accounts: [], instruments: [], holdings: [], trades: [], historyEvents: [], budgets: [], snapshots: [], updatedAt: null,
})
const row = (symbol, extra = {}) => ({ symbol, name: '来源名称', market: 'CN', assetClass: 'stock', currency: 'CNY', sourceSymbol: symbol, ...extra })
const snapshot = (rows) => ({ holdings: rows, complete: true, warnings: [], queriedAt: '2026-11-07T00:00:00Z', uploadedAt: null, quoteDate: null })

const now = () => '2026-11-13T00:00:00.000Z'

test('resolveProfiles maps six-digit codes to fund or stock with classification and full name', async () => {
  const { fetch } = fullProfileFetch()
  const profiles = await resolveProfiles({ symbol: '000001', market: 'CN', assetClass: 'fund' }, { fetch, now })
  const fund = profiles.find((p) => p.market === 'FUND')
  assert.equal(fund.name, '华夏成长混合')
  assert.equal(fund.fullName, '华夏成长证券投资基金')
  assert.equal(fund.securityType, '基金 · 混合型-灵活')
  assert.equal(fund.fundType, '混合型-灵活')
  const stock = profiles.find((p) => p.market === 'CN')
  assert.equal(stock.name, '平安银行')
  assert.equal(stock.securityType, 'A股')
  assert.equal(stock.sector, '银行', 'push2 f127 fills the sector dimension')
})

test('resolveProfiles falls back to the search API for HK codes', async () => {
  const { fetch } = fullProfileFetch()
  const profiles = await resolveProfiles({ symbol: 'HK.02549', market: 'HK', assetClass: 'stock' }, { fetch, now })
  assert.equal(profiles.length, 1)
  assert.equal(profiles[0].market, 'HK')
  assert.equal(profiles[0].name, '卡罗特')
  assert.equal(profiles[0].securityType, '港股')
})

test('ingest matches a fund and stores it as one verified catalog entry with dimensions', async () => {
  const { fetch } = fullProfileFetch()
  const db = emptyDb()
  const resolutions = await resolveCatalogForSnapshot(snapshot([row('000001', { assetClass: 'fund', market: 'FUND', name: '000001' })]), { fetch })
  const result = applyCatalogResolutions(db, resolutions, { source: 'ths', now })
  assert.deepEqual([result.created, result.verified, result.pending], [1, 1, 0])
  const [instrument] = db.instruments
  assert.equal(instrument.market, 'FUND')
  assert.equal(instrument.name, '华夏成长混合', 'a code-as-name placeholder is replaced by the catalog name')
  assert.equal(instrument.fullName, '华夏成长证券投资基金')
  assert.equal(instrument.securityType, '基金 · 混合型-灵活')
  assert.equal(instrument.sourceCodes.ths, '000001', 'raw source code is archived on the catalog entry')
  assert.equal(instrument.verification.status, 'verified')
  assert.equal(instrument.verification.at, now())
})

test('a stock row resolves to a verified entry with sector; same identity is queried once', async () => {
  const { fetch, calls } = fullProfileFetch()
  const db = emptyDb()
  const rows = [
    row('000001', { assetClass: 'stock', name: '平银' }),
    row('000001', { assetClass: 'stock', name: '平银', sourceSymbol: 'SZ000001' }),
  ]
  const resolutions = await resolveCatalogForSnapshot(snapshot(rows), { fetch })
  assert.equal(calls.filter((u) => u.includes('fundsuggest')).length, 1, 'one lookup per distinct identity')
  applyCatalogResolutions(db, resolutions, { source: 'longbridge', now })
  const [instrument] = db.instruments
  assert.equal(instrument.name, '平银', 'a real source name is kept (only placeholders are replaced)')
  assert.equal(instrument.sector, '银行')
  assert.equal(instrument.securityType, 'A股')
  assert.equal(instrument.verification.status, 'verified')
})

test('a declared fund the public catalog lists only as a stock lands in the pending state with candidates', async () => {
  const { fetch } = fullProfileFetch()
  const db = emptyDb()
  // 快照说 600519 是场外基金，但公开目录里它只有股票档 → 身份冲突，必须等用户确认。
  const resolutions = await resolveCatalogForSnapshot(snapshot([row('600519', { assetClass: 'fund', market: 'CN' })]), { fetch })
  const result = applyCatalogResolutions(db, resolutions, { source: 'ths', now })
  assert.equal(result.pending, 1)
  const [instrument] = db.instruments
  assert.equal(instrument.verification.status, 'pending')
  assert.match(instrument.verification.reason, /不一致/)
  assert.deepEqual(instrument.verification.candidates.map((c) => c.market), ['CN'])
  assert.equal(instrument.verification.candidates[0].name, '贵州茅台')
})

test('an unlisted code lands in pending, and a failed lookup degrades instead of throwing', async () => {
  const db = emptyDb()
  const none = await resolveCatalogForSnapshot(snapshot([row('02549', { market: 'CN', assetClass: 'stock' })]), {
    fetch: stubFetch([['searchapi.eastmoney.com', () => json({ QuotationCodeTable: { Data: [] } })]]).fetch,
  })
  applyCatalogResolutions(db, none, { source: 'ths', now })
  assert.equal(db.instruments[0].verification.status, 'pending')
  assert.match(db.instruments[0].verification.reason, /未收录/)

  const db2 = emptyDb()
  const offline = await resolveCatalogForSnapshot(snapshot([row('600519')]), { fetch: async () => { throw new Error('network down') } })
  const result = applyCatalogResolutions(db2, offline, { source: 'ths', now })
  assert.equal(result.pending, 1)
  assert.equal(result.warnings.length, 1)
  assert.match(db2.instruments[0].verification.reason, /核验查询失败/)
  assert.equal(db2.instruments[0].symbol, '600519', 'the row is still catalogued so holdings can attach')
})

test('a local hit reuses the entry without any network lookup', async () => {
  const db = emptyDb()
  db.instruments.push({ id: 'INS_1', symbol: '600519', name: '贵州茅台', market: 'CN', assetClass: 'stock', currency: 'CNY' })
  const outcome = await ensureCatalogEntry(db, { symbol: '600519', market: 'CN', assetClass: 'stock' }, {
    fetch: async () => { throw new Error('must not query') }, now,
  })
  assert.equal(outcome.status, 'hit')
  assert.equal(outcome.created, false)
  assert.equal(db.instruments.length, 1)
})

test('verifyInstrument upgrades a pending entry and rejects unknown ids', async () => {
  const db = emptyDb()
  db.instruments.push({ id: 'INS_1', symbol: '000001', name: '000001', market: 'FUND', assetClass: 'fund', currency: 'CNY', verification: { status: 'pending' } })
  const { fetch } = fullProfileFetch()
  const result = await verifyInstrument(db, 'INS_1', { fetch, now })
  assert.equal(result.status, 'verified')
  assert.equal(db.instruments[0].name, '华夏成长混合')
  assert.equal(db.instruments[0].verification.status, 'verified')
  await assert.rejects(verifyInstrument(db, 'INS_MISSING', { fetch, now }), (error) => error instanceof OpError && error.code === 'not-found')
  await assert.rejects(verifyInstrument(db, 'INS_1', { fetch: async () => { throw new Error('boom') }, now }), /核验查询失败/)
})

test('pendingInstruments lists every unconfirmed entry with its holding count', () => {
  const db = emptyDb()
  db.instruments.push(
    { id: 'INS_1', symbol: '600519', market: 'CN', name: '待确认一', verification: { status: 'pending' } },
    { id: 'INS_2', symbol: '00700', market: 'HK', name: '已确认', verification: { status: 'verified' } },
  )
  db.holdings.push({ id: 'h1', instrumentId: 'INS_1', accountId: 'a', qty: 1 })
  const pending = pendingInstruments(db)
  assert.deepEqual(pending.map((i) => i.id), ['INS_1'])
  assert.equal(pending[0].holdingsCount, 1)
})

test('candidates carry an explicit asset class so adoption cannot leave a fund valued as a fund', async () => {
  const { fetch } = fullProfileFetch()
  const db = emptyDb()
  // 待确认的场外基金采用股票候选：确认必须同时把 assetClass 改成 stock。
  const resolutions = await resolveCatalogForSnapshot(snapshot([row('600519', { assetClass: 'fund', market: 'CN' })]), { fetch })
  applyCatalogResolutions(db, resolutions, { source: 'ths', now })
  const candidate = db.instruments[0].verification.candidates[0]
  assert.equal(candidate.market, 'CN')
  assert.equal(candidate.assetClass, 'stock', 'stock candidates declare assetClass stock')
  const fundProfiles = await resolveProfiles({ symbol: '000001', market: 'FUND', assetClass: 'fund' }, { fetch })
  assert.equal(fundProfiles.find((p) => p.market === 'FUND').securityType.includes('基金'), true)
  const fundCandidate = (await searchCatalog('000001', { fetch }))[0]
  // suggest 接口对 000001 返回的是深市股票档：候选类别必须是 stock，不能含糊。
  assert.equal(fundCandidate.assetClass, 'stock')
})

test('identities already in the ledger and cash rows are not re-queried', async () => {
  const { fetch, calls } = fullProfileFetch()
  const db = emptyDb()
  db.instruments.push({ id: 'I1', symbol: 'AAPL', name: '苹果', market: 'US', assetClass: 'stock', currency: 'USD' })
  const known = knownCatalogKeys(db)
  assert.equal(known.has('US|AAPL|S'), true)
  const resolutions = await resolveCatalogForSnapshot(snapshot([
    row('AAPL', { market: 'US', assetClass: 'stock', currency: 'USD' }),
    row('600519'),
    row('CNY.CASH', { market: 'CASH', assetClass: 'cash', currency: 'CNY' }),
  ]), { fetch, known })
  assert.equal(calls.filter((u) => u.includes('searchapi')).length, 0, 'AAPL is known: no suggest lookup')
  assert.deepEqual(resolutions.map((r) => r.ref.symbol), ['600519'], 'cash rows are skipped entirely')
  // 应用阶段对已知身份仍然只复用、不重建。
  const result = applyCatalogResolutions(db, resolutions, { source: 'ths', now })
  assert.equal(result.created, 1)
  assert.equal(db.instruments.filter((i) => i.symbol === 'AAPL').length, 1)
})

test('legacy cash-classified money funds are claimed: upgraded when alone, merged when a fund entry exists', () => {
  const db = emptyDb()
  db.instruments.push({ id: 'LEGACY', symbol: '000001', name: '货币基金', market: 'CN', assetClass: 'cash', currency: 'CNY' })
  const ref = { symbol: '000001', market: 'CN', assetClass: 'fund', currency: 'CNY' }
  assert.deepEqual(legacyCashFundTwins(db, ref).map((i) => i.id), ['LEGACY'])
  assert.deepEqual(legacyCashFundTwins(db, { ...ref, assetClass: 'stock' }), [], 'stock refs never claim cash rows')
  // 只剩旧条目：升级为基金档。
  const resolutions = [{ ref, profiles: [], error: { message: 'catalog offline' } }]
  const result = applyCatalogResolutions(db, resolutions, { source: 'ths', now })
  assert.equal(result.claimedLegacy, 1)
  assert.equal(db.instruments.length, 1)
  assert.equal(db.instruments[0].assetClass, 'fund', 'legacy entry upgraded in place')

  // 旧条目与真正的基金档并存：旧条目并入基金档（别处还有同代码股票也不受影响）。
  const db2 = emptyDb()
  db2.instruments.push(
    { id: 'LEGACY', symbol: '000001', name: '货币基金', market: 'CN', assetClass: 'cash', currency: 'CNY' },
    { id: 'FUNDENTRY', symbol: '000001', name: '华夏成长混合', market: 'FUND', assetClass: 'fund', currency: 'CNY' },
    { id: 'STOCK', symbol: '000001', name: '平安银行', market: 'CN', assetClass: 'stock', currency: 'CNY' },
  )
  db2.holdings.push(
    { id: 'HL', accountId: 'a1', instrumentId: 'LEGACY', qty: 100, currency: 'CNY' },
    { id: 'HF', accountId: 'a2', instrumentId: 'FUNDENTRY', qty: 5, currency: 'CNY' },
  )
  const r2 = applyCatalogResolutions(db2, [{ ref, profiles: [], error: { message: 'x' } }], { source: 'ths', now })
  assert.equal(r2.claimedLegacy, 1)
  assert.deepEqual(db2.instruments.map((i) => i.id).sort(), ['FUNDENTRY', 'STOCK'])
  assert.equal(db2.holdings.find((h) => h.id === 'HL').instrumentId, 'FUNDENTRY', 'legacy holding now hangs off the fund entry')
})

test('verification is split: the network stage never writes, and the apply stage refuses deleted ids', async () => {
  const db = emptyDb()
  db.instruments.push({ id: 'INS_1', symbol: '000001', name: '000001', market: 'FUND', assetClass: 'fund', currency: 'CNY', verification: { status: 'pending' } })
  const before = structuredClone(db)
  const outcome = await verifyInstrumentRef(db, 'INS_1', { fetch: fullProfileFetch().fetch, now })
  assert.deepEqual(db, before, 'the network stage must not touch the ledger')
  assert.equal(outcome.id, 'INS_1')
  // 查询期间标的被删：应用阶段按 not-found 报告，而不是把旧副本写回。
  db.instruments.length = 0
  assert.throws(() => applyVerificationResult(db, outcome, { now }), (error) => error instanceof OpError && error.code === 'not-found')
  // 正常路径：查询后重读的账本里条目仍在 → 只写这一条的核验结果。
  const fresh = emptyDb()
  fresh.instruments.push(structuredClone(before.instruments[0]))
  const result = applyVerificationResult(fresh, outcome, { now })
  assert.equal(result.status, 'verified')
  assert.equal(fresh.instruments[0].name, '华夏成长混合')
  assert.equal(fresh.accounts.length, 0, 'only the instrument was written; nothing else came along')
  await assert.rejects(verifyInstrumentRef(db, 'INS_MISSING', { fetch: fullProfileFetch().fetch }), (error) => error instanceof OpError && error.code === 'not-found')
})
