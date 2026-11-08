import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createCredentialStore,validateCredentials} from './credentials.mjs'
test('credential validation accepts only connector-owned secret fields and ignores blank edit fields',()=>{
 assert.deepEqual(validateCredentials('longbridge',{appKey:' abc ',appSecret:'',accessToken:'tok'}),{appKey:'abc',accessToken:'tok'})
 for(const args of [['ths',{appSecret:'x'}],['futu',{cookie:'x'}],['ths',{cookie:5}],['unknown',{}]])assert.throws(()=>validateCredentials(...args))
})
test('encrypted secrets survive reopen, never appear in public config or plaintext, support merge and removal',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wealth-vault-'))
 try{const vault=createCredentialStore(dir);assert.deepEqual(vault.get('a'),{});vault.set('a','longbridge',{appKey:'fixture-key',appSecret:'fixture-secret',accessToken:'fixture-token'});assert.equal(vault.configured('a','longbridge'),true)
 const raw=readFileSync(join(dir,'credentials.enc.json'),'utf8');assert.ok(!raw.includes('fixture-secret'));assert.ok(!raw.includes('fixture-token'))
 assert.equal(createCredentialStore(dir).get('a').appSecret,'fixture-secret');vault.set('a','longbridge',{appKey:''});assert.equal(vault.get('a').appKey,'fixture-key')
 vault.set('pending-ths','ths',{cookie:'userid=123; v=fixture-login'});assert.equal(vault.configured('pending-ths','ths'),true)
 vault.remove('a');assert.deepEqual(vault.get('a'),{});assert.equal(vault.get('pending-ths').cookie,'userid=123; v=fixture-login')
 const corrupted=JSON.parse(readFileSync(join(dir,'credentials.enc.json'),'utf8'));corrupted.tag=Buffer.alloc(16).toString('base64');writeFileSync(join(dir,'credentials.enc.json'),JSON.stringify(corrupted));assert.throws(()=>vault.get('pending-ths'))
 }finally{rmSync(dir,{recursive:true,force:true})}
})
