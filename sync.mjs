// Persistent read-only source connections and host-owned refresh scheduling.
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { DATA_DIR, load, save, applyOp, summarize, OpError } from './store.mjs'
import { getConnectorStatus, normalizeSnapshot } from './connectors.mjs'
import { createCredentialStore, validateCredentials } from './credentials.mjs'
import { getConnector, timeoutMs, resolveAuthTransport, resolveSaveTransport, defaultFingerprintParts, endpoint, bad } from './connector-registry.mjs'
// 同花顺的登录/转账流程仍是独立流程，直接使用其适配器；其余来源一律经注册表分发。
import { listThsAccounts, scanThsTransfers } from './ths-client.mjs'
import { fetchNativeHistory } from './history-provider.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const keyOf = row => JSON.stringify([row.market, row.symbol, row.currency])

// 自动更新计划：宿主本地时间。daily = 每天 HH:MM，interval = 固定间隔分钟。
// 旧来源记录只有 intervalMinutes，tick 在缺少 schedule 时按它回退。
export const DEFAULT_DAILY_SCHEDULE = Object.freeze({ kind: 'daily', time: '21:00' })
const SCHEDULE_TIME = /^(\d{2}):(\d{2})$/
function validScheduleTime(value) {
  const match = SCHEDULE_TIME.exec(String(value ?? ''))
  if (!match) return false
  return Number(match[1]) <= 23 && Number(match[2]) <= 59
}
const scheduleInterval = value => {
  if (value === undefined || value === null || value === '') return undefined
  return Number(value)
}
// 读取时容错：坏掉的 schedule 不抛错，回退到 intervalMinutes 或默认每天 21:00。
export function normalizeSchedule(schedule, intervalMinutes) {
  if (plain(schedule)) {
    if (schedule.kind === 'daily' && validScheduleTime(schedule.time)) return { kind: 'daily', time: String(schedule.time) }
    if (schedule.kind === 'interval' && Number.isInteger(schedule.minutes) && schedule.minutes >= 0) return { kind: 'interval', minutes: schedule.minutes }
  }
  const interval = scheduleInterval(intervalMinutes)
  if (interval !== undefined && Number.isInteger(interval) && interval >= 0) return { kind: 'interval', minutes: interval }
  return { ...DEFAULT_DAILY_SCHEDULE }
}
// 写入时严格校验：非法输入明确报错（API 映射为 bad-request）。
// 兼容旧客户端：请求仍带 intervalMinutes 且与 schedule 冲突时，以 intervalMinutes 为准。
function resolveSchedule(input, previous) {
  if (input.schedule !== undefined && input.schedule !== null) {
    if (!plain(input.schedule)) throw bad('同步计划格式无效')
    if (input.schedule.kind === 'daily') {
      const time = String(input.schedule.time ?? '')
      if (!validScheduleTime(time)) throw bad('同步时间须为 HH:MM（00:00–23:59）')
      return { kind: 'daily', time }
    }
    if (input.schedule.kind === 'interval') {
      const minutes = Number(input.schedule.minutes)
      // 0 保留为旧版的「仅手动同步」，其余必须是非负整数。
      if (!Number.isInteger(minutes) || minutes < 0) throw bad('同步间隔须为 0 或正整数分钟')
      const legacy = scheduleInterval(input.intervalMinutes)
      if (legacy !== undefined) {
        if (!Number.isInteger(legacy) || (legacy !== 0 && (legacy < 5 || legacy > 1440))) throw bad('同步间隔须为 0，或 5 至 1440 分钟')
        if (legacy !== minutes) return { kind: 'interval', minutes: legacy }
      }
      return { kind: 'interval', minutes }
    }
    throw bad('同步计划类型无效，请选择每天定时或固定间隔')
  }
  const legacy = scheduleInterval(input.intervalMinutes)
  if (legacy !== undefined) {
    if (!Number.isInteger(legacy) || (legacy !== 0 && (legacy < 5 || legacy > 1440))) throw bad('同步间隔须为 0，或 5 至 1440 分钟')
    return { kind: 'interval', minutes: legacy }
  }
  if (previous) return normalizeSchedule(previous.schedule, previous.intervalMinutes)
  return { ...DEFAULT_DAILY_SCHEDULE }
}
const secretKey = /^(?:password|secret|token|api[_-]?key|cookie|authorization|access[_-]?token|refresh[_-]?token)$/i
function checkArgs(value) {
  if (!plain(value)) throw bad('工具参数必须是 JSON 对象')
  const inspect = node => {
    if (!node || typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      if (secretKey.test(key)) throw bad('连接参数不可保存密钥，请在宿主环境或 MCP 配置中设置凭据')
      inspect(child)
    }
  }
  inspect(value)
  if (JSON.stringify(value).length > 20000) throw bad('连接参数过长')
  return structuredClone(value)
}
const AUTH_CONFIG_FIELDS = ['host','port','tls','tradeEnvironment','tradeMarket','currency','gatewayUrl','trustLocalGateway','mcpEndpoint']
// A login can see many sub-accounts; these identify one of them and must never
// be treated as login-wide settings.
const AUTH_IDENTITY_FIELDS = ['portfolioId','thsBookType']
// These belong to the login, not to one sub-account; a re-authorization updates every source under it.
const AUTH_SHARED_FIELDS = ['host','port','tls','tradeEnvironment','tradeMarket','currency','gatewayUrl','trustLocalGateway','mcpEndpoint']
// A stored bearer token is sent wherever these point. A request body must never
// override them for an authorization-bound source, or a local caller could
// redirect the token. They may only change together with fresh credentials.
const AUTH_TARGET_FIELDS = ['mcpEndpoint','gatewayUrl','host','port','tls']
const stripTargets = value => Object.fromEntries(Object.entries(value || {}).filter(([key]) => !AUTH_TARGET_FIELDS.includes(key)))
/** Login-wide settings only: never let a stored authorization carry one sub-account's identity. */
const authWideConfig = auth => Object.fromEntries(Object.entries(auth?.config || {}).filter(([key]) => !AUTH_IDENTITY_FIELDS.includes(key)))

// 来源指纹：sha256(parts)。导出仅为固定测试；改变拼接内容会让已有来源被识别为新来源。
export function fingerprint(source, secrets = {}) {
  const entry = getConnector(source.connector)
  const parts = entry ? entry.fingerprintParts(source, secrets) : defaultFingerprintParts(source)
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

/**
 * One authorization is one login. Older source records predate this split, so each
 * becomes its own authorization and keeps its existing vault key (= source id).
 */
function legacyAuthorization(source) {
  const config = {}
  for (const key of AUTH_CONFIG_FIELDS) if (source[key] !== undefined && source[key] !== null) config[key] = source[key]
  const base = getConnector(source.connector)?.name || source.connector || '授权'
  return {
    id: String(source.authId || source.id),
    connector: source.connector,
    transport: source.transport,
    label: base + (source.name ? ' · ' + String(source.name).slice(0, 60) : ''),
    config,
    accounts: [],
    accountsFetchedAt: null,
    authorizedAt: source.updatedAt || null,
    lastError: null,
    legacy: true,
  }
}
function withLegacyAuthorizations(authorizations, sources) {
  const out = Array.isArray(authorizations) ? authorizations.filter(a => a && a.id) : []
  const have = new Set(out.map(a => a.id))
  for (const source of sources) {
    const id = source.authId || source.id
    if (!id || have.has(id)) continue
    out.push(legacyAuthorization({ ...source, id }))
    have.add(id)
  }
  return out
}

/** Uses a separate config file; credentials themselves are never persisted here. */
export function sourceStore(dir = DATA_DIR) {
  const file = join(dir, 'sources.json')
  const parseFile = () => {
    if (!existsSync(file)) return { version: 3, authorizations: [], sources: [] }
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const sources = Array.isArray(data) ? data : data?.sources
    if (!Array.isArray(sources)) throw bad('数据源配置文件损坏，请检查 sources.json')
    // 数组形式是 version 之前的旧文件；按 0 处理以走同一迁移。
    if (Array.isArray(data)) return { version: 0, authorizations: [], sources }
    return {
      version: Number.isInteger(data.version) ? data.version : 1,
      authorizations: Array.isArray(data.authorizations) ? data.authorizations : [],
      sources,
    }
  }
  const persist = (authorizations, sources) => {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    if (existsSync(file)) copyFileSync(file, file + '.bak')
    writeFileSync(file + '.tmp', JSON.stringify({ version: 3, authorizations, sources }, null, 2), { mode: 0o600 })
    renameSync(file + '.tmp', file)
    // Windows ignores POSIX modes; on other platforms keep the file (and its backup)
    // private because it now caches broker account ids and names.
    for (const path of [file, file + '.bak']) try { chmodSync(path, 0o600) } catch { /* file may not exist yet */ }
  }
  const readFile = () => {
    const raw = parseFile()
    // v2 → v3：用户要求把所有自动更新统一挪到每天 21:00。version ≥ 3 的文件原样信任。
    if (raw.version >= 3) return raw
    const sources = raw.sources.map(source => {
      const next = { ...source, schedule: { ...DEFAULT_DAILY_SCHEDULE } }
      delete next.intervalMinutes
      return next
    })
    try { persist(raw.authorizations, sources) } catch { /* 只读磁盘：迁移结果仍可在内存中使用 */ }
    return { version: 3, authorizations: raw.authorizations, sources }
  }
  return {
    read() { return readFile().sources },
    readAuths() { const { authorizations, sources } = readFile(); return withLegacyAuthorizations(authorizations, sources) },
    readAll() { const { authorizations, sources } = readFile(); return { authorizations: withLegacyAuthorizations(authorizations, sources), sources } },
    // Derived legacy records are read-time only: persisting them would freeze a
    // stale copy that later outlives edits to the source it came from.
    write(sources) { persist(readFile().authorizations, sources) },
    writeAuths(authorizations) { persist((authorizations || []).filter(a => a && a.id && !a.legacy), readFile().sources) },
  }
}

// v2 分段覆盖：快照 segment 使用资产类别键，etf 归入 stock 段查询。
const coverageSegment = assetClass => assetClass === 'etf' ? 'stock' : assetClass
// v2.4 信息性对账：来源汇总与快照持仓合计不一致时追加 info 警告（不阻断同步、不影响删除、不打成 partial）。
// 实测（2026-11-09，富途）：券商 totalAsset/netAssets 用实时估值，持仓接口的价格可能滞后数个百分点
// （6.2%），跨价源的推导差异不可能收敛到任何容差内——降级判断是适配器（同源数据，如 THS value 列）的
// 职责，核心对账只做提示。
const RECONCILE_ABS_TOLERANCE = 0.011
const reconcileTolerance = expected => Math.max(RECONCILE_ABS_TOLERANCE, Math.abs(expected) * 0.005)
function reconcileTotals(snapshot) {
  const totals = snapshot.sourceTotals
  if (!totals) return
  const warn = key => {
    const message = `来源汇总与持仓合计不一致(${key})`
    snapshot.warnings.push(`TOTAL_MISMATCH:${key}:${message}`)
    snapshot.warningDetails.push({ code:`TOTAL_MISMATCH:${key}`, severity:'info', message })
  }
  // 现金只有一个持仓行时才可对：现金行的 qty 就是金额。
  const cashRows = snapshot.holdings.filter(h=>h.assetClass === 'cash')
  if (typeof totals.cash === 'number' && cashRows.length === 1 && Math.abs(totals.cash - cashRows[0].qty) > reconcileTolerance(totals.cash)) warn('cash')
  // 总资产只在快照为单币种时可对：非现金行 qty×(manualPrice??avgCost)，现金行按 qty 累加。
  if (new Set(snapshot.holdings.map(h=>h.currency)).size !== 1) return
  const sum = snapshot.holdings.reduce((total, h) => {
    if (h.assetClass === 'cash') return total + h.qty
    const price = h.manualPrice ?? h.avgCost
    return price == null ? NaN : total + h.qty * price
  }, 0)
  if (!Number.isFinite(sum)) return
  for (const key of ['totalAsset','netAssets']) if (typeof totals[key] === 'number' && Math.abs(totals[key] - sum) > reconcileTolerance(totals[key])) warn(key)
}

/** Apply authoritative positions only to positions owned by this connection. */
export function mergeSnapshot(db, source, input) {
  const snapshot = normalizeSnapshot(input)
  if ((snapshot.sourceTotals?.totalLiability || 0) > 0) throw bad('目前自动同步仅支持无融资负债的现货账户')
  const staged = structuredClone(db)
  const account = staged.accounts.find(a=>a.id === source.accountId)
  if (!account) throw bad('绑定账户已删除，请重新选择账户')
  if (staged.holdings.some(h=>h.accountId === account.id && h.syncSourceId !== source.id)) throw bad('自动同步需要独立空账户；该账户包含手工或其他来源持仓')
  const seen = new Set()
  for (const row of snapshot.holdings) {
    const holdingKey = keyOf(row)
    const { holding } = applyOp(staged, 'holding.upsert', { holding: { ...row, accountId: account.id } })
    if (seen.has(holding.id)) throw bad('多个来源持仓映射到相同本地标的，请拆分账户')
    seen.add(holding.id)
    Object.assign(holding, { syncSourceId: source.id, externalHoldingKey: holdingKey, sourcePrice: row.manualPrice, sourceQueriedAt: snapshot.queriedAt, sourceUploadedAt: snapshot.uploadedAt, sourceQuoteDate: snapshot.quoteDate })
  }
  // v1 无 coverage：complete 才全量删除。v2 有 coverage：只有段落为 full 的消失持仓可删，
  // 标的缺失时无法判段，永不删除。
  const prunable = h => {
    if (!snapshot.coverage) return snapshot.complete
    const instrument = staged.instruments.find(i=>i.id === h.instrumentId)
    return instrument ? snapshot.coverage[coverageSegment(instrument.assetClass)] === 'full' : false
  }
  staged.holdings = staged.holdings.filter(h=>h.syncSourceId !== source.id || seen.has(h.id) || !prunable(h))
  if (snapshot.trades?.length) applyOp(staged, 'import.trades', { rows: snapshot.trades.map(t=>({...t, accountId: account.id, source: source.id})), source: source.id, applyHoldings: false })
  account.syncSourceId = source.id
  account.sourceTotals = snapshot.sourceTotals || null
  account.sourceQueriedAt = snapshot.queriedAt
  account.sourceUploadedAt = snapshot.uploadedAt
  account.sourceQuoteDate = snapshot.quoteDate
  reconcileTotals(snapshot)
  return { ledger: staged, snapshot, imported: seen.size }
}

/**
 * 快照内容哈希：只取持仓经济字段（按市场/代码/币种排序），不含时间戳、警告或汇总。
 * 内容相同的旧快照不是陈旧数据——重新并入不会丢失任何持仓，可用于修复被时间水位卡住的来源。
 */
export function snapshotContentHash(snapshot) {
  const rows = snapshot.holdings
    .map(h => [h.market, h.symbol, h.currency, h.assetClass, h.qty, h.avgCost, h.manualPrice])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]))
    .map(([, symbol, , assetClass, qty, avgCost, manualPrice]) => [assetClass, symbol, qty, avgCost, manualPrice])
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

/**
 * 账本侧内容哈希：与 snapshotContentHash 相同的行语义（assetClass, symbol, qty, avgCost, manualPrice），
 * 符号/市场/币种/资产类别取自标的，价格取上次并入的快照价 sourcePrice。
 * 用于识别「时间戳倒退、但内容正是已保存数据」的重放快照，修复被水位卡死的来源。
 */
export function ledgerContentHash(db, sourceId) {
  const rows = db.holdings
    .filter(h => h.syncSourceId === sourceId)
    .map(h => {
      const instrument = db.instruments.find(i => i.id === h.instrumentId) || {}
      return [instrument.market, instrument.symbol, h.currency ?? instrument.currency, instrument.assetClass, h.qty, h.avgCost, h.sourcePrice]
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])) || String(a[2]).localeCompare(String(b[2])))
    .map(([, symbol, , assetClass, qty, avgCost, manualPrice]) => [assetClass, symbol, qty, avgCost, manualPrice])
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}
// 两个日期取较晚者（空值视为未知）；水位只能前进。
const latestDate = (stored, incoming) => !stored ? incoming ?? null : !incoming ? stored : Date.parse(incoming) >= Date.parse(stored) ? incoming : stored

function unwrapToolResult(result) {
  if (result?.isError) throw bad('MCP 读取工具返回错误，账本未更新')
  if (result?.value !== undefined) return unwrapToolResult(result.value)
  if (result?.structuredContent) return result.structuredContent
  if (Array.isArray(result?.content)) {
    const text = result.content.filter(x=>x.type === 'text').map(x=>x.text).join('\n')
    try { return JSON.parse(text) } catch { throw bad('MCP 工具必须返回标准快照 JSON') }
  }
  return result
}

export function createSyncService(ctx, options = {}) {
  const config = options.config || sourceStore()
  const vault = options.credentials || createCredentialStore()
  const readLedger = options.load || load, writeLedger = options.save || save
  const now = options.now || (()=>Date.now())
  const httpFetch = options.fetch || globalThis.fetch
  const inFlight = new Map(), importing = new Map(), aborts = new Set()
  let disposed = false, tickBusy = false
  const iso = () => new Date(now()).toISOString()
  const connectors = () => getConnectorStatus(ctx)
  const authList = () => config.readAuths ? config.readAuths() : config.readAll ? config.readAll().authorizations : []
  const authById = id => {
    const found = authList().find(a => a.id === id)
    if (found) return found
    const source = config.read().find(s => s.id === id)
    return source ? legacyAuthorization({ ...source, id }) : null
  }
  const persistAuths = next => {
    if (config.writeAuths) return config.writeAuths(next)
    if (config.writeAll) return config.writeAll({ authorizations: next, sources: config.read() })
  }
  function updateAuth(id, changes) {
    const all = authList(), index = all.findIndex(a => a.id === id)
    if (index < 0) throw bad('授权不存在')
    const current = all[index]
    // A legacy record is only synthesised from its source at read time. Materialise
    // it before storing a change so renames and cached accounts actually persist.
    all[index] = { ...current, ...changes, ...(current.legacy ? { legacy: false, createdAt: current.createdAt || iso() } : {}), updatedAt: iso() }
    persistAuths(all)
    return all[index]
  }
  const list = () => {
    const sources = config.read().map(s=>{
      const authId = s.authId || s.id
      return {...s, authId, credentialsConfigured:vault.configured(authId,s.connector), ...(s.lastStatus === 'syncing' && !inFlight.has(s.id) ? {lastStatus:'error',lastError:'上次同步中断，可重新同步'} : {}), syncing:inFlight.has(s.id)}
    })
    const authorizations = authList().map(a=>({
      ...a,
      // IB 与 OpenD 在账本之外完成认证；其他登录需要库里保存的凭据。
      credentialsConfigured: getConnector(a.connector)?.credentialsAlwaysConfigured?.(a.transport) ? true : vault.configured(a.id,a.connector),
      status: a.lastError ? 'error' : a.authorizedAt ? 'authorized' : 'ready',
      sources: sources.filter(s=>s.authId === a.id).map(s=>({ id:s.id, name:s.name, accountId:s.accountId, intervalMinutes:s.intervalMinutes, schedule:s.schedule, enabled:s.enabled, lastStatus:s.lastStatus, lastSuccessAt:s.lastSuccessAt, portfolioId:s.portfolioId, brokerAccountId:s.brokerAccountId, thsBookType:s.thsBookType })),
    }))
    return { sources, authorizations, connectors: connectors() }
  }
  function secretsFor(source, credentials = {}) {
    const authId = source.authId || source.id
    if (source.authId) {
      const auth = authById(source.authId)
      if (!auth) throw bad('授权不存在')
      if (auth.connector !== source.connector) throw bad('授权与连接来源不匹配')
    } else if (source.id) {
      const saved = config.read().find(s=>s.id === source.id)
      if (!saved || saved.connector !== source.connector) throw bad('连接来源与已保存配置不匹配')
    }
    const saved = vault.get(authId)
    const typed = validateCredentials(source.connector, credentials)
    // 浏览器/设备码流程的暂存槽：保存的 token 字段缺失时才合并，避免旧流程覆盖新凭据。
    const pending = getConnector(source.connector)?.auth
    return {
      ...(pending?.pendingSlot && pending.pendingFields.every(field => !saved[field]) ? vault.get(pending.pendingSlot) : {}),
      ...saved, ...typed,
    }
  }
  const AUTH_ERROR = /\b401\b|授权|未授权|失效|过期|expired|unauthori[sz]ed|invalid token|re-?auth/i
  // Sub-accounts of one login share a rotating refresh token; coalesce refreshes
  // so two concurrent syncs do not invalidate each other.
  const refreshing = new Map()
  async function refreshSecrets(source, secrets) {
    // 只有注册了续期函数的 MCP transport（富途/且慢/老虎）才自动续期。
    const auth = getConnector(source.connector)?.transports[source.transport]?.auth
    if (!auth?.refresh) return null
    if (!secrets.refreshToken || !secrets.clientId) return null
    const owner = source.authId || source.id
    let work = refreshing.get(owner)
    if (!work) {
      work = (async () => {
        const token = await auth.refresh({ refreshToken: secrets.refreshToken, clientId: secrets.clientId, signal: AbortSignal.timeout(20000) })
        if (!token || !token.accessToken) return null
        const fields = auth.tokenFields(token)
        vault.set(owner, source.connector, fields)
        if (source.authId) { try { updateAuth(source.authId, { authorizedAt: iso(), lastError: null }) } catch { /* refreshed token is still usable */ } }
        return fields
      })().finally(() => refreshing.delete(owner))
      refreshing.set(owner, work)
    }
    const fields = await work.catch(() => null)
    return fields ? { ...secrets, ...fields } : null
  }
  async function withAuthRefresh(source, fn, initialSecrets) {
    const secrets = initialSecrets || secretsFor(source)
    try { return await fn(secrets) }
    catch (error) {
      if (!AUTH_ERROR.test(String(error?.message || error))) throw error
      let refreshed = null, refreshError = null
      try { refreshed = await refreshSecrets(source, secrets) } catch (refreshFailure) { refreshError = refreshFailure }
      if (!refreshed) {
        // Surface why renewal failed so "凭据无效" never hides a broken refresh token.
        if (refreshError) throw new Error(String(error?.message || error) + '；自动续期失败：' + String(refreshError?.message || refreshError))
        throw error
      }
      return await fn(refreshed)
    }
  }
  const withFutuAuth = withAuthRefresh
  // ---- 银证转账回扫（asset_change 二分定位到日）----
  // 首次全历史深扫必须显式触发（scanThsTransfersDeep，可能要几分钟）；
  // 已有游标的账户随每次同步做小预算增量——新转账只会出现在已扫区间之后，
  // 二分从最新端进入，通常 1–3 个请求就能收尾，不轮询、不重扫已知区间。
  const transferEventsOf = (db, accountId) => (db.historyEvents || []).filter(e => e.accountId === accountId && e.source === 'ths-asset-change').map(e => ({ date: e.date, direction: e.kind === 'deposit' ? 'in' : 'out', amount: Math.abs(e.cashAmount) }))
  const transferScanBook = source => ({ portfolioId: source.portfolioId, thsBookType: String(source.thsBookType || 'common') })
  async function applyTransferScan(db, accountId, scan) {
    if (!scan.events.length) return { imported: 0, duplicates: 0 }
    const result = applyOp(db, 'transfers.import', { accountId, rows: scan.events, cursor: { coveredFrom: scan.coveredFrom, complete: scan.complete, scannedAt: iso(), requests: scan.requests } })
    writeLedger(db)
    return { imported: result.imported, duplicates: result.duplicates }
  }
  async function syncThsTransfers(source, signal) {
    if (source.connector !== 'ths' || String(source.thsBookType || 'common') !== 'common') return null
    const db = readLedger()
    const account = db.accounts.find(a => a.id === source.accountId)
    const coveredFrom = account?.transferScan?.coveredFrom
    if (!coveredFrom) return null
    const scan = await scanThsTransfers(transferScanBook(source), secretsFor(source), { from: coveredFrom, maxRequests: 40, delayMs: 200, found: transferEventsOf(db, account.id) }, signal)
    const applied = await applyTransferScan(db, account.id, scan)
    return { ...applied, requests: scan.requests, complete: scan.complete, warnings: scan.warnings }
  }
  async function scanThsTransfersDeep(accountId, { maxRequests } = {}) {
    if (disposed) throw bad('同步服务已停止')
    const source = config.read().find(s => s.accountId === accountId && s.connector === 'ths')
    if (!source) throw bad('该账户没有绑定同花顺股票账本来源')
    if (String(source.thsBookType || 'common') !== 'common') throw bad('基金账本的资金流动是申购/赎回口径，没有银行转账可回扫')
    const db = readLedger()
    if (!db.accounts.some(a => a.id === accountId)) throw bad('账户不存在: ' + accountId)
    const coveredFrom = db.accounts.find(a => a.id === accountId)?.transferScan?.coveredFrom
    const from = coveredFrom || '2000-01-01'
    const abort = new AbortController(); aborts.add(abort)
    const timer = setTimeout(() => abort.abort(new Error('回扫超时')), 600000); timer.unref?.()
    try {
      const scan = await scanThsTransfers(transferScanBook(source), secretsFor(source), { from, maxRequests: Math.min(2000, Math.max(20, Number(maxRequests) || 600)), delayMs: 250, found: transferEventsOf(db, accountId) }, abort.signal)
      if (disposed || abort.signal.aborted) throw bad('回扫已中止')
      const applied = await applyTransferScan(db, accountId, scan)
      return { accountId, from, to: scan.to, ...applied, requests: scan.requests, complete: scan.complete, coveredFrom: scan.coveredFrom, totals: scan.totals, warnings: scan.warnings }
    } catch (error) {
      let message = String(error?.message || error || '')
      try { for (const value of Object.values(vault.get(source.authId || source.id) || {})) if (value && String(value).length > 3) message = message.split(String(value)).join('[已隐藏]') } catch { /* keep message */ }
      throw bad('银证转账回扫失败：' + message)
    } finally { clearTimeout(timer); aborts.delete(abort) }
  }
  function existingImport(source, secrets) {
    const key = fingerprint(source,secrets)
    return config.read().find(s=>s.connector === source.connector && (s.transport === 'native' || s.transport === 'mcp') && (s.remoteFingerprint || fingerprint(s,vault.get(s.authId || s.id))) === key)
  }
  async function listAccounts(input, credentials = {}) {
    if (!plain(input)) throw bad('请选择独立账户连接来源')
    let source = { ...input }
    if (input.authId) {
      const auth = authById(input.authId)
      if (!auth) throw bad('授权不存在')
      // The authorization owns where its token goes; a request body must never move it.
      const moved = AUTH_TARGET_FIELDS.filter(key => input[key] !== undefined && String(input[key]) !== String((auth.config || {})[key] ?? ''))
      // 需要本机网关的来源（富途原生，带 listPrecheck）单独提示 OpenD 限制。
      const authEntry = getConnector(auth.connector), localGateway = (authEntry?.transports[auth.transport] || authEntry?.transports[authEntry?.defaultTransport])?.listPrecheck
      if (moved.length) throw bad(localGateway
        ? '富途账户读取须指向本机 OpenD；连接地址由授权统一管理'
        : '连接地址由授权统一管理，请重新授权后再修改')
      source = { ...source, ...authWideConfig(auth), connector: auth.connector, transport: auth.transport, authId: auth.id }
      delete source.id
    }
    const entry = getConnector(source.connector)
    if (!entry) throw bad('请选择独立账户连接来源')
    // 读取凭据前的来源校验（富途原生只能连本机 OpenD）。
    ;(entry.transports[source.transport] || entry.transports[entry.defaultTransport]).listPrecheck?.(source)
    const secrets = secretsFor(source, credentials), signal = AbortSignal.timeout(timeoutMs('list', source.transport))
    const load = async (current) => {
      // 长桥重复连接：保存了 appKey 用原生 SDK，只有 MCP token 时走官方 MCP。
      const resolved = entry.resolveTransport ? entry.resolveTransport(source, current) : source.transport
      const transport = entry.transports[resolved] || entry.transports[entry.defaultTransport]
      const result = options.listAccounts
        ? await options.listAccounts(source,current,signal)
        : await transport.listAccounts(source,current,signal)
      if (!Array.isArray(result.accounts)) throw bad('来源未返回有效账户列表')
      return result
    }
    const result = await withFutuAuth(source, load, secrets)
    if (source.authId) {
      try {
        const current = authById(source.authId)
        const patch = {
          accounts: result.accounts.map(a=>({ id:String(a.id), name:a.name || String(a.id), currency:a.currency || null, thsType:a.thsType || null, broker:a.broker || null })),
          accountsFetchedAt: iso(),
          lastError: null,
        }
        // First discovery gives a bare "富途" authorization a recognisable identity.
        if (current && (!current.label || current.label === getConnector(current.connector)?.name) && result.accounts[0]?.name) patch.label = (getConnector(current.connector)?.name || current.connector) + ' · ' + String(result.accounts[0].name).slice(0, 80)
        updateAuth(source.authId, patch)
      } catch { /* discovery stays usable even if the cache cannot be written */ }
    }
    const db = readLedger()
    return { ...result, accounts:result.accounts.filter(a=>!entry.filterAccountsByEnvironment || !source.tradeEnvironment || !a.tradeEnvironment || a.tradeEnvironment === source.tradeEnvironment).map(a=>{
      const candidate = {...source,[entry.accountIdField]:String(a.id),...(entry.bookTypeFromList ? {thsBookType:a.thsType || 'common'} : {})}
      const imported = existingImport(candidate,secrets), account = imported && db.accounts.find(x=>x.id === imported.accountId)
      return {...a,imported:!!imported,sourceId:imported?.id || null,accountId:account?.id || null,accountName:account?.name || null}
    }) }
  }
  async function acceptThsLogin(target, cookie) {
    const secrets = validateCredentials('ths',{cookie})
    if (target) {
      const source = config.read().find(s=>s.id === target && s.connector === 'ths')
      const auth = source ? null : authById(target)
      if (auth) {
        if (auth.connector !== 'ths') throw bad('待重新登录的授权不是同花顺')
        const signal = AbortSignal.timeout(45000)
        const probe = { ...(auth.config||{}), connector:'ths', transport:'native', authId:auth.id }
        const result = options.listAccounts ? await options.listAccounts(probe,secrets,signal) : await listThsAccounts(probe,secrets,signal)
        const bound = config.read().filter(s=>(s.authId || s.id) === target && s.connector === 'ths')
        const missing = bound.find(s=>!result.accounts.some(a=>String(a.id) === String(s.portfolioId) && String(a.thsType || 'common') === String(s.thsBookType || 'common')))
        if (missing) throw bad('新登录账号不包含已绑定账本，请为新账号创建授权')
        vault.set(target,'ths',secrets)
        updateAuth(target,{authorizedAt:iso(),lastError:null})
        clearReauthForAuth(target,'ths')
      } else if (source) {
        const signal = AbortSignal.timeout(45000)
        const result = options.listAccounts ? await options.listAccounts(source,secrets,signal) : await listThsAccounts(source,secrets,signal)
        if (!result.accounts.some(a=>String(a.id) === String(source.portfolioId) && String(a.thsType || 'common') === String(source.thsBookType || 'common'))) throw bad('新登录账号不包含已绑定账本，请为新账号创建连接')
        vault.set(source.id,'ths',secrets)
        updateRecord(source.id,{configRevision:randomUUID(),lastStatus:'never',lastError:null,lastAttemptAt:null,needsReauth:false,failCount:0})
      } else throw bad('待重新登录的同花顺连接不存在')
    }
    vault.set('pending-ths','ths',secrets)
  }
  async function createAuthorization(input = {}, credentials = {}) {
    if (!plain(input)) throw bad('缺少授权信息')
    const connector = String(input.connector || '')
    const entry = getConnector(connector)
    if (!entry) throw bad('该来源不需要登录授权')
    const transport = resolveAuthTransport(connector, input.transport)
    const transportImpl = entry.transports[transport]
    const all = authList()
    const existing = input.authId ? all.find(a => a.id === input.authId) : null
    if (input.authId && !existing) throw bad('授权不存在')
    if (existing && existing.connector !== connector) throw bad('授权与来源不匹配')
    if (existing && existing.transport !== transport) {
      const bound = config.read().filter(s => (s.authId || s.id) === existing.id)
      if (bound.length) throw bad('该授权下已有导入账户，不能切换接入方式；请新建授权')
    }
    const authSettings = { ...authWideConfig(existing), ...transportImpl.authConfig({ ...authWideConfig(existing), ...(input.config || {}), ...input }) }
    const id = existing?.id || 'AUTH_'+randomUUID()
    const typed = validateCredentials(connector, credentials)
    // A browser flow can belong to one specific login. Only a brand-new authorization may
    // consume the unscoped slot; an existing one needs a token captured for its own id.
    const pendingSpec = entry.auth?.pendingSlot && entry.auth.pendingTransports.includes(transport) ? entry.auth : null
    const pending = !pendingSpec ? {}
      : pendingSpec.pendingScope === 'scoped'
        ? (existing ? vault.get(pendingSpec.pendingSlot + ':' + existing.id) : vault.get(pendingSpec.pendingSlot))
        : existing ? {} : vault.get(pendingSpec.pendingSlot)
    const saved = existing ? vault.get(id) : {}
    // A fresh browser token must win over the stored one, otherwise "重新授权"
    // keeps using a possibly revoked credential.
    const secrets = { ...saved, ...pending, ...typed }
    // Connection settings decide where the stored token is sent. They may only
    // change together with fresh credentials, which are verified against the
    // bound sub-accounts below.
    if (existing && entry.configRequiresReauth && !Object.keys(typed).length && !Object.keys(pending).length) {
      const before = existing.config || {}
      if (AUTH_TARGET_FIELDS.some(key => (before[key] ?? null) !== (authSettings[key] ?? null))) throw bad('修改登录的连接地址需要重新授权并验证账户')
    }
    const invalid = transportImpl.auth?.validate?.(secrets)
    if (invalid) throw bad(invalid)
    if (existing && connector === 'ths') {
      const bound = config.read().filter(s => (s.authId || s.id) === id && s.connector === 'ths')
      if (bound.length) {
        const probe = { ...(existing.config || {}), connector:'ths', transport:'native', authId:id }
        const signal = AbortSignal.timeout(45000)
        const result = options.listAccounts ? await options.listAccounts(probe,secrets,signal) : await listThsAccounts(probe,secrets,signal)
        const missing = bound.find(s => !result.accounts.some(a => String(a.id) === String(s.portfolioId) && String(a.thsType || 'common') === String(s.thsBookType || 'common')))
        if (missing) throw bad('新登录账号不包含已绑定账本，请为新账号创建授权')
      }
    }
    // A fresh Futu/Longbridge token can belong to a different login. Do not silently
    // repoint an authorization that already has imported sub-accounts.
    if (existing && (Object.keys(pending).length || Object.keys(typed).length) && transport === 'mcp' && transportImpl.auth?.reprobeBound) {
      const bound = config.read().filter(s => (s.authId || s.id) === id)
      if (bound.length) {
        const probe = { ...authSettings, connector, transport:'mcp', authId:id }
        const signal = AbortSignal.timeout(180000)
        const result = options.listAccounts ? await options.listAccounts(probe,secrets,signal) : await transportImpl.listAccounts(probe,secrets,signal)
        const missing = bound.find(s => !result.accounts.some(a => String(a.id) === String(s[entry.accountIdField])))
        if (missing) throw bad('新授权不包含已绑定的账户，请为新账号创建授权')
      }
    }
    if (Object.keys(secrets).length) vault.set(id, connector, secrets)
    // 新授权落地后清掉它的暂存槽（未绑定 id 的槽 + 本授权 scoped 槽）。
    const pendingCleanup = entry.auth?.pendingSlot ? (entry.auth.pendingScope === 'new-only' ? [entry.auth.pendingSlot] : [entry.auth.pendingSlot, entry.auth.pendingSlot + ':' + id]) : []
    for (const slot of pendingCleanup) vault.remove(slot)
    const auth = {
      ...(existing || {}),
      id,
      connector,
      transport,
      label: String(input.label || existing?.label || entry.name + (input.name ? ' · ' + String(input.name).slice(0,60) : '')).slice(0,120),
      config: authSettings,
      accounts: existing?.accounts || [],
      accountsFetchedAt: existing?.accountsFetchedAt || null,
      authorizedAt: iso(),
      lastError: null,
      legacy: false,
      createdAt: existing?.createdAt || iso(),
      updatedAt: iso(),
    }
    // Re-read before writing: account probes above can take minutes, and another
    // rename/remove may have landed meanwhile.
    persistAuths(authList().filter(a => a.id !== id).concat(auth))
    if (existing) syncSourceConfigFromAuth(id, authSettings)
    clearReauthForAuth(id, connector)
    return { auth, ...list() }
  }
  function syncSourceConfigFromAuth(authId, settings) {
    const all = config.read()
    let changed = false
    for (const source of all) {
      if ((source.authId || source.id) !== authId) continue
      let touched = false
      for (const key of AUTH_SHARED_FIELDS) {
        if (settings[key] === undefined) {
          if (source[key] !== undefined) { delete source[key]; touched = true }
        } else if (source[key] !== settings[key]) {
          source[key] = settings[key]; touched = true
        }
      }
      if (touched) { source.configRevision = randomUUID(); changed = true }
    }
    if (changed) config.write(all)
  }
  async function listAuthAccounts(authId, credentials = {}) {
    const auth = authById(authId)
    if (!auth) throw bad('授权不存在')
    try {
      return await listAccounts({ ...(auth.config || {}), connector:auth.connector, transport:auth.transport, authId:auth.id }, credentials)
    } catch (error) {
      let message = String(error?.message || error)
      for (const value of Object.values(vault.get(authId) || {})) if (value && String(value).length > 3) message = message.split(String(value)).join('[已隐藏]')
      try { updateAuth(authId, { lastError: message.slice(0, 500) }) } catch { /* keep the original failure */ }
      throw error
    }
  }
  function renameAuthorization(authId, label) {
    const value = String(label || '').trim()
    if (!value || value.length > 120) throw bad('授权名称须为 1–120 字')
    updateAuth(authId, { label: value })
    return list()
  }
  function removeAuthorization(authId) {
    const auth = authById(authId)
    if (!auth) throw bad('授权不存在')
    const bound = config.read().filter(s => (s.authId || s.id) === authId)
    if (bound.length) throw bad('该授权下还有 ' + bound.length + ' 个已导入账户，请先移除这些账户')
    persistAuths(authList().filter(a => a.id !== authId))
    vault.remove(authId)
    return list()
  }
  function updateRecord(id, changes) {
    const all = config.read(), index = all.findIndex(s=>s.id === id)
    if (index < 0) throw bad('数据源不存在')
    all[index] = {...all[index], ...changes}; config.write(all); return all[index]
  }
  // 重新授权成功后，清除该登录下所有来源的 needsReauth，让 tick 恢复调度。
  // legacy 来源（无 authId）一一对应旧记录：按 id 相同且连接器一致归属。
  function clearReauthForAuth(authId, connector) {
    const all = config.read()
    let changed = false
    for (const source of all) {
      const bound = source.authId ? source.authId === authId : source.id === authId && source.connector === connector
      if (bound && source.needsReauth) { delete source.needsReauth; changed = true }
    }
    if (changed) config.write(all)
  }
  function saveSource(input, credentials = {}, transaction = {}) {
    if (!plain(input)) throw bad('缺少 source 配置')
    for (const field of ['cookie','websocketKey','appKey','appSecret','accessToken','bearerToken']) if (field in input) throw bad('认证信息须通过独立 credentials 字段提交')
    const incomingSecrets = validateCredentials(input.connector,credentials)
    const all = config.read(), previousConfig = structuredClone(all), previous = input.id ? all.find(s=>s.id === input.id) : null
    if (input.id && !previous) throw bad('数据源不存在')
    if (previous && inFlight.has(previous.id)) throw bad('正在同步，请完成后再修改连接')
    if (input.connector !== 'custom' && !getConnector(input.connector)) throw bad('不支持的数据源')
    if (previous && previous.connector !== input.connector) throw bad('已有连接不可更换来源，请新建连接')
    let auth = null
    const targetAuthId = input.authId || previous?.authId
    if (targetAuthId) {
      auth = authById(targetAuthId)
      if (!auth) throw bad('授权不存在')
      if (auth.connector !== input.connector) throw bad('授权与连接来源不匹配')
      // Connection settings live on a real authorization; legacy one-to-one records still
      // accept edits because they were created from the source record itself.
      if (!auth.legacy) input = { ...stripTargets(input), ...authWideConfig(auth) }
    }
    const db = transaction.ledger || readLedger(), account = db.accounts.find(a=>a.id === input.accountId)
    if (!account) throw bad('请选择已创建的本地账户')
    const owner = previous?.id || transaction.sourceId
    if (db.holdings.some(h=>h.accountId === account.id && (!owner || h.syncSourceId !== owner)) || (!previous && db.trades.some(t=>t.accountId === account.id && (!owner || t.source !== owner)))) throw bad('此账户不是独立空账户，包含其他记录')
    if (all.some(s=>s.id !== previous?.id && s.accountId === account.id)) throw bad('该账户已绑定其他数据源')
    if (previous && previous.accountId !== account.id) throw bad('已有连接不可更换绑定账户，请新增连接')
    const schedule = resolveSchedule(input, previous)
    const inputInterval = scheduleInterval(input.intervalMinutes)
    const interval = schedule.kind === 'interval' ? schedule.minutes : inputInterval
    if (typeof input.enabled !== 'boolean') throw bad('enabled 必须为布尔值')
    const sourceEntry = getConnector(input.connector)
    const source = { ...(previous || {}), id:previous?.id || transaction.sourceId || 'SRC_'+randomUUID(), name:String(input.name || '').trim(), connector:input.connector, transport:resolveSaveTransport(input.connector, input.transport), accountId:account.id, ...(auth?.id || input.authId || previous?.authId ? { authId: auth?.id || input.authId || previous?.authId } : {}), ...(interval !== undefined ? { intervalMinutes: interval } : {}), schedule, enabled:input.enabled, configRevision:randomUUID(), updatedAt:iso() }
    // 来源切换到每天定时后，删掉不再对应的旧 intervalMinutes。
    if (interval === undefined) delete source.intervalMinutes
    if (!source.name || source.name.length > 120) throw bad('请输入不超过 120 字的数据源名称')
    delete source.url; delete source.toolName; delete source.args; delete source.credentialRef; delete source.portfolioId; delete source.thsBookType; delete source.mcpEndpoint; delete source.gatewayUrl; delete source.trustLocalGateway
    if (sourceEntry) {
      const transportImpl = sourceEntry.transports[source.transport]
      if (!transportImpl) throw bad('请选择 API 或 MCP 连接方式')
      if (sourceEntry.accountIdField === 'brokerAccountId') {
        source.brokerAccountId = String(input.brokerAccountId || '').trim()
        if (!source.brokerAccountId) throw bad('请明确选择券商账户或通道')
      }
      Object.assign(source, transportImpl.sourceFields(input, { account, source }))
    } else if (source.transport === 'http') {
      source.url = endpoint(input.url)
      const ref = String(input.credentialRef || '').trim()
      if (ref && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref)) throw bad('凭据引用只能填写环境变量名称')
      if (ref) source.credentialRef = ref
    } else if (source.transport === 'mcp') {
      source.toolName = String(input.toolName || '').trim()
      if (!/^mcp__.+__(?:get_|read_|list_)?(?:stock_)?(?:positions|holdings|portfolio_snapshot|account_snapshot|snapshot)$/.test(source.toolName)) throw bad('请选择只读快照 MCP 工具，如 mcp__broker__get_positions 或 mcp__broker__get_portfolio_snapshot')
      source.args = checkArgs(input.args || {})
    } else throw bad('请选择 API 或 MCP 连接方式')
    if (source.connector === 'ths' && all.some(s=>s.id !== source.id && s.connector === 'ths' && s.portfolioId === source.portfolioId && String(s.thsBookType || 'common') === source.thsBookType)) throw bad('该同花顺账本已绑定，重复连接会重复计算资产')
    const accountIdentity = s => JSON.stringify([s.connector,s.thsBookType || 'common',s.portfolioId,s.brokerAccountId,s.tradeEnvironment,s.tradeMarket])
    if (previous && source.transport === 'native' && accountIdentity(previous) !== accountIdentity(source) && db.holdings.some(h=>h.syncSourceId === source.id)) throw bad('已有持仓的连接不可更换来源账户或市场；请为新账户创建独立连接')
    const identity = s => JSON.stringify([s.connector,s.transport,s.thsBookType || 'common',s.portfolioId,s.url,s.toolName,s.args,s.credentialRef,s.brokerAccountId,s.host,s.port,s.tls,s.tradeEnvironment,s.tradeMarket,s.currency,s.gatewayUrl,s.trustLocalGateway,s.mcpEndpoint])
    if (previous && identity(previous) !== identity(source) && db.holdings.some(h=>h.syncSourceId === source.id)) throw bad('已有持仓的连接不可更换来源标识或端点；请创建独立连接')
    if (previous && (identity(previous) !== identity(source) || Object.keys(incomingSecrets).length)) {
      Object.assign(source, {lastStatus:'never',lastSuccessAt:null,lastAttemptAt:null,lastError:null,warnings:[],warningDetails:[],coverage:null,queriedAt:null,uploadedAt:null,quoteDate:null,needsReauth:false,failCount:0,...(identity(previous) !== identity(source) ? {uploadedAtWatermark:null,quoteDateWatermark:null} : {uploadedAtWatermark:previous.uploadedAtWatermark || previous.uploadedAt || null,quoteDateWatermark:previous.quoteDateWatermark || previous.quoteDate || null})})
    }
    if (!previous) { source.lastStatus = 'never'; all.push(source) }
    else all[all.indexOf(previous)] = source
    if (transaction.snapshot) {
      const s = transaction.snapshot
      // v2.3：只有 degraded 警告或覆盖不完整才标 partial，纯 info 警告保持 ok。
      const degraded = (s.warningDetails || []).some(d => d.severity === 'degraded')
      Object.assign(source,{remoteFingerprint:transaction.fingerprint,lastAttemptAt:iso(),lastSuccessAt:iso(),lastStatus:degraded || !s.complete ? 'partial' : 'ok',lastError:null,warnings:s.warnings,warningDetails:s.warningDetails,coverage:s.coverage ?? null,queriedAt:s.queriedAt,uploadedAt:s.uploadedAt,quoteDate:s.quoteDate,uploadedAtWatermark:s.uploadedAt,quoteDateWatermark:s.quoteDate,complete:s.complete,imported:s.holdings.length})
    }
    const credentialOwner = source.authId || source.id
    const storedSecrets = { ...vault.get(credentialOwner), ...incomingSecrets }
    const capture = sourceEntry?.auth
    if (capture?.captureOnSave && capture.pendingFields.every(field => !storedSecrets[field])) Object.assign(storedSecrets,vault.get(capture.pendingSlot))
    if (Object.keys(storedSecrets).length) vault.set(credentialOwner,source.connector,storedSecrets)
    try {
      config.write(all)
      if (transaction.ledger) writeLedger(transaction.ledger)
    } catch (error) {
      if (transaction.ledger) {
        try { config.write(previousConfig) } catch { /* preserve original persistence failure */ }
        if (!previous && !source.authId) try { vault.remove(credentialOwner) } catch { /* source was new and never published successfully */ }
      }
      throw error
    }
    return list()
  }
  function connectSource(input, credentials = {}) {
    if (disposed) return Promise.reject(bad('账户导入服务已停止'))
    if (!plain(input)) return Promise.reject(bad('请选择支持登录导入的来源'))
    if (input.authId) {
      const auth = authById(input.authId)
      if (!auth) return Promise.reject(bad('授权不存在，请重新授权'))
      // Never let a request body move where this login's token is sent.
      const moved = AUTH_TARGET_FIELDS.filter(key => input[key] !== undefined && String(input[key]) !== String((auth.config || {})[key] ?? ''))
      if (moved.length) return Promise.reject(bad('连接地址由授权统一管理，请重新授权后再修改'))
      input = { ...authWideConfig(auth), ...input, connector: auth.connector, transport: auth.transport, authId: auth.id }
      delete input.id
    }
    const entry = getConnector(input.connector)
    if (!entry) return Promise.reject(bad('请选择支持登录导入的来源'))
    if (input.id) return Promise.reject(bad('已导入账户请通过编辑保存，无需重新导入'))
    const remoteId = input[entry.accountIdField]
    if (typeof remoteId !== 'string' || !remoteId.trim()) return Promise.reject(bad('请先登录并明确选择一个来源账户'))
    // 同花顺专属：账本类型归一。
    if (input.connector === 'ths') {
      const bookType = input.thsBookType === undefined || input.thsBookType === null || input.thsBookType === '' ? 'common' : String(input.thsBookType)
      if (!['common','manFund','ijj'].includes(bookType)) return Promise.reject(bad('同花顺账本类型无效'))
      input = {...input,thsBookType:bookType}
    }
    // 长桥 / 且慢 MCP 接入：无 brokerAccountId 时固定为 'main'（单一账户）。
    if (entry.defaults?.accountId && (input.transport === 'mcp' || !input.brokerAccountId)) input = {...input,brokerAccountId:String(input.brokerAccountId || entry.defaults.accountId)}
    let secrets
    try { secrets = secretsFor(input,credentials) } catch (error) { return Promise.reject(error) }
    const key = fingerprint(input,secrets)
    if (importing.has(key)) return importing.get(key)
    const resultFor = (source,created=false) => {
      const ledger = readLedger(), account = ledger.accounts.find(a=>a.id === source.accountId)
      if (!account) throw bad('此来源已导入，但本地账户已删除；请移除旧来源后重新导入')
      return {...list(),source,account,created,alreadyImported:!created,ledger,summary:summarize(ledger)}
    }
    const run = async () => {
      const previous = existingImport(input,secrets)
      if (previous) return resultFor(previous)
      const abort = new AbortController(); aborts.add(abort)
      const timer = setTimeout(()=>abort.abort(), timeoutMs('connect', input.transport));timer.unref?.()
      try {
        const found = await listAccounts({...input,transport:(input.transport === 'mcp' ? 'mcp' : 'native')},credentials)
        const selected = found.accounts.filter(a=>String(a.id) === remoteId)
        if (selected.length !== 1) throw bad('所选账户不属于当前登录或选择不唯一，请重新读取来源账户')
        if (disposed || abort.signal.aborted) throw bad('账户导入已中止')
        const duplicate = existingImport(input,secrets)
        if (duplicate) return resultFor(duplicate)
        const ledger = readLedger(), sourceId = 'SRC_'+randomUUID()
        const name = String(selected[0].name || remoteId).trim().slice(0,120) || remoteId
        const currency = entry.connectCurrency(input, selected[0], ledger.baseCurrency)
        if (!/^[A-Z]{3}$/.test(currency)) throw bad('来源账户币种无效，导入未保存')
        const {account} = applyOp(ledger,'account.upsert',{name,type:'broker',currency,note:'从'+entry.name+'导入'})
        account.externalAccountId = remoteId;account.connector = input.connector
        // 新导入未指定计划时由 saveSource 默认成每天 21:00。
        const sourceInput = {...input,name:String(input.name || entry.name+' · '+name).trim(),accountId:account.id,transport:(input.transport === 'mcp' ? 'mcp' : 'native'),enabled:input.enabled !== false}
        // 先建账户与来源，再尝试首次读取：上游慢或临时失败时账户照常出现，错误显示在账户上，由自动同步/手动同步重试。
        let staged = ledger, snapshot = null, firstError = null
        try {
          const raw = await fetchSnapshot({...input,transport:(input.transport === 'mcp' ? 'mcp' : 'native')},abort.signal,secrets)
          if (disposed || abort.signal.aborted) throw bad('账户导入已中止')
          const merged = mergeSnapshot(ledger,{...sourceInput,id:sourceId},raw)
          staged = merged.ledger; snapshot = merged.snapshot
        } catch (error) {
          if (disposed || abort.signal.aborted) throw error
          firstError = String(error?.message || error)
        }
        saveSource(sourceInput,secrets,{ledger:staged,sourceId,snapshot,fingerprint:key})
        if (firstError) updateRecord(sourceId,{lastStatus:'error',lastError:firstError,lastAttemptAt:iso()})
        const result = resultFor(config.read().find(s=>s.id === sourceId),true)
        if (firstError) result.syncError = '账户已创建，但首次读取持仓失败：'+firstError+'。可点账户上的「同步」重试，或等待自动同步。'
        return result
      } finally {clearTimeout(timer);aborts.delete(abort)}
    }
    const work = Promise.resolve().then(run).finally(()=>importing.delete(key))
    importing.set(key,work);return work
  }
  function removeSource(id) {
    if (inFlight.has(id)) throw bad('正在同步，暂不能移除')
    const all = config.read(), source = all.find(s=>s.id === id)
    if (!source) throw bad('数据源不存在')
    // Keep ledger data. Remove ownership so the remaining records become manual.
    const db = readLedger()
    for (const h of db.holdings) if (h.syncSourceId === id) { delete h.syncSourceId; delete h.externalHoldingKey }
    for (const a of db.accounts) if (a.syncSourceId === id) delete a.syncSourceId
    writeLedger(db)
    const remaining = all.filter(s=>s.id !== id)
    config.write(remaining)
    const owner = source.authId || id, auth = authById(owner)
    const stillUsed = remaining.some(s => (s.authId || s.id) === owner)
    // A real authorization stays after its last account is removed so the other
    // sub-accounts can still be imported; a legacy one-to-one record goes away.
    if (!stillUsed && (!auth || auth.legacy)) {
      vault.remove(owner)
      if (auth) persistAuths(authList().filter(a => a.id !== owner))
    }
    return list()
  }
  async function fetchSnapshot(source, signal, suppliedSecrets) {
    if (options.fetchSnapshot) return options.fetchSnapshot(source, signal, suppliedSecrets)
    // 注册表来源（含 futu/longbridge 的 MCP transport）由独立适配器读取；custom 才走宿主 MCP 工具。
    const entry = getConnector(source.connector)
    if (entry) {
      const secrets = suppliedSecrets || secretsFor(source)
      const transport = entry.transports[source.transport] || entry.transports[entry.defaultTransport]
      return withAuthRefresh(source, current => transport.fetchSnapshot(source, current, signal), secrets)
    }
    if (source.transport === 'http') {
      const headers = { accept:'application/json' }
      if (source.credentialRef) {
        const value = process.env[source.credentialRef]
        if (!value) throw bad('未找到配置的凭据环境变量')
        headers.authorization = 'Bearer '+value
      }
      const response = await httpFetch(endpoint(source.url), { method:'GET',headers,signal,redirect:'error' })
      if (!response.ok) throw bad('快照 API 返回 HTTP '+response.status)
      const text = await response.text()
      if (text.length > 5_000_000) throw bad('快照响应过大')
      return JSON.parse(text)
    }
    if (options.callTool) return unwrapToolResult(await options.callTool(source.toolName, source.args, signal))
    const tools = ctx.get?.('tools')
    if (!tools?.get || !tools?.execute || !tools.get(source.toolName)) throw bad('找不到已注册的 MCP 快照工具，请先配置 MCP 或改用快照 API')
    // Use the public executor so host guards and policies remain in force.
    const result = await tools.execute({ name:source.toolName,arguments:source.args || {},signal,callId:'wealth-sync-'+randomUUID() })
    return unwrapToolResult(result)
  }
  async function runSync(id) {
    const source = config.read().find(s=>s.id === id)
    if (!source) throw bad('数据源不存在')
    const revision = source.configRevision
    updateRecord(id, { lastAttemptAt:iso(), lastStatus:'syncing',lastError:null })
    const abort = new AbortController(); aborts.add(abort)
    const timer = setTimeout(()=>abort.abort(new Error('同步超时')), timeoutMs('sync', source.transport)); timer.unref?.()
    try {
      const input = await fetchSnapshot(source, abort.signal)
      if (disposed || abort.signal.aborted) throw bad('同步已中止')
      const current = config.read().find(s=>s.id === id)
      if (!current || current.configRevision !== revision) throw bad('连接配置已变化，请重新同步')
      const db = readLedger()
      const { ledger, snapshot, imported } = mergeSnapshot(db, current, input)
      const contentHash = snapshotContentHash(snapshot)
      const uploadWatermark = current.uploadedAtWatermark || current.uploadedAt, quoteWatermark = current.quoteDateWatermark || current.quoteDate
      const stale = (uploadWatermark && snapshot.uploadedAt && Date.parse(snapshot.uploadedAt) < Date.parse(uploadWatermark)) || (quoteWatermark && snapshot.quoteDate && Date.parse(snapshot.quoteDate) < Date.parse(quoteWatermark))
      // 内容完全相同的旧快照可以安全重放（水位被 trans_date 等时间字段污染时用它自愈）；
      // 与账本已保存内容一致的重放同样接受（时间倒退但数据没变）；
      // 内容有变化时时间倒退仍然拒绝。
      if (stale && current.snapshotHash !== contentHash && ledgerContentHash(db, id) !== contentHash) {
        // 先持久化本次观测到的哈希——连续两次相同内容即视为当前真相，
        // 否则水位高于所有可达日期的来源永远无法自愈。
        updateRecord(id, { snapshotHash: contentHash, lastStatus:'error', lastError:'来源数据时间早于已保存快照，已保留原数据' })
        throw bad('来源数据时间早于已保存快照，已保留原数据')
      }
      writeLedger(ledger)
      // v2.3：仅 degraded 警告或覆盖不完整才标 partial，纯 info 警告保持 ok。
      const degraded = snapshot.warningDetails.some(d => d.severity === 'degraded')
      const updated = updateRecord(id, { lastSuccessAt:iso(),lastStatus:degraded || !snapshot.complete ? 'partial' : 'ok',lastError:null,warnings:snapshot.warnings,warningDetails:snapshot.warningDetails,coverage:snapshot.coverage ?? null,uploadedAt:snapshot.uploadedAt,quoteDate:snapshot.quoteDate,uploadedAtWatermark:latestDate(uploadWatermark,snapshot.uploadedAt),quoteDateWatermark:latestDate(quoteWatermark,snapshot.quoteDate),queriedAt:snapshot.queriedAt,imported,complete:snapshot.complete,snapshotHash:contentHash,needsReauth:false,failCount:0 })
      // 深扫过的账户随同步增量收尾新转账；失败或未开通游标都不影响本次持仓结果。
      let transferScan = null
      try { transferScan = await syncThsTransfers(current, abort.signal) } catch (error) { transferScan = { error: String(error?.message || error).slice(0, 200) } }
      return { source:updated,ledger,summary:summarize(ledger),imported,transferScan }
    } catch (error) {
      // Adapter messages are curated and safe; still redact every known secret
      // before the message reaches the browser or sources.json.
      let message = String(error?.message || error || '').trim()
      try {
        for (const value of Object.values(vault.get(source.authId || source.id) || {})) if (value && String(value).length > 3) message = message.split(String(value)).join('[已隐藏]')
      } catch { /* vault unavailable; keep the message */ }
      const ref = source.credentialRef && process.env[source.credentialRef]
      if (ref) message = message.split(ref).join('[已隐藏]')
      if (abort.signal.aborted) message = '同步超时或已中止：' + message
      // 认证类失败（对脱敏后的消息判定）：停止自动轮询直到重新授权或一次成功；不计入退避。
      // 其余失败：failCount +1，供 tick 指数退避。空消息的通用提示含「授权」二字，只是
      // 排查建议，不能作为认证失败的判定依据。
      const authFailed = message !== '' && AUTH_ERROR.test(message)
      if (!message) message = '同步失败，请检查连接、授权及快照格式'
      if (authFailed) updateRecord(id, {lastStatus:'error',lastError:message,needsReauth:true})
      else updateRecord(id, {lastStatus:'error',lastError:message,failCount:(source.failCount || 0) + 1})
      throw bad(message)
    } finally { clearTimeout(timer);aborts.delete(abort) }
  }
  function sync(id) {
    if (disposed) return Promise.reject(bad('同步服务已停止'))
    if (inFlight.has(id)) return inFlight.get(id)
    const work = Promise.resolve().then(()=>runSync(id)).finally(()=>inFlight.delete(id))
    inFlight.set(id,work); return work
  }
  async function readHistory(accountId, range) {
    if (disposed) throw bad('同步服务已停止')
    const source = config.read().find(s=>s.accountId === accountId)
    const transport = source ? getConnector(source.connector)?.transports[source.transport] : null
    if (!transport?.fetchHistory) throw bad('此来源请通过账单文件补充历史流水')
    const guard = transport.auth?.historyGuard
    if (guard) { const message = guard(secretsFor(source)); if (message) throw bad(message) }
    const revision = source.configRevision, abort = new AbortController()
    aborts.add(abort)
    // MCP sources are slow per call (5–20s) and history spans several markets + paged cash logs.
    const timer = setTimeout(()=>abort.abort(), timeoutMs('history', source.transport)); timer.unref?.()
    try {
      const result = await withAuthRefresh(source, current => (options.fetchHistory || fetchNativeHistory)(source,current,range,abort.signal), secretsFor(source))
      const current = config.read().find(s=>s.id===source.id)
      if (disposed || abort.signal.aborted) throw bad('历史读取已中止，请缩小日期范围后重试')
      if (!current || current.configRevision !== revision) throw bad('来源配置已变化，请重新读取历史流水')
      return result
    } catch (error) {
      if (error instanceof OpError) throw bad(error.message)
      let detail = String(error?.message || '').slice(0, 200)
      for (const secret of Object.values(secretsFor(source) || {})) if (secret && String(secret).length > 3) detail = detail.split(String(secret)).join('[已隐藏]')
      throw bad('历史成交读取失败' + (detail ? '：' + detail : '') + '。可稍后重试，或使用账单文件补录')
    } finally {clearTimeout(timer);aborts.delete(abort)}
  }
  // 固定间隔的失败退避：连续失败后到期间隔缩短为 min(minutes, 5*2^(failCount-1)) 分钟
  // （首次 5 分钟，之后逐次翻倍），永不超过配置的间隔；成功清零后回到完整间隔。
  // 例外：服务端限流（HTTP 429/限流）不能提前重试——越快撞墙越严重，必须等满配置间隔。
  const RATE_LIMIT = /\b429\b|限流|rate.?limit|too many requests/i
  const dueMinutes = (source, minutes) => (source.failCount >= 1 && !RATE_LIMIT.test(String(source.lastError || '')))
    ? Math.min(minutes, 5 * 2 ** (source.failCount - 1)) : minutes
  // 每天定时：以「最近一次 HH:MM」为水位，错过就补同步（应用关闭时跨过 21:00，下次 tick 立即补）。
  const latestDailyOccurrence = (at, time) => {
    const [hours, minutes] = String(time).split(':').map(Number)
    const occurrence = new Date(at)
    occurrence.setHours(hours, minutes, 0, 0)
    if (occurrence.getTime() > at) occurrence.setDate(occurrence.getDate() - 1)
    return occurrence.getTime()
  }
  const dailyDue = (source, schedule) => {
    const at = now()
    const last = Date.parse(source.lastAttemptAt || '')
    const occurrence = latestDailyOccurrence(at, schedule.time)
    if (!Number.isFinite(last) || last < occurrence) return true
    // 提前重试只覆盖今天已经到点、并且失败发生在该定时点之后的那一轮。
    // 定时点之前的失败（手动同步，或白天留下的 failCount）等到今天的 HH:MM，不在白天连打。
    const occurrenceIsToday = new Date(occurrence).toDateString() === new Date(at).toDateString()
    if (occurrenceIsToday && source.failCount >= 1 && !RATE_LIMIT.test(String(source.lastError || ''))) {
      const retry = Math.min(120, 5 * 2 ** (source.failCount - 1)) * 60000
      return at - last >= retry
    }
    return false
  }
  async function tick() {
    if (disposed || tickBusy) return
    tickBusy = true
    try {
      // 周六/周日休市不自动同步；来源可用 syncWeekends 显式退出（为加密资产账户预留）。
      // 每天定时由用户明确选择时间，不受周末规则影响。
      const day = new Date(now()).getDay(), weekend = day === 0 || day === 6
      const due = config.read().filter(source => {
        if (!source.enabled || inFlight.has(source.id)) return false
        if (source.needsReauth) return false // 认证失效：只等手动同步或重新授权
        const schedule = normalizeSchedule(source.schedule, source.intervalMinutes)
        if (schedule.kind === 'daily') return dailyDue(source, schedule)
        if (!(schedule.minutes > 0)) return false // 0 = 仅手动同步
        if (weekend && source.syncWeekends !== true) return false
        const last = Date.parse(source.lastAttemptAt || '')
        if (Number.isFinite(last) && now()-last < dueMinutes(source, schedule.minutes)*60000) return false
        return true
      })
      // 同一连接器串行（一条链），跨连接器并行；一条 MCP 卡住不再拖住其他来源。
      // tick 等全部链结束才返回；disposed 后不再发起新同步。
      const chains = new Map()
      for (const source of due) {
        const run = async () => {
          if (disposed) return
          try { await sync(source.id) } catch { /* failure retained on source; retried after backoff */ }
        }
        const prev = chains.get(source.connector) || Promise.resolve()
        chains.set(source.connector, prev.catch(() => {}).then(run))
      }
      await Promise.all(chains.values())
    } finally { tickBusy=false }
  }
  return { list,saveSource,removeSource,sync,tick,listAccounts,listAuthAccounts,createAuthorization,renameAuthorization,removeAuthorization,connectSource,acceptThsLogin,readHistory,scanThsTransfers:scanThsTransfersDeep,listThsPortfolios:async()=>{const r=await listAccounts({connector:'ths'});return {portfolios:r.accounts.map(a=>({...a,selected:false})),warnings:r.warnings||[]}},dispose() { disposed=true; for (const controller of aborts) controller.abort() } }
}
