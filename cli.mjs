#!/usr/bin/env node
// dsh-portfolio CLI — how the AI (资产管家) reads and writes the ledger.
// Usage:
//   node cli.mjs state
//   node cli.mjs summary
//   node cli.mjs '<op-json>'          e.g. '{"op":"trade.add","accountId":"...","symbol":"600519","side":"buy","qty":100,"price":1600}'
//   node cli.mjs help
// Every command prints one JSON object to stdout. Nothing is interactive.
import { join } from 'node:path'
import { load, save, applyOp, summarize, OpError, DATA_FILE, DATA_DIR } from './store.mjs'
import { forecast } from './forecast.mjs'
import { billSummary } from './bills.mjs'
import { parseBillCsv, billPreview } from './bills-import.mjs'
import { buildDigest } from './digest.mjs'
import { inferredTransfers } from './timeline.mjs'
import { normalizeSymbol, identityKey, resolveSecurity } from './symbols.mjs'
import { computePerformance } from './performance.mjs'

function out(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n')
  process.exitCode = code
}

function help() {
  out({
    ok: true,
    dataFile: DATA_FILE,
    dataDir: DATA_DIR,
    usage: [
      'node cli.mjs state                          # full ledger',
      'node cli.mjs summary                        # valued totals in base currency',
      'node cli.mjs accounts                       # account list with values (balance sheet view)',
      'node cli.mjs positions [accountId]          # holdings joined with instruments (+sector/style)',
      'node cli.mjs history [accountId] [limit]    # archived flows (deposit/dividend/fee/life bills)',
      'node cli.mjs bills [months]                 # life-bill summary by category and month (default 12)',
      'node cli.mjs bills-import <accountId> <csv> [apply=1]  # preview (default) or import WeChat/Alipay bill CSV',
      'node cli.mjs digest [days]                  # daily summary: net worth, upcoming bills, data notes (default 7)',
      'node cli.mjs inferred-flows [accountId]     # lower-bound estimate of unrecorded external transfers',
      'node cli.mjs forecast [days]                # recurring flows + projected out/in for next N days (default 30)',
      'node cli.mjs performance [accountId] [days] # backfilled daily NAV from flows + historical prices (default 1095)',
      'node cli.mjs export [file]                  # write the whole ledger JSON to a file',
      'node cli.mjs <op> key=value key=value ...   # run one operation',
      'node cli.mjs \'{"op":"...",...}\'             # or pass one JSON object',
      '',
      'examples:',
      '  node cli.mjs account.upsert name=华泰证券 type=broker currency=CNY',
      '  node cli.mjs trade.add accountId=ACC_xxx symbol=600519 side=buy qty=100 price=1600',
      '  node cli.mjs historyEvent.add accountId=ACC_xxx kind=deposit date=2026-11-08 cashAmount=10000 note=工资转入了 life-bill 余额',
      '  node cli.mjs holding.upsert accountId=ACC_xxx symbol=00700 market=HK qty=200 avgCost=380',
      '  node cli.mjs instrument.upsert instrumentId=INS_xxx sector=白酒 style=value',
      '  node cli.mjs price.set instrumentId=INS_xxx price=1650',
      '  node cli.mjs fx.set currency=HKD rate=0.92',
      '  node cli.mjs budget.set category=food monthly=2000',
    ],
    ops: {
      'account.upsert': '{op, account:{id?,name,type?,currency?,note?,type credit=负债}}',
      'account.remove': '{op, id, confirm:true}   # removes holdings/trades/history of the account',
      'instrument.upsert': '{op, instrument:{id?,symbol,name?,market?,assetClass?,currency?,sector?,style?}}',
      'holding.upsert': '{op, holding:{id?,accountId,symbol|instrumentId,market?,qty,avgCost,currency?,manualPrice?,note?}}',
      'holding.remove': '{op, id}',
      'trade.add': '{op, accountId, symbol|instrumentId, market?, side:"buy"|"sell", qty, price, fee?, currency?, date?, note?}',
      'trade.remove': '{op, id}',
      'historyEvent.add': '{op, accountId, kind(deposit|withdrawal|dividend|interest|fee|tax|security_in|security_out|ipo|other), date, cashAmount, currency?, fee?, note?, externalId?}  # archive-only flow, never moves positions',
      'price.set': '{op, holdingId?|instrumentId?, price}',
      'fx.set': '{op, currency, rate}   # 1 unit of currency = ? base',
      'base.set': '{op, currency}',
      'import.holdings': '{op, rows:[holding...]}',
      'import.trades': '{op, rows:[trade...], applyHoldings:false, source?} # historical imports: archive only; duplicate rows skipped',
    },
  })
}

function parseValue(v) {
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

// Accepts: op <name> k=v k=v ...   OR a single JSON argument '{...}'
function parseRequest(args) {
  if (args[0] && args[0].trim().startsWith('{')) {
    const req = JSON.parse(args.join(' '))
    const op = req.op || req.operation
    const payload = { ...req }; delete payload.op; delete payload.operation
    return { op, payload }
  }
  const [op, ...rest] = args
  const payload = {}
  for (const token of rest) {
    const eq = token.indexOf('=')
    if (eq > 0) {
      const key = token.slice(0, eq), value = token.slice(eq + 1)
      payload[key] = ['symbol', 'externalId', 'accountId', 'instrumentId', 'holdingId', 'date', 'name', 'kind', 'sector', 'style', 'side', 'note', 'currency', 'source'].includes(key) ? value : parseValue(value)
    }
    else if (token.startsWith('-')) { /* ignore stray flags */ }
  }
  return { op, payload }
}

const arg = process.argv.slice(2)
if (arg.length === 0 || arg[0] === 'help' || arg[0] === '--help' || arg[0] === '-h') { help() }
else if (arg[0] === 'state') {
  const db = load()
  out({ ok: true, ledger: db, summary: summarize(db) })
} else if (arg[0] === 'summary') {
  out({ ok: true, summary: summarize(load()) })
} else if (arg[0] === 'accounts') {
  // Balance-sheet view: credit accounts are liabilities, everything else is an asset.
  const db = load(), summary = summarize(db)
  const byId = new Map(summary.accounts.map((a) => [a.id, a]))
  const rows = db.accounts.map((a) => ({ ...byId.get(a.id), liability: a.type === 'credit' }))
  const assets = rows.filter((r) => !r.liability).reduce((s, r) => s + (r.valueBase || 0), 0)
  const liabilities = rows.filter((r) => r.liability).reduce((s, r) => s + Math.abs(r.valueBase || 0), 0)
  out({ ok: true, baseCurrency: summary.baseCurrency, accounts: rows, assets: Number(assets.toFixed(2)), liabilities: Number(liabilities.toFixed(2)), netWorth: Number((assets - liabilities).toFixed(2)) })
} else if (arg[0] === 'positions') {
  const db = load(), summary = summarize(db)
  const accountId = arg[1]
  const insMap = new Map(db.instruments.map((i) => [i.id, i]))
  const fx = summary.fx, base = summary.baseCurrency
  const rows = db.holdings.filter((h) => !accountId || h.accountId === accountId).map((h) => {
    const ins = insMap.get(h.instrumentId) || {}
    const rate = fx[h.currency] || fx[h.currency || ''] || (h.currency === base ? 1 : undefined)
    const valueBase = typeof rate === 'number' ? Number((h.qty * (h.manualPrice ?? h.avgCost ?? 0) * rate).toFixed(2)) : null
    return { holdingId: h.id, accountId: h.accountId, symbol: ins.symbol, name: ins.name, market: ins.market, assetClass: ins.assetClass, sector: ins.sector || null, style: ins.style || null, currency: h.currency, qty: h.qty, avgCost: h.avgCost, price: h.manualPrice ?? null, valueBase }
  })
  out({ ok: true, baseCurrency: base, count: rows.length, positions: rows })
} else if (arg[0] === 'history') {
  const db = load()
  const accountId = arg[1]
  const limit = Number(arg[2]) || 200
  const events = (db.historyEvents || []).filter((e) => !accountId || e.accountId === accountId).slice(-limit)
  out({ ok: true, count: events.length, events })
} else if (arg[0] === 'instrument.merge') {
  // 合并重复标的：node cli.mjs instrument.merge keepId=INS_A dropId=INS_B
  const req = parseRequest(['instrument.merge', ...arg.slice(1)])
  const db = load()
  try {
    const result = applyOp(db, 'instrument.merge', req.payload)
    save(db)
    out({ ok: true, ...result, summary: summarize(db) })
  } catch (error) {
    out({ ok: false, error: { code: error.code || 'internal', message: error.message } }, 1)
  }
} else if (arg[0] === 'symbol.resolve') {
  // 外部查询：把名称或旧写法解析成统一交易代码（东财公开搜索）。
  try {
    out({ ok: true, query: arg.slice(1).join(' '), resolved: await resolveSecurity(arg.slice(1).join(' ')) })
  } catch (error) {
    out({ ok: false, error: { code: 'lookup-failed', message: error.message } }, 1)
  }
} else if (arg[0] === 'instruments.normalize') {
  // 把历史导入的旧代码收敛到统一写法；重复身份（同一只证券多条记录）只报告不合并。
  const apply = arg.includes('apply=1')
  const db = load()
  const groups = new Map()
  for (const ins of db.instruments) {
    const key = identityKey(ins)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(ins)
  }
  const planned = []
  const collisions = []
  for (const [key, list] of groups) {
    if (list.length > 1) {
      collisions.push({ key, instruments: list.map((i) => ({ id: i.id, symbol: i.symbol, market: i.market, name: i.name, holdings: db.holdings.filter((h) => h.instrumentId === i.id).length })) })
    }
    for (const ins of list) {
      const normalized = normalizeSymbol(ins.symbol, ins.market)
      if (normalized.symbol !== ins.symbol) planned.push({ id: ins.id, from: ins.market + '|' + ins.symbol, to: normalized.market + '|' + normalized.symbol, name: ins.name })
    }
  }
  if (!apply) { out({ ok: true, applied: false, planned, collisions }) }
  else {
    const renamed = []
    for (const item of planned) {
      try { applyOp(db, 'instrument.rename', { id: item.id, symbol: item.to.split('|')[1] }); renamed.push(item) }
      catch (error) { renamed.push({ ...item, error: error.message }) }
    }
    if (renamed.some((r) => !r.error)) save(db)
    out({ ok: true, applied: true, renamed, collisions })
  }
} else if (arg[0] === 'inferred-flows') {
  out({ ok: true, ...inferredTransfers(load(), { accountIds: arg[1] ? [arg[1]] : [] }) })
} else if (arg[0] === 'digest') {
  const horizonDays = Math.min(30, Math.max(1, Number(arg[1]) || 7))
  out({ ok: true, ...buildDigest(load(), { horizonDays }) })
} else if (arg[0] === 'bills') {
  const months = Math.min(60, Math.max(1, Number(arg[1]) || 12))
  out({ ok: true, ...billSummary(load(), { months }) })
} else if (arg[0] === 'bills-import') {
  const accountId = arg[1], file = arg[2]
  const apply = arg.includes('apply=1') || arg.includes('--apply')
  if (!accountId || !file) { out({ ok: false, error: { code: 'bad-request', message: '用法: node cli.mjs bills-import <accountId> <csv> [apply=1]' } }, 2); process.exit() }
  const { readFileSync } = await import('node:fs')
  let text
  const bytes = readFileSync(file)
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { text = new TextDecoder('gbk').decode(bytes) }
  const parsed = parseBillCsv(text)
  const preview = billPreview(parsed)
  if (!apply) { out({ ok: true, applied: false, accountId, file, ...preview, rows: preview.rows.slice(0, 20) }) }
  else {
    const db = load()
    const result = applyOp(db, 'bills.import', { accountId, rows: parsed.rows, provider: parsed.provider })
    save(db)
    out({ ok: true, applied: true, ...result, summary: summarize(db) })
  }
} else if (arg[0] === 'forecast') {
  const days = Math.min(365, Math.max(7, Number(arg[1]) || 30))
  out({ ok: true, ...forecast(load(), { days }) })
} else if (arg[0] === 'performance') {
  const accountId = arg[1] && !/^\d+$/.test(arg[1]) ? arg[1] : null
  const days = Math.min(3650, Math.max(30, Number(arg[1] && /^\d+$/.test(arg[1]) ? arg[1] : arg[2]) || 1095))
  const result = await computePerformance(load(), { accountIds: accountId ? [accountId] : [], days, cachePath: join(DATA_DIR, 'cache', 'klines.json') })
  // 曲线可能上千点：CLI 输出指标 + 首尾与最大回撤区间，完整序列放在 series。
  out({ ok: true, ...result })
} else if (arg[0] === 'export') {
  const db = load()
  const { writeFileSync } = await import('node:fs')
  const target = arg[1] || 'dsh-wealth-export.json'
  writeFileSync(target, JSON.stringify({ exportedAt: new Date().toISOString(), ledger: db, summary: summarize(db) }, null, 2))
  out({ ok: true, file: target, accounts: db.accounts.length, holdings: db.holdings.length, historyEvents: (db.historyEvents || []).length })
} else {
  let req
  try { req = parseRequest(arg) } catch (e) { out({ ok: false, error: { code: 'bad-json', message: '参数解析失败: ' + e.message } }, 2); process.exit() }
  const { op, payload } = req
  if (!op) { out({ ok: false, error: { code: 'bad-request', message: '缺少 op' } }, 2); process.exit() }
  const db = load()
  try {
    const result = applyOp(db, op, payload)
    save(db)
    out({ ok: true, op, result, summary: summarize(db) })
  } catch (error) {
    const code = error instanceof OpError ? error.code : 'internal'
    out({ ok: false, op, error: { code, message: error.message } }, 1)
  }
}
