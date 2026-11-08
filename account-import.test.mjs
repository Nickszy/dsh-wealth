import test from 'node:test'
import assert from 'node:assert/strict'
import {createSyncService} from './sync.mjs'
const clone=x=>structuredClone(x)
const snap=(symbol='600000',extra={})=>({holdings:[{symbol,name:'来源持仓',market:'CN',assetClass:'stock',currency:'CNY',qty:100,avgCost:10,manualPrice:12}],complete:true,warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null,...extra})
function fixture(overrides={}){
 let ledger={version:1,baseCurrency:'CNY',fx:{CNY:1,USD:7,HKD:.9},accounts:[],instruments:[],holdings:[],trades:[],snapshots:[],updatedAt:null},sources=[],writes=0,reads=0,fetches=0
 const secrets={}
 const vault={get:id=>clone(secrets[id]||{}),set:(id,_kind,value)=>{secrets[id]={...(secrets[id]||{}),...value}},remove:id=>{delete secrets[id]},configured:id=>Object.keys(secrets[id]||{}).length>0}
 const config={read:()=>clone(sources),write:rows=>{sources=clone(rows)}}
 const options={credentials:vault,config,load:()=>clone(ledger),save:db=>{writes++;ledger=clone(db)},listAccounts:async()=>{reads++;return {accounts:[{id:'book1',name:'官方股票账户一',currency:'CNY'},{id:'book2',name:'官方股票账户二',currency:'CNY'}],warnings:[]}},fetchSnapshot:async source=>{fetches++;return snap(source.portfolioId==='book2'?'600001':'600000')},...overrides}
 const service=createSyncService({get:()=>null},options)
 const source=(id='book1')=>({connector:'ths',transport:'native',portfolioId:id})
 return {service,source,options,config,vault,secrets,db:()=>clone(ledger),counts:()=>({writes,reads,fetches})}
}
test('login-discovered source imports account and holdings with no pre-created local account or binding input',async()=>{
 const f=fixture()
 const listed=await f.service.listAccounts({connector:'ths'})
 assert.equal(listed.accounts.length,2);assert.equal(f.db().accounts.length,0)
 const result=await f.service.connectSource(f.source('book2'),{cookie:'userid=fixture; v=test'})
 assert.equal(result.created,true);assert.equal(result.account.name,'官方股票账户二');assert.equal(result.account.currency,'CNY');assert.equal(result.account.externalAccountId,'book2')
 assert.equal(result.ledger.holdings[0].qty,100);assert.equal(result.ledger.instruments[0].symbol,'600001')
 assert.equal(result.source.accountId,result.account.id);assert.equal(result.source.lastStatus,'ok');assert.equal(result.source.intervalMinutes,15)
 assert.equal(f.counts().writes,1);assert.ok(!JSON.stringify(result).includes('userid=fixture'))
})
test('duplicate import reuses the already imported account without fetching or saving again',async()=>{
 const f=fixture();const first=await f.service.connectSource(f.source())
 const second=await f.service.connectSource(f.source())
 assert.equal(second.created,false);assert.equal(second.alreadyImported,true);assert.equal(first.account.id,second.account.id)
 assert.deepEqual(f.counts(),{writes:1,reads:1,fetches:1});assert.equal(f.db().accounts.length,1)
 const listed=await f.service.listAccounts({connector:'ths'})
 assert.equal(listed.accounts[0].imported,true);assert.equal(listed.accounts[0].accountName,'官方股票账户一');assert.equal(listed.accounts[1].imported,false)
})
test('separate source accounts become separate accounts with the corresponding holdings',async()=>{
 const f=fixture();await f.service.connectSource(f.source());await f.service.connectSource(f.source('book2'))
 assert.equal(f.db().accounts.length,2);assert.equal(f.db().holdings.length,2);assert.equal(f.config.read().length,2)
 for(const s of f.config.read()){const a=f.db().accounts.find(x=>x.id===s.accountId);assert.equal(a.externalAccountId,s.portfolioId)}
})
test('explicit source selection and current account ownership are verified before persistence',async()=>{
 const f=fixture()
 await assert.rejects(f.service.connectSource({connector:'ths'}),/明确选择/)
 await assert.rejects(f.service.connectSource(f.source('not-owned')),/不属于/)
 assert.equal(f.counts().writes,0);assert.equal(f.counts().fetches,0);assert.equal(f.db().accounts.length,0);assert.equal(f.config.read().length,0)
})
test('failed authentication or bad snapshot leaves no empty accounts or source records',async()=>{
 for(const overrides of [{listAccounts:async()=>{throw Error('login expired')}}]){
 const f=fixture(overrides);await assert.rejects(f.service.connectSource(f.source()));assert.equal(f.db().accounts.length,0);assert.equal(f.db().holdings.length,0);assert.equal(f.config.read().length,0);assert.equal(f.counts().writes,0)
 }
})
test('slow or failing first snapshot still creates the account, reports syncError, and auto-sync can recover',async()=>{
 const f=fixture({fetchSnapshot:async()=>{throw Error('富途 MCP 请求超时')}})
 const result=await f.service.connectSource(f.source())
 assert.equal(result.created,true);assert.match(result.syncError,/账户已创建.*富途 MCP 请求超时/)
 assert.equal(f.db().accounts.length,1);assert.equal(f.db().holdings.length,0);assert.equal(f.config.read().length,1)
 assert.equal(f.config.read()[0].lastStatus,'error');assert.match(f.config.read()[0].lastError,/超时/)
 // 恢复后手动同步即可补上持仓。
 f.options.fetchSnapshot=async()=>snap('600000')
 await f.service.sync(f.config.read()[0].id)
 assert.equal(f.db().holdings.length,1)
})
test('invalid connection settings leave staged account unpublished',async()=>{
 const f=fixture();await assert.rejects(f.service.connectSource({...f.source(),intervalMinutes:1}),/间隔/)
 assert.equal(f.db().accounts.length,0);assert.equal(f.config.read().length,0)
})
test('config persistence failure rolls back source credentials before any ledger write',async()=>{
 const f=fixture();const original=f.config.write
 f.config.write=rows=>{if(rows.length)throw Error('disk error');original(rows)}
 await assert.rejects(f.service.connectSource(f.source(),{cookie:'userid=fixture; v=test'}),/disk/)
 assert.equal(f.db().accounts.length,0);assert.equal(f.config.read().length,0);assert.equal(Object.keys(f.secrets).length,0);assert.equal(f.counts().writes,0)
})
test('ledger persistence failure restores prior config and removes new credential record',async()=>{
 const f=fixture({save:()=>{throw Error('ledger disk error')}})
 await assert.rejects(f.service.connectSource(f.source(),{cookie:'userid=fixture; v=test'}),/disk/)
 assert.equal(f.db().accounts.length,0);assert.equal(f.config.read().length,0);assert.equal(Object.keys(f.secrets).length,0)
})
test('concurrent import clicks share one request and cannot create duplicate accounts',async()=>{
 let release
 const f=fixture({listAccounts:()=>new Promise(resolve=>{release=resolve})})
 const a=f.service.connectSource(f.source()),b=f.service.connectSource(f.source());assert.equal(a,b)
 await Promise.resolve();assert.equal(f.db().accounts.length,0)
 release({accounts:[{id:'book1',name:'选择的账户',currency:'CNY'}],warnings:[]})
 await Promise.all([a,b]);assert.equal(f.db().accounts.length,1);assert.equal(f.counts().writes,1)
})
test('unknown account display currency defaults to base without requiring another user decision',async()=>{
 const f=fixture({listAccounts:async()=>({accounts:[{id:'lb',name:'长桥账户'}],warnings:[]})})
 const result=await f.service.connectSource({connector:'longbridge',brokerAccountId:'lb'},{appKey:'test-app',appSecret:'test-secret',accessToken:'test-token'})
 assert.equal(result.account.currency,'CNY');assert.equal(result.account.name,'长桥账户')
})
test('Longbridge channel labels are scoped to authenticated app identity for duplicate detection',async()=>{
 const f=fixture({listAccounts:async(_s,secrets)=>({accounts:[{id:'lb',name:secrets.appKey==='app1'?'账号一':'账号二'}],warnings:[]})})
 const source={connector:'longbridge',brokerAccountId:'lb'}
 await f.service.connectSource(source,{appKey:'app1',appSecret:'secret',accessToken:'token1'})
 const creds={appKey:'app2',appSecret:'secret',accessToken:'token2'}
 const listed=await f.service.listAccounts(source,creds);assert.equal(listed.accounts[0].imported,false)
 await f.service.connectSource(source,creds);assert.equal(f.db().accounts.length,2)
})
test('disposing during account discovery cannot publish an account',async()=>{
 let release
 const f=fixture({listAccounts:()=>new Promise(resolve=>{release=resolve})})
 const work=f.service.connectSource(f.source());await Promise.resolve();f.service.dispose()
 release({accounts:[{id:'book1',name:'account',currency:'CNY'}],warnings:[]})
 await assert.rejects(work,/中止/);assert.equal(f.counts().writes,0);assert.equal(f.config.read().length,0)
})
