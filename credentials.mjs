// Local per-user encrypted credential storage, independent of other DSH plugins.
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, OpError } from './store.mjs'
const FIELDS = {
  ths:['cookie','accessToken','refreshToken','clientId'],
  futu:['websocketKey','mcpToken','refreshToken','clientId'],
  longbridge:['appKey','appSecret','accessToken','mcpToken'],
  qieman:['apiKey','bearerToken','refreshToken','clientId'],
  tiger:['accessToken','refreshToken','clientId'],
  fosun:['apiKey','privateKey','serverPublicKey'],
  // 应用级密钥（不属于任何来源授权）：同花顺金融数据 API、腾讯自选股 westock-mcp。
  finapi:['token'],
  westock:['accessToken','refreshToken','clientId','expiresAt'],
  ib:[],
  custom:[],
}
const bad = message => new OpError('bad-request', message)
export function validateCredentials(connector, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('认证信息须为对象')
  if (!FIELDS[connector]) throw bad('认证来源不支持')
  const out = {}
  for (const [key,value] of Object.entries(input)) {
    if (!FIELDS[connector].includes(key)) throw bad('认证字段不支持: '+key)
    if (typeof value !== 'string' || value.length > 64000) throw bad('认证字段格式无效')
    if (value.trim()) out[key] = value.trim()
  }
  return out
}
export function createCredentialStore(dir = DATA_DIR) {
  const keyFile=join(dir,'credentials.key'), file=join(dir,'credentials.enc.json')
  const ensure=()=>{mkdirSync(dir,{recursive:true,mode:0o700});try{chmodSync(dir,0o700)}catch{}}
  const key=()=>{
    ensure()
    if (!existsSync(keyFile)) writeFileSync(keyFile,randomBytes(32),{flag:'wx',mode:0o600})
    const value=readFileSync(keyFile)
    if(value.length!==32)throw bad('本地认证密钥文件损坏')
    return value
  }
  const read=()=>{
    if (!existsSync(file))return {}
    const data=JSON.parse(readFileSync(file,'utf8'))
    const iv=Buffer.from(data.iv,'base64'),tag=Buffer.from(data.tag,'base64')
    const decrypt=createDecipheriv('aes-256-gcm',key(),iv);decrypt.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decrypt.update(Buffer.from(data.data,'base64')),decrypt.final()]).toString('utf8'))
  }
  const write=entries=>{
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv)
    const data=Buffer.concat([cipher.update(JSON.stringify(entries),'utf8'),cipher.final()])
    writeFileSync(file+'.tmp',JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}),{mode:0o600})
    renameSync(file+'.tmp',file)
    try{chmodSync(file,0o600)}catch{}
  }
  return {
    get(id){return structuredClone(read()[id]||{})},
    set(id,connector,input){const valid=validateCredentials(connector,input),all=read();all[id]={...(all[id]||{}),...valid};write(all)},
    remove(id){const all=read();if(Object.hasOwn(all,id)){delete all[id];write(all)}},
    configured(id,connector){
      const value=read()[id]||{}
      if(connector==='ths')return !!value.cookie || !!value.accessToken
      if(connector==='longbridge')return ['appKey','appSecret','accessToken'].every(k=>!!value[k])||!!value.mcpToken
      if(connector==='futu')return !!value.websocketKey||!!value.mcpToken
      if(connector==='qieman')return !!value.apiKey||!!value.bearerToken
      if(connector==='tiger')return !!value.accessToken
      if(connector==='fosun')return ['apiKey','privateKey','serverPublicKey'].every(k=>!!value[k])
      if(connector==='finapi')return !!value.token
      if(connector==='westock')return !!value.accessToken
      return false
    },
  }
}
