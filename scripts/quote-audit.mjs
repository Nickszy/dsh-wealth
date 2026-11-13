// 只读审计（v2）：用插件真实的 quoteKey / fundQuoteKey / valuationPrice 统计
// 每条持仓的行情键与估值链。绝不写账本。
import { readFileSync } from 'node:fs'
import { quoteKey, fundQuoteKey, valuationPrice } from '../quotes.mjs'

const dir = 'C:/Users/zheyu/.dsh/data/dsh-portfolio'
const db = JSON.parse(readFileSync(dir + '/ledger.json', 'utf8'))
const ins = new Map(db.instruments.map((i) => [i.id, i]))
const rows = db.holdings.map((h) => {
  const i = ins.get(h.instrumentId) || {}
  const key = quoteKey(i) || fundQuoteKey(i)
  return { m: i.market, c: i.assetClass, s: i.symbol, name: i.name, key, hand: h.manualPrice, quote: h.quotePrice, qsrc: h.quoteSource, src: h.sourcePrice, cost: h.avgCost }
})
const grouped = {}
for (const r of rows) {
  const k = r.m + ':' + r.c
  grouped[k] = grouped[k] || []
  grouped[k].push(r)
}
for (const [k, v] of Object.entries(grouped)) {
  console.log(k.padEnd(12), 'n=' + String(v.length).padStart(2),
    'nokey=' + v.filter((x) => !x.key).length,
    'hasQuote=' + v.filter((x) => x.quote != null).length,
    'handReal=' + v.filter((x) => x.hand != null && Number(x.hand) !== Number(x.src)).length)
}
console.log('--- 无行情键（刷新永远不会覆盖它们）---')
for (const r of rows) if (!r.key) console.log((r.m + '/' + r.c).padEnd(14), String(r.s).padEnd(18), r.name || '')
