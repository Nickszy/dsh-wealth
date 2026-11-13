// 本地证券目录（产品表）：ledger.instruments 就是这张表——每只证券一条，
// 带 code / 简称 / 全称 / 分类等维度；持仓只挂 instrumentId，行情只更新表上的报价。
//
// 入库（同步快照）时的身份解析流程：
//   1. 本地表命中 → 直接复用（来源原始代码照旧留档）；
//   2. 未命中 → 查公开接口核对市场 / 类型 / 名称 / 分类，唯一吻合才建「已核验」条目；
//   3. 查询失败或结果与快照声明的身份冲突 → 建条目但标「待确认」，
//      附上候选，等用户或 AI 用 instrument.confirm 钉死身份。
// 前端只按已确认（或至少未被标记待确认）的 instrumentId 汇总。
//
// 并发约束：网络核验（resolveCatalogForSnapshot）必须在读账本之前完成；
// 读账本 → applyCatalogResolutions → mergeSnapshot → 落盘 之间不允许再有 await，
// 否则两个来源并行同步会各自基于旧账本合并、后写者覆盖前写者。
import { canonicalMarket } from './model.mjs'
import { normalizeSymbol, isFundLike, identityKey, resolveSecurity } from './symbols.mjs'
import { applyOp, findInstrumentByIdentity, OpError } from './store.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const FUND_SEARCH_URL = 'https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx'
const FUND_F10_URL = 'https://fundf10.eastmoney.com/jbgk_{CODE}.html'
const STOCK_GET_URL = 'https://push2.eastmoney.com/api/qt/stock/get'
const timeoutSignal = (timeoutMs) => AbortSignal.timeout(timeoutMs)
const asFetch = (fetch) => fetch || globalThis.fetch

async function getJSON(url, { fetch, timeoutMs }) {
  const response = await asFetch(fetch)(url, {
    method: 'GET', redirect: 'error', signal: timeoutSignal(timeoutMs),
    headers: { accept: 'application/json, text/plain, */*', 'user-agent': UA },
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  return response.json()
}

// 六位代码：天天基金搜索接口同时收录基金与沪深股票，用 CATEGORYDESC 区分。
// 基金档还带 FTYPE（混合型-灵活…），顺带抓 f10 页面拿基金全称。
async function fetchCatalogByCode(code, options) {
  const json = await getJSON(`${FUND_SEARCH_URL}?m=1&key=${encodeURIComponent(code)}`, options)
  const rows = Array.isArray(json?.Datas) ? json.Datas : []
  const fundRow = rows.find((r) => r?.CATEGORYDESC === '基金' && /^\d{6}$/.test(String(r?.CODE || '')))
  const stockRow = rows.find((r) => ['沪市', '深市', '北交所'].includes(r?.CATEGORYDESC) && /^\d{6}$/.test(String(r?.CODE || '')))
  const profiles = []
  if (fundRow) {
    const base = fundRow.FundBaseInfo || {}
    const fundType = String(base.FTYPE || '').trim() || null
    const fullName = await fetchFundFullName(code, options).catch(() => null)
    profiles.push({
      symbol: String(fundRow.CODE), market: 'FUND',
      name: String(base.SHORTNAME || fundRow.NAME || '').trim(),
      fullName: fullName || null,
      securityType: fundType ? '基金 · ' + fundType : '基金',
      fundType, sector: null, provider: 'eastmoney',
    })
  }
  if (stockRow) {
    const sector = await fetchStockSector(String(stockRow.CODE), 'CN', options).catch(() => null)
    profiles.push({
      symbol: String(stockRow.CODE), market: 'CN',
      name: String(stockRow.NAME || '').trim(), fullName: null,
      securityType: stockRow.CATEGORYDESC === '北交所' ? '北交所A股' : 'A股',
      fundType: null, sector, provider: 'eastmoney',
    })
  }
  return profiles
}

// 基金全称只在 f10 基本概况页；抓不到就留空，绝不阻塞入库。
async function fetchFundFullName(code, options) {
  const url = FUND_F10_URL.replace('{CODE}', encodeURIComponent(code))
  const response = await asFetch(options.fetch)(url, {
    method: 'GET', redirect: 'error', signal: timeoutSignal(options.timeoutMs),
    headers: { accept: 'text/html,*/*', 'user-agent': UA },
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  const bytes = await response.arrayBuffer()
  let text
  try { text = new TextDecoder('utf-8').decode(bytes) } catch { text = new TextDecoder('latin1').decode(bytes) }
  const match = /基金全称<\/th>\s*<td[^>]*>([^<]+)<\/td>/.exec(text)
  return match ? match[1].trim().slice(0, 80) : null
}

// 股票/港股行业（东财 push2 的 f127）。美股 secid 前缀随交易所（105/106/107），逐个试。
async function fetchStockSector(code, market, options) {
  const secids = []
  if (market === 'CN') secids.push(/^(6|9|5)/.test(code) ? '1.' + code : '0.' + code)
  else if (market === 'HK') secids.push('116.' + code)
  else if (market === 'US') secids.push('105.' + code, '106.' + code, '107.' + code)
  for (const secid of secids) {
    const json = await getJSON(`${STOCK_GET_URL}?secid=${encodeURIComponent(secid)}&fields=f127`, options)
    const sector = String(json?.data?.f127 || '').trim()
    if (sector) return sector.slice(0, 24)
  }
  return null
}

// 非六位代码（港股五位 / 美股字母 / 港美股 ETF）：东财搜索接口核对市场与类型。
async function fetchCatalogByQuery(query, options) {
  const found = await resolveSecurity(query, options)
  if (!found) return []
  const market = canonicalMarket(found.market)
  const sector = ['CN', 'HK'].includes(market) ? await fetchStockSector(found.symbol, market, options).catch(() => null) : null
  return [{
    symbol: found.symbol, market,
    name: found.name || '', fullName: null,
    securityType: found.securityType || null,
    fundType: null, sector, provider: 'eastmoney',
  }]
}

/**
 * 按入库引用查公开目录。返回候选档案数组（按吻合度排序）；
 * 网络失败抛错，由调用方决定降级为「待确认·查询失败」。
 * profile = { symbol, market, name, fullName, securityType, fundType?, sector?, provider }
 */
export async function resolveProfiles(ref, options = {}) {
  const opts = { ...options, timeoutMs: options.timeoutMs ?? 10000 }
  const normalized = normalizeSymbol(ref.symbol, ref.market || '')
  const symbol = normalized.symbol || String(ref.symbol || '').trim()
  if (!symbol) return []
  if (/^\d{6}$/.test(symbol) && ['CN', 'FUND'].includes(canonicalMarket(normalized.market))) {
    return fetchCatalogByCode(symbol, opts)
  }
  return fetchCatalogByQuery(symbol, opts)
}

// 单个入库引用的核验结果（纯网络，不碰账本）：
// { ref, profiles, error }；error 非空表示此次核验失败（入库时降级为待确认）。
export async function resolveCatalogRef(ref, options = {}) {
  try {
    return { ref, profiles: await resolveProfiles(ref, options), error: null }
  } catch (error) {
    return { ref, profiles: [], error }
  }
}

/**
 * 快照级预核验：把快照里每个不同身份（代码 + 市场 + 基金位）各查一次。
 * 这是异步网络阶段，必须在读账本之前调用；结果交给 applyCatalogResolutions 写表。
 */
export async function resolveCatalogForSnapshot(snapshot, options = {}) {
  const distinct = new Map()
  for (const row of snapshot.holdings || []) {
    const ref = {
      symbol: row.symbol, market: row.market, assetClass: row.assetClass, currency: row.currency,
      name: row.name, sourceCode: row.sourceSymbol || row.symbol,
    }
    const wantFund = isFundLike({ market: normalizeSymbol(row.symbol, row.market).market, assetClass: row.assetClass })
    const key = identityKey({ symbol: row.symbol, market: row.market }) + '|' + (wantFund ? 'F' : 'S')
    if (!distinct.has(key)) distinct.set(key, ref)
  }
  const resolutions = []
  for (const ref of distinct.values()) resolutions.push(await resolveCatalogRef(ref, options))
  return resolutions
}

// 候选档案是否与快照声明的身份吻合（市场一致 + 基金位一致）。
function profileMatches(profile, ref) {
  const normalized = normalizeSymbol(ref.symbol, ref.market || '')
  const wantFund = isFundLike({ market: normalized.market, assetClass: ref.assetClass })
  const profileFund = canonicalMarket(profile.market) === 'FUND'
  if (/^\d{6}$/.test(normalized.symbol)) return wantFund === profileFund
  return canonicalMarket(profile.market) === canonicalMarket(normalized.market)
}

const candidateOf = (profile) => ({
  symbol: profile.symbol, market: profile.market, name: profile.name || '',
  securityType: profile.securityType || null, provider: profile.provider || 'eastmoney',
})

// 只填空位：外部核验是数据来源，但绝不覆盖用户已填的名称、行业、全称。
function applyProfileToInstrument(instrument, profile) {
  const placeholderName = !instrument.name || instrument.name === instrument.symbol
  if (profile.name && placeholderName) instrument.name = profile.name
  if (profile.fullName && !instrument.fullName) instrument.fullName = profile.fullName
  if (profile.securityType && !instrument.securityType) instrument.securityType = profile.securityType
  if (profile.sector && !instrument.sector) instrument.sector = profile.sector
}

// 在本地产品表里新建一条（走 instrument.upsert，与手工/AI 建档同一套校验）。
function createCatalogInstrument(db, ref, options) {
  const normalized = normalizeSymbol(ref.symbol, ref.market || '')
  const fallbackName = String(ref.name || '').trim() || normalized.symbol
  const { instrument } = applyOp(db, 'instrument.upsert', { instrument: {
    symbol: normalized.symbol, market: normalized.market, assetClass: ref.assetClass,
    currency: ref.currency, name: fallbackName,
    ...(options.source ? { sourceCodes: { [String(options.source).toLowerCase()]: String(ref.sourceCode || normalized.symbol).slice(0, 80) } } : {}),
  } })
  return { instrument, normalized }
}

// 把一次核验结果落到条目上：吻合 → 已核验并补齐维度；否则 → 待确认并附候选。
function applyResolution(instrument, normalized, resolution, now) {
  if (resolution.error) {
    instrument.verification = {
      status: 'pending', source: 'eastmoney', at: now(),
      reason: '核验查询失败：' + String(resolution.error?.message || resolution.error).slice(0, 120),
      candidates: [],
    }
    return 'pending'
  }
  const matched = resolution.profiles.find((p) => p.symbol === normalized.symbol && profileMatches(p, resolution.ref))
  if (matched) {
    applyProfileToInstrument(instrument, matched)
    instrument.securityType = instrument.securityType || matched.securityType || null
    instrument.fullName = instrument.fullName || matched.fullName || null
    instrument.verification = { status: 'verified', source: 'eastmoney', at: now(), securityType: matched.securityType || null }
    return 'verified'
  }
  instrument.verification = {
    status: 'pending', source: 'eastmoney', at: now(),
    reason: resolution.profiles.length ? '公开目录候选与快照声明的市场或类别不一致' : '公开目录未收录此代码',
    candidates: resolution.profiles.map(candidateOf),
  }
  return 'pending'
}

/**
 * 把预核验结果写进账本（同步，事务内调用）：本地已命中就复用，未命中才建条目。
 * 必须在 readLedger 之后、落盘之前、无 await 的同一段代码里执行。
 */
export function applyCatalogResolutions(db, resolutions, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  const result = { created: 0, verified: 0, pending: 0, warnings: [] }
  for (const resolution of resolutions) {
    if (findInstrumentByIdentity(db, resolution.ref)) continue
    const { instrument, normalized } = createCatalogInstrument(db, resolution.ref, options)
    const status = applyResolution(instrument, normalized, resolution, now)
    result.created++
    result[status]++
    if (resolution.error) result.warnings.push('目录核验失败 ' + resolution.ref.symbol + '：' + String(resolution.error?.message || resolution.error).slice(0, 120))
  }
  return result
}

/**
 * 单条便捷入口（核验/测试用）：先查本地命中（不联网），未命中再查目录并写表。
 * 网络错误降级为待确认；只有编程错误才抛出。
 */
export async function ensureCatalogEntry(db, ref, options = {}) {
  const existing = findInstrumentByIdentity(db, ref)
  if (existing) return { instrument: existing, status: 'hit', created: false }
  const resolution = await resolveCatalogRef(ref, options)
  const { instrument, normalized } = createCatalogInstrument(db, ref, options)
  const status = applyResolution(instrument, normalized, resolution, options.now || (() => new Date().toISOString()))
  return { instrument, status, created: true }
}

/**
 * 对已有条目重新核验（用户点「重新查询」或首次补核验）。
 * 吻合 → 套用档案并标已核验；不吻合/未收录 → 待确认并附候选。查询失败原样抛出由路由转错误。
 */
export async function verifyInstrument(db, id, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  const instrument = db.instruments.find((i) => i.id === id)
  if (!instrument) throw new OpError('not-found', '标的不存在: ' + id)
  const ref = { symbol: instrument.symbol, market: instrument.market, assetClass: instrument.assetClass }
  const resolution = await resolveCatalogRef(ref, options)
  if (resolution.error) throw new OpError('bad-request', '核验查询失败：' + String(resolution.error?.message || resolution.error).slice(0, 120))
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const status = applyResolution(instrument, normalized, resolution, now)
  instrument.updatedAt = now()
  return { instrument, status }
}

/** 前端「待确认标的」列表：带每条的持仓数量，方便展示影响面。 */
export function pendingInstruments(db) {
  return (db.instruments || [])
    .filter((i) => i.verification?.status === 'pending')
    .map((i) => ({
      ...i,
      holdingsCount: (db.holdings || []).filter((h) => h.instrumentId === i.id).length,
    }))
}
