import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createSyncService,mergeSnapshot,sourceStore} from './sync.mjs'
import {applyOp} from './store.mjs'
const row=(symbol='00700',extra={})=>({symbol,name:'测试标的',market:'HK',assetClass:'stock',currency:'HKD',qty:100,avgCost:300,manualPrice:400,...extra})
const snapshot=(holdings=[row()],extra={})=>({holdings,complete:true,warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null,...extra})
function setup(extra={}) {
 let ledger={baseCurrency:'CNY',fx:{CNY:1,HKD:.9,USD:7},accounts:[{id:'a',name:'港股',currency:'HKD'},{id:'b',name:'人民币',currency:'CNY'}],instruments:[],holdings:[],trades:[],snapshots:[],updatedAt:null}
 let records=[],clock=Date.parse('2026-11-07T00:00:00Z'),writes=0
 const config={read:()=>structuredClone(records),write:all=>{records=structuredClone(all)}}
 const entries={}
 const credentials={get:id=>structuredClone(entries[id]||{}),set:(id,_kind,value)=>{entries[id]={...(entries[id]||{}),...value}},remove:id=>{delete entries[id]},configured:id=>Object.keys(entries[id]||{}).length>0}
 const service=createSyncService({get:()=>null},{config,credentials,load:()=>structuredClone(ledger),save:db=>{writes++;ledger=structuredClone({...db,updatedAt:new Date(clock).toISOString()})},now:()=>clock,fetchSnapshot:async()=>snapshot(),...extra})
 const source={name:'连接',connector:'custom',transport:'http',accountId:'a',url:'http://127.0.0.1:3333/snapshot',intervalMinutes:0,enabled:true}
 return {service,source,config,credentials,db:()=>structuredClone(ledger),setDb:db=>{ledger=db},writes:()=>writes,advance:n=>{clock+=n},add:over=>service.saveSource({...source,...over}).sources.at(-1)}
}
test('persistent source config stores references and survives reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wealth-sources-'))
 try{const a=sourceStore(dir);a.write([{id:'test',credentialRef:'TEST_ENV'}]);a.write([{id:'next'}]);assert.deepEqual(sourceStore(dir).read(),[{id:'next'}]);assert.match(readFileSync(join(dir,'sources.json.bak'),'utf8'),/TEST_ENV/)}finally{rmSync(dir,{recursive:true,force:true})}
})
test('configuration validates empty accounts, intervals, credentials and transports',()=>{
 const f=setup()
 for(const override of [{accountId:'missing'},{intervalMinutes:1},{intervalMinutes:1441},{enabled:'true'},{connector:'unknown'},{url:'http://remote.example/positions'},{url:'https://user:pass@example.com/'},{url:'https://example.com/?token=secret'},{credentialRef:'actual secret'},{transport:'mcp',toolName:'mcp__broker__place_order'},{transport:'mcp',toolName:'mcp__broker__get_positions',args:{token:'secret'}}])assert.throws(()=>f.add(override))
 const db=f.db();applyOp(db,'holding.upsert',{...row(),accountId:'a'});f.setDb(db)
 assert.throws(()=>f.add(),/空账户/);assert.equal(f.config.read().length,0)
})
test('native THS connection requires explicit portfolio and CNY; duplicate portfolio blocked',()=>{
 const f=setup()
 assert.throws(()=>f.add({connector:'ths',portfolioId:'book'}),/CNY/)
 assert.throws(()=>f.add({connector:'ths',accountId:'b'}),/账本/)
 f.add({connector:'ths',accountId:'b',portfolioId:'book'})
 const db=f.db();db.accounts.push({id:'c',name:'second',currency:'CNY'});f.setDb(db)
 assert.throws(()=>f.add({connector:'ths',accountId:'c',portfolioId:'book'}),/重复/)
})
test('successful repeated refresh updates managed holdings, not duplicates, and retains status',async()=>{
 const f=setup();const src=f.add();let r=await f.service.sync(src.id)
 assert.equal(r.ledger.holdings.length,1);assert.equal(r.ledger.holdings[0].syncSourceId,src.id);assert.equal(r.source.lastStatus,'ok');assert.equal(r.imported,1)
 r=await f.service.sync(src.id);assert.equal(r.ledger.holdings.length,1);assert.equal(f.writes(),2)
 assert.equal(f.service.list().sources[0].lastError,null)
})
test('full snapshots prune disappeared managed holdings; partial snapshots retain them',()=>{
 let db=setup().db(),src={id:'s',accountId:'a'}
 db=mergeSnapshot(db,src,snapshot([row(),row('09988')])).ledger
 db=mergeSnapshot(db,src,snapshot([row()],{complete:false,warnings:['PARTIAL']})).ledger
 assert.equal(db.holdings.length,2)
 db=mergeSnapshot(db,src,snapshot([])).ledger
 assert.equal(db.holdings.length,0)
})
test('invalid snapshot and unmanaged conflicts leave original ledger intact',()=>{
 const src={id:'s',accountId:'a'},db=setup().db()
 applyOp(db,'holding.upsert',{...row(),accountId:'a'})
 const before=structuredClone(db)
 assert.throws(()=>mergeSnapshot(db,src,snapshot()),/独立空账户/)
 assert.throws(()=>mergeSnapshot(db,src,snapshot([row('A',{qty:null})])))
 assert.deepEqual(db,before)
})
test('failed fetch or malformed snapshot never writes or clears saved holdings',async()=>{
 let fail=false
 const f=setup({fetchSnapshot:async()=>{if(fail)throw Error('expired authorization');return snapshot()}})
 const src=f.add();await f.service.sync(src.id);const saved=f.db();fail=true
 await assert.rejects(f.service.sync(src.id));assert.deepEqual(f.db(),saved);assert.equal(f.writes(),1)
 assert.equal(f.service.list().sources[0].lastStatus,'error');assert.ok(f.service.list().sources[0].lastSuccessAt)
})
test('history attached to snapshots archives only and remains idempotent',()=>{
 const db=setup().db(),src={id:'s',accountId:'a'},trade={...row(),qty:10,side:'buy',price:300,date:'2026-11-06',externalId:'fill1'}
 let merged=mergeSnapshot(db,src,snapshot([row()],{trades:[trade]})).ledger
 merged=mergeSnapshot(merged,src,snapshot([row()],{trades:[trade]})).ledger
 assert.equal(merged.holdings[0].qty,100);assert.equal(merged.trades.length,1);assert.equal(merged.trades[0].appliedToHoldings,false)
})
test('overlapping refresh requests share one fetch; config changes blocked during refresh',async()=>{
 let resolve,calls=0
 const f=setup({fetchSnapshot:()=>{calls++;return new Promise(r=>{resolve=r})}}),src=f.add()
 const a=f.service.sync(src.id),b=f.service.sync(src.id);assert.equal(a,b)
 await Promise.resolve();assert.equal(calls,1)
 assert.throws(()=>f.service.saveSource({...src,enabled:false}),/正在同步/)
 assert.throws(()=>f.service.removeSource(src.id),/正在同步/)
 resolve(snapshot());await a;assert.equal(f.writes(),1)
})
test('fetch does not clobber other ledger edits made while awaiting network',async()=>{
 let resolve
 const f=setup({fetchSnapshot:()=>new Promise(r=>{resolve=r})}),src=f.add()
 const work=f.service.sync(src.id);await Promise.resolve()
 const db=f.db();db.accounts[1].name='用户最新名称';applyOp(db,'holding.upsert',{accountId:'b',symbol:'600000',market:'CN',qty:2,avgCost:10,manualPrice:12});f.setDb(db)
 resolve(snapshot());await work
 assert.equal(f.db().accounts[1].name,'用户最新名称');assert.equal(f.db().holdings.length,2)
})
test('scheduler respects enabled, zero interval, due time and failed backoff',async()=>{
 let calls=0,fail=false
 const f=setup({fetchSnapshot:async()=>{calls++;if(fail)throw Error('offline');return snapshot()}}),src=f.add()
 await f.service.tick();assert.equal(calls,0)
 f.service.saveSource({...src,intervalMinutes:5});await f.service.tick();assert.equal(calls,1)
 await f.service.tick();assert.equal(calls,1)
 f.advance(5*60000);fail=true;await f.service.tick();assert.equal(calls,2)
 await f.service.tick();assert.equal(calls,2)
 f.service.saveSource({...f.service.list().sources[0],enabled:false});f.advance(6*60000);await f.service.tick();assert.equal(calls,2)
})
test('older upstream timestamps and margin liabilities cannot overwrite stored values',async()=>{
 let uploadedAt='2026-11-06T20:00:00Z'
 const f=setup({fetchSnapshot:async()=>snapshot([row()],{uploadedAt})}),src=f.add();await f.service.sync(src.id)
 const before=f.db();uploadedAt='2026-11-05T20:00:00Z'
 await assert.rejects(f.service.sync(src.id),/早于/);assert.deepEqual(f.db(),before)
 assert.throws(()=>mergeSnapshot(before,src,snapshot([row()],{sourceTotals:{totalLiability:1}})),/负债/)
})
test('removing connection keeps data and detaches ownership',async()=>{
 const f=setup(),src=f.add();await f.service.sync(src.id);f.service.removeSource(src.id)
 assert.equal(f.service.list().sources.length,0);assert.equal(f.db().holdings.length,1);assert.equal(f.db().holdings[0].syncSourceId,undefined)
})
test('remote identity cannot change after import and mix partial snapshots across accounts',async()=>{
 const f=setup(),src=f.add();await f.service.sync(src.id)
 const before=f.db()
 assert.throws(()=>f.service.saveSource({...f.service.list().sources[0],url:'http://localhost:3333/other'}),/独立连接/)
 assert.deepEqual(f.db(),before)
})
test('timestamp-less partial snapshot never clears stale-data watermarks',async()=>{
 let uploadedAt='2026-11-07T00:00:00Z',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{uploadedAt,complete:uploadedAt!==null})}),src=f.add()
 await f.service.sync(src.id);uploadedAt=null;qty=150;await f.service.sync(src.id)
 assert.equal(f.service.list().sources[0].uploadedAt,null);assert.equal(f.service.list().sources[0].uploadedAtWatermark,'2026-11-07T00:00:00Z')
 uploadedAt='2026-11-06T00:00:00Z';qty=1;await assert.rejects(f.service.sync(src.id),/早于/);assert.equal(f.db().holdings[0].qty,150)
})
test('discovery rejects remote Futu hosts before loading or forwarding saved credentials',async()=>{
 let calls=0
 const f=setup({listAccounts:async()=>{calls++;return {accounts:[],warnings:[]}}})
 const src=f.add({connector:'futu',transport:'native',brokerAccountId:'123',tradeMarket:'HK',currency:'HKD'})
 f.credentials.set(src.id,'futu',{websocketKey:'stored-secret'})
 await assert.rejects(f.service.listAccounts({...src,host:'external.example'}),/本机/);assert.equal(calls,0)
})
test('sync errors surface the adapter reason with stored secrets redacted',async()=>{
 const f=setup({fetchSnapshot:async()=>{throw new Error('同花顺登录已失效，请重新登录或更新 Cookie：secret-cookie-token')}})
 const src=f.add({connector:'ths',transport:'native',accountId:'b',portfolioId:'book'})
 f.credentials.set(src.id,'ths',{cookie:'secret-cookie-token'})
 await assert.rejects(f.service.sync(src.id),/重新登录/)
 assert.equal(f.service.list().sources[0].lastError,'同花顺登录已失效，请重新登录或更新 Cookie：[已隐藏]')
})
test('fresh THS browser login renews a bound cookie only after account ownership verification',async()=>{
 const f=setup({listAccounts:async(_source,secrets)=>({accounts:secrets.cookie==='wrong-login'?[{id:'other',name:'other'}]:[{id:'book',name:'book'}],warnings:[]})})
 const src=f.add({connector:'ths',transport:'native',accountId:'b',portfolioId:'book'})
 f.credentials.set(src.id,'ths',{cookie:'expired-login'})
 await f.service.acceptThsLogin(src.id,'fresh-login');assert.equal(f.credentials.get(src.id).cookie,'fresh-login')
 await assert.rejects(f.service.acceptThsLogin(src.id,'wrong-login'),/不包含/);assert.equal(f.credentials.get(src.id).cookie,'fresh-login')
})
test('dispose aborts pending refresh and does not persist returned data',async()=>{
 let resolve,signal
 const f=setup({fetchSnapshot:(_src,s)=>{signal=s;return new Promise(r=>{resolve=r})}}),src=f.add(),work=f.service.sync(src.id)
 await Promise.resolve();f.service.dispose();assert.equal(signal.aborted,true);resolve(snapshot());await assert.rejects(work)
 assert.equal(f.writes(),0);await assert.rejects(f.service.sync(src.id))
})
test('HTTP uses GET with environment reference, no redirects or secret persistence',async()=>{
 process.env.WEALTH_TEST_TOKEN='private-fixture-token'
 let request
 const f=setup({fetchSnapshot:undefined,fetch:async(url,options)=>{request={url,options};return {ok:true,text:async()=>JSON.stringify(snapshot())}}})
 try{const src=f.add({credentialRef:'WEALTH_TEST_TOKEN'});await f.service.sync(src.id);assert.equal(request.options.method,'GET');assert.equal(request.options.headers.authorization,'Bearer private-fixture-token');assert.equal(request.options.redirect,'error');assert.ok(!JSON.stringify(f.service.list()).includes('private-fixture-token'))}finally{delete process.env.WEALTH_TEST_TOKEN}
})
test('native credentials persist separately, blank edits retain them, discovery never returns secrets',async()=>{
 const f=setup({listAccounts:async(source,secrets)=>{assert.equal(source.connector,'longbridge');assert.equal(secrets.appSecret,'native-secret');return {accounts:[{id:'lb',name:'原生通道'}],warnings:[]}}})
 const result=f.service.saveSource({...f.source,connector:'longbridge',transport:'native',brokerAccountId:'lb'},{appKey:'native-key',appSecret:'native-secret',accessToken:'native-token'})
 const src=result.sources[0];assert.equal(src.transport,'native');assert.equal(src.credentialsConfigured,true);assert.ok(!JSON.stringify(result).includes('native-secret'))
 f.service.saveSource({...src,enabled:false},{appSecret:''});assert.equal(f.credentials.get(src.id).appSecret,'native-secret')
 const found=await f.service.listAccounts({...src},{});assert.equal(found.accounts[0].id,'lb');assert.ok(!JSON.stringify(found).includes('native-secret'))
 assert.throws(()=>f.service.saveSource({...src,cookie:'inline-secret'}),/独立/)
})
test('THS saved connection captures verified pending login without another plugin',()=>{
 const f=setup();f.credentials.set('pending-ths','ths',{cookie:'userid=test; v=fixture'})
 const src=f.add({connector:'ths',transport:'native',accountId:'b',portfolioId:'book'})
 assert.equal(src.credentialsConfigured,true);assert.equal(f.credentials.get(src.id).cookie,'userid=test; v=fixture');assert.equal(src.cookie,undefined)
})
test('native source settings require explicit broker selection and valid connection parameters',()=>{
 const f=setup()
 for(const config of [{connector:'futu',transport:'native'},{connector:'futu',transport:'native',brokerAccountId:'123',host:'remote.example',tradeMarket:'HK',currency:'HKD'},{connector:'ib',transport:'native'},{connector:'longbridge',transport:'native'}])assert.throws(()=>f.add(config))
 const src=f.add({connector:'futu',transport:'native',brokerAccountId:'123',tradeEnvironment:'REAL',tradeMarket:'HK',currency:'HKD'})
 assert.equal(src.port,33333)
})
test('MCP executes exact registered tool through host policies and unwraps structured content',async()=>{
 let exec
 const ctx={get:n=>n==='tools'?{get:name=>name==='mcp__broker__get_positions'?{}:null,execute:async input=>{exec=input;return {isError:false,value:{structuredContent:snapshot(),content:[]}}}}:null}
 const f=setup({fetchSnapshot:undefined}),service=createSyncService(ctx,{config:f.config,credentials:f.credentials,load:f.db,save:f.setDb})
 const src=service.saveSource({...f.source,transport:'mcp',toolName:'mcp__broker__get_positions',args:{account_id:'123'}}).sources[0]
 await service.sync(src.id);assert.equal(exec.name,'mcp__broker__get_positions');assert.equal(exec.arguments.account_id,'123');assert.equal(exec.parent,undefined);assert.equal(f.db().holdings.length,1)
})
test('MCP host rejection is not bypassed and leaves existing ledger unchanged',async()=>{
 const f=setup({fetchSnapshot:undefined,callTool:async()=>({isError:true,error:{code:'APPROVAL_REQUIRED'}})}),src=f.add({transport:'mcp',toolName:'mcp__broker__get_positions',args:{}})
 await assert.rejects(f.service.sync(src.id),/MCP/);assert.equal(f.writes(),0)
})
test('THS fund book type is stored, validated and deduplicated separately from a stock book on the same id',()=>{
 const f=setup()
 const db=f.db();db.accounts.push({id:'fund1',name:'基金账户',currency:'CNY'},{id:'fund2',name:'另一基金',currency:'CNY'});f.setDb(db)
 const stock=f.service.saveSource({name:'股票账本',connector:'ths',accountId:'b',portfolioId:'book1',enabled:true}).sources.at(-1)
 assert.equal(stock.thsBookType,'common')
 const fund=f.service.saveSource({name:'爱基金',connector:'ths',accountId:'fund1',portfolioId:'book1',thsBookType:'ijj',enabled:true}).sources.at(-1)
 assert.equal(fund.thsBookType,'ijj');assert.equal(fund.portfolioId,'book1')
 assert.throws(()=>f.service.saveSource({name:'坏类型',connector:'ths',accountId:'fund2',portfolioId:'book2',thsBookType:'bogus',enabled:true}),/类型无效/)
 assert.throws(()=>f.service.saveSource({name:'重复基金',connector:'ths',accountId:'fund2',portfolioId:'book1',thsBookType:'ijj',enabled:true}),/已绑定/)
})
test('THS discovery annotates each book with thsType and connectSource forwards thsBookType',async()=>{
 let seenSource=null
 const f=setup({listAccounts:async(source)=>{seenSource=source;return {accounts:[{id:'book1',name:'股票账户',thsType:'common'},{id:'100108832246',name:'爱基金',thsType:'ijj'}],warnings:[]}}})
 const found=await f.service.listAccounts({connector:'ths',transport:'native',accountId:'b'},{})
 assert.deepEqual(found.accounts.map(a=>[a.id,a.thsType]),[['book1','common'],['100108832246','ijj']])
 f.setDb((()=>{const d=f.db();d.accounts.push({id:'fund1',name:'基金',currency:'CNY'});return d})())
 const r=await f.service.connectSource({name:'爱基金',connector:'ths',accountId:'fund1',portfolioId:'100108832246',thsBookType:'ijj'},{cookie:'userid=123; v=fixture'})
 assert.equal(r.source.thsBookType,'ijj');assert.equal(r.source.portfolioId,'100108832246')
 assert.equal(r.account.name,'爱基金');assert.equal(r.created,true)
})
