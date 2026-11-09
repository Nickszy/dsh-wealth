import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSyncService, sourceStore } from './sync.mjs'

const clone = x => structuredClone(x)
const snapshot = () => ({ holdings:[{symbol:'600000',name:'来源持仓',market:'CN',assetClass:'stock',currency:'CNY',qty:100,avgCost:10,manualPrice:12}], complete:true, warnings:[], queriedAt:'2026-11-07T00:00:00Z', uploadedAt:null, quoteDate:null })

function fixture(overrides = {}, seed = {}) {
  let ledger = { version:1, baseCurrency:'CNY', fx:{CNY:1}, accounts:[], instruments:[], holdings:[], trades:[], snapshots:[], updatedAt:null }
  let sources = clone(seed.sources || []), authorizations = clone(seed.authorizations || [])
  const secrets = {}
  const vault = {
    get: id => clone(secrets[id] || {}),
    set: (id, _kind, value) => { secrets[id] = { ...(secrets[id] || {}), ...value } },
    remove: id => { delete secrets[id] },
    configured: id => Object.keys(secrets[id] || {}).length > 0,
  }
  const config = {
    read: () => clone(sources),
    write: rows => { sources = clone(rows) },
    readAuths: () => clone(authorizations),
    writeAuths: rows => { authorizations = clone(rows) },
  }
  const options = {
    credentials: vault,
    config,
    load: () => clone(ledger),
    save: db => { ledger = clone(db) },
    listAccounts: async () => ({ accounts:[{ id:'A1', name:'富途证券 · 融资账户 · 尾号 1234' },{ id:'A2', name:'富途证券 · 现金账户 · 尾号 5678' }], warnings:[] }),
    fetchSnapshot: async () => snapshot(),
    ...overrides,
  }
  const service = createSyncService({ get:() => null }, options)
  return { service, config, vault, secrets, sources: () => clone(sources), authorizations: () => clone(authorizations), db: () => clone(ledger) }
}
const pendingFutu = (vault, token = 'token-1') => vault.set('pending-futu-mcp', 'futu', { mcpToken: token, refreshToken:'refresh-1', clientId:'client-1' })

test('one authorization imports every sub-account and keeps a single token set', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  assert.match(auth.id, /^AUTH_/)
  assert.equal(f.vault.configured('pending-futu-mcp'), false)
  assert.equal(f.vault.get(auth.id).mcpToken, 'token-1')

  const first = await f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:15, enabled:true })
  const second = await f.service.connectSource({ authId:auth.id, brokerAccountId:'A2', intervalMinutes:15, enabled:true })
  assert.equal(first.created, true)
  assert.equal(second.created, true)
  assert.notEqual(first.account.id, second.account.id)
  assert.equal(f.sources().length, 2)
  assert.ok(f.sources().every(source => source.authId === auth.id))
  assert.deepEqual(Object.keys(f.secrets).filter(key => key.startsWith('AUTH_')), [auth.id])

  const listed = f.service.list()
  assert.equal(listed.authorizations.length, 1)
  assert.equal(listed.authorizations[0].sources.length, 2)
  assert.equal(listed.authorizations[0].accounts.length, 2)
  assert.equal(listed.sources[0].credentialsConfigured, true)
})

test('authorization stays after its last account is removed so other sub-accounts can still be imported', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  const only = await f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:0, enabled:true })

  assert.throws(() => f.service.removeAuthorization(auth.id), /还有 1 个/)
  f.service.removeSource(only.source.id)
  assert.equal(f.service.list().authorizations.length, 1)
  assert.equal(f.service.list().authorizations[0].sources.length, 0)
  assert.equal(f.vault.configured(auth.id), true)

  f.service.removeAuthorization(auth.id)
  assert.equal(f.service.list().authorizations.length, 0)
  assert.equal(f.vault.configured(auth.id), false)
})

test('discovery caches all accounts and gives a bare authorization an identity', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  const listed = await f.service.listAuthAccounts(auth.id)
  assert.equal(listed.accounts.length, 2)
  const stored = f.service.list().authorizations[0]
  assert.equal(stored.accounts.length, 2)
  assert.match(stored.label, /尾号 1234/)
  assert.ok(stored.accountsFetchedAt)

  f.service.renameAuthorization(auth.id, '我的富途主账号')
  assert.equal(f.service.list().authorizations[0].label, '我的富途主账号')
})

test('an authorization with imported accounts cannot switch transport', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  await f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:0, enabled:true })
  await assert.rejects(f.service.createAuthorization({ authId:auth.id, connector:'futu', transport:'native' }), /接入方式/)
})

test('two authorizations are listed separately with their own accounts', async () => {
  let discovered = 0
  const f = fixture({ listAccounts: async () => { discovered++; return { accounts:[{ id:'A'+discovered, name:'富途账户 '+discovered }], warnings:[] } } })
  pendingFutu(f.vault, 'work')
  const first = (await f.service.createAuthorization({ connector:'futu', transport:'mcp', label:'工作号' })).auth
  await f.service.connectSource({ authId:first.id, brokerAccountId:'A1', intervalMinutes:15, enabled:true })
  pendingFutu(f.vault, 'personal')
  const second = (await f.service.createAuthorization({ connector:'futu', transport:'mcp', label:'私人号' })).auth
  await f.service.connectSource({ authId:second.id, brokerAccountId:'A2', intervalMinutes:15, enabled:true })

  assert.notEqual(first.id, second.id)
  const listed = f.service.list().authorizations
  assert.deepEqual(listed.map(auth => auth.label).sort(), ['工作号','私人号'])
  assert.equal(listed.find(auth => auth.id === first.id).sources.length, 1)
  assert.equal(listed.find(auth => auth.id === second.id).sources.length, 1)
})

test('expired Futu MCP token is refreshed once and reused without another login', async () => {
  const realFetch = globalThis.fetch
  let tokenRequests = 0, accountCalls = 0
  globalThis.fetch = async (url, init) => {
    tokenRequests++
    assert.match(String(url), /token/)
    assert.match(String(init.body), /grant_type=refresh_token/)
    return { ok:true, text: async () => JSON.stringify({ access_token:'fresh', refresh_token:'fresh-refresh', expires_in:3600 }) }
  }
  try {
    const f = fixture({ listAccounts: async (_source, secrets) => {
      accountCalls++
      if (secrets.mcpToken === 'stale') throw new Error('富途 MCP 授权已失效，请重新授权：401')
      return { accounts:[{ id:'A1', name:'富途账户' }], warnings:[] }
    } })
    pendingFutu(f.vault, 'stale')
    const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
    const listed = await f.service.listAuthAccounts(auth.id)
    assert.equal(listed.accounts.length, 1)
    assert.equal(accountCalls, 2)
    assert.equal(tokenRequests, 1)
    assert.equal(f.vault.get(auth.id).mcpToken, 'fresh')
    assert.equal(f.vault.get(auth.id).refreshToken, 'fresh-refresh')
  } finally { globalThis.fetch = realFetch }
})

test('authorization discovery errors never echo saved secrets into the UI', async () => {
  const f = fixture({ listAccounts: async (_source, secrets) => { throw new Error('upstream rejected ' + secrets.mcpToken) } })
  pendingFutu(f.vault, 'super-secret-token')
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  await assert.rejects(f.service.listAuthAccounts(auth.id), /super-secret-token/)
  const stored = f.service.list().authorizations[0].lastError
  assert.doesNotMatch(stored, /super-secret-token/)
  assert.match(stored, /已隐藏/)
})

test('non-auth discovery errors are not retried and never trigger a token refresh', async () => {
  const realFetch = globalThis.fetch
  let tokenRequests = 0
  globalThis.fetch = async () => { tokenRequests++; throw new Error('should not be called') }
  try {
    const f = fixture({ listAccounts: async () => { throw new Error('network down') } })
    pendingFutu(f.vault)
    const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
    await assert.rejects(f.service.listAuthAccounts(auth.id), /network down/)
    assert.equal(tokenRequests, 0)
  } finally { globalThis.fetch = realFetch }
})

test('existing one-account connections appear as a migrated authorization', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wealth-auth-'))
  try {
    writeFileSync(join(dir, 'sources.json'), JSON.stringify({ version:1, sources:[{ id:'SRC_OLD', name:'旧连接', connector:'ths', transport:'native', accountId:'ACC1', portfolioId:'book1', thsBookType:'common' }] }))
    const store = sourceStore(dir)
    const migrated = store.readAuths()
    assert.equal(migrated.length, 1)
    assert.equal(migrated[0].id, 'SRC_OLD')
    assert.equal(migrated[0].legacy, true)
    assert.match(migrated[0].label, /旧连接/)

    store.write([{ id:'SRC_OLD', name:'改名', connector:'ths', transport:'native', accountId:'ACC1', portfolioId:'book1', thsBookType:'common' }])
    const file = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'))
    assert.equal(file.version, 3)
    // Derived legacy records are never persisted; they are rebuilt from the source.
    assert.equal(file.authorizations.length, 0)
    assert.equal(file.sources[0].id, 'SRC_OLD')
    assert.equal(sourceStore(dir).readAuths()[0].label, '同花顺 · 改名')
  } finally { rmSync(dir, { recursive:true, force:true }) }
})

test('re-authorizing with a fresh browser token replaces the stored one', async () => {
  const f = fixture()
  pendingFutu(f.vault, 'first')
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  f.vault.set('pending-futu-mcp:' + auth.id, 'futu', { mcpToken:'second', refreshToken:'second-refresh', clientId:'client-1' })
  await f.service.createAuthorization({ authId:auth.id, connector:'futu', transport:'mcp' })
  assert.equal(f.vault.get(auth.id).mcpToken, 'second')
  assert.equal(f.vault.configured('pending-futu-mcp:' + auth.id), false)
})

test('a browser flow for another login cannot replace an existing token', async () => {
  const f = fixture()
  pendingFutu(f.vault, 'original')
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp' })
  pendingFutu(f.vault, 'stale-other-login')
  await f.service.createAuthorization({ authId:auth.id, connector:'futu', transport:'mcp' })
  assert.equal(f.vault.get(auth.id).mcpToken, 'original')
})

test('a config-only endpoint change cannot repoint an authorization with imported accounts', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp', config:{ mcpEndpoint:'https://mcp.futunn.com' } })
  await f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:0, enabled:true })
  await assert.rejects(f.service.createAuthorization({ authId:auth.id, connector:'futu', transport:'mcp', config:{ mcpEndpoint:'https://attacker.example' } }), /重新授权/)
  assert.equal(f.service.list().authorizations[0].config.mcpEndpoint, 'https://mcp.futunn.com')
})

test('request bodies cannot override where an authorization sends its token', async () => {
  let seen = []
  const f = fixture({ listAccounts: async source => { seen.push(source.mcpEndpoint || 'default'); return { accounts:[{ id:'A1', name:'富途账户' }], warnings:[] } } })
  pendingFutu(f.vault)
  const { auth } = await f.service.createAuthorization({ connector:'futu', transport:'mcp', config:{ mcpEndpoint:'https://mcp.futunn.com' } })
  await assert.rejects(f.service.listAccounts({ authId:auth.id, mcpEndpoint:'https://attacker.example' }), /授权统一管理/)
  await assert.rejects(f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:0, enabled:true, mcpEndpoint:'https://attacker.example' }), /授权统一管理/)
  assert.equal(seen.length, 0)
  await f.service.connectSource({ authId:auth.id, brokerAccountId:'A1', intervalMinutes:0, enabled:true })
  assert.ok(seen.every(endpoint => endpoint === 'https://mcp.futunn.com'))
  assert.equal(f.service.list().sources[0].mcpEndpoint, 'https://mcp.futunn.com')
})

test('adopting a migrated THS authorization still imports a second book', async () => {
  const f = fixture({
    listAccounts: async () => ({ accounts:[{ id:'book1', name:'账本一', thsType:'common' },{ id:'book2', name:'账本二', thsType:'manFund' }], warnings:[] }),
  }, {
    sources:[{ id:'SRC_A', name:'旧连接', connector:'ths', transport:'native', accountId:'ACC1', portfolioId:'book1', thsBookType:'common' }],
    authorizations:[{ id:'SRC_A', connector:'ths', transport:'native', label:'同花顺 · 旧连接', config:{}, accounts:[], legacy:true, authorizedAt:null }],
  })
  f.vault.set('SRC_A','ths',{ cookie:'old-login' })
  const adopted = await f.service.createAuthorization({ authId:'SRC_A', connector:'ths', transport:'native' })
  assert.equal(adopted.auth.legacy, false)
  assert.equal(adopted.auth.config.portfolioId, undefined)
  const second = await f.service.connectSource({ authId:'SRC_A', portfolioId:'book2', thsBookType:'manFund' })
  const stored = f.sources().find(source => source.accountId === second.account.id)
  assert.equal(stored.portfolioId, 'book2')
  assert.equal(stored.thsBookType, 'manFund')
  assert.equal(stored.authId, 'SRC_A')
})

test('MCP endpoints reject embedded credentials and secret query keys', async () => {
  const f = fixture()
  pendingFutu(f.vault)
  await assert.rejects(f.service.createAuthorization({ connector:'futu', transport:'mcp', config:{ mcpEndpoint:'https://user:' + 'pw' + '@mcp.futunn.com' } }), /凭据/)
  await assert.rejects(f.service.createAuthorization({ connector:'futu', transport:'mcp', config:{ mcpEndpoint:'https://mcp.futunn.com?access_token=abc' } }), /凭据/)
  assert.equal(f.service.list().authorizations.length, 0)
})
