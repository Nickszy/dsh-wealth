import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
const dir = mkdtempSync(join(tmpdir(), 'wealth-host-'))
process.env.DSH_PORTFOLIO_DIR = dir
const { apply } = await import('./index.js')
let handler
const disposers=[]
apply({ effect: fn => {const dispose=fn();if(typeof dispose==='function')disposers.push(dispose)}, get: () => null, webServer: { register: route => { handler=route.handler;return ()=>{} } } },{syncOptions:{
 listAccounts:async()=>({accounts:[{id:'test-book',name:'测试账本',currency:'CNY'}],warnings:[]}),
 fetchSnapshot:async()=>({holdings:[{symbol:'600000',name:'测试股票',market:'CN',assetClass:'stock',currency:'CNY',qty:10,avgCost:5,manualPrice:6},{symbol:'CASH:CNY',name:'现金',market:'CASH',assetClass:'cash',currency:'CNY',qty:100,avgCost:1,manualPrice:1}],complete:true,warnings:[],queriedAt:'2026-11-07T00:00:00Z',uploadedAt:null,quoteDate:null}),
}})
async function request(path, body, headers={host:'127.0.0.1:58938'}) {
  const req=new EventEmitter(); req.headers=headers;req.url='/portfolio/api/'+path;req.method=body===undefined?'GET':'POST'
  let status, text=''
  const res={writeHead:s=>{status=s},end:s=>{text+=s||''},destroy:()=>{}}
  const promise=handler(req,res)
  if(body!==undefined){req.emit('data',Buffer.from(typeof body==='string'?body:JSON.stringify(body)));req.emit('end')}
  await promise
  let data;try{data=JSON.parse(text)}catch{}
  return {status,data,text}
}
test('host routes preview, atomic imports, model absence and stale proposal',async()=>{
  let r=await request('op',{op:'account.upsert',name:'测试',currency:'HKD'})
  assert.equal(r.status,200)
  const accountId=r.data.ledger.accounts[0].id
  const text='代码,名称,数量,成本,币种,现价\n00700,腾讯,200,380,HKD,410'
  r=await request('import/preview',{text,accountId,source:'futu'})
  assert.equal(r.status,200);assert.equal(r.data.errors.length,0);assert.equal(r.data.rows[0].symbol,'00700')
  r=await request('op',{op:'import.holdings',rows:r.data.rows});assert.equal(r.data.ledger.holdings[0].qty,200)
  const updatedAt=r.data.ledger.updatedAt
  r=await request('chat/apply',{revision:updatedAt,ops:[{op:'price.set',holdingId:r.data.ledger.holdings[0].id,price:420}]})
  assert.equal(r.status,200);assert.equal(r.data.ledger.holdings[0].manualPrice,420)
  r=await request('chat/apply',{revision:'stale',ops:[]});assert.notEqual(r.status,200)
  r=await request('model');assert.equal(r.status,200);assert.equal(r.data.model,null)
  r=await request('chat',{message:'我的资产多少'});assert.notEqual(r.status,200);assert.match(r.data.error.message,/模型/)
  r=await request('state');assert.equal(r.data.summary.history.length,1)
})
test('host rejects cross-site requests and unsupported methods',async()=>{
  assert.equal((await request('op',{op:'state'},{host:'127.0.0.1:58938',origin:'https://evil.example'})).status,403)
  assert.equal((await request('chat')).status,405)
  assert.equal((await request('op','{broken')).status,400)
})
test('source API binds an explicit THS portfolio, synchronizes and preserves data on removal',async()=>{
  let r=await request('op',{op:'account.upsert',name:'自动同步专用',currency:'CNY'})
  const accountId=r.data.ledger.accounts.at(-1).id
  r=await request('sources/ths/portfolios');assert.equal(r.status,200);assert.equal(r.data.portfolios[0].id,'test-book')
  r=await request('sources/save',{source:{name:'THS测试',connector:'ths',accountId,portfolioId:'test-book',intervalMinutes:0,enabled:true}})
  assert.equal(r.status,200);const id=r.data.sources[0].id
  r=await request('sources/sync',{id});assert.equal(r.status,200);assert.equal(r.data.source.lastStatus,'ok');assert.equal(r.data.ledger.holdings.filter(h=>h.syncSourceId===id).length,2)
  r=await request('sources');assert.equal(r.data.sources[0].id,id)
  r=await request('sources/remove',{id});assert.equal(r.status,200);assert.equal(r.data.sources.length,0)
  r=await request('state');assert.equal(r.data.ledger.holdings.filter(h=>h.accountId===accountId).length,2)
})
test('direct account import endpoint needs only a selected source and creates populated account once',async()=>{
  let r=await request('state');const count=r.data.ledger.accounts.length
  r=await request('sources/accounts',{source:{connector:'ths'}});assert.equal(r.data.accounts[0].imported,false)
  const source={connector:'ths',portfolioId:'test-book'}
  r=await request('sources/connect',{source});assert.equal(r.status,200);assert.equal(r.data.created,true);assert.equal(r.data.account.name,'测试账本')
  const id=r.data.account.id;assert.equal(r.data.ledger.accounts.length,count+1);assert.equal(r.data.ledger.holdings.filter(h=>h.accountId===id).length,2)
  r=await request('sources/connect',{source});assert.equal(r.status,200);assert.equal(r.data.created,false);assert.equal(r.data.account.id,id);assert.equal(r.data.ledger.accounts.length,count+1)
  r=await request('sources/accounts',{source:{connector:'ths'}});assert.equal(r.data.accounts[0].imported,true)
  r=await request('sources/connect',{source,account:{mode:'existing',id}});assert.equal(r.status,400)
})
test('authorization API keeps one login with its sub-accounts and refuses removal while bound',async()=>{
  let r=await request('sources/auth/create',{auth:{connector:'ib',transport:'native',label:'IB 测试授权',config:{gatewayUrl:'https://localhost:5000/v1/api'}}})
  assert.equal(r.status,200)
  const authId=r.data.auth.id
  assert.equal(r.data.auth.label,'IB 测试授权')
  assert.ok(r.data.authorizations.find(a=>a.id===authId))

  r=await request('sources/auth/accounts',{authId});assert.equal(r.status,200)
  assert.equal(r.data.accounts[0].id,'test-book');assert.equal(r.data.accounts[0].imported,false)

  r=await request('sources/connect',{source:{authId,brokerAccountId:'test-book',intervalMinutes:0,enabled:true}})
  assert.equal(r.status,200);assert.equal(r.data.created,true);assert.equal(r.data.source.authId,authId)

  r=await request('sources');assert.equal(r.data.sources.find(s=>s.authId===authId)?.authId,authId)
  assert.equal(r.data.authorizations.find(a=>a.id===authId).sources.length,1)
  const sourceId=r.data.sources.find(s=>s.authId===authId).id

  r=await request('sources/auth/rename',{authId,label:'IB 主账号'});assert.equal(r.status,200)
  assert.equal(r.data.authorizations.find(a=>a.id===authId).label,'IB 主账号')

  r=await request('sources/auth/remove',{authId});assert.equal(r.status,400)
  r=await request('sources/remove',{id:sourceId});assert.equal(r.status,200)
  r=await request('sources');assert.equal(r.data.authorizations.find(a=>a.id===authId).sources.length,0)
  r=await request('sources/auth/remove',{authId});assert.equal(r.status,200)
  assert.equal(r.data.authorizations.some(a=>a.id===authId),false)
})
test('history API previews XLSX-compatible event columns, commits archives only and detects repeated files',async()=>{
  let r=await request('state');const accountId=r.data.ledger.accounts[0].id
  const before=structuredClone(r.data.ledger.holdings)
  const text='成交日期,成交时间,代码,名称,交易类别,成交数量,成交价格,发生金额,成交金额,费用,备注\n2024-01-02,09:30:01,000001,示例,买入,100,10,-1005,1000,5,历史\n2024-01-03,,--,--,银行转证券,0,0,1000,,,入金'
  r=await request('history/capabilities');assert.equal(r.status,200);assert.ok(r.data.accounts.find(a=>a.accountId===accountId))
  r=await request('history/preview',{accountId,text,defaultCurrency:'CNY',method:'file'});assert.equal(r.status,200);assert.equal(r.data.errors.length,0);assert.equal(r.data.summary.new,2)
  const token=r.data.token
  r=await request('state');assert.equal(r.data.ledger.historyEvents.length,0)
  r=await request('history/commit',{token,rows:[{accountId:'injected'}]});assert.equal(r.status,200);assert.equal(r.data.result.imported,2);assert.deepEqual(r.data.ledger.holdings,before)
  assert.equal(r.data.ledger.historyEvents[0].symbol,'000001');assert.equal(r.data.ledger.historyEvents[1].kind,'deposit');assert.equal(r.data.ledger.historyEvents[1].fee,null)
  r=await request('history/commit',{token});assert.equal(r.status,200);assert.equal(r.data.ledger.historyEvents.length,2)
  r=await request('history/preview',{accountId,text,defaultCurrency:'CNY'});assert.equal(r.data.summary.duplicate,2);assert.equal(r.data.summary.new,0)
  assert.equal((await request('history/preview')).status,405)
  assert.equal((await request('history/commit',{token:'forged'})).status,400)
})
test.after(()=>{for(const dispose of disposers)dispose();rmSync(dir,{recursive:true,force:true})})
