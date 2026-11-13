// 只读探针：用生产账本的行情键实际打一次腾讯行情接口，报告会更新多少条、
// 哪些键拿不到价、失败原因是什么。绝不写账本。
import { readFileSync } from 'node:fs'
const dir = 'C:/Users/zheyu/.dsh/data/dsh-portfolio'
const db = JSON.parse(readFileSync(dir + '/ledger.json', 'utf8'))
const { fetchQuotes, fetchFundQuotes } = await import(new URL('../quotes.mjs', import.meta.url))

const ins = new Map(db.instruments.map((i) => [i.id, i]))
const quoteKey = (i) => {
  if (!i) return ''
  const m = String(i.market || '').toUpperCase()
  const s = String(i.symbol || '').trim()
  if (m === 'CN') return /^(6|9|5)/.test(s) ? 'sh' + s : (/^(0|2|3)/.test(s) ? 'sz' + s : '')
  if (m === 'HK') return /^\d{1,5}$/.test(s) ? 'hk' + s.padStart(5, '0') : ''
  if (m === 'US') return /^[A-Za-z.]+$/.test(s) ? 'us' + s : ''
  return ''
}
const fundQuoteKey = (i) => {
  if (!i) return ''
  const m = String(i.market || '').toUpperCase()
  const s = String(i.symbol || '').trim()
  if (m === 'FUND' && /^\d{6}$/.test(s)) return 'jj' + s
  return ''
}
const byKey = new Map()
for (const h of db.holdings || []) {
  const i = ins.get(h.instrumentId) || {}
  const key = (quoteKey(i) || fundQuoteKey(i) || '').toLowerCase()
  if (!key) continue
  if (!byKey.has(key)) byKey.set(key, new Set())
  byKey.get(key).add(h.instrumentId)
}
const keys = [...byKey.keys()]
console.log('行情键总数:', keys.length)
const t0 = Date.now()
const [stocks, funds] = await Promise.all([
  fetchQuotes(keys, { timeoutMs: 20000 }),
  fetchFundQuotes(keys, { timeoutMs: 20000 }),
])
const quotes = new Map([...stocks.quotes, ...funds.quotes])
const warnings = [...stocks.warnings, ...funds.warnings]
console.log('拿到报价:', quotes.size, '· 警告:', warnings.length, '· 耗时', Date.now() - t0, 'ms')
const missing = keys.filter((k) => !quotes.has(k))
if (missing.length) console.log('缺价的键:', missing.join(', '))
if (warnings.length) console.log('警告:', warnings.slice(0, 10).join(' | '))
let would = 0
for (const [k, set] of byKey) if (quotes.has(k)) would += set.size
console.log('若现在刷新，会更新:', would, '条持仓')
