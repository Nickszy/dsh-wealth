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
import { normalizeSymbol, isFundLike, resolveSecurity } from './symbols.mjs'
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

// 身份键含基金位：目录已知集合与「来源身份 → 已确认条目」别名都用它。
// 与 store 的匹配规则同构：六位代码的 CN/FUND 基金身份折叠成同一个键，
// 否则「已有 FUND 基金档」遇上「CN 基金快照」会被当成陌生身份重复联网。
export function catalogKey(symbol, market, assetClass) {
  const normalized = normalizeSymbol(symbol, market || '')
  const wantFund = isFundLike({ market: normalized.market, assetClass })
  const sixDigit = /^\d{6}$/.test(normalized.symbol)
  const marketKey = sixDigit && wantFund && ['CN', 'FUND'].includes(canonicalMarket(normalized.market)) ? 'FUND' : canonicalMarket(normalized.market)
  return marketKey + '|' + normalized.symbol + '|' + (wantFund ? 'F' : 'S')
}

// store 侧别名键（identityKey 原样，如 CN|000001|F）折算成目录键，统一进已知集合。
function aliasToCatalogKey(alias) {
  const match = /^([^|]+)\|([^|]+)\|([FS])$/.exec(String(alias || ''))
  if (!match) return String(alias || '')
  return catalogKey(match[2], match[1], match[3] === 'F' ? 'fund' : 'stock')
}

/** 同步联网前的只读快照：账本里已有身份（含确认别名，按折叠后的键）。 */
export function knownCatalogKeys(db) {
  const keys = new Set()
  for (const i of db.instruments || []) {
    keys.add(catalogKey(i.symbol, i.market, i.assetClass))
    for (const alias of i.confirmedAliases || []) keys.add(aliasToCatalogKey(alias))
  }
  return keys
}

/**
 * 快照级预核验：把快照里每个不同身份（代码 + 市场 + 基金位）各查一次。
 * 这是异步网络阶段，必须在读账本之前调用；结果交给 applyCatalogResolutions 写表。
 * 现金（CASH 市场，身份即币种）完全跳过；账本已有的身份标记 knownHit——
 * 仍会流入写表阶段（旧 cash 货币基金的认领不能被跳过），只是不再联网。
 */
export async function resolveCatalogForSnapshot(snapshot, options = {}) {
  const distinct = new Map()
  for (const row of snapshot.holdings || []) {
    const ref = {
      symbol: row.symbol, market: row.market, assetClass: row.assetClass, currency: row.currency,
      name: row.name, sourceCode: row.sourceSymbol || row.symbol,
    }
    const normalized = normalizeSymbol(row.symbol, row.market)
    // 现金没有可核验的公开证券；身份就是币种，建档交给 holding.upsert 即可。
    if (canonicalMarket(normalized.market) === 'CASH') continue
    const key = catalogKey(row.symbol, row.market, row.assetClass)
    const existing = distinct.get(key)
    if (existing) continue
    distinct.set(key, { ref, profiles: options.known?.has(key) ? null : undefined, error: null, knownHit: !!options.known?.has(key) })
  }
  const resolutions = []
  for (const entry of distinct.values()) {
    if (entry.knownHit) { resolutions.push(entry); continue }
    resolutions.push(await resolveCatalogRef(entry.ref, options))
  }
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

// 候选必须自带明确的资产类别：确认时一并保存，否则「待确认基金 + 股票候选」
// 会保留 fund 类别，条目显示已核验却仍按基金估值。
function profileAssetClass(profile) {
  if (canonicalMarket(profile.market) === 'FUND') return 'fund'
  if (/ETF|LOF/i.test(String(profile.securityType || ''))) return 'etf'
  return 'stock'
}

const assetClassLabel = (cls) => ({ fund: '场外基金', stock: '股票', etf: 'ETF', cash: '现金', bond: '债券' })[String(cls || '').toLowerCase()] || String(cls || '标的')
const marketLabel = (market) => ({ CN: 'A股', HK: '港股', US: '美股', FUND: '场外基金', CASH: '现金' })[canonicalMarket(market)] || String(market || '')

const candidateOf = (profile) => ({
  symbol: profile.symbol, market: profile.market, name: profile.name || '',
  securityType: profile.securityType || null, assetClass: profileAssetClass(profile),
  provider: profile.provider || 'eastmoney',
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
  // 说明「券商报的」和「公开目录里是什么」两边，用户才知道自己在确认什么。
  const first = resolution.profiles[0]
  const claimed = assetClassLabel(resolution.ref.assetClass)
  instrument.verification = {
    status: 'pending', source: 'eastmoney', at: now(),
    reason: first
      ? `公开目录里 ${first.symbol} 是「${first.name || first.symbol}」（${first.securityType || marketLabel(first.market)}），和券商报的${claimed}对不上`
      : '公开目录未收录此代码',
    candidates: resolution.profiles.map(candidateOf),
  }
  return 'pending'
}

// 旧版同花顺把货币基金存成 market=CN + 六位代码 + assetClass=cash；真现金一律是
// CASH 市场（币种.CASH）。基金引用遇到这样的旧条目必须认领——否则赎回后旧持仓
// 永远不满足覆盖段剪枝，资产被虚增。返回与该基金引用同代码的旧 cash 条目。
export function legacyCashFundTwins(db, ref) {
  const normalized = normalizeSymbol(ref.symbol, ref.market || '')
  if (!/^\d{6}$/.test(normalized.symbol) || !['CN', 'FUND'].includes(canonicalMarket(normalized.market))) return []
  if (!isFundLike({ market: normalized.market, assetClass: ref.assetClass })) return []
  return (db.instruments || []).filter((i) => i.symbol === normalized.symbol
    && canonicalMarket(i.market) === 'CN'
    && String(i.assetClass || '').toLowerCase() === 'cash')
}

/**
 * 把预核验结果写进账本（同步，事务内调用）。命中即复用（含确认别名命中）；
 * 未命中才建条目。基金引用还会先认领旧版 cash 货币基金条目（升级或并账）。
 * 必须在 readLedger 之后、落盘之前、无 await 的同一段代码里执行。
 */
export function applyCatalogResolutions(db, resolutions, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  const result = { created: 0, verified: 0, pending: 0, claimedLegacy: 0, warnings: [] }
  for (const resolution of resolutions) {
    let hit = findInstrumentByIdentity(db, { ...resolution.ref, matchAliases: true })
    // 基金身份遇到旧版 cash 货币基金条目：有基金档（含命中的这条）就并进去，
    // 没有就把旧条目升级为基金档——即使基金档已命中也不能跳过，否则旧条目
    // 永远留在 cash 档，赎回后不可剪枝，资产被虚增。knownHit 的引用同样要走到这里。
    const twins = legacyCashFundTwins(db, resolution.ref).filter((t) => t.id !== hit?.id)
    for (const twin of twins) {
      try {
        // 认领的保留方必须是「真正的基金身份条目」（严格匹配，不走别名）：
        // 别名可能把来源身份指到完全不同的证券上，把旧货基并进去会错迁别人的持仓。
        const keep = findInstrumentByIdentity(db, { ...resolution.ref })
        if (keep) applyOp(db, 'instrument.merge', { keepId: keep.id, dropId: twin.id })
        else applyOp(db, 'instrument.upsert', { instrument: { id: twin.id, assetClass: 'fund' } })
        result.claimedLegacy++
      } catch (error) {
        // 同账户同币种双持仓等需人工核对的情形：保留现状，不阻断同步。
        result.warnings.push('旧货币基金条目认领跳过 ' + twin.symbol + '：' + String(error?.message || error).slice(0, 120))
      }
    }
    if (twins.length) hit = findInstrumentByIdentity(db, { ...resolution.ref, matchAliases: true })
    // 本地已命中 → 复用。
    if (hit) continue
    if (resolution.knownHit) {
      // 已知身份却在本地找不到条目（别名等价漂移等罕见情形）：宁可建一条待确认
      // 交人工处理，也不能静默绕过人工确认。
      const { instrument } = createCatalogInstrument(db, resolution.ref, options)
      instrument.verification = { status: 'pending', source: 'eastmoney', at: now(), reason: '已知身份未在本地命中，请重新确认或核验', candidates: [] }
      result.created++
      result.pending++
      continue
    }
    const { instrument, normalized } = createCatalogInstrument(db, resolution.ref, options)
    const status = applyResolution(instrument, normalized, resolution, now)
    result.created++
    if (result[status] !== undefined) result[status]++
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
 * 核验第一阶段（只联网、不写账本）：定位标的身份并查询公开目录。
 * 调用方在查询返回后必须重读账本，把结果交给 applyVerificationResult——
 * 查询期间账本可能被并发修改，整本回写旧副本会吞掉期间的其他变更。
 */
export async function verifyInstrumentRef(db, id, options = {}) {
  const instrument = db.instruments.find((i) => i.id === id)
  if (!instrument) throw new OpError('not-found', '标的不存在: ' + id)
  const ref = { symbol: instrument.symbol, market: instrument.market, assetClass: instrument.assetClass }
  const resolution = await resolveCatalogRef(ref, options)
  if (resolution.error) throw new OpError('bad-request', '核验查询失败：' + String(resolution.error?.message || resolution.error).slice(0, 120))
  return { id, ref, resolution }
}

/** 核验第二阶段（同步写）：只更新这一条标的的核验结果；标的已被删除则报 not-found。 */
export function applyVerificationResult(db, outcome, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  const instrument = db.instruments.find((i) => i.id === outcome.id)
  if (!instrument) throw new OpError('not-found', '标的不存在: ' + outcome.id)
  // 查询期间身份可能已被人工确认改掉：旧回包按过期的 ref 匹配会把股票档补成基金
  // 分类、甚至标成已核验。身份已漂移就作废这次结果，让用户重新查询。
  const refNow = catalogKey(instrument.symbol, instrument.market, instrument.assetClass)
  const refThen = catalogKey(outcome.ref.symbol, outcome.ref.market, outcome.ref.assetClass)
  if (refNow !== refThen) {
    throw new OpError('bad-request', '查询期间该标的的身份已被修改，本次核验结果已作废，请重新查询')
  }
  const normalized = normalizeSymbol(instrument.symbol, instrument.market)
  const status = applyResolution(instrument, normalized, outcome.resolution, now)
  instrument.updatedAt = now()
  return { instrument, status }
}

/** 单条便捷入口（测试用）：定位 → 联网 → 应用到同一账本。 */
export async function verifyInstrument(db, id, options = {}) {
  const outcome = await verifyInstrumentRef(db, id, options)
  return applyVerificationResult(db, outcome, options)
}

/**
 * 手工录入辅助：按代码或公司名称查公开目录，返回带资产类别的候选。
 * 供「添加持仓」表单和搜索接口使用；文件导入的批量核对仍走同步管线的入库核验。
 */
export async function searchCatalog(query, options = {}) {
  const found = await resolveSecurity(String(query || '').trim(), options)
  if (!found) return []
  return [candidateOf({
    symbol: found.symbol, market: found.market, name: found.name || '',
    fullName: null, securityType: found.securityType || null,
    fundType: null, sector: null, provider: 'eastmoney',
  })]
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
