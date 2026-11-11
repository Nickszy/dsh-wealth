import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fingerprint } from './sync.mjs'
import { getConnectorStatus } from './connectors.mjs'
import { CONNECTORS, CONNECTOR_IDS, TRANSPORT_TIMEOUT_MS, timeoutMs, resolveAuthTransport, resolveSaveTransport, getConnector } from './connector-registry.mjs'

// 指纹固定表：每条 hash 都由改造前的 sync.mjs 实现计算。已有来源按 sha256 去重，
// 任何拼接变化都会让用户已导入的账户被识别成新来源，因此这张表必须原样通过。
const FINGERPRINT_PINS = {
  "ths-common": { source: {"connector":"ths","transport":"native","portfolioId":"100108832246"}, secrets: {}, hash: 'bf5a8a1100e4ecc6e4a15fbb32942d0a2a953898a6a523628e207be73460a1b4' },
  "ths-manFund": { source: {"connector":"ths","transport":"native","portfolioId":"book1","thsBookType":"manFund"}, secrets: {}, hash: 'd138a71661962f2691c61e8228f90909f7caef7e66d6205560e79d75e1838648' },
  "ths-ijj": { source: {"connector":"ths","transport":"native","portfolioId":"book1","thsBookType":"ijj"}, secrets: {}, hash: '70b408991812379bacc6732f02d3f7b5832d801267394dac7033e31b450ab04d' },
  "ths-emptyBookType": { source: {"connector":"ths","transport":"native","portfolioId":"book1","thsBookType":""}, secrets: {}, hash: '72de75622dbdad98a47c2cc0374dfb107764e2269615ce370a0b3d1089fa9054' },
  "futu-native-REAL": { source: {"connector":"futu","transport":"native","brokerAccountId":"123456","tradeEnvironment":"REAL","tradeMarket":"HK","currency":"HKD","host":"127.0.0.1","port":33333}, secrets: {"websocketKey":"ws-key"}, hash: '71a3d19fbb25c8fe633795e8126e824de9916de49bc3e0db31e3a892e120f480' },
  "futu-native-SIMULATE": { source: {"connector":"futu","transport":"native","brokerAccountId":"123456","tradeEnvironment":"SIMULATE","tradeMarket":"US","currency":"USD"}, secrets: {"websocketKey":"ws-key"}, hash: '89f91990e169fd1b526eb737d0397dcebfd7a1e214adbf126425423b6f7014e8' },
  "futu-native-noEnv": { source: {"connector":"futu","transport":"native","brokerAccountId":"123456","tradeMarket":"CN"}, secrets: {"websocketKey":"ws-key"}, hash: '71a3d19fbb25c8fe633795e8126e824de9916de49bc3e0db31e3a892e120f480' },
  "futu-mcp": { source: {"connector":"futu","transport":"mcp","brokerAccountId":"A1"}, secrets: {"mcpToken":"tok-1","refreshToken":"r1","clientId":"c1"}, hash: 'df32191f7b87d1a03f59dda2bf50d57494803fd44717a43fa182175f2314cd58' },
  "longbridge-native": { source: {"connector":"longbridge","transport":"native","brokerAccountId":"cash"}, secrets: {"appKey":"app-key","appSecret":"s","accessToken":"t"}, hash: '063cb13f7bb3fc8b754268bd5ba7f7909fd62e438969b719bdebcb761441909b' },
  "longbridge-mcp": { source: {"connector":"longbridge","transport":"mcp","brokerAccountId":"main"}, secrets: {"mcpToken":"mtok-1"}, hash: '6555930837aafd5326f8b7337d15d4cc05f7883af1b11e6b039bbcfc11a3547f' },
  "qieman-apiKey": { source: {"connector":"qieman","transport":"mcp","brokerAccountId":"main","mcpEndpoint":"https://stargate.yingmi.com/mcp/v2"}, secrets: {"apiKey":"qk-1"}, hash: 'cbba8243602adc245cadc09cd76382ab193ed276f2500aac633cbe3b037d6325' },
  "qieman-bearerToken": { source: {"connector":"qieman","transport":"mcp","brokerAccountId":"main"}, secrets: {"bearerToken":"bt-1"}, hash: 'f7f8fdeb77f5c92b71ee828117a08ae5b81421b58d6239f40143d0769a5c4b0f' },
  "tiger": { source: {"connector":"tiger","transport":"mcp","brokerAccountId":"123","mcpEndpoint":"https://mcp.tigerfintech.com/mcp"}, secrets: {"accessToken":"at","refreshToken":"rt","clientId":"client-7"}, hash: '0c42dd9cf7b86dfe927d16fef1299c1a547ac29a33ef457b755d1ea94baa98d6' },
  "fosun": { source: {"connector":"fosun","transport":"native","brokerAccountId":"666","gatewayUrl":"https://openapi.fosunxcz.com"}, secrets: {"apiKey":"ak_1","privateKey":"p","serverPublicKey":"s"}, hash: 'dbc38c8559c058113b55dd3ffcc0c0443109b0721aef6ba8eb57539958c61be9' },
  "ib": { source: {"connector":"ib","transport":"native","brokerAccountId":"U777","gatewayUrl":"https://localhost:5000/v1/api","trustLocalGateway":false}, secrets: {}, hash: 'a95dd889d29ea2804d67f0082769f4d45e45afe9e1bb902a719917b323af0fc8' },
}

test('source fingerprints stay byte-identical per connector/transport (re-import dedup relies on them)', () => {
  for (const [name, { source, secrets, hash }] of Object.entries(FINGERPRINT_PINS)) {
    assert.equal(fingerprint(source, secrets), hash, name)
  }
})

test('fingerprint parts are assembled per connector exactly as the pre-refactor code did', () => {
  assert.deepEqual(CONNECTORS.ths.fingerprintParts({ portfolioId: 'p1' }, {}), ['ths', 'p1', '', '', '', ''])
  assert.deepEqual(CONNECTORS.ths.fingerprintParts({ portfolioId: 'p1', thsBookType: 'ijj' }, {}), ['ths', 'p1', '', '', '', '', 'ijj'])
  assert.deepEqual(CONNECTORS.futu.fingerprintParts({ brokerAccountId: '9', tradeEnvironment: 'SIMULATE' }, {}), ['futu', '9', 'SIMULATE', '', '', ''])
  assert.deepEqual(CONNECTORS.futu.fingerprintParts({ brokerAccountId: '9' }, {}), ['futu', '9', 'REAL', '', '', ''])
  assert.deepEqual(CONNECTORS.longbridge.fingerprintParts({ brokerAccountId: 'cash' }, { appKey: 'ak' }), ['longbridge', 'cash', '', 'ak', '', ''])
  assert.deepEqual(CONNECTORS.qieman.fingerprintParts({ brokerAccountId: 'main' }, { bearerToken: 'bt' }), ['qieman', 'main', '', '', '', 'bt'])
  assert.deepEqual(CONNECTORS.tiger.fingerprintParts({ brokerAccountId: '1' }, { clientId: 'cid' }), ['tiger', '1', '', '', 'cid', ''])
  assert.deepEqual(CONNECTORS.fosun.fingerprintParts({ brokerAccountId: '2' }, { apiKey: 'ak_1' }), ['fosun', '2', '', '', '', '', 'ak_1'])
  assert.deepEqual(CONNECTORS.ib.fingerprintParts({ brokerAccountId: 'U1' }, {}), ['ib', 'U1', '', '', '', ''])
})

test('registry keys and display metadata are complete and unique', () => {
  assert.deepEqual([...CONNECTOR_IDS], ['ths', 'futu', 'longbridge', 'qieman', 'tiger', 'fosun', 'ib'])
  assert.equal(new Set(CONNECTOR_IDS).size, CONNECTOR_IDS.length)
  for (const entry of Object.values(CONNECTORS)) {
    for (const field of ['id', 'label', 'name', 'description', 'defaultTransport', 'accountIdField', 'fingerprintParts', 'connectCurrency', 'transports']) {
      assert.ok(entry[field], `${entry.id}.${field} is missing`)
    }
    assert.ok(['portfolioId', 'brokerAccountId'].includes(entry.accountIdField), entry.id)
    const transports = Object.keys(entry.transports)
    assert.ok(transports.length >= 1, entry.id)
    for (const key of transports) assert.ok(['native', 'mcp'].includes(key), `${entry.id} has unknown transport ${key}`)
    assert.ok(entry.transports[entry.defaultTransport], `${entry.id} defaultTransport is not implemented`)
    for (const [key, transport] of Object.entries(entry.transports)) {
      for (const method of ['listAccounts', 'fetchSnapshot', 'authConfig', 'sourceFields']) {
        assert.equal(typeof transport[method], 'function', `${entry.id}/${key}.${method}`)
      }
      for (const kind of ['list', 'sync', 'history']) {
        assert.equal(transport.timeoutMs[kind], timeoutMs(kind, key), `${entry.id}/${key}.timeoutMs.${kind}`)
      }
      assert.equal(getConnector(entry.id), CONNECTORS[entry.id])
    }
  }
})

test('per-transport timeouts keep the historical literal values', () => {
  assert.deepEqual(TRANSPORT_TIMEOUT_MS, {
    mcp: { list: 180000, sync: 240000, connect: 240000, history: 600000 },
    native: { list: 45000, sync: 45000, connect: 45000, history: 180000 },
  })
  assert.equal(timeoutMs('list', 'mcp'), 180000)
  assert.equal(timeoutMs('sync', 'http'), 45000)
  assert.equal(timeoutMs('history', 'native'), 180000)
})

test('transport inference matches the pre-refactor rules', () => {
  assert.equal(resolveAuthTransport('ths', 'mcp'), 'mcp')
  assert.equal(resolveAuthTransport('ths', undefined), 'native')
  for (const id of ['fosun', 'ib']) assert.equal(resolveAuthTransport(id, 'mcp'), 'native', id)
  assert.equal(resolveAuthTransport('qieman', 'native'), 'mcp')
  assert.equal(resolveAuthTransport('tiger', undefined), 'mcp')
  assert.equal(resolveAuthTransport('futu', 'mcp'), 'mcp')
  assert.equal(resolveAuthTransport('futu', 'native'), 'native')
  assert.equal(resolveAuthTransport('futu', 'banana'), 'native')
  assert.equal(resolveAuthTransport('longbridge', undefined), 'native')
  assert.equal(resolveSaveTransport('ths', 'mcp'), 'mcp')
  assert.equal(resolveSaveTransport('ths', undefined), 'native')
  for (const id of ['fosun', 'ib']) assert.equal(resolveSaveTransport(id, 'mcp'), 'native', id)
  assert.equal(resolveSaveTransport('qieman', 'native'), 'mcp')
  assert.equal(resolveSaveTransport('tiger', undefined), 'mcp')
  assert.equal(resolveSaveTransport('futu', 'mcp'), 'mcp')
  assert.equal(resolveSaveTransport('futu', undefined), 'native')
  // 旧逻辑把未识别的 transport 原样保存，由后续分支报错；这里不能悄悄改写它。
  assert.equal(resolveSaveTransport('futu', 'banana'), 'banana')
  assert.equal(resolveSaveTransport('custom', undefined), 'http')
  assert.equal(resolveSaveTransport('custom', 'mcp'), 'mcp')
})

test('getConnectorStatus output is byte-identical to the pre-refactor catalogue', () => {
  assert.deepEqual(getConnectorStatus({ get() { throw Error('must not access plugins') } }), [
    { id:'ths',label:'同花顺投资账本',available:true,transport:'native',description:'官方投资账本 MCP。点一次授权，在浏览器登录同花顺并同意后自动读取账本。' },
    { id:'futu',label:'富途',available:true,transport:'native',description:'官方 OpenD JavaScript 只读连接；请运行并登录 OpenD，启用 WebSocket。' },
    { id:'longbridge',label:'长桥',available:true,transport:'native',description:'官方 Longport SDK，使用自己的 App Key、Secret 和 Access Token。' },
    { id:'qieman',label:'且慢',available:true,transport:'mcp',description:'盈米 / 且慢官方 MCP；用长期 API Key 读取基金持仓与收益，无需浏览器授权。' },
    { id:'tiger',label:'老虎证券',available:true,transport:'mcp',description:'老虎官方远程 MCP；浏览器设备码授权后自动续期，读取账户、持仓、现金与成交。' },
    { id:'fosun',label:'复星证券',available:true,transport:'native',description:'复星财富 / 星财富官方 OpenAPI；填写开放平台网关、API Key 与密钥对。' },
    { id:'ib',label:'Interactive Brokers',available:true,transport:'native',description:'IB 官方 Client Portal Gateway；需要在官方网关完成登录。' },
    { id:'custom',label:'通用 API / MCP',available:true,transport:'bridge',description:'高级选项：标准持仓快照 API 或已配置的 MCP 读工具。' },
  ])
})

test('adapter modules never import the registry (dependency is one-way)', () => {
  for (const file of ['ths-client.mjs', 'ths-mcp.mjs', 'brokers-sdk.mjs', 'lb-mcp.mjs', 'futu-mcp.mjs', 'qieman-mcp.mjs', 'tiger-mcp.mjs', 'fosun-client.mjs', 'ib-client.mjs', 'credentials.mjs']) {
    assert.doesNotMatch(readFileSync(new URL('./' + file, import.meta.url), 'utf8'), /connector-registry/, file)
  }
})

test('ths-client imports the snapshot schema directly so the registry cycle stays broken', () => {
  const read = file => readFileSync(new URL('./' + file, import.meta.url), 'utf8')
  // 旧环：connector-registry → ths-client → connectors → connector-registry。
  assert.doesNotMatch(read('ths-client.mjs'), /from '\.\/connectors\.mjs'/, 'ths-client.mjs must not import connectors.mjs')
  assert.match(read('ths-client.mjs'), /from '\.\/snapshot-schema\.mjs'/, 'ths-client.mjs imports the schema directly')
  assert.match(read('connectors.mjs'), /from '\.\/connector-registry\.mjs'/, 'connectors.mjs keeps the registry import for the catalogue')
  const schema = read('snapshot-schema.mjs')
  assert.doesNotMatch(schema, /connector-registry/, 'snapshot-schema.mjs must not import the registry')
  assert.doesNotMatch(schema, /from '\.\/connectors\.mjs'/, 'snapshot-schema.mjs must stay a leaf module')
})

test('the registry imports native history from adapters, never from history-provider', () => {
  const read = file => readFileSync(new URL('./' + file, import.meta.url), 'utf8')
  const registry = read('connector-registry.mjs')
  // history-provider -> registry is the only direction: the dispatcher looks transports up.
  assert.doesNotMatch(registry, /history-provider/, 'connector-registry.mjs must not import history-provider.mjs')
  assert.match(registry, /futuHistory[^\n]*from '\.\/futu-mcp\.mjs'/)
  assert.match(registry, /longbridgeHistory[^\n]*from '\.\/lb-mcp\.mjs'/)
  assert.match(read('futu-mcp.mjs'), /export async function futuHistory\b/)
  assert.match(read('lb-mcp.mjs'), /export async function longbridgeHistory\b/)
  assert.match(read('history-provider.mjs'), /from '\.\/connector-registry\.mjs'/)
})
