// Historical archives are independent of authoritative position snapshots.
import { createHash, randomUUID } from 'node:crypto'
import { load, save, summarize, OpError } from './store.mjs'
import { readHistoryFile } from './history-file.mjs'

export const HISTORY_EPOCH = '2000-01-01'
export const HISTORY_LIMITS = Object.freeze({maxFileBytes:5*1024*1024,maxRows:25000})
const bad = message => new OpError('bad-request',message)
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const revisionOf = db => hash(db)
const KINDS = new Set(['buy','sell','deposit','withdrawal','dividend','tax','fee','interest','repo_open','repo_close','ipo','security_in','security_out','other'])
const finite = value => value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value))
export function historyDate(value, field = '日期') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10) !== value) throw bad(field+'无效，请使用 YYYY-MM-DD')
  return value
}
function validateRow(row) {
  historyDate(row.date,'成交日期')
  if (row.time != null && !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?$/.test(row.time)) throw bad('成交时间无效')
  if (!KINDS.has(row.kind)) throw bad('流水类型无效')
  if (!/^[A-Z]{3}$/.test(row.currency || '')) throw bad('文件未提供币种，请选择文件金额的币种；不会自动换汇')
  for (const key of ['qty','price','grossAmount','cashAmount','fee']) if (!finite(row[key])) throw bad(key+'必须为有限数字或未知值')
  if (row.qty != null && row.qty < 0) throw bad('成交数量不能为负数')
  if (row.price != null && row.price < 0) throw bad('成交价格不能为负数')
  if (['buy','sell'].includes(row.kind) && (!row.symbol || !(row.qty > 0) || row.price == null)) throw bad('买卖记录需要代码、正数量和成交价格')
}
const semantic = r => [r.accountId,r.date,r.time || null,r.kind,r.symbol || null,r.market || null,r.currency,r.qty ?? null,r.price ?? null,r.grossAmount ?? null,r.cashAmount ?? null,r.fee ?? null]
const weakKey = r => hash(semantic(r))
const strongKey = r => r.externalId == null || r.externalId === '' ? null : hash([r.accountId,r.provider || '',r.kind,String(r.externalId)])
function legacyEvents(db, provider, accountId) {
  return (db.trades || []).filter(t=>t.accountId === accountId).map(t=>{
    const instrument = (db.instruments || []).find(i=>i.id === t.instrumentId) || {}
    // Preserve unknown cash instead of inventing net settlement amounts.
    return {accountId:t.accountId,date:String(t.date).slice(0,10),time:t.time || null,kind:t.side,provider,externalId:t.externalId,symbol:instrument.symbol,market:instrument.market,currency:t.currency || instrument.currency,qty:t.qty,price:t.price,grossAmount:t.grossAmount ?? null,cashAmount:t.cashAmount ?? null,fee:t.fee ?? null}
  })
}

/** Pure validation and multiset deduplication. Equal fills without IDs retain multiplicity. */
export function prepareHistory(db, input, parsed) {
  if (!db.accounts.some(a=>a.id === input.accountId)) throw bad('请选择仍存在的账户')
  const from = input.from ? historyDate(input.from,'开始日期') : null
  const to = input.to ? historyDate(input.to,'结束日期') : null
  if (from && to && from > to) throw bad('开始日期不能晚于结束日期')
  if (!Array.isArray(parsed.rows) || parsed.rows.length > HISTORY_LIMITS.maxRows) throw bad('单次最多导入 25000 条流水，请按日期拆分')
  const provider = input.provider || 'file'
  const old = [...(db.historyEvents || []).filter(r=>r.accountId === input.accountId),...legacyEvents(db,provider,input.accountId)]
  const strong = new Map(), counts = new Map(), anonymous = new Map(), seenAnonymous = new Map()
  for (const row of old) {
    const k = weakKey(row), id = strongKey(row)
    counts.set(k,(counts.get(k)||0)+1)
    if (id) strong.set(id,row)
    else anonymous.set(k,(anonymous.get(k)||0)+1)
  }
  const rows = [], errors = [...(parsed.errors || [])], warnings = (parsed.warnings || []).map(w=>typeof w === 'string' ? {message:w} : w)
  const summary = {total:parsed.rows.length,new:0,duplicate:0,conflict:0,outside:0,byKind:{},observedFrom:null,observedTo:null}
  let missingIds = 0
  for (const raw of parsed.rows) {
    // Whitelist data fields: uploaded JSON cannot inject account IDs or internal keys.
    const row = Object.fromEntries(['date','time','kind','originalType','symbol','name','market','currency','qty','price','grossAmount','cashAmount','fee','externalId','note','sheet','row'].map(k=>[k,raw[k] ?? null]))
    Object.assign(row,{accountId:input.accountId,provider,status:'new'})
    try { validateRow(row) } catch (error) { errors.push({row:row.row,sheet:row.sheet,field:'record',message:error.message});row.status='conflict' }
    if (row.status !== 'conflict' && ((from && row.date < from) || (to && row.date > to))) row.status='outside'
    if (row.status === 'new') {
      const key = weakKey(row), id = strongKey(row)
      if (id && strong.has(id)) {
        if (weakKey(strong.get(id)) === key) row.status='duplicate'
        else {row.status='conflict';errors.push({row:row.row,field:'externalId',message:'同一成交编号的内容与已保存记录不同，请核对账单后再导入'})}
      } else if (id) {
        const available = anonymous.get(key) || 0
        if (available) {row.status='duplicate';anonymous.set(key,available-1)}
        strong.set(id,row)
      } else {
        missingIds++
        const occurrence = (seenAnonymous.get(key)||0)+1
        seenAnonymous.set(key,occurrence)
        if (occurrence <= (counts.get(key)||0)) row.status='duplicate'
      }
    }
    summary[row.status]++
    if (row.status !== 'outside') {
      summary.byKind[row.kind] = (summary.byKind[row.kind]||0)+1
      if (row.date && (!summary.observedFrom || row.date < summary.observedFrom)) summary.observedFrom=row.date
      if (row.date && (!summary.observedTo || row.date > summary.observedTo)) summary.observedTo=row.date
    }
    rows.push(row)
  }
  if (missingIds) warnings.push({message:'部分记录没有独立成交编号，按日期、时间、类型、币种及原始金额匹配；完全相同的多笔记录保留原有笔数。跨文件精度或费用不一致时请人工核对。'})
  if (old.length && (db.trades || []).some(t=>t.accountId===input.accountId && !t.externalId && !t.time)) warnings.push({message:'账户存在旧版无成交时间或编号的流水，跨格式自动匹配可能不足，请核对重复记录。'})
  return {rows,errors,warnings,summary}
}

export function createHistoryService(options = {}) {
  const readLedger=options.load || load, writeLedger=options.save || save, now=options.now || Date.now
  const drafts=new Map(), ttl=10*60*1000
  let disposed=false
  const sources=()=>options.sources?.() || []
  function capability(source) {
    if (!source || (source.transport !== 'native' && source.transport !== 'mcp')) return {apiAvailable:false,description:'支持上传券商账单补录历史流水'}
    if (source.connector==='futu' && source.transport==='mcp') return {apiAvailable:true,description:'读取富途官方 MCP 的历史成交与资金流水（存取、股息、利息、费税等）；未成交订单与费用分摊仍需账单补录'}
    if (source.connector==='futu' && source.tradeEnvironment==='SIMULATE') return {apiAvailable:false,description:'富途模拟账户不支持此历史成交接口，请使用文件补录'}
    if (source.connector==='futu') return {apiAvailable:true,description:'从本机 OpenD 读取历史成交；范围受券商权限和可查期限限制，费用未知时保留未知'}
    if (source.connector==='longbridge' && source.transport==='mcp') return {apiAvailable:true,description:'读取长桥官方 MCP 的历史成交与资金流水（存入取出、股息等）；未成交订单与费用分摊仍需账单补录'}
    if (source.connector==='longbridge') return {apiAvailable:true,description:'读取长桥历史成交；分段获取并核验账户通道，非成交流水仍需账单补录'}
    if (source.connector==='ib') return {apiAvailable:false,description:'现有 Gateway 持仓接口不提供完整历史流水；请导出成交/资金账单上传，Flex 为后续独立接入'}
    if (source.connector==='ths') return {apiAvailable:true,description:'读取同花顺投资账本资金流水（买卖、回购、派息、缴税、入账）；银证转账等银行侧记录仍需文件补录。基金账本支持申购、定投、赎回、分红与转入转出记录'}
    return {apiAvailable:false,description:'此来源暂不支持历史 API，请通过导出的 Excel / CSV 账单文件回补'}
  }
  function capabilities() {
    const db=readLedger(), list=sources()
    return {accounts:db.accounts.map(a=>{const s=list.find(x=>x.accountId===a.id);return {accountId:a.id,name:a.name,sourceId:s?.id || null,connector:s?.connector || 'manual',...capability(s)}}),limits:HISTORY_LIMITS}
  }
  const prune=()=>{for (const [id,p] of drafts) if(now()-p.createdAt > ttl) drafts.delete(id)}
  async function preview(input = {}) {
    if(disposed) throw bad('历史回补服务已停止')
    if (!readLedger().accounts.some(a=>a.id===input.accountId)) throw bad('请选择已有账户')
    const method=input.method || 'file'
    let parsed, coverage, source=sources().find(s=>s.accountId===input.accountId)
    if(method==='api') {
      if(!capability(source).apiAvailable || !options.readSourceHistory) throw bad(capability(source).description)
      const from=historyDate(input.from,'开始日期'),to=historyDate(input.to,'结束日期')
      if(from>to) throw bad('开始日期不能晚于结束日期')
      parsed=await options.readSourceHistory(input.accountId,{from,to})
      coverage={method,requestedFrom:from,requestedTo:to,complete:false,...parsed.coverage}
    } else if(method==='file') {
      parsed=await (options.readHistoryFile || readHistoryFile)(input)
      coverage={method,requestedFrom:input.from || null,requestedTo:input.to || null,complete:false,note:'此范围仅表示文件中可见记录的跨度，无法证明中间每一天或全部业务完整；不会重建历史总资产。'}
    } else throw bad('请选择文件或官方接口回补')
    if(disposed) throw bad('历史回补服务已停止')
    const db=readLedger(), provider=source?.connector || db.accounts.find(a=>a.id===input.accountId)?.connector || 'file'
    const prepared=prepareHistory(db,{...input,provider},parsed)
    Object.assign(coverage,{observedFrom:prepared.summary.observedFrom,observedTo:prepared.summary.observedTo})
    const token=randomUUID(),revision=revisionOf(db)
    const result={token,revision,...prepared,coverage,sheets:parsed.sheets || [],selectedSheet:parsed.selectedSheet || null,ignoredSheets:parsed.ignoredSheets || []}
    prune()
    while(drafts.size>=5) drafts.delete(drafts.keys().next().value)
    drafts.set(token,{createdAt:now(),accountId:input.accountId,revision,result:structuredClone(result)})
    return result
  }
  function commit({token} = {}) {
    if(disposed) throw bad('历史回补服务已停止')
    prune();const draft=drafts.get(token)
    if(!draft) throw bad('预览已过期，请重新读取文件或接口')
    if(draft.completed) return {...draft.completed,ledger:readLedger(),summary:summarize(readLedger())}
    const db=readLedger(),preview=draft.result
    if(revisionOf(db)!==draft.revision) throw bad('账本已更新，请重新预览，核对去重结果后再导入')
    if(preview.errors.length || preview.summary.conflict) throw bad('预览存在错误或冲突，请处理后再导入')
    if(!db.accounts.some(a=>a.id===draft.accountId)) throw bad('账户已删除，请重新选择')
    const staged=structuredClone(db),batchId='HIST_'+randomUUID(),importedAt=new Date(now()).toISOString()
    const records=preview.rows.filter(r=>r.status==='new').map(({status,...row})=>({...row,id:'EVT_'+randomUUID(),batchId,importedAt,archiveOnly:true}))
    staged.historyEvents ||= [];staged.historyBatches ||= []
    staged.historyEvents.push(...records)
    const result={imported:records.length,duplicates:preview.summary.duplicate,outside:preview.summary.outside,batchId}
    staged.historyBatches.push({id:batchId,accountId:draft.accountId,importedAt,...result,coverage:preview.coverage,byKind:preview.summary.byKind})
    // Single JSON write, archive-only: never invoke trade.add or position replay.
    writeLedger(staged)
    const response={ledger:staged,summary:summarize(staged),result}
    draft.completed={result}
    return response
  }
  // 一键同步：无需选择区间。首次从最早可查日期读到今天，之后从上次水位回看 30 天增量读取；
  // 去重后直接归档新增记录（与预览→确认走同一套校验和去重），冲突/无效记录跳过并报告。
  const running=new Map()
  async function syncAccount(accountId,{full=false}={}) {
    if(disposed) throw bad('历史回补服务已停止')
    if(running.has(accountId)) return running.get(accountId)
    const task=(async()=>{
      const source=sources().find(s=>s.accountId===accountId)
      const cap=capability(source)
      if(!cap.apiAvailable || !options.readSourceHistory) return {skipped:true,reason:cap.description}
      const today=new Date(now()).toISOString().slice(0,10)
      const state=readLedger().historySync?.[accountId]
      let from=HISTORY_EPOCH
      if(!full && state?.lastTo && state.sourceId===source.id) {
        const d=new Date(state.lastTo+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-30)
        from=d.toISOString().slice(0,10) < HISTORY_EPOCH ? HISTORY_EPOCH : d.toISOString().slice(0,10)
      }
      // 本机 OpenD 的历史成交按 90 天窗口分段且有调用预算，首次只回看约两年；其余来源从最早可查日期开始。
      if(source.connector==='futu' && source.transport==='native') {
        const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-800)
        if(from<d.toISOString().slice(0,10)) from=d.toISOString().slice(0,10)
      }
      const parsed=await options.readSourceHistory(accountId,{from,to:today})
      if(disposed) throw bad('历史回补服务已停止')
      const db=readLedger()
      if(!db.accounts.some(a=>a.id===accountId)) throw bad('账户已删除')
      const prepared=prepareHistory(db,{accountId,provider:source.connector,from,to:today},{...parsed,errors:[]})
      const staged=structuredClone(db),importedAt=new Date(now()).toISOString()
      const fresh=prepared.rows.filter(r=>r.status==='new')
      const skipped=prepared.rows.filter(r=>r.status==='conflict')
      const result={imported:fresh.length,duplicates:prepared.summary.duplicate,skipped:skipped.length,from,to:today,observedFrom:prepared.summary.observedFrom,observedTo:prepared.summary.observedTo,
        warnings:[...prepared.warnings,...prepared.errors.slice(0,5).map(e=>({message:'已跳过：'+e.message}))].map(w=>w.message).slice(0,10)}
      staged.historyEvents ||= [];staged.historyBatches ||= [];staged.historySync ||= {}
      if(fresh.length) {
        const batchId='HIST_'+randomUUID()
        staged.historyEvents.push(...fresh.map(({status,...row})=>({...row,id:'EVT_'+randomUUID(),batchId,importedAt,archiveOnly:true})))
        staged.historyBatches.push({id:batchId,accountId,importedAt,imported:fresh.length,duplicates:result.duplicates,outside:0,batchId,method:'auto',
          coverage:{method:'api',requestedFrom:from,requestedTo:today,complete:false,...parsed.coverage,observedFrom:result.observedFrom,observedTo:result.observedTo},byKind:prepared.summary.byKind})
        result.batchId=batchId
      }
      staged.historySync[accountId]={sourceId:source.id,lastFrom:from,lastTo:today,at:importedAt,imported:fresh.length,skipped:skipped.length,note:parsed.coverage?.note || null}
      writeLedger(staged)
      return result
    })()
    running.set(accountId,task)
    try { return await task } finally { running.delete(accountId) }
  }
  return {capabilities,preview,commit,syncAccount,dispose(){disposed=true;drafts.clear()}}
}
