// Persistent read-only source connections and host-owned refresh scheduling.
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { DATA_DIR, load, save, applyOp, summarize, OpError } from './store.mjs'
import { getConnectorStatus, normalizeSnapshot } from './connectors.mjs'
import { createCredentialStore, validateCredentials } from './credentials.mjs'
import { listThsAccounts, fetchStandaloneThsSnapshot } from './ths-client.mjs'
import { listFutuAccounts, fetchFutuSnapshot, fetchLongbridgeSnapshot } from './brokers-sdk.mjs'
import { listLongbridgeMcpAccounts, fetchLongbridgeMcpSnapshot } from './lb-mcp.mjs'
import { listFutuMcpAccounts, fetchFutuMcpSnapshot, refreshFutuToken } from './futu-mcp.mjs'
import { listIbAccounts, fetchIbSnapshot } from './ib-client.mjs'
import { fetchNativeHistory } from './history-provider.mjs'

const bad = message => new OpError('bad-request', message)
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const keyOf = row => JSON.stringify([row.market, row.symbol, row.currency])
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
function endpoint(raw) {
  let url
  try { url = new URL(raw) } catch { throw bad('请输入有效的快照 API 地址') }
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw bad('API 仅支持 HTTPS 或本机 HTTP 桥接')
  if (url.username || url.password || url.hash || [...url.searchParams.keys()].some(k=>secretKey.test(k))) throw bad('API 地址不能包含凭据或片段，请使用环境变量引用')
  return url.href
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
const CONNECTOR_NAME = { ths:'同花顺', futu:'富途', longbridge:'长桥', ib:'IB' }
const stripTargets = value => Object.fromEntries(Object.entries(value || {}).filter(([key]) => !AUTH_TARGET_FIELDS.includes(key)))
/** Login-wide settings only: never let a stored authorization carry one sub-account's identity. */
const authWideConfig = auth => Object.fromEntries(Object.entries(auth?.config || {}).filter(([key]) => !AUTH_IDENTITY_FIELDS.includes(key)))
/** Normalise an MCP endpoint without letting credentials or secret query keys into sources.json. */
function mcpEndpointUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  let url
  try { url = new URL(value) } catch { throw bad('MCP 地址须为有效的 http(s):// URL') }
  if (!['http:','https:'].includes(url.protocol)) throw bad('MCP 地址须以 http(s):// 开头')
  if (url.username || url.password || url.hash || [...url.searchParams.keys()].some(key => secretKey.test(key))) throw bad('MCP 地址不能包含凭据或片段')
  return url.href.replace(/\/+$/,'')
}

/**
 * One authorization is one login. Older source records predate this split, so each
 * becomes its own authorization and keeps its existing vault key (= source id).
 */
function legacyAuthorization(source) {
  const config = {}
  for (const key of AUTH_CONFIG_FIELDS) if (source[key] !== undefined && source[key] !== null) config[key] = source[key]
  const base = CONNECTOR_NAME[source.connector] || source.connector || '授权'
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

/** Validate and keep only the non-secret connection settings that belong to a login. */
function authConfig(connector, transport, raw = {}) {
  const out = {}
  if (connector === 'ths') return out
  if (connector === 'futu' && transport === 'mcp') {
    const mcpEndpoint = mcpEndpointUrl(raw.mcpEndpoint)
    if (mcpEndpoint) out.mcpEndpoint = mcpEndpoint
    const currency = String(raw.currency || '').toUpperCase()
    if (currency) { if (!/^[A-Z]{3}$/.test(currency)) throw bad('富途资金币种无效'); out.currency = currency }
    return out
  }
  if (connector === 'futu') {
    out.host = String(raw.host || '127.0.0.1').trim()
    if (!['127.0.0.1','localhost','::1'].includes(out.host)) throw bad('富途连接须指向本机 OpenD')
    out.port = Number(raw.port || 33333)
    if (!Number.isInteger(out.port) || out.port < 1 || out.port > 65535) throw bad('OpenD 端口无效')
    out.tls = raw.tls === true
    out.tradeEnvironment = ['SIMULATE','REAL'].includes(String(raw.tradeEnvironment || '').toUpperCase()) ? String(raw.tradeEnvironment).toUpperCase() : 'REAL'
    out.tradeMarket = ['HK','US','CN'].includes(String(raw.tradeMarket || '').toUpperCase()) ? String(raw.tradeMarket).toUpperCase() : 'HK'
    out.currency = ['HKD','USD','CNH'].includes(String(raw.currency || '').toUpperCase()) ? String(raw.currency).toUpperCase() : 'HKD'
    return out
  }
  if (connector === 'longbridge' && transport === 'mcp') {
    const mcpEndpoint = mcpEndpointUrl(raw.mcpEndpoint)
    if (mcpEndpoint) {
      if (mcpEndpoint.endsWith('/agent')) throw bad('长桥 MCP 地址不能是授权端点 /agent')
      out.mcpEndpoint = mcpEndpoint
    }
    return out
  }
  if (connector === 'ib') {
    out.gatewayUrl = endpoint(raw.gatewayUrl || 'https://localhost:5000/v1/api').replace(/\/$/,'')
    out.trustLocalGateway = raw.trustLocalGateway === true
    return out
  }
  return out
}

/** Uses a separate config file; credentials themselves are never persisted here. */
export function sourceStore(dir = DATA_DIR) {
  const file = join(dir, 'sources.json')
  const readFile = () => {
    if (!existsSync(file)) return { authorizations: [], sources: [] }
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const sources = Array.isArray(data) ? data : data?.sources
    if (!Array.isArray(sources)) throw bad('数据源配置文件损坏，请检查 sources.json')
    return { authorizations: Array.isArray(data.authorizations) ? data.authorizations : [], sources }
  }
  const writeFile = (authorizations, sources) => {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    if (existsSync(file)) copyFileSync(file, file + '.bak')
    writeFileSync(file + '.tmp', JSON.stringify({ version: 2, authorizations, sources }, null, 2), { mode: 0o600 })
    renameSync(file + '.tmp', file)
    // Windows ignores POSIX modes; on other platforms keep the file (and its backup)
    // private because it now caches broker account ids and names.
    for (const path of [file, file + '.bak']) try { chmodSync(path, 0o600) } catch { /* file may not exist yet */ }
  }
  return {
    read() { return readFile().sources },
    readAuths() { const { authorizations, sources } = readFile(); return withLegacyAuthorizations(authorizations, sources) },
    readAll() { const { authorizations, sources } = readFile(); return { authorizations: withLegacyAuthorizations(authorizations, sources), sources } },
    // Derived legacy records are read-time only: persisting them would freeze a
    // stale copy that later outlives edits to the source it came from.
    write(sources) { writeFile(readFile().authorizations, sources) },
    writeAuths(authorizations) { const { sources } = readFile(); writeFile((authorizations || []).filter(a => a && a.id && !a.legacy), sources) },
  }
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
  if (snapshot.complete) staged.holdings = staged.holdings.filter(h=>h.syncSourceId !== source.id || seen.has(h.id))
  if (snapshot.trades?.length) applyOp(staged, 'import.trades', { rows: snapshot.trades.map(t=>({...t, accountId: account.id, source: source.id})), source: source.id, applyHoldings: false })
  account.syncSourceId = source.id
  account.sourceTotals = snapshot.sourceTotals || null
  account.sourceQueriedAt = snapshot.queriedAt
  account.sourceUploadedAt = snapshot.uploadedAt
  account.sourceQuoteDate = snapshot.quoteDate
  return { ledger: staged, snapshot, imported: seen.size }
}

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
      // IB and OpenD authenticate outside the vault; the other logins need a saved secret.
      credentialsConfigured: a.connector === 'ib' || (a.connector === 'futu' && a.transport !== 'mcp') ? true : vault.configured(a.id,a.connector),
      status: a.lastError ? 'error' : a.authorizedAt ? 'authorized' : 'ready',
      sources: sources.filter(s=>s.authId === a.id).map(s=>({ id:s.id, name:s.name, accountId:s.accountId, intervalMinutes:s.intervalMinutes, enabled:s.enabled, lastStatus:s.lastStatus, lastSuccessAt:s.lastSuccessAt, portfolioId:s.portfolioId, brokerAccountId:s.brokerAccountId, thsBookType:s.thsBookType })),
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
    return { ...(source.connector === 'ths' && !saved.cookie ? vault.get('pending-ths') : {}), ...(source.connector === 'futu' && !saved.mcpToken ? vault.get('pending-futu-mcp') : {}), ...saved, ...typed }
  }
  const AUTH_ERROR = /\b401\b|授权|未授权|失效|过期|expired|unauthori[sz]ed|invalid token|re-?auth/i
  // Sub-accounts of one login share a rotating refresh token; coalesce refreshes
  // so two concurrent syncs do not invalidate each other.
  const refreshing = new Map()
  async function refreshFutuSecrets(source, secrets) {
    if (source.connector !== 'futu' || source.transport !== 'mcp') return null
    if (!secrets.refreshToken || !secrets.clientId) return null
    const owner = source.authId || source.id
    let work = refreshing.get(owner)
    if (!work) {
      work = (async () => {
        const token = await refreshFutuToken({ refreshToken: secrets.refreshToken, clientId: secrets.clientId, signal: AbortSignal.timeout(20000) })
        if (!token || !token.accessToken) return null
        const fields = { mcpToken: token.accessToken }
        if (token.refreshToken) fields.refreshToken = token.refreshToken
        vault.set(owner, 'futu', fields)
        if (source.authId) { try { updateAuth(source.authId, { authorizedAt: iso(), lastError: null }) } catch { /* refreshed token is still usable */ } }
        return fields
      })().finally(() => refreshing.delete(owner))
      refreshing.set(owner, work)
    }
    const fields = await work.catch(() => null)
    return fields ? { ...secrets, ...fields } : null
  }
  async function withFutuAuth(source, fn, initialSecrets) {
    const secrets = initialSecrets || secretsFor(source)
    try { return await fn(secrets) }
    catch (error) {
      if (!AUTH_ERROR.test(String(error?.message || ''))) throw error
      let refreshed = null
      try { refreshed = await refreshFutuSecrets(source, secrets) } catch { /* surface the original auth error */ }
      if (!refreshed) throw error
      return await fn(refreshed)
    }
  }
  function fingerprint(source, secrets = {}) {
    const remoteId = source.connector === 'ths' ? source.portfolioId : source.brokerAccountId
    // 股票账本保持旧指纹（4 段），基金账本追加账本类型避免与同号股票账本混淆。
    const parts = [source.connector,String(remoteId || ''),source.connector === 'futu' ? source.tradeEnvironment || 'REAL' : '',source.connector === 'longbridge' ? secrets.appKey || '' : '']
    const bookType = source.connector === 'ths' ? String(source.thsBookType || 'common') : ''
    if (bookType && bookType !== 'common') parts.push(bookType)
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
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
      if (moved.length) throw bad(auth.connector === 'futu' && auth.transport !== 'mcp'
        ? '富途账户读取须指向本机 OpenD；连接地址由授权统一管理'
        : '连接地址由授权统一管理，请重新授权后再修改')
      source = { ...source, ...authWideConfig(auth), connector: auth.connector, transport: auth.transport, authId: auth.id }
      delete source.id
    }
    if (!['ths','futu','longbridge','ib'].includes(source.connector)) throw bad('请选择独立账户连接来源')
    if (source.connector === 'futu' && source.transport !== 'mcp') {
      if (!['127.0.0.1','localhost','::1'].includes(String(source.host || '127.0.0.1'))) throw bad('富途账户读取须指向本机 OpenD')
      const port = Number(source.port || 33333)
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw bad('OpenD 端口无效')
    }
    const secrets = secretsFor(source, credentials), signal = AbortSignal.timeout(source.transport === 'mcp' ? 180000 : 45000)
    const load = async (current) => {
      let result
      if (options.listAccounts) result = await options.listAccounts(source,current,signal)
      else if (source.connector === 'ths') result = await listThsAccounts(source,current,signal)
      else if (source.connector === 'futu' && source.transport === 'mcp') result = await listFutuMcpAccounts(source,current,signal)
      else if (source.connector === 'futu') result = await listFutuAccounts(source,current,signal)
      else if (source.connector === 'ib') result = await listIbAccounts(source,current,signal)
      else if (source.connector === 'longbridge' && (source.transport === 'mcp' || !current.appKey && current.mcpToken)) result = await listLongbridgeMcpAccounts(source,current,signal)
      else {
        const sdk = await import('./brokers-sdk.mjs')
        if (!sdk.listLongbridgeAccounts) throw bad('请读取并选择长桥账户通道')
        result = await sdk.listLongbridgeAccounts(source,current,signal)
      }
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
        if (current && (!current.label || current.label === CONNECTOR_NAME[current.connector]) && result.accounts[0]?.name) patch.label = (CONNECTOR_NAME[current.connector] || current.connector) + ' · ' + String(result.accounts[0].name).slice(0, 80)
        updateAuth(source.authId, patch)
      } catch { /* discovery stays usable even if the cache cannot be written */ }
    }
    const db = readLedger()
    return { ...result, accounts:result.accounts.filter(a=>source.connector !== 'futu' || !source.tradeEnvironment || !a.tradeEnvironment || a.tradeEnvironment === source.tradeEnvironment).map(a=>{
      const candidate = {...source,[source.connector === 'ths' ? 'portfolioId' : 'brokerAccountId']:String(a.id),...(source.connector === 'ths' ? {thsBookType:a.thsType || 'common'} : {})}
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
      } else if (source) {
        const signal = AbortSignal.timeout(45000)
        const result = options.listAccounts ? await options.listAccounts(source,secrets,signal) : await listThsAccounts(source,secrets,signal)
        if (!result.accounts.some(a=>String(a.id) === String(source.portfolioId) && String(a.thsType || 'common') === String(source.thsBookType || 'common'))) throw bad('新登录账号不包含已绑定账本，请为新账号创建连接')
        vault.set(source.id,'ths',secrets)
        updateRecord(source.id,{configRevision:randomUUID(),lastStatus:'never',lastError:null,lastAttemptAt:null})
      } else throw bad('待重新登录的同花顺连接不存在')
    }
    vault.set('pending-ths','ths',secrets)
  }
  async function createAuthorization(input = {}, credentials = {}) {
    if (!plain(input)) throw bad('缺少授权信息')
    const connector = String(input.connector || '')
    if (!['ths','futu','longbridge','ib'].includes(connector)) throw bad('该来源不需要登录授权')
    const transport = ['ths','ib'].includes(connector) ? 'native' : (input.transport === 'mcp' ? 'mcp' : 'native')
    const all = authList()
    const existing = input.authId ? all.find(a => a.id === input.authId) : null
    if (input.authId && !existing) throw bad('授权不存在')
    if (existing && existing.connector !== connector) throw bad('授权与来源不匹配')
    if (existing && existing.transport !== transport) {
      const bound = config.read().filter(s => (s.authId || s.id) === existing.id)
      if (bound.length) throw bad('该授权下已有导入账户，不能切换接入方式；请新建授权')
    }
    const authSettings = { ...authWideConfig(existing), ...authConfig(connector, transport, { ...authWideConfig(existing), ...(input.config || {}), ...input }) }
    const id = existing?.id || 'AUTH_'+randomUUID()
    const typed = validateCredentials(connector, credentials)
    // A browser flow can belong to one specific login. Only a brand-new
    // authorization may consume the unscoped slot; an existing one needs a
    // pending token that was captured for its own id, so a stale flow for a
    // different login can never replace a valid token.
    const pending = connector === 'futu' && transport === 'mcp'
      ? (existing ? vault.get('pending-futu-mcp:' + existing.id) : vault.get('pending-futu-mcp'))
      : existing ? {} : (connector === 'ths' ? vault.get('pending-ths') : {})
    const saved = existing ? vault.get(id) : {}
    // A fresh browser token must win over the stored one, otherwise "重新授权"
    // keeps using a possibly revoked credential.
    const secrets = { ...saved, ...pending, ...typed }
    // Connection settings decide where the stored token is sent. They may only
    // change together with fresh credentials, which are verified against the
    // bound sub-accounts below.
    if (existing && ['futu','longbridge'].includes(connector) && transport === 'mcp' && !Object.keys(typed).length && !Object.keys(pending).length) {
      const before = existing.config || {}
      if (AUTH_TARGET_FIELDS.some(key => (before[key] ?? null) !== (authSettings[key] ?? null))) throw bad('修改登录的连接地址需要重新授权并验证账户')
    }
    if (connector === 'ths' && !secrets.cookie) throw bad('请先完成同花顺浏览器登录')
    if (connector === 'futu' && transport === 'mcp' && !secrets.mcpToken) throw bad('请先完成富途浏览器授权')
    if (connector === 'longbridge' && transport === 'mcp' && !secrets.mcpToken) throw bad('请先兑换长桥授权码')
    if (connector === 'longbridge' && transport !== 'mcp' && !(secrets.appKey && secrets.appSecret && secrets.accessToken)) throw bad('请填写长桥 App Key / App Secret / Access Token')
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
    if (existing && (Object.keys(pending).length || Object.keys(typed).length) && transport === 'mcp' && (connector === 'futu' || connector === 'longbridge')) {
      const bound = config.read().filter(s => (s.authId || s.id) === id)
      if (bound.length) {
        const probe = { ...authSettings, connector, transport:'mcp', authId:id }
        const signal = AbortSignal.timeout(180000)
        const result = options.listAccounts ? await options.listAccounts(probe,secrets,signal) : connector === 'futu' ? await listFutuMcpAccounts(probe,secrets,signal) : await listLongbridgeMcpAccounts(probe,secrets,signal)
        const missing = bound.find(s => !result.accounts.some(a => String(a.id) === String(s.connector === 'ths' ? s.portfolioId : s.brokerAccountId)))
        if (missing) throw bad('新授权不包含已绑定的账户，请为新账号创建授权')
      }
    }
    if (Object.keys(secrets).length) vault.set(id, connector, secrets)
    if (connector === 'ths') vault.remove('pending-ths')
    if (connector === 'futu') { vault.remove('pending-futu-mcp'); vault.remove('pending-futu-mcp:' + id) }
    const auth = {
      ...(existing || {}),
      id,
      connector,
      transport,
      label: String(input.label || existing?.label || CONNECTOR_NAME[connector] + (input.name ? ' · ' + String(input.name).slice(0,60) : '')).slice(0,120),
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
  function saveSource(input, credentials = {}, transaction = {}) {
    if (!plain(input)) throw bad('缺少 source 配置')
    for (const field of ['cookie','websocketKey','appKey','appSecret','accessToken','bearerToken']) if (field in input) throw bad('认证信息须通过独立 credentials 字段提交')
    const incomingSecrets = validateCredentials(input.connector,credentials)
    const all = config.read(), previousConfig = structuredClone(all), previous = input.id ? all.find(s=>s.id === input.id) : null
    if (input.id && !previous) throw bad('数据源不存在')
    if (previous && inFlight.has(previous.id)) throw bad('正在同步，请完成后再修改连接')
    if (!['ths','futu','longbridge','ib','custom'].includes(input.connector)) throw bad('不支持的数据源')
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
    const interval = Number(input.intervalMinutes ?? 0)
    if (!Number.isInteger(interval) || (interval !== 0 && (interval < 5 || interval > 1440))) throw bad('同步间隔须为 0，或 5 至 1440 分钟')
    if (typeof input.enabled !== 'boolean') throw bad('enabled 必须为布尔值')
    const source = { ...(previous || {}), id:previous?.id || transaction.sourceId || 'SRC_'+randomUUID(), name:String(input.name || '').trim(), connector:input.connector, transport:input.connector === 'ths' ? 'native' : (input.transport || (input.connector === 'custom' ? 'http' : 'native')), accountId:account.id, ...(auth?.id || input.authId || previous?.authId ? { authId: auth?.id || input.authId || previous?.authId } : {}), intervalMinutes:interval, enabled:input.enabled, configRevision:randomUUID(), updatedAt:iso() }
    if (!source.name || source.name.length > 120) throw bad('请输入不超过 120 字的数据源名称')
    delete source.url; delete source.toolName; delete source.args; delete source.credentialRef; delete source.portfolioId; delete source.thsBookType; delete source.mcpEndpoint
    if (source.connector === 'ths') {
      if (!input.portfolioId || typeof input.portfolioId !== 'string') throw bad('请明确选择同花顺账本')
      if (account.currency !== 'CNY') throw bad('同花顺账本须绑定 CNY 账户')
      const bookType = input.thsBookType === undefined || input.thsBookType === null || input.thsBookType === '' ? 'common' : String(input.thsBookType)
      if (!['common','manFund','ijj'].includes(bookType)) throw bad('同花顺账本类型无效')
      source.portfolioId = input.portfolioId
      source.thsBookType = bookType
    } else if (source.transport === 'native' || (source.transport === 'mcp' && (source.connector === 'longbridge' || source.connector === 'futu'))) {
      source.brokerAccountId = String(input.brokerAccountId || '').trim()
      if (!source.brokerAccountId) throw bad('请明确选择券商账户或通道')
      if (source.connector === 'futu') {
        if (source.transport === 'mcp') {
          // 富途官方 MCP：按授权账户（acc_id）导入，可选自定义端点（默认 mcp.futunn.com）。
          const mcpEndpoint = mcpEndpointUrl(input.mcpEndpoint)
          if (mcpEndpoint) source.mcpEndpoint = mcpEndpoint
          // Optional settlement currency, used to attribute cash-flow rows that carry no symbol.
          const cashCurrency = String(input.currency || '').toUpperCase()
          if (cashCurrency) {
            if (!/^[A-Z]{3}$/.test(cashCurrency)) throw bad('富途资金币种无效')
            source.currency = cashCurrency
          }
        } else {
        source.host = String(input.host || '127.0.0.1').trim()
        if (!['127.0.0.1','localhost','::1'].includes(source.host)) throw bad('富途连接须指向本机 OpenD')
        source.port = Number(input.port || 33333)
        if (!Number.isInteger(source.port) || source.port < 1 || source.port > 65535) throw bad('OpenD 端口无效')
        source.tls = input.tls === true
        source.tradeEnvironment = String(input.tradeEnvironment || 'REAL').toUpperCase()
        source.tradeMarket = String(input.tradeMarket || '').toUpperCase()
        source.currency = String(input.currency || '').toUpperCase()
        if (!['REAL','SIMULATE'].includes(source.tradeEnvironment) || !['HK','US','CN'].includes(source.tradeMarket) || !/^[A-Z]{3}$/.test(source.currency)) throw bad('请设置富途交易环境、市场和资金币种')
        }
      } else if (source.connector === 'ib') {
        if (source.transport !== 'native') throw bad('IB 不支持 MCP 接入')
        source.gatewayUrl = endpoint(input.gatewayUrl || 'https://localhost:5000/v1/api').replace(/\/$/,'')
        source.trustLocalGateway = input.trustLocalGateway === true
      } else if (source.connector === 'longbridge' && source.transport === 'mcp') {
        // 长桥官方 MCP：单账户（brokerAccountId='main'），可选自定义端点（默认 mcp.longbridge.com）。
        if (source.brokerAccountId !== 'main') throw bad('长桥 MCP 接入为单一账户（main）')
        const mcpEndpoint = mcpEndpointUrl(input.mcpEndpoint)
        if (mcpEndpoint) {
          if (mcpEndpoint.endsWith('/agent')) throw bad('长桥 MCP 地址不能是授权端点 /agent')
          source.mcpEndpoint = mcpEndpoint
        }
      } else if (source.connector !== 'longbridge') throw bad('来源不支持原生连接')
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
      Object.assign(source, {lastStatus:'never',lastSuccessAt:null,lastAttemptAt:null,lastError:null,warnings:[],queriedAt:null,uploadedAt:null,quoteDate:null,...(identity(previous) !== identity(source) ? {uploadedAtWatermark:null,quoteDateWatermark:null} : {uploadedAtWatermark:previous.uploadedAtWatermark || previous.uploadedAt || null,quoteDateWatermark:previous.quoteDateWatermark || previous.quoteDate || null})})
    }
    if (!previous) { source.lastStatus = 'never'; all.push(source) }
    else all[all.indexOf(previous)] = source
    if (transaction.snapshot) {
      const s = transaction.snapshot
      Object.assign(source,{remoteFingerprint:transaction.fingerprint,lastAttemptAt:iso(),lastSuccessAt:iso(),lastStatus:s.warnings.length || !s.complete ? 'partial' : 'ok',lastError:null,warnings:s.warnings,queriedAt:s.queriedAt,uploadedAt:s.uploadedAt,quoteDate:s.quoteDate,uploadedAtWatermark:s.uploadedAt,quoteDateWatermark:s.quoteDate,complete:s.complete,imported:s.holdings.length})
    }
    const credentialOwner = source.authId || source.id
    const storedSecrets = { ...vault.get(credentialOwner), ...incomingSecrets }
    if (source.connector === 'ths' && !storedSecrets.cookie) Object.assign(storedSecrets,vault.get('pending-ths'))
    if (source.connector === 'futu' && !storedSecrets.mcpToken) Object.assign(storedSecrets,vault.get('pending-futu-mcp'))
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
    if (!['ths','futu','longbridge','ib'].includes(input.connector)) return Promise.reject(bad('请选择支持登录导入的来源'))
    if (input.id) return Promise.reject(bad('已导入账户请通过编辑保存，无需重新导入'))
    const remoteId = input.connector === 'ths' ? input.portfolioId : input.brokerAccountId
    if (typeof remoteId !== 'string' || !remoteId.trim()) return Promise.reject(bad('请先登录并明确选择一个来源账户'))
    if (input.connector === 'ths') {
      const bookType = input.thsBookType === undefined || input.thsBookType === null || input.thsBookType === '' ? 'common' : String(input.thsBookType)
      if (!['common','manFund','ijj'].includes(bookType)) return Promise.reject(bad('同花顺账本类型无效'))
      input = {...input,thsBookType:bookType}
    }
    // 长桥 MCP 接入：无 brokerAccountId 时固定为 'main'（单一账户）。
    if (input.connector === 'longbridge' && (input.transport === 'mcp' || !input.brokerAccountId)) input = {...input,brokerAccountId:String(input.brokerAccountId || 'main')}
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
      const timer = setTimeout(()=>abort.abort(), input.transport === 'mcp' ? 240000 : 45000);timer.unref?.()
      try {
        const found = await listAccounts({...input,transport:(input.transport === 'mcp' ? 'mcp' : 'native')},credentials)
        const selected = found.accounts.filter(a=>String(a.id) === remoteId)
        if (selected.length !== 1) throw bad('所选账户不属于当前登录或选择不唯一，请重新读取来源账户')
        if (disposed || abort.signal.aborted) throw bad('账户导入已中止')
        const duplicate = existingImport(input,secrets)
        if (duplicate) return resultFor(duplicate)
        const ledger = readLedger(), sourceId = 'SRC_'+randomUUID(), labels = {ths:'同花顺',futu:'富途',longbridge:'长桥',ib:'IB'}
        const name = String(selected[0].name || remoteId).trim().slice(0,120) || remoteId
        const currency = input.connector === 'ths' ? 'CNY' : String(selected[0].currency || (input.connector === 'futu' ? input.currency : null) || ledger.baseCurrency || 'CNY').toUpperCase()
        if (!/^[A-Z]{3}$/.test(currency)) throw bad('来源账户币种无效，导入未保存')
        const {account} = applyOp(ledger,'account.upsert',{name,type:'broker',currency,note:'从'+labels[input.connector]+'导入'})
        account.externalAccountId = remoteId;account.connector = input.connector
        const sourceInput = {...input,name:String(input.name || labels[input.connector]+' · '+name).trim(),accountId:account.id,transport:(input.transport === 'mcp' ? 'mcp' : 'native'),intervalMinutes:input.intervalMinutes ?? 15,enabled:input.enabled !== false}
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
    // 原生四来源（含 futu/longbridge 的 MCP transport）由独立适配器读取；custom 才走宿主 MCP 工具。
    if (['ths','futu','longbridge','ib'].includes(source.connector)) {
      const secrets = suppliedSecrets || secretsFor(source)
      const load = current => {
        if (source.connector === 'ths') return fetchStandaloneThsSnapshot(source,current,signal)
        if (source.connector === 'futu') return source.transport === 'mcp' ? fetchFutuMcpSnapshot(source,current,signal) : fetchFutuSnapshot(source,current,signal)
        if (source.connector === 'longbridge') return source.transport === 'mcp' ? fetchLongbridgeMcpSnapshot(source,current,signal) : fetchLongbridgeSnapshot(source,current,signal)
        return fetchIbSnapshot(source,current,signal)
      }
      return withFutuAuth(source, load, secrets)
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
    const timer = setTimeout(()=>abort.abort(new Error('同步超时')), source.transport === 'mcp' ? 240000 : 45000); timer.unref?.()
    try {
      const input = await fetchSnapshot(source, abort.signal)
      if (disposed || abort.signal.aborted) throw bad('同步已中止')
      const current = config.read().find(s=>s.id === id)
      if (!current || current.configRevision !== revision) throw bad('连接配置已变化，请重新同步')
      const { ledger, snapshot, imported } = mergeSnapshot(readLedger(), current, input)
      const uploadWatermark = current.uploadedAtWatermark || current.uploadedAt, quoteWatermark = current.quoteDateWatermark || current.quoteDate
      if ((uploadWatermark && snapshot.uploadedAt && Date.parse(snapshot.uploadedAt) < Date.parse(uploadWatermark)) || (quoteWatermark && snapshot.quoteDate && Date.parse(snapshot.quoteDate) < Date.parse(quoteWatermark))) throw bad('来源数据时间早于已保存快照，已保留原数据')
      writeLedger(ledger)
      const updated = updateRecord(id, { lastSuccessAt:iso(),lastStatus:snapshot.warnings.length || !snapshot.complete ? 'partial' : 'ok',lastError:null,warnings:snapshot.warnings,uploadedAt:snapshot.uploadedAt,quoteDate:snapshot.quoteDate,uploadedAtWatermark:snapshot.uploadedAt || uploadWatermark || null,quoteDateWatermark:snapshot.quoteDate || quoteWatermark || null,queriedAt:snapshot.queriedAt,imported,complete:snapshot.complete })
      return { source:updated,ledger,summary:summarize(ledger),imported }
    } catch (error) {
      // Adapter messages are curated and safe; still redact every known secret
      // before the message reaches the browser or sources.json.
      let message = String(error?.message || error || '').trim() || '同步失败，请检查连接、授权及快照格式'
      try {
        for (const value of Object.values(vault.get(source.authId || source.id) || {})) if (value && String(value).length > 3) message = message.split(String(value)).join('[已隐藏]')
      } catch { /* vault unavailable; keep the message */ }
      const ref = source.credentialRef && process.env[source.credentialRef]
      if (ref) message = message.split(ref).join('[已隐藏]')
      if (abort.signal.aborted) message = '同步超时或已中止：' + message
      updateRecord(id, {lastStatus:'error',lastError:message})
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
    const nativeLike = source && (source.transport === 'native' || (source.transport === 'mcp' && ['futu','longbridge'].includes(source.connector)))
    if (!source || !nativeLike || !['futu','longbridge','ths'].includes(source.connector)) throw bad('此来源请通过账单文件补充历史流水')
    if (source.connector === 'longbridge' && source.transport === 'mcp' && !secretsFor(source).mcpToken) throw bad('长桥 MCP 未授权，请先完成授权码兑换')
    if (source.connector === 'futu' && source.transport === 'mcp' && !secretsFor(source).mcpToken) throw bad('富途 MCP 未授权，请先完成浏览器授权')
    const revision = source.configRevision, abort = new AbortController()
    aborts.add(abort)
    // MCP sources are slow per call (5–20s) and history spans several markets + paged cash logs.
    const timer = setTimeout(()=>abort.abort(), source.transport === 'mcp' ? 600000 : 180000); timer.unref?.()
    try {
      const result = await withFutuAuth(source, current => (options.fetchHistory || fetchNativeHistory)(source,current,range,abort.signal), secretsFor(source))
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
  async function tick() {
    if (disposed || tickBusy) return
    tickBusy = true
    try {
      for (const source of config.read()) {
        if (!source.enabled || !source.intervalMinutes || inFlight.has(source.id)) continue
        const last = Date.parse(source.lastAttemptAt || '')
        if (Number.isFinite(last) && now()-last < source.intervalMinutes*60000) continue
        try { await sync(source.id) } catch { /* failure retained on source; retry next configured interval */ }
        if (disposed) break
      }
    } finally { tickBusy=false }
  }
  return { list,saveSource,removeSource,sync,tick,listAccounts,listAuthAccounts,createAuthorization,renameAuthorization,removeAuthorization,connectSource,acceptThsLogin,readHistory,listThsPortfolios:async()=>{const r=await listAccounts({connector:'ths'});return {portfolios:r.accounts.map(a=>({...a,selected:false})),warnings:r.warnings||[]}},dispose() { disposed=true; for (const controller of aborts) controller.abort() } }
}
