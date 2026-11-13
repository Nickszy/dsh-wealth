// 只读探针：用生产账本 + 插件真实的 quoteKey / fundQuoteKey 打一次腾讯行情接口，
// 报告能更新多少条、哪些标的没有公开行情、失败原因。绝不写账本。
import { readFileSync } from 'node:fs'
import { quoteKey, fundQuoteKey, fetchQuotes, fetchFundQuotes } from '../quotes.mjs'

const dir = 'C:/Users/zheyu/.dsh/data/dsh-portfolio'
const db = JSON.parse(readFileSync(dir + '/ledger.json', 'utf8'))
const ins = new Map(db.instruments.map((i) => [i.id, i]))

const byKey = new Map()
const noKey = []
for (const h of db.holdings || []) {
  const i = ins.get(h.instrumentId) || {}
  const key = (quoteKey(i) || fundQuoteKey(i) || '').toLowerCase()
  if (!key) { noKey.push(i); continue }
  if (!byKey.has(key)) byKey.set(key, [])
  byKey.get(key).push(h)
}
const keys = [...byKey.keys()]
console.log('有行情键的持仓:', [...byKey.values()].reduce((n, v) => n + v.length, 0), '· 行情键去重:', keys.length)
console.log('本来就没有行情键:', noKey.length, noKey.map((i) => i.market + '/' + i.symbol).join(', '))

const t0 = Date.now()
const [stocks, funds] = await Promise.all([
  fetchQuotes(keys, { timeoutMs: 20000 }),
  fetchFundQuotes(keys, { timeoutMs: 20000 }),
])
const quotes = new Map([...stocks.quotes, ...funds.quotes])
const warnings = [...stocks.warnings, ...funds.warnings]
let would = 0
for (const [k, list] of byKey) if (quotes.has(k)) would += list.length
console.log('拿到报价:', quotes.size, '/', keys.length, '· 耗时', Date.now() - t0, 'ms')
console.log('若现在刷新会更新:', would, '条持仓')
const missing = keys.filter((k) => !quotes.has(k))
if (missing.length) console.log('没有公开行情的键:', missing.join(', '))
const net = warnings.filter((w) => w.startsWith('QUOTES_'))
if (net.length) console.log('接口级警告:', net.join(' | '))
