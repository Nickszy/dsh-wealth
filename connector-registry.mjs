// 连接器注册表：把各适配器的导出函数组装成每个来源的描述对象。
// sync.mjs 与历史分发层按这里查表分发；适配器保持纯函数，不反向依赖本文件。
// 新增一家券商 = 新增一个适配器模块 + 在 CONNECTORS 里加一个条目。
import { OpError } from './store.mjs'
import { listThsAccounts, fetchStandaloneThsSnapshot, fetchThsHistory } from './ths-client.mjs'
import { listFutuAccounts, fetchFutuSnapshot, listLongbridgeAccounts, fetchLongbridgeSnapshot } from './brokers-sdk.mjs'
import { listLongbridgeMcpAccounts, fetchLongbridgeMcpSnapshot, fetchLongbridgeMcpHistory, longbridgeHistory } from './lb-mcp.mjs'
import { listFutuMcpAccounts, fetchFutuMcpSnapshot, refreshFutuToken, fetchFutuMcpHistory, futuHistory } from './futu-mcp.mjs'
import { listQiemanAccounts, fetchQiemanSnapshot, refreshQiemanToken } from './qieman-mcp.mjs'
import { listTigerAccounts, fetchTigerSnapshot, refreshTigerToken, fetchTigerHistory } from './tiger-mcp.mjs'
import { listFosunAccounts, fetchFosunSnapshot, fetchFosunHistory } from './fosun-client.mjs'
import { listIbAccounts, fetchIbSnapshot } from './ib-client.mjs'

export const bad = message => new OpError('bad-request', message)
const secretKey = /^(?:password|secret|token|api[_-]?key|cookie|authorization|access[_-]?token|refresh[_-]?token)$/i
function endpoint(raw) {
  let url
  try { url = new URL(raw) } catch { throw bad('请输入有效的快照 API 地址') }
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw bad('API 仅支持 HTTPS 或本机 HTTP 桥接')
  if (url.username || url.password || url.hash || [...url.searchParams.keys()].some(k=>secretKey.test(k))) throw bad('API 地址不能包含凭据或片段，请使用环境变量引用')
  return url.href
}
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
export { endpoint }

// 超时按接入方式区分（目前与连接器无关）：账户列表 / 同步 / 首次导入 / 历史。
export const TRANSPORT_TIMEOUT_MS = Object.freeze({
  mcp: Object.freeze({ list: 180000, sync: 240000, connect: 240000, history: 600000 }),
  native: Object.freeze({ list: 45000, sync: 45000, connect: 45000, history: 180000 }),
})
export function timeoutMs(kind, transport) {
  return (TRANSPORT_TIMEOUT_MS[transport] || TRANSPORT_TIMEOUT_MS.native)[kind]
}

/** createAuthorization：单一接入方式的连接器强制之；富途/长桥按传入选择，未识别值回退 native。 */
export function resolveAuthTransport(id, raw) {
  const entry = CONNECTORS[id]
  if (!entry) return null
  const keys = Object.keys(entry.transports)
  if (keys.length === 1) return keys[0]
  return entry.transports[raw] ? raw : entry.defaultTransport
}
/** saveSource：与旧逻辑一致，未识别的 transport 原样保留，由后续分支统一报错。 */
export function resolveSaveTransport(id, raw) {
  if (id === 'custom') return raw || 'http'
  const entry = CONNECTORS[id]
  if (!entry) return raw
  const keys = Object.keys(entry.transports)
  if (keys.length === 1) return keys[0]
  return raw || entry.defaultTransport
}
/** 注册表之外（custom）的通用指纹：与旧实现的缺省拼接一致。 */
export function defaultFingerprintParts(source) {
  return [source.connector, String(source.brokerAccountId || ''), '', '', '', '']
}
// 导入币种：固定人民币（同花顺/且慢）；其余取账户币种，富途可由连接币种兜底。
const fixedCurrency = value => () => value
const accountCurrency = withInput => (input, remote, base) => String(remote?.currency || (withInput ? input.currency : null) || base || 'CNY').toUpperCase()

const optionalMcpEndpoint = (raw, extraCheck) => {
  const fields = {}
  const mcpEndpoint = mcpEndpointUrl(raw)
  if (mcpEndpoint) {
    if (extraCheck) extraCheck(mcpEndpoint)
    fields.mcpEndpoint = mcpEndpoint
  }
  return fields
}

export const CONNECTORS = {
  ths: {
    id: 'ths',
    label: '同花顺投资账本',
    name: '同花顺',
    description: '插件独立登录并读取人民币股票、ETF 和现金，无需安装其他插件。',
    defaultTransport: 'native',
    accountIdField: 'portfolioId',
    bookTypeFromList: true,
    fingerprintParts(source) {
      const parts = ['ths', String(source.portfolioId || ''), '', '', '', '']
      const bookType = String(source.thsBookType || 'common')
      if (bookType && bookType !== 'common') parts.push(bookType)
      return parts
    },
    connectCurrency: fixedCurrency('CNY'),
    auth: { pendingSlot: 'pending-ths', pendingFields: ['cookie'], pendingTransports: ['native'], pendingScope: 'new-only', captureOnSave: true },
    transports: {
      native: {
        listAccounts: listThsAccounts,
        fetchSnapshot: fetchStandaloneThsSnapshot,
        fetchHistory: fetchThsHistory,
        // 与富途/长桥原生历史一致：分发前先做本地时间与中止检查（历史行为保持）。
        usesLocalNow: true,
        timeoutMs: TRANSPORT_TIMEOUT_MS.native,
        authConfig: () => ({}),
        sourceFields(input, { account }) {
          if (!input.portfolioId || typeof input.portfolioId !== 'string') throw bad('请明确选择同花顺账本')
          if (account.currency !== 'CNY') throw bad('同花顺账本须绑定 CNY 账户')
          const bookType = input.thsBookType === undefined || input.thsBookType === null || input.thsBookType === '' ? 'common' : String(input.thsBookType)
          if (!['common','manFund','ijj'].includes(bookType)) throw bad('同花顺账本类型无效')
          return { portfolioId: input.portfolioId, thsBookType: bookType }
        },
        auth: {
          validate: secrets => secrets.cookie ? null : '请先完成同花顺浏览器登录',
        },
      },
    },
  },
  futu: {
    id: 'futu',
    label: '富途',
    name: '富途',
    description: '官方 OpenD JavaScript 只读连接；请运行并登录 OpenD，启用 WebSocket。',
    defaultTransport: 'native',
    accountIdField: 'brokerAccountId',
    // 登录地址即凭据投递目标：改动必须搭配新鲜凭据复核。
    configRequiresReauth: true,
    filterAccountsByEnvironment: true,
    credentialsAlwaysConfigured: transport => transport !== 'mcp',
    fingerprintParts(source) {
      return ['futu', String(source.brokerAccountId || ''), source.tradeEnvironment || 'REAL', '', '', '']
    },
    connectCurrency: accountCurrency(true),
    auth: { pendingSlot: 'pending-futu-mcp', pendingFields: ['mcpToken'], pendingTransports: ['mcp'], pendingScope: 'scoped', captureOnSave: true },
    transports: {
      native: {
        listAccounts: listFutuAccounts,
        fetchSnapshot: fetchFutuSnapshot,
        fetchHistory: futuHistory,
        usesLocalNow: true,
        timeoutMs: TRANSPORT_TIMEOUT_MS.native,
        listPrecheck(source) {
          if (!['127.0.0.1','localhost','::1'].includes(String(source.host || '127.0.0.1'))) throw bad('富途账户读取须指向本机 OpenD')
          const port = Number(source.port || 33333)
          if (!Number.isInteger(port) || port < 1 || port > 65535) throw bad('OpenD 端口无效')
        },
        authConfig(raw) {
          const out = {}
          out.host = String(raw.host || '127.0.0.1').trim()
          if (!['127.0.0.1','localhost','::1'].includes(out.host)) throw bad('富途连接须指向本机 OpenD')
          out.port = Number(raw.port || 33333)
          if (!Number.isInteger(out.port) || out.port < 1 || out.port > 65535) throw bad('OpenD 端口无效')
          out.tls = raw.tls === true
          out.tradeEnvironment = ['SIMULATE','REAL'].includes(String(raw.tradeEnvironment || '').toUpperCase()) ? String(raw.tradeEnvironment).toUpperCase() : 'REAL'
          out.tradeMarket = ['HK','US','CN'].includes(String(raw.tradeMarket || '').toUpperCase()) ? String(raw.tradeMarket).toUpperCase() : 'HK'
          out.currency = ['HKD','USD','CNH'].includes(String(raw.currency || '').toUpperCase()) ? String(raw.currency).toUpperCase() : 'HKD'
          return out
        },
        sourceFields(input) {
          const fields = {
            host: String(input.host || '127.0.0.1').trim(),
            port: Number(input.port || 33333),
            tls: input.tls === true,
            tradeEnvironment: String(input.tradeEnvironment || 'REAL').toUpperCase(),
            tradeMarket: String(input.tradeMarket || '').toUpperCase(),
            currency: String(input.currency || '').toUpperCase(),
          }
          if (!['127.0.0.1','localhost','::1'].includes(fields.host)) throw bad('富途连接须指向本机 OpenD')
          if (!Number.isInteger(fields.port) || fields.port < 1 || fields.port > 65535) throw bad('OpenD 端口无效')
          if (!['REAL','SIMULATE'].includes(fields.tradeEnvironment) || !['HK','US','CN'].includes(fields.tradeMarket) || !/^[A-Z]{3}$/.test(fields.currency)) throw bad('请设置富途交易环境、市场和资金币种')
          return fields
        },
      },
      mcp: {
        listAccounts: listFutuMcpAccounts,
        fetchSnapshot: fetchFutuMcpSnapshot,
        fetchHistory: fetchFutuMcpHistory,
        timeoutMs: TRANSPORT_TIMEOUT_MS.mcp,
        authConfig(raw) {
          const out = optionalMcpEndpoint(raw.mcpEndpoint)
          const currency = String(raw.currency || '').toUpperCase()
          if (currency) { if (!/^[A-Z]{3}$/.test(currency)) throw bad('富途资金币种无效'); out.currency = currency }
          return out
        },
        sourceFields(input) {
          // 富途官方 MCP：按授权账户（acc_id）导入，可选自定义端点（默认 mcp.futunn.com）。
          const fields = optionalMcpEndpoint(input.mcpEndpoint)
          // 可选结算币种：归属无代码的现金流。
          const cashCurrency = String(input.currency || '').toUpperCase()
          if (cashCurrency) {
            if (!/^[A-Z]{3}$/.test(cashCurrency)) throw bad('富途资金币种无效')
            fields.currency = cashCurrency
          }
          return fields
        },
        auth: {
          validate: secrets => secrets.mcpToken ? null : '请先完成富途浏览器授权',
          refresh: ({ refreshToken, clientId, signal }) => refreshFutuToken({ refreshToken, clientId, signal }),
          tokenFields: token => ({ mcpToken: token.accessToken, ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}) }),
          reprobeBound: true,
          historyGuard: secrets => secrets.mcpToken ? null : '富途 MCP 未授权，请先完成浏览器授权',
        },
      },
    },
  },
  longbridge: {
    id: 'longbridge',
    label: '长桥',
    name: '长桥',
    description: '官方 Longport SDK，使用自己的 App Key、Secret 和 Access Token。',
    defaultTransport: 'native',
    accountIdField: 'brokerAccountId',
    // 登录地址即凭据投递目标：改动必须搭配新鲜凭据复核。
    configRequiresReauth: true,
    defaults: { accountId: 'main' },
    // 原生发现按密钥自动切换通道：保存了 appKey 用原生 SDK，只有 MCP token 用官方 MCP。
    resolveTransport: (source, secrets) => (source.transport === 'mcp' || (!secrets.appKey && secrets.mcpToken)) ? 'mcp' : 'native',
    fingerprintParts(source, secrets = {}) {
      return ['longbridge', String(source.brokerAccountId || ''), '', secrets.appKey || '', '', '']
    },
    connectCurrency: accountCurrency(false),
    transports: {
      native: {
        listAccounts: listLongbridgeAccounts,
        fetchSnapshot: fetchLongbridgeSnapshot,
        fetchHistory: longbridgeHistory,
        usesLocalNow: true,
        timeoutMs: TRANSPORT_TIMEOUT_MS.native,
        authConfig: () => ({}),
        sourceFields: () => ({}),
        auth: {
          validate: secrets => (secrets.appKey && secrets.appSecret && secrets.accessToken) ? null : '请填写长桥 App Key / App Secret / Access Token',
        },
      },
      mcp: {
        listAccounts: listLongbridgeMcpAccounts,
        fetchSnapshot: fetchLongbridgeMcpSnapshot,
        fetchHistory: fetchLongbridgeMcpHistory,
        timeoutMs: TRANSPORT_TIMEOUT_MS.mcp,
        // 长桥官方 MCP：单账户（brokerAccountId='main'），可选自定义端点（默认 mcp.longbridge.com）。
        authConfig(raw) {
          return optionalMcpEndpoint(raw.mcpEndpoint, mcpEndpoint => { if (mcpEndpoint.endsWith('/agent')) throw bad('长桥 MCP 地址不能是授权端点 /agent') })
        },
        sourceFields(input, { source }) {
          if (source.brokerAccountId !== 'main') throw bad('长桥 MCP 接入为单一账户（main）')
          return optionalMcpEndpoint(input.mcpEndpoint, mcpEndpoint => { if (mcpEndpoint.endsWith('/agent')) throw bad('长桥 MCP 地址不能是授权端点 /agent') })
        },
        auth: {
          validate: secrets => secrets.mcpToken ? null : '请先兑换长桥授权码',
          historyGuard: secrets => secrets.mcpToken ? null : '长桥 MCP 未授权，请先完成授权码兑换',
          reprobeBound: true,
        },
      },
    },
  },
  qieman: {
    id: 'qieman',
    label: '且慢',
    name: '且慢',
    description: '盈米 / 且慢官方 MCP；用长期 API Key 读取基金持仓与收益，无需浏览器授权。',
    defaultTransport: 'mcp',
    accountIdField: 'brokerAccountId',
    // 登录地址即凭据投递目标：改动必须搭配新鲜凭据复核。
    configRequiresReauth: true,
    defaults: { accountId: 'main' },
    fingerprintParts(source, secrets = {}) {
      return ['qieman', String(source.brokerAccountId || ''), '', '', '', secrets.apiKey || secrets.bearerToken || '']
    },
    connectCurrency: fixedCurrency('CNY'),
    auth: { pendingSlot: 'pending-qieman-mcp', pendingFields: ['bearerToken','apiKey'], pendingTransports: ['mcp'], pendingScope: 'scoped' },
    transports: {
      mcp: {
        listAccounts: listQiemanAccounts,
        fetchSnapshot: fetchQiemanSnapshot,
        // 且慢不提供逐笔流水（fetchQiemanHistory 会明确拒绝），故不注册 fetchHistory。
        timeoutMs: TRANSPORT_TIMEOUT_MS.mcp,
        authConfig(raw) {
          return optionalMcpEndpoint(raw.mcpEndpoint)
        },
        sourceFields(input) {
          // 'main' = 总账户; any other id is one 且慢 sub-account (四笔钱/盈米宝).
          return optionalMcpEndpoint(input.mcpEndpoint)
        },
        auth: {
          validate: secrets => (secrets.apiKey || secrets.bearerToken) ? null : '请填写且慢 MCP API Key（ai.yingmi.com 申请，长期有效）',
          refresh: ({ refreshToken, clientId, signal }) => refreshQiemanToken({ refreshToken, clientId, signal }),
          tokenFields: token => ({ bearerToken: token.accessToken, ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}) }),
        },
      },
    },
  },
  tiger: {
    id: 'tiger',
    label: '老虎证券',
    name: '老虎证券',
    description: '老虎官方远程 MCP；浏览器设备码授权后自动续期，读取账户、持仓、现金与成交。',
    defaultTransport: 'mcp',
    accountIdField: 'brokerAccountId',
    // 登录地址即凭据投递目标：改动必须搭配新鲜凭据复核。
    configRequiresReauth: true,
    fingerprintParts(source, secrets = {}) {
      return ['tiger', String(source.brokerAccountId || ''), '', '', secrets.clientId || '', '']
    },
    connectCurrency: accountCurrency(false),
    auth: { pendingSlot: 'pending-tiger-mcp', pendingFields: ['accessToken'], pendingTransports: ['mcp'], pendingScope: 'scoped' },
    transports: {
      mcp: {
        listAccounts: listTigerAccounts,
        fetchSnapshot: fetchTigerSnapshot,
        fetchHistory: fetchTigerHistory,
        timeoutMs: TRANSPORT_TIMEOUT_MS.mcp,
        authConfig(raw) {
          return optionalMcpEndpoint(raw.mcpEndpoint)
        },
        sourceFields(input) {
          return optionalMcpEndpoint(input.mcpEndpoint)
        },
        auth: {
          validate: secrets => !secrets.accessToken ? '请先完成老虎浏览器设备码授权'
            : !(secrets.refreshToken && secrets.clientId) ? '老虎授权缺少 refresh token，请重新授权以获得长期登录'
            : null,
          refresh: ({ refreshToken, clientId, signal }) => refreshTigerToken({ refreshToken, clientId, signal }),
          tokenFields: token => ({ accessToken: token.accessToken, ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}) }),
          reprobeBound: true,
          historyGuard: secrets => secrets.accessToken ? null : '老虎 MCP 未授权，请先完成浏览器设备码授权',
        },
      },
    },
  },
  fosun: {
    id: 'fosun',
    label: '复星证券',
    name: '复星证券',
    description: '复星财富 / 星财富官方 OpenAPI；填写开放平台网关、API Key 与密钥对。',
    defaultTransport: 'native',
    accountIdField: 'brokerAccountId',
    // 登录地址即凭据投递目标：改动必须搭配新鲜凭据复核。
    configRequiresReauth: true,
    fingerprintParts(source, secrets = {}) {
      return ['fosun', String(source.brokerAccountId || ''), '', '', '', '', secrets.apiKey || '']
    },
    connectCurrency: accountCurrency(false),
    auth: { pendingSlot: 'pending-fosun', pendingFields: ['apiKey'], pendingTransports: ['native'], pendingScope: 'scoped' },
    transports: {
      native: {
        listAccounts: listFosunAccounts,
        fetchSnapshot: fetchFosunSnapshot,
        fetchHistory: fetchFosunHistory,
        timeoutMs: TRANSPORT_TIMEOUT_MS.native,
        authConfig(raw) {
          const gatewayUrl = String(raw.gatewayUrl || '').trim() || 'https://openapi.fosunxcz.com'
          return { gatewayUrl: endpoint(gatewayUrl).replace(/\/$/,'') }
        },
        sourceFields(input) {
          return { gatewayUrl: endpoint(input.gatewayUrl || 'https://openapi.fosunxcz.com').replace(/\/$/,'') }
        },
        auth: {
          validate: secrets => (secrets.apiKey && secrets.privateKey && secrets.serverPublicKey) ? null : '请填写复星 API Key（ak_ 开头）、客户端私钥与服务端公钥',
        },
      },
    },
  },
  ib: {
    id: 'ib',
    label: 'Interactive Brokers',
    name: 'IB',
    description: 'IB 官方 Client Portal Gateway；需要在官方网关完成登录。',
    defaultTransport: 'native',
    accountIdField: 'brokerAccountId',
    credentialsAlwaysConfigured: () => true,
    fingerprintParts(source) {
      return ['ib', String(source.brokerAccountId || ''), '', '', '', '']
    },
    connectCurrency: accountCurrency(false),
    transports: {
      native: {
        listAccounts: listIbAccounts,
        fetchSnapshot: fetchIbSnapshot,
        timeoutMs: TRANSPORT_TIMEOUT_MS.native,
        authConfig(raw) {
          return {
            gatewayUrl: endpoint(raw.gatewayUrl || 'https://localhost:5000/v1/api').replace(/\/$/,''),
            trustLocalGateway: raw.trustLocalGateway === true,
          }
        },
        sourceFields(input) {
          return {
            gatewayUrl: endpoint(input.gatewayUrl || 'https://localhost:5000/v1/api').replace(/\/$/,''),
            trustLocalGateway: input.trustLocalGateway === true,
          }
        },
      },
    },
  },
}

export const CONNECTOR_IDS = Object.keys(CONNECTORS)
export const getConnector = id => CONNECTORS[id] || null
