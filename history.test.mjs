import test from 'node:test'
import assert from 'node:assert/strict'
import { createHistoryService, prepareHistory } from './history.mjs'
import {applyOp} from './store.mjs'

const event = (patch={})=>({date:'2026-01-05',time:'09:30:01',kind:'buy',originalType:'买入',symbol:'000001',name:'示例',market:'CN',currency:'CNY',qty:100,price:10,grossAmount:1000,cashAmount:-1005,fee:5,row:2,...patch})
const ledger = ()=>({version:1,baseCurrency:'CNY',fx:{CNY:1},accounts:[{id:'A',name:'账户',currency:'CNY'}],instruments:[],holdings:[{id:'H',accountId:'A',instrumentId:'I',qty:123,avgCost:9,manualPrice:11,currency:'CNY'}],trades:[],historyEvents:[],historyBatches:[],snapshots:[],updatedAt:null})
const prepared = (db,rows,extra={})=>prepareHistory(db,{accountId:'A',provider:'ths',...extra},{rows,errors:[],warnings:[]})
function service(rows=[event()],extras={}) {
 let db=ledger(),writes=0
 const service=createHistoryService({load:()=>structuredClone(db),save:staged=>{db=structuredClone(staged);writes++},readHistoryFile:async()=>({rows,errors:[],warnings:[]}),...extras})
 return {service,get db(){return db},set db(value){db=value},get writes(){return writes}}
}

test('historical archive preserves all event kinds, signed cash, zero and unknown fees without touching holdings',async()=>{
 const rows=[event(),event({kind:'sell',qty:1000,cashAmount:9995,price:10,grossAmount:10000}),event({kind:'deposit',symbol:null,qty:0,price:0,cashAmount:1000,grossAmount:null,fee:null}),event({kind:'tax',qty:0,price:0,cashAmount:-90,grossAmount:0,fee:0}),event({kind:'repo_open',qty:70,price:3.5,cashAmount:-7000.35,grossAmount:7000,fee:.35}),event({kind:'repo_close',qty:70,price:3.5,cashAmount:7001.3,grossAmount:7001.3,fee:0}),event({kind:'ipo'}),event({kind:'security_in'}),event({kind:'security_out'}),event({kind:'dividend'}),event({kind:'other',originalType:'未知业务'})]
 const f=service(rows),before=structuredClone(f.db)
 const p=await f.service.preview({accountId:'A',method:'file'})
 assert.equal(f.writes,0);assert.equal(p.summary.new,11)
 const r=f.service.commit({token:p.token})
 assert.equal(r.result.imported,11);assert.deepEqual(f.db.holdings,before.holdings);assert.deepEqual(f.db.trades,before.trades);assert.deepEqual(f.db.instruments,before.instruments)
 assert.equal(f.db.historyEvents[2].fee,null);assert.equal(f.db.historyEvents[3].fee,0);assert.equal(f.db.historyEvents[4].cashAmount,-7000.35)
 assert.equal(f.db.historyEvents[1].qty,1000);assert.ok(f.db.historyEvents.every(x=>x.archiveOnly))
 assert.equal(p.coverage.complete,false)
})
test('explicit account deletion removes that account archives and invalidates pending previews',async()=>{
 const f=service(),p=await f.service.preview({accountId:'A'});f.service.commit({token:p.token})
 f.db.accounts.push({id:'B',name:'另一账户',currency:'CNY'})
 f.db.historyEvents.push({...event(),accountId:'B'});f.db.historyBatches.push({id:'keep',accountId:'B'})
 const pending=await f.service.preview({accountId:'A'})
 applyOp(f.db,'account.remove',{id:'A'})
 assert.equal(f.db.historyEvents.length,1);assert.equal(f.db.historyEvents[0].accountId,'B')
 assert.deepEqual(f.db.historyBatches,[{id:'keep',accountId:'B'}]);assert.throws(()=>f.service.commit({token:pending.token}),/账本已更新/)
})
test('repeat commit token is idempotent, repeated file and overlaps are deduped',async()=>{
 const f=service([event({externalId:'9007199254740993'})])
 const p=await f.service.preview({accountId:'A'})
 f.service.commit({token:p.token});f.service.commit({token:p.token});assert.equal(f.writes,1)
 const p2=await f.service.preview({accountId:'A'})
 assert.equal(p2.summary.new,0);assert.equal(p2.summary.duplicate,1)
 assert.equal(f.db.historyEvents[0].externalId,'9007199254740993')
})
test('no-id exact executions retain multiplicity within a file and across overlapping copies',()=>{
 const db=ledger(),rows=[event(),event()]
 let p=prepared(db,rows);assert.equal(p.summary.new,2)
 db.historyEvents=p.rows.map(({status,...x})=>x)
 p=prepared(db,rows);assert.equal(p.summary.duplicate,2);assert.equal(p.summary.new,0)
 p=prepared(db,[...rows,event()]);assert.equal(p.summary.new,1);assert.equal(p.summary.duplicate,2)
})
test('intraday timestamps and distinct execution IDs prevent merging real fills',()=>{
 let p=prepared(ledger(),[event(),event({time:'09:30:02'})]);assert.equal(p.summary.new,2)
 p=prepared(ledger(),[event({externalId:'1'}),event({externalId:'2'})]);assert.equal(p.summary.new,2)
 const db=ledger();db.historyEvents=[{...event({externalId:'1'}),accountId:'A',provider:'ths'}]
 p=prepared(db,[event({externalId:'2'})]);assert.equal(p.summary.new,1)
})
test('same stable execution ID with changed economics blocks commit and cannot overwrite silently',async()=>{
 const f=service([event({externalId:'id'})]);let p=await f.service.preview({accountId:'A'});f.service.commit({token:p.token})
 f.db.historyEvents[0].price=9
 p=await f.service.preview({accountId:'A'});assert.equal(p.summary.conflict,1);assert.throws(()=>f.service.commit({token:p.token}),/冲突/);assert.equal(f.db.historyEvents[0].price,9)
})
test('unknown currency, invalid dates, malformed numbers and unknown account cannot be committed',async()=>{
 for(const patch of [{currency:null},{date:'2026-02-30'},{time:'24:00:00'},{qty:NaN},{price:Infinity}]){
  const f=service([event(patch)]),p=await f.service.preview({accountId:'A'});assert.ok(p.errors.length);assert.throws(()=>f.service.commit({token:p.token}),/错误/);assert.equal(f.writes,0)
 }
 const f=service();await assert.rejects(f.service.preview({accountId:'missing'}),/账户/)
})
test('date-range preview reports excluded records, never claims full history coverage',async()=>{
 const f=service([event({date:'2025-12-01'}),event(),event({date:'2026-02-01'})])
 const p=await f.service.preview({accountId:'A',from:'2026-01-01',to:'2026-01-31'})
 assert.equal(p.summary.outside,2);assert.equal(p.summary.new,1);assert.equal(p.coverage.observedFrom,'2026-01-05');assert.equal(p.coverage.observedTo,'2026-01-05');assert.equal(p.coverage.complete,false)
 assert.equal(f.service.commit({token:p.token}).result.imported,1)
 await assert.rejects(f.service.preview({accountId:'A',from:'2026-03-01',to:'2026-02-01'}),/晚于/)
})
test('stale preview, expiry and disposal never write history',async()=>{
 let clock=1000;const f=service([event()],{now:()=>clock})
 let p=await f.service.preview({accountId:'A'});f.db.holdings[0].qty=124;assert.throws(()=>f.service.commit({token:p.token}),/已更新/)
 p=await f.service.preview({accountId:'A'});clock+=600001;assert.throws(()=>f.service.commit({token:p.token}),/过期/)
 f.service.dispose();await assert.rejects(f.service.preview({accountId:'A'}),/停止/);assert.equal(f.writes,0)
})
test('IO failure leaves current ledger untouched and preview retryable',async()=>{
 const original=ledger();let fail=true,saved
 const s=createHistoryService({load:()=>structuredClone(original),save:db=>{if(fail)throw new Error('disk full');saved=db},readHistoryFile:async()=>({rows:[event()],errors:[],warnings:[]})})
 const p=await s.preview({accountId:'A'});assert.throws(()=>s.commit({token:p.token}),/disk full/);assert.equal(original.historyEvents.length,0)
 fail=false;s.commit({token:p.token});assert.equal(saved.historyEvents.length,1)
})
test('capabilities distinguish native execution fetch from file-only sources without credentials',async()=>{
 const f=service([event()],{sources:()=>[{id:'S',accountId:'A',connector:'ib',transport:'native'}]})
 assert.equal(f.service.capabilities().accounts[0].apiAvailable,false)
 await assert.rejects(f.service.preview({accountId:'A',method:'api',from:'2026-01-01',to:'2026-01-31'}),/账单/)
})
test('THS money-history capability is available and requires a wired readSourceHistory',async()=>{
 const f=service([event()],{sources:()=>[{id:'S',accountId:'A',connector:'ths',transport:'native'}]})
 assert.equal(f.service.capabilities().accounts[0].apiAvailable,true)
 assert.match(f.service.capabilities().accounts[0].description,/同花顺投资账本/)
 await assert.rejects(f.service.preview({accountId:'A',method:'api',from:'2026-01-01',to:'2026-01-31'}),/同花顺投资账本资金流水/)
})
test('API preview invokes selected existing account and remains read-only until commit',async()=>{
 let called
 const f=service([],{sources:()=>[{id:'S',accountId:'A',connector:'futu',transport:'native'}],readSourceHistory:async(id,range)=>{called={id,range};return {rows:[event({externalId:'fill'})],coverage:{complete:false,note:'仅成交'},warnings:[]}}})
 const p=await f.service.preview({accountId:'A',method:'api',from:'2026-01-01',to:'2026-01-31'})
 assert.deepEqual(called,{id:'A',range:{from:'2026-01-01',to:'2026-01-31'}});assert.equal(f.writes,0);assert.equal(p.coverage.note,'仅成交')
 assert.equal(f.service.commit({token:p.token}).result.imported,1)
})
