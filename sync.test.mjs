import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createSyncService,mergeSnapshot,snapshotContentHash,sourceStore} from './sync.mjs'
import {applyOp} from './store.mjs'
const row=(symbol='00700',extra={})=>({symbol,name:'测试标的',market:'HK',assetClass:'stock',currency:'HKD',qty:100,avgCost:300,manualPrice:400,...extra})
const snapshot=(holdings=[row()],extra={})=>({holdings,complete:true,warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null,...extra})
function setup(extra={}) {
 let ledger={baseCurrency:'CNY',fx:{CNY:1,HKD:.9,USD:7},accounts:[{id:'a',name:'港股',currency:'HKD'},{id:'b',name:'人民币',currency:'CNY'}],instruments:[],holdings:[],trades:[],snapshots:[],updatedAt:null}
 // 基准时钟取工作日（周五）：tick 在周六/周日默认跳过自动同步，周末行为由专门测试注入 clockStart 覆盖。
 let records=[],clock=extra.clockStart ?? Date.parse('2026-11-06T00:00:00Z'),writes=0
 const config={read:()=>structuredClone(records),write:all=>{records=structuredClone(all)}}
 const entries={}
 const credentials={get:id=>structuredClone(entries[id]||{}),set:(id,_kind,value)=>{entries[id]={...(entries[id]||{}),...value}},remove:id=>{delete entries[id]},configured:id=>Object.keys(entries[id]||{}).length>0}
 const service=createSyncService({get:()=>null},{config,credentials,load:()=>structuredClone(ledger),save:db=>{writes++;ledger=structuredClone({...db,updatedAt:new Date(clock).toISOString()})},now:()=>clock,fetchSnapshot:async()=>snapshot(),// 目录核验默认断网：把新标的降级为「待确认」，不影响同步结果断言。
 catalogFetch:extra.catalogFetch ?? (async()=>{throw new Error('catalog offline')}),...extra})
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

test('a new security is verified into the local catalog before the holding is merged', async () => {
 const catalog = async (url) => {
  if (String(url).includes('fundsuggest')) return { ok: true, status: 200, json: async () => ({ Datas: [{ CODE: '600519', NAME: '贵州茅台', CATEGORYDESC: '沪市', FundBaseInfo: null }] }) }
  if (String(url).includes('push2')) return { ok: true, status: 200, json: async () => ({ data: { f127: '白酒Ⅱ' } }) }
  throw new Error('unexpected catalog fetch ' + url)
 }
 const f = setup({ fetchSnapshot: async () => snapshot([row('600519', { name: '茅台', market: 'CN', assetClass: 'stock', currency: 'CNY' })]), catalogFetch: catalog })
 const src = f.add()
 const r = await f.service.sync(src.id)
 const [instrument] = r.ledger.instruments
 assert.equal(instrument.verification.status, 'verified', 'ingest confirms the identity against the public catalog')
 assert.equal(instrument.securityType, 'A股')
 assert.equal(instrument.sector, '白酒Ⅱ')
 assert.equal(instrument.name, '茅台', 'a name supplied by the source is kept')
 assert.equal(r.ledger.holdings[0].instrumentId, instrument.id, 'the holding attaches to the catalog entry')
})

test('an unreachable catalog degrades to a pending entry without failing the sync', async () => {
 const f = setup({ fetchSnapshot: async () => snapshot([row('600519', { market: 'CN', assetClass: 'stock', currency: 'CNY' })]) })
 const src = f.add()
 const r = await f.service.sync(src.id)
 assert.equal(r.source.lastStatus, 'ok')
 assert.equal(r.ledger.instruments[0].verification.status, 'pending')
 assert.match(r.ledger.instruments[0].verification.reason, /核验查询失败/)
 assert.equal(r.ledger.holdings.length, 1, 'the position is still imported')
})

test('sync keeps a hand price, stores the broker price separately, and applies external quotes',async()=>{
 const f=setup({refreshQuotes:async db=>{ for(const h of db.holdings){ h.quotePrice=321; h.quoteAt='2026-11-09T08:00:00Z'; h.quoteSource='tencent' } return {updated:db.holdings.length} }})
 const src=f.add()
 await f.service.sync(src.id)
 const db=f.db(); db.holdings[0].manualPrice=88; f.setDb(db)
 const r=await f.service.sync(src.id)
 const h=r.ledger.holdings[0]
 assert.equal(h.manualPrice,88)
 assert.equal(h.sourcePrice,400)
 assert.equal(h.quotePrice,321)
 assert.equal(h.quoteSource,'tencent')
})

test('a quote refresh failure does not fail the sync or clear the saved holding',async()=>{
 const f=setup({refreshQuotes:async()=>{ throw new Error('quotes down') }})
 const src=f.add()
 const r=await f.service.sync(src.id)
 assert.equal(r.source.lastStatus,'ok')
 assert.equal(r.ledger.holdings.length,1)
 assert.equal(r.ledger.holdings[0].quotePrice ?? null, null)
 assert.equal(r.ledger.holdings[0].sourcePrice,400)
})

test('sync status is partial only for degraded warnings or incomplete coverage',async()=>{
 let warnings=[{code:'QUOTE_DATE_UNAVAILABLE',severity:'info',message:'缺少行情日期'}]
 const f=setup({fetchSnapshot:async()=>snapshot([row()],{warnings})}),src=f.add()
 let r=await f.service.sync(src.id)
 assert.equal(r.source.lastStatus,'ok')
 assert.deepEqual(r.source.warnings,['缺少行情日期'])
 assert.deepEqual(r.source.warningDetails,[{code:'QUOTE_DATE_UNAVAILABLE',severity:'info',message:'缺少行情日期'}])
 warnings=[{code:'STOCK_FETCH_FAILED',severity:'degraded',message:'股票段读取失败'}]
 r=await f.service.sync(src.id)
 assert.equal(r.source.lastStatus,'partial')
 assert.equal(r.source.warningDetails[0].severity,'degraded')
 // 覆盖不完整即使只有 info 警告也标 partial。
 warnings=[]
 const g=setup({fetchSnapshot:async()=>snapshot([row()],{coverage:{stock:'partial'}})}),src2=g.add()
 assert.equal((await g.service.sync(src2.id)).source.lastStatus,'partial')
})
test('connectSource computes initial status by warning severity and persists v2 fields',async()=>{
 const f=setup({
  listAccounts:async()=>({accounts:[{id:'book',name:'股票账户',thsType:'common'}],warnings:[]}),
  fetchSnapshot:async()=>snapshot([row()],{warnings:[{code:'QUOTE_DATE_UNAVAILABLE',severity:'info',message:'缺少行情日期'}]}),
 })
 const r=await f.service.connectSource({connector:'ths',transport:'native',accountId:'b',portfolioId:'book'},{cookie:'test-cookie'})
 assert.equal(r.source.lastStatus,'ok')
 assert.equal(r.source.warningDetails[0].severity,'info')
 assert.equal(r.source.coverage,null)
})
test('full snapshots prune disappeared managed holdings; partial snapshots retain them',()=>{
 let db=setup().db(),src={id:'s',accountId:'a'}
 db=mergeSnapshot(db,src,snapshot([row(),row('09988')])).ledger
 db=mergeSnapshot(db,src,snapshot([row()],{complete:false,warnings:['PARTIAL']})).ledger
 assert.equal(db.holdings.length,2)
 db=mergeSnapshot(db,src,snapshot([])).ledger
 assert.equal(db.holdings.length,0)
})
test('coverage pruning deletes only vanished holdings whose segment is full',()=>{
 let db=setup().db(),src={id:'s',accountId:'a'}
 const bond=row('B1',{name:'债券',market:'CN',assetClass:'bond',currency:'CNY'})
 const etf=row('510300',{name:'ETF',market:'CN',assetClass:'etf',currency:'CNY'})
 db=mergeSnapshot(db,src,snapshot([row('00700'),row('09988'),bond,etf])).ledger
 // stock full 段里的 09988、ETF（etf 归入 stock）消失后删除；bond failed 段的持仓保留。
 db=mergeSnapshot(db,src,{holdings:[row('00700')],coverage:{stock:'full',bond:'failed'},warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null}).ledger
 const symbols=ledger=>ledger.holdings.map(h=>ledger.instruments.find(i=>i.id===h.instrumentId).symbol).sort()
 assert.deepEqual(symbols(db),['00700','B1'])
 // 全部 full：消失的持仓全部删除。
 db=mergeSnapshot(db,src,{holdings:[row('00700')],coverage:{stock:'full',bond:'full'},warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null}).ledger
 assert.deepEqual(symbols(db),['00700'])
})
test('without coverage, complete snapshots still prune every vanished holding',()=>{
 // v1 行为保持不变（pin）：无 coverage 时仅看 complete。
 let db=setup().db(),src={id:'s',accountId:'a'}
 db=mergeSnapshot(db,src,snapshot([row('00700'),row('09988')])).ledger
 db=mergeSnapshot(db,src,snapshot([row('00700')],{complete:false})).ledger
 assert.equal(db.holdings.length,2)
 db=mergeSnapshot(db,src,snapshot([row('00700')])).ledger
 assert.equal(db.holdings.length,1)
})
test('core reconciliation warns on mismatching totals and cash, skips matching and multi-currency',()=>{
 const db=setup().db(),src={id:'s',accountId:'a'}
 const warningsOf=r=>r.snapshot.warnings.filter(w=>w.startsWith('TOTAL_MISMATCH'))
 // qty 100 × manualPrice 400 = 40000，完全一致不告警。
 let r=mergeSnapshot(db,src,snapshot([row()],{sourceTotals:{totalAsset:40000}}))
 assert.deepEqual(warningsOf(r),[])
 // 跨口径推导天然差几毛：0.5% 以内（40000 的 0.2% = 80）视为正常，不告警。
 r=mergeSnapshot(db,src,snapshot([row()],{sourceTotals:{totalAsset:40080}}))
 assert.deepEqual(warningsOf(r),[])
 // 超出相对容差（0.5% = 200）才告警，并同时写入结构化明细。
 r=mergeSnapshot(db,src,snapshot([row()],{sourceTotals:{totalAsset:40250}}))
 assert.equal(warningsOf(r).length,1)
 assert.ok(r.snapshot.warningDetails.some(d=>d.code==='TOTAL_MISMATCH:totalAsset'&&d.severity==='info'))
 // 跨价源推导差异只做提示：对账警告不能让健康来源变成 partial。
 assert.equal(r.snapshot.warningDetails.filter(d=>d.severity==='degraded').length, 0)
 // 多币种无法对总资产：跳过且不告警。
 const mixed=[row(),row('AAPL',{market:'US',currency:'USD',qty:1,avgCost:100,manualPrice:100})]
 r=mergeSnapshot(db,src,snapshot(mixed,{sourceTotals:{totalAsset:1}}))
 assert.deepEqual(warningsOf(r),[])
 // 单一现金行与 sourceTotals.cash 对账。
 const cash={symbol:'CASH:HKD',name:'现金',market:'CASH',assetClass:'cash',currency:'HKD',qty:500,avgCost:1,manualPrice:1}
 r=mergeSnapshot(db,src,snapshot([row(),cash],{sourceTotals:{cash:600}}))
 assert.ok(warningsOf(r).some(w=>w.startsWith('TOTAL_MISMATCH:cash')))
 r=mergeSnapshot(db,src,snapshot([row(),cash],{sourceTotals:{cash:500}}))
 assert.deepEqual(warningsOf(r),[])
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
 let uploadedAt='2026-11-06T20:00:00Z',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{uploadedAt})}),src=f.add();await f.service.sync(src.id)
 const before=f.db();uploadedAt='2026-11-05T20:00:00Z';qty=1
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
test('older quote date with identical content is accepted and stores the content hash',async()=>{
 let quoteDate='2026-11-06'
 const f=setup({fetchSnapshot:async()=>snapshot([row()],{quoteDate})}),src=f.add()
 const first=await f.service.sync(src.id)
 assert.equal(first.source.quoteDateWatermark,'2026-11-06')
 assert.match(first.source.snapshotHash,/^[0-9a-f]{64}$/)
 quoteDate='2026-11-05';const second=await f.service.sync(src.id)
 assert.equal(second.source.lastStatus,'ok');assert.equal(second.source.snapshotHash,first.source.snapshotHash)
 // 内容相同也不能让水位回退。
 assert.equal(second.source.quoteDateWatermark,'2026-11-06');assert.equal(f.db().holdings[0].qty,100)
})
test('older quote date with changed holdings is still rejected',async()=>{
 let quoteDate='2026-11-06',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{quoteDate})}),src=f.add()
 await f.service.sync(src.id);const before=f.db()
 quoteDate='2026-11-05';qty=50
 await assert.rejects(f.service.sync(src.id),/来源数据时间早于已保存快照，已保留原数据/)
 assert.deepEqual(f.db(),before)
})
test('stale replay matching stored ledger content is accepted without a stored hash',async()=>{
 let quoteDate='2026-11-06'
 const f=setup({fetchSnapshot:async()=>snapshot([row()],{quoteDate})}),src=f.add()
 await f.service.sync(src.id)
 const before=f.db()
 // 模拟迁移前的旧记录：数据已入库，但来源没有保存内容哈希。
 f.config.write(f.config.read().map(s=>({...s,snapshotHash:undefined})))
 quoteDate='2026-11-05'
 const r=await f.service.sync(src.id)
 assert.equal(r.source.lastStatus,'ok')
 // 经济字段不变（时间戳元数据会正常更新）。
 assert.deepEqual(f.db().holdings.map(h=>[h.qty,h.avgCost,h.manualPrice]),before.holdings.map(h=>[h.qty,h.avgCost,h.manualPrice]))
 assert.match(f.config.read()[0].snapshotHash,/^[0-9a-f]{64}$/)
})
test('stale changed content is rejected but records the observed hash for self-healing',async()=>{
 let quoteDate='2026-11-06',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{quoteDate})}),src=f.add()
 await f.service.sync(src.id)
 f.config.write(f.config.read().map(s=>({...s,snapshotHash:undefined})))
 quoteDate='2026-11-05';qty=50
 await assert.rejects(f.service.sync(src.id),/早于/)
 const record=f.config.read()[0]
 assert.equal(record.snapshotHash,snapshotContentHash(snapshot([row('00700',{qty:50})],{quoteDate:'2026-11-05'})))
 assert.equal(record.lastStatus,'error')
 assert.equal(f.db().holdings[0].qty,100)
})
test('immediate retry of the same stale content is accepted',async()=>{
 let quoteDate='2026-11-06',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{quoteDate})}),src=f.add()
 await f.service.sync(src.id)
 quoteDate='2026-11-05';qty=50
 await assert.rejects(f.service.sync(src.id),/早于/)
 // 第二次观测到同样的旧内容：视为当前真相，接受并入。
 const r=await f.service.sync(src.id)
 assert.equal(r.source.lastStatus,'ok');assert.equal(f.db().holdings[0].qty,50)
})
test('stale changed content still rejected when stored hash belongs to another content',async()=>{
 let quoteDate='2026-11-06',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{quoteDate})}),src=f.add()
 await f.service.sync(src.id)
 const before=f.db()
 quoteDate='2026-11-05';qty=50
 await assert.rejects(f.service.sync(src.id),/早于/)
 assert.notEqual(f.config.read()[0].snapshotHash,snapshotContentHash(snapshot([row('00700',{qty:100})],{quoteDate:'2026-11-06'})))
 assert.deepEqual(f.db().holdings,before.holdings)
})
test('newer quote date advances the watermark and replaces the content hash',async()=>{
 let quoteDate='2026-11-06',qty=100
 const f=setup({fetchSnapshot:async()=>snapshot([row('00700',{qty})],{quoteDate})}),src=f.add()
 const first=await f.service.sync(src.id)
 quoteDate='2026-11-08';qty=200
 const second=await f.service.sync(src.id)
 assert.equal(second.source.quoteDateWatermark,'2026-11-08');assert.notEqual(second.source.snapshotHash,first.source.snapshotHash)
 assert.equal(f.db().holdings[0].qty,200)
})
test('content hash is stable across runs and ignores query time, warnings and totals',async()=>{
 let run=0
 const f=setup({fetchSnapshot:async()=>snapshot([row()],{queriedAt:new Date(Date.parse('2026-11-07T00:00:00Z')+run*60000).toISOString(),warnings:['WARN'+(run++)],sourceTotals:{totalAsset:run}})}),src=f.add()
 const first=await f.service.sync(src.id),second=await f.service.sync(src.id)
 assert.match(first.source.snapshotHash,/^[0-9a-f]{64}$/)
 assert.equal(second.source.snapshotHash,first.source.snapshotHash)
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
test('auth failure sets needsReauth without failCount; tick skips it until manual success clears',async()=>{
 let calls=0,mode='ok' // 'ok' 成功 | 'net' 非认证失败 | 'auth' 认证失败
 const f=setup({fetchSnapshot:async()=>{calls++;if(mode==='auth')throw Error('401 unauthorized, token expired');if(mode==='net')throw Error('network down');return snapshot()}})
 const src=f.add({intervalMinutes:30})
 await f.service.tick();assert.equal(calls,1)
 let record=f.config.read()[0]
 assert.equal(record.lastStatus,'ok');assert.equal(record.failCount,0);assert.equal(record.needsReauth,false)
 // 非认证失败：failCount +1，不写 needsReauth。
 mode='net';f.advance(30*60000)
 await f.service.tick();assert.equal(calls,2)
 record=f.config.read()[0]
 assert.equal(record.lastStatus,'error');assert.equal(record.failCount,1);assert.equal(record.needsReauth,false)
 // 认证失败：写 needsReauth，failCount 不变。
 mode='auth';f.advance(5*60000) // failCount=1 → 退避 5 分钟
 await f.service.tick();assert.equal(calls,3)
 record=f.config.read()[0]
 assert.equal(record.lastStatus,'error');assert.equal(record.needsReauth,true);assert.equal(record.failCount,1)
 // tick 不再调度该来源。
 f.advance(600*60000);await f.service.tick();assert.equal(calls,3)
 // 手动同步仍然允许：再次认证失败也不累计 failCount。
 await assert.rejects(f.service.sync(src.id),/unauthorized/);assert.equal(calls,4)
 record=f.config.read()[0];assert.equal(record.failCount,1);assert.equal(record.needsReauth,true)
 // 手动同步成功：清除标志与退避计数，tick 恢复调度。
 mode='ok';await f.service.sync(src.id)
 record=f.config.read()[0]
 assert.equal(record.needsReauth,false);assert.equal(record.failCount,0);assert.equal(record.lastStatus,'ok')
 f.advance(30*60000);await f.service.tick();assert.equal(calls,6) // 标志清除后 tick 恢复调度
})
test('re-authorization clears needsReauth on bound sources only; fresh credentials via saveSource clear too',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'wealth-reauth-'))
 try{
  let ledger={version:1,baseCurrency:'CNY',fx:{CNY:1},accounts:[{id:'a',name:'人民币账户',currency:'CNY'},{id:'d',name:'另一人民币账户',currency:'CNY'}],instruments:[],holdings:[],trades:[],snapshots:[],updatedAt:null}
  const entries={}
  const credentials={get:id=>structuredClone(entries[id]||{}),set:(id,_kind,value)=>{entries[id]={...(entries[id]||{}),...value}},remove:id=>{delete entries[id]},configured:id=>Object.keys(entries[id]||{}).length>0}
  const config=sourceStore(dir)
  const service=createSyncService({get:()=>null},{config,credentials,load:()=>structuredClone(ledger),save:db=>{ledger=structuredClone(db)},listAccounts:async()=>({accounts:[{id:'book',name:'股票账本',thsType:'common'},{id:'book2',name:'另一账本',thsType:'common'}],warnings:[]}),fetchSnapshot:async()=>snapshot()})
  const bound=service.saveSource({name:'账本一',connector:'ths',transport:'native',accountId:'a',portfolioId:'book',intervalMinutes:15,enabled:true}).sources.at(-1)
  const other=service.saveSource({name:'账本二',connector:'ths',transport:'native',accountId:'d',portfolioId:'book2',intervalMinutes:15,enabled:true}).sources.at(-1)
  // 两个来源都处于「需重新授权」状态。
  config.write(config.read().map(s=>({...s,needsReauth:true,failCount:2})))
  // 重新授权 bound 所属的登录（legacy 来源：授权 id 即来源 id，按 connector 校验归属）。
  const {auth}=await service.createAuthorization({connector:'ths',authId:bound.id},{cookie:'fresh-cookie'})
  assert.equal(auth.legacy,false)
  let rows=config.read()
  assert.equal(rows.find(s=>s.id===bound.id).needsReauth,undefined)
  assert.equal(rows.find(s=>s.id===other.id).needsReauth,true) // 其他登录的来源不受影响
  // saveSource 存入新凭据同样清除该来源的标志并重置退避。
  service.saveSource({id:other.id,name:'账本二',connector:'ths',transport:'native',accountId:'d',portfolioId:'book2',intervalMinutes:15,enabled:true},{cookie:'fresh-cookie-2'})
  rows=config.read()
  assert.equal(rows.find(s=>s.id===other.id).needsReauth,false)
  assert.equal(rows.find(s=>s.id===other.id).failCount,0)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('empty sync errors use the generic hint without being treated as auth failures',async()=>{
 const f=setup({fetchSnapshot:async()=>{throw ''}}),src=f.add({intervalMinutes:5})
 await assert.rejects(f.service.sync(src.id),/同步失败，请检查连接/)
 const record=f.config.read()[0]
 assert.equal(record.needsReauth,undefined) // 通用提示里的「授权」只是排查建议
 assert.equal(record.failCount,1)
})
test('non-auth failures back off exponentially capped at the configured interval; success resets',async()=>{
 let calls=0,mode='net'
 const f=setup({fetchSnapshot:async()=>{calls++;if(mode==='net')throw Error('network down');return snapshot()}})
 const src=f.add({intervalMinutes:30})
 await f.service.tick();assert.equal(calls,1) // failCount 1 → 5 分钟
 assert.equal(f.config.read()[0].failCount,1)
 f.advance(4*60000);await f.service.tick();assert.equal(calls,1)
 f.advance(1*60000);await f.service.tick();assert.equal(calls,2) // failCount 2 → 10 分钟
 f.advance(9*60000);await f.service.tick();assert.equal(calls,2)
 f.advance(1*60000);await f.service.tick();assert.equal(calls,3) // failCount 3 → 20 分钟
 f.advance(19*60000);await f.service.tick();assert.equal(calls,3)
 f.advance(1*60000);await f.service.tick();assert.equal(calls,4) // failCount 4 → min(30, 40)=30 分钟（封顶）
 f.advance(29*60000);await f.service.tick();assert.equal(calls,4)
 f.advance(1*60000);await f.service.tick();assert.equal(calls,5) // failCount 5 → 5*16=80 封顶仍 30 分钟
 mode='ok';f.advance(30*60000);await f.service.tick();assert.equal(calls,6)
 const record=f.config.read()[0]
 assert.equal(record.lastStatus,'ok');assert.equal(record.failCount,0)
 await f.service.tick();assert.equal(calls,6) // 成功后回到完整间隔
 f.advance(29*60000);await f.service.tick();assert.equal(calls,6)
 f.advance(1*60000);await f.service.tick();assert.equal(calls,7)
})
test('a rate-limited (429) source waits the full interval instead of the early backoff window',async()=>{
 // HTTP 429 是服务端限流：提前重试只会加重限流，必须等满配置间隔（普通失败才吃 5 分钟提前退避）。
 let mode=0
 const f=setup({fetchSnapshot:async()=>{ if(mode===0) throw Error('MCP 返回 HTTP 429'); return snapshot() }})
 const src=f.add({intervalMinutes:30})
 await f.service.tick()
 assert.equal(f.config.read()[0].failCount,1)
 f.advance(5*60000);await f.service.tick() // 退避窗口内，且上次错误是限流 → 不重试
 assert.equal(f.config.read()[0].lastError,'MCP 返回 HTTP 429')
 f.advance(25*60000);mode=1;await f.service.tick() // 满一个完整间隔 → 正常重试并恢复
 assert.equal(f.config.read()[0].lastStatus,'ok')
 assert.equal(f.config.read()[0].failCount,0)
})
test('tick skips weekends unless syncWeekends; manual sync is unaffected',async()=>{
 // 取宿主本地时区的下一个周日中午，避免测试结果依赖机器时区。
 const sunday=new Date();sunday.setDate(sunday.getDate()+((7-sunday.getDay())%7));sunday.setHours(12,0,0,0)
 assert.equal(sunday.getDay(),0)
 let calls=0
 const f=setup({clockStart:sunday.getTime(),fetchSnapshot:async()=>{calls++;return snapshot()}})
 const src=f.add({intervalMinutes:5})
 await f.service.tick();assert.equal(calls,0) // 周日默认不自动同步
 f.config.write(f.config.read().map(s=>({...s,syncWeekends:true})))
 await f.service.tick();assert.equal(calls,1) // 显式 opt-in 后照常同步
 f.config.write(f.config.read().map(s=>({...s,syncWeekends:false})))
 await f.service.sync(src.id);assert.equal(calls,2) // 手动同步不受休市日限制
})
test('tick serializes sources on one connector and runs different connectors in parallel',async()=>{
 const active=new Set();let maxActive=0;const pending=[]
 const start=async source=>{active.add(source.id);maxActive=Math.max(maxActive,active.size);await Promise.resolve();return new Promise(resolve=>pending.push({source,resolve:()=>{active.delete(source.id);resolve(snapshot())}}))}
 const f=setup({fetchSnapshot:start})
 const db=f.db();db.accounts.push({id:'c',name:'第二港股账户',currency:'HKD'});f.setDb(db)
 const a=f.add({name:'自定义A',accountId:'a',url:'http://127.0.0.1:1/a',intervalMinutes:5})
 const b=f.add({name:'自定义B',accountId:'c',url:'http://127.0.0.1:1/b',intervalMinutes:5})
 // 同一连接器（custom）：串行执行，B 等 A 结束后才开始。
 const work=f.service.tick()
 await new Promise(r=>setTimeout(r,0))
 assert.equal(pending.length,1);assert.equal(maxActive,1)
 assert.equal(pending[0].source.id,a.id)
 pending[0].resolve();await new Promise(r=>setTimeout(r,0))
 assert.equal(pending.length,2);assert.equal(maxActive,1) // A 结束后 B 才开始
 assert.equal(pending[1].source.id,b.id)
 pending[1].resolve();await work
 assert.equal(maxActive,1)
 assert.deepEqual(f.db().holdings.map(h=>h.accountId).sort(),['a','c'])
})
test('tick runs different connectors in parallel',async()=>{
 const active=new Set();let maxActive=0;const pending=[]
 const start=async source=>{active.add(source.id);maxActive=Math.max(maxActive,active.size);await Promise.resolve();return new Promise(resolve=>pending.push({source,resolve:()=>{active.delete(source.id);resolve(source.connector==='ths'?snapshot([row('600000',{name:'浦发银行',market:'CN',assetClass:'stock',currency:'CNY'})]):snapshot())}}))}
 const f=setup({fetchSnapshot:start})
 const a=f.add({name:'自定义',accountId:'a',url:'http://127.0.0.1:1/a',intervalMinutes:5})
 const t=f.add({name:'同花顺',connector:'ths',transport:'native',accountId:'b',portfolioId:'book',intervalMinutes:5})
 const work=f.service.tick()
 await new Promise(r=>setTimeout(r,0))
 assert.equal(pending.length,2);assert.equal(maxActive,2) // 跨连接器并行：两个来源同时进行中
 pending.forEach(p=>p.resolve());await work
 // 目录核验默认断网 → 同花顺的 600000 落成「待确认」，但持仓照常入库：两只都在。
 assert.equal(f.db().holdings.length,2)
})
// ---- Configurable schedules: daily HH:MM (default 21:00) or fixed interval ----
const localTime=(y,month,day,hour,minute=0)=>new Date(y,month-1,day,hour,minute,0,0).getTime()
const pinAttempt=(f,ms)=>f.config.write(f.config.read().map(s=>({...s,lastAttemptAt:new Date(ms).toISOString()})))

test('new sources default to daily 21:00; legacy intervalMinutes keeps interval semantics',()=>{
 const f=setup()
 const daily=f.add({intervalMinutes:undefined})
 assert.deepEqual(daily.schedule,{kind:'daily',time:'21:00'})
 assert.equal(daily.intervalMinutes,undefined)
 const g=setup()
 const interval=g.add({intervalMinutes:30})
 assert.deepEqual(interval.schedule,{kind:'interval',minutes:30})
 assert.equal(interval.intervalMinutes,30)
})

test('connectSource defaults new imports to daily 21:00',async()=>{
 const f=setup({listAccounts:async()=>({accounts:[{id:'book',name:'账户',thsType:'common'}],warnings:[]})})
 const r=await f.service.connectSource({connector:'ths',transport:'native',accountId:'b',portfolioId:'book'},{cookie:'test-cookie'})
 assert.deepEqual(r.source.schedule,{kind:'daily',time:'21:00'})
 assert.equal(r.source.intervalMinutes,undefined)
})

test('daily schedule fires when the local time passes, then waits until the next day',async()=>{
 let calls=0
 const start=localTime(2026,11,6,20,0) // 周五 20:00 本地时间
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;return snapshot()}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 pinAttempt(f,start)
 await f.service.tick();assert.equal(calls,0)
 f.advance(60*60000)
 await f.service.tick();assert.equal(calls,1)
 await f.service.tick();assert.equal(calls,1)
 // 周六 20:59：每天定时不受周末跳过影响，但仍等到达 21:00。
 f.advance(23*60*60000+59*60000)
 await f.service.tick();assert.equal(calls,1)
 f.advance(60000)
 await f.service.tick();assert.equal(calls,2)
})

test('daily schedule catches up after a missed occurrence',async()=>{
 let calls=0
 const now=localTime(2026,11,6,14,0) // 周五 14:00，今天的 21:00 还没到
 const f=setup({clockStart:now,fetchSnapshot:async()=>{calls++;return snapshot()}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 pinAttempt(f,localTime(2026,11,5,10,0)) // 周四 10:00，早于最近一次（周四 21:00）
 await f.service.tick();assert.equal(calls,1)
})

test('custom daily times are honoured',async()=>{
 let calls=0
 const start=localTime(2026,11,6,8,0)
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;return snapshot()}})
 f.add({schedule:{kind:'daily',time:'08:30'}})
 pinAttempt(f,start)
 await f.service.tick();assert.equal(calls,0)
 f.advance(29*60000);await f.service.tick();assert.equal(calls,0)
 f.advance(60000);await f.service.tick();assert.equal(calls,1)
})

test('a failed daily source retries after min(120, 5*2^(n-1)) minutes',async()=>{
 let calls=0,fail=true
 const start=localTime(2026,11,6,20,55)
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;if(fail)throw Error('network down');return snapshot()}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 pinAttempt(f,start)
 f.advance(5*60000);await f.service.tick();assert.equal(calls,1) // 21:00 失败 → 5 分钟
 f.advance(4*60000);await f.service.tick();assert.equal(calls,1)
 f.advance(60000);await f.service.tick();assert.equal(calls,2) // failCount 2 → 10 分钟
 f.advance(9*60000);await f.service.tick();assert.equal(calls,2)
 f.advance(60000);await f.service.tick();assert.equal(calls,3) // failCount 3 → 20 分钟
 fail=false
 f.advance(19*60000);await f.service.tick();assert.equal(calls,3)
 f.advance(60000);await f.service.tick();assert.equal(calls,4)
 assert.equal(f.config.read()[0].failCount,0)
 f.advance(23*60*60000);await f.service.tick();assert.equal(calls,4) // 成功后等下一次定时
})

test('daily retry backoff caps at 120 minutes',async()=>{
 let calls=0
 const start=localTime(2026,11,6,21,0)
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;throw Error('network down')}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 f.config.write(f.config.read().map(s=>({...s,lastAttemptAt:new Date(start).toISOString(),failCount:6})))
 await f.service.tick();assert.equal(calls,0)
 f.advance(119*60000);await f.service.tick();assert.equal(calls,0)
 f.advance(60000);await f.service.tick();assert.equal(calls,1)
})

test('a rate-limited daily source waits for the next scheduled occurrence',async()=>{
 let calls=0
 const start=localTime(2026,11,6,20,50)
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;throw Error('MCP 返回 HTTP 429')}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 pinAttempt(f,start)
 f.advance(10*60000);await f.service.tick();assert.equal(calls,1)
 f.advance(5*60000);await f.service.tick();assert.equal(calls,1) // 限流不提前重试
 f.advance((24*60-5)*60000);await f.service.tick();assert.equal(calls,2) // 次日 21:00
})

test('a daily source that failed before today slot waits until the slot',async()=>{
 let calls=0
 const now=localTime(2026,11,6,14,0) // 周五 14:00，今天的 21:00 还没到
 const f=setup({clockStart:now,fetchSnapshot:async()=>{calls++;throw Error('network down')}})
 f.add({schedule:{kind:'daily',time:'21:00'}})
 f.config.write(f.config.read().map(s=>({...s,lastAttemptAt:new Date(localTime(2026,11,6,10,0)).toISOString(),failCount:1,lastError:'network down'})))
 await f.service.tick();assert.equal(calls,0) // 10:00 的失败不能在 14:00 提前重试
 f.advance(6*60*60000);await f.service.tick();assert.equal(calls,0) // 20:00 仍未到点
 f.advance(60*60000);await f.service.tick();assert.equal(calls,1) // 21:00 到点才同步
})

test('tick uses schedule over a stale intervalMinutes field',async()=>{
 let calls=0
 const start=localTime(2026,11,6,20,0)
 const f=setup({clockStart:start,fetchSnapshot:async()=>{calls++;return snapshot()}})
 f.add({intervalMinutes:5,schedule:{kind:'daily',time:'21:00'}})
 pinAttempt(f,start)
 await f.service.tick();assert.equal(calls,0)
 f.advance(10*60000);await f.service.tick();assert.equal(calls,0) // 5 分钟间隔字段不会触发
 f.advance(50*60000);await f.service.tick();assert.equal(calls,1)
})

test('version 2 sources.json migrates every source to daily 21:00 and persists version 3',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wealth-schedule-migrate-'))
 try{
  writeFileSync(join(dir,'sources.json'),JSON.stringify({version:2,authorizations:[],sources:[{id:'a',intervalMinutes:30},{id:'b',schedule:{kind:'interval',minutes:5}}]}))
  const rows=sourceStore(dir).read()
  assert.deepEqual(rows.map(s=>s.schedule),[{kind:'daily',time:'21:00'},{kind:'daily',time:'21:00'}])
  assert.equal(rows[0].intervalMinutes,undefined)
  const persisted=JSON.parse(readFileSync(join(dir,'sources.json'),'utf8'))
  assert.equal(persisted.version,3)
  assert.deepEqual(persisted.sources.map(s=>s.schedule),[{kind:'daily',time:'21:00'},{kind:'daily',time:'21:00'}])
  // version 3 文件原样信任：显式 schedule 不被改写，缺失 schedule 也不补写。
  writeFileSync(join(dir,'sources.json'),JSON.stringify({version:3,authorizations:[],sources:[{id:'c',schedule:{kind:'interval',minutes:45}},{id:'d'}]}))
  const trusted=sourceStore(dir).read()
  assert.deepEqual(trusted[0].schedule,{kind:'interval',minutes:45})
  assert.equal(trusted[1].schedule,undefined)
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('schedule validation rejects malformed times and intervals',()=>{
 const f=setup()
 for(const schedule of [{kind:'daily',time:'24:00'},{kind:'daily',time:'9:00'},{kind:'daily',time:'21:60'},{kind:'interval',minutes:-1},{kind:'interval',minutes:1.5},{kind:'weekly'}])assert.throws(()=>f.add({schedule}),/同步/)
 assert.throws(()=>f.add({schedule:'daily'}),/同步计划/)
})
