#!/usr/bin/env node
// dsh-portfolio CLI — how the AI (资产管家) reads and writes the ledger.
// Usage:
//   node cli.mjs state
//   node cli.mjs summary
//   node cli.mjs '<op-json>'          e.g. '{"op":"trade.add","accountId":"...","symbol":"600519","side":"buy","qty":100,"price":1600}'
//   node cli.mjs help
// Every command prints one JSON object to stdout. Nothing is interactive.
import { load, save, applyOp, summarize, OpError, DATA_FILE, DATA_DIR } from './store.mjs'

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
      'node cli.mjs <op> key=value key=value ...   # run one operation',
      'node cli.mjs \'{"op":"...",...}\'             # or pass one JSON object',
      '',
      'examples:',
      '  node cli.mjs account.upsert name=华泰证券 type=broker currency=CNY',
      '  node cli.mjs trade.add accountId=ACC_xxx symbol=600519 side=buy qty=100 price=1600',
      '  node cli.mjs holding.upsert accountId=ACC_xxx symbol=00700 market=HK qty=200 avgCost=380',
      '  node cli.mjs price.set instrumentId=INS_xxx price=1650',
      '  node cli.mjs fx.set currency=HKD rate=0.92',
    ],
    ops: {
      'account.upsert': '{op, account:{id?,name,type?,currency?,note?}}',
      'account.remove': '{op, id}',
      'instrument.upsert': '{op, instrument:{id?,symbol,name?,market?,assetClass?,currency?}}',
      'holding.upsert': '{op, holding:{id?,accountId,symbol|instrumentId,market?,qty,avgCost,currency?,manualPrice?,note?}}',
      'holding.remove': '{op, id}',
      'trade.add': '{op, accountId, symbol|instrumentId, market?, side:"buy"|"sell", qty, price, fee?, currency?, date?, note?}',
      'trade.remove': '{op, id}',
      'price.set': '{op, holdingId?|instrumentId?, price}',
      'fx.set': '{op, currency, rate}   # 1 unit of currency = ? base',
      'base.set': '{op, currency}',
      'import.holdings': '{op, rows:[holding...]}',
      'import.trades': '{op, rows:[trade...]}',
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
    if (eq > 0) payload[token.slice(0, eq)] = parseValue(token.slice(eq + 1))
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
