import test from 'node:test'
import assert from 'node:assert/strict'
import Client from './vendor/futu/main.js'
import Base from './vendor/futu/base.js'
import root from './vendor/futu/proto.cjs'
import {readFileSync} from 'node:fs'
test('bundled official transport loads with patched protobuf runtime and preserves uint64 header',()=>{
 const client=new Client();assert.equal(typeof client.GetAccList,'function');assert.equal(typeof client.GetPositionList,'function');assert.equal(typeof client.GetFunds,'function');assert.equal(client.websock,null)
 const type=root.lookupType('Trd_GetPositionList.Request')
 const input={c2s:{header:{trdEnv:1,accID:'9007199254740993',trdMarket:1}}}
 const encoded=type.encode(type.create(input)).finish();const decoded=type.decode(encoded)
 assert.equal(decoded.c2s.header.accID.toString(),'9007199254740993')
 const installed=JSON.parse(readFileSync(new URL('./node_modules/protobufjs/package.json',import.meta.url),'utf8'));assert.equal(installed.version,'7.6.6')
})
test('transport close rejects pending values and clears timers without a socket',async()=>{
 const base=new Base();let rejected=false
 const timer=setTimeout(()=>{throw Error('pending timer leaked')},10000)
 base.promisePool={1:{timer,reject:()=>{rejected=true}}}
 base.close();assert.equal(rejected,true);assert.deepEqual(base.promisePool,{})
})
