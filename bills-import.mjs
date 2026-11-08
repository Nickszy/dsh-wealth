// 微信支付 / 支付宝 账单 CSV 解析：读官方导出文件，规范化为生活账单行，并给出分类建议。
// 只解析文件内容，不联网、不写账本；分类建议基于关键词，用户可改。
// 格式随时间变化：按表头定位列，不认识的行跳过并计入统计，绝不猜测金额。
import { LIFE_CATEGORIES } from './model.mjs'

const HEADER_KEYS = [
  ['date', ['交易时间', '交易创建时间', '付款时间', '创建时间']],
  ['type', ['交易类型', '交易分类', '类型']],
  ['counterparty', ['交易对方', '对方', '商户名称']],
  ['description', ['商品说明', '商品名称', '商品', '备注说明']],
  ['direction', ['收/支', '收支', '收/支类型']],
  ['amount', ['金额(元)', '金额（元）', '金额']],
  ['method', ['收/付款方式', '支付方式', '付款方式']],
  ['status', ['交易状态', '当前状态', '状态']],
  ['externalId', ['交易订单号', '交易单号', '交易号', '订单号']],
  ['merchantId', ['商家订单号', '商户单号']],
]

function splitCsvLine(line) {
  const out = []
  let current = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') quoted = false
      else current += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(current); current = '' }
    else current += ch
  }
  out.push(current)
  return out.map((s) => s.trim())
}

function detectHeader(lines) {
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.some((c) => /收\/支/.test(c)) && cells.some((c) => /时间/.test(c))) {
      const map = {}
      for (const [key, aliases] of HEADER_KEYS) {
        const index = cells.findIndex((cell) => aliases.some((alias) => cell.replace(/\s/g, '') === alias.replace(/\s/g, '')))
        if (index >= 0 && map[key] === undefined) map[key] = index
      }
      return { index: i, map, cells }
    }
  }
  return null
}

const toAmount = (value) => {
  const text = String(value || '').replace(/[¥￥,\s]/g, '')
  const n = Number(text)
  return Number.isFinite(n) && n > 0 ? n : null
}
const toDay = (value) => {
  const m = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(String(value || ''))
  if (!m) return null
  const day = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  const d = new Date(day + 'T00:00:00Z')
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day ? day : null
}
const toTime = (value) => {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(value || ''))
  return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}:${m[3] || '00'}` : null
}

// 关键词 → 生活分类；匹配顺序即优先级（居住先于购物，避免「物业费」落入购物）。
const CATEGORY_RULES = [
  ['housing', ['房租', '租金', '物业', '水费', '电费', '燃气', '水电煤', '房贷']],
  ['food', ['餐饮', '美团', '饿了么', '外卖', '咖啡', '奶茶', '星巴克', '瑞幸', '肯德基', '麦当劳', '火锅', '食堂', '早餐', '午餐', '晚餐']],
  ['transport', ['交通', '地铁', '公交', '滴滴', '打车', '出租车', '高铁', '火车票', '航空', '机票', '加油', '停车', '12306', '共享单车']],
  ['telecom', ['话费', '流量', '宽带', '移动', '联通', '电信', '通讯']],
  ['health', ['医疗', '医院', '药房', '药店', '挂号', '体检', '诊所']],
  ['education', ['教育', '学费', '培训', '课程', '书店', '书籍', '文具']],
  ['entertainment', ['娱乐', '电影', '游戏', '视频', '音乐', '演出', 'ktv', '健身']],
  ['shopping', ['购物', '淘宝', '天猫', '京东', '拼多多', '超市', '便利店', '商场', '服饰', '数码']],
  ['social', ['红包', '礼金', '份子', '随礼', '礼物']],
]
/** 按标题/商品/对方猜测生活分类；猜不到返回 null，交给用户或 AI。 */
export function guessCategory(...texts) {
  const haystack = texts.filter(Boolean).join(' ').toLowerCase()
  if (!haystack) return null
  for (const [category, words] of CATEGORY_RULES) {
    if (words.some((w) => haystack.includes(w.toLowerCase()))) return category
  }
  return null
}

/**
 * 解析微信 / 支付宝账单 CSV 文本。
 * 返回 { provider, header: [...], rows, skipped, warnings }；
 * rows 每项 { date, time, direction: 'out'|'in'|'none', amount, counterparty,
 *            description, method, status, externalId, category, note }。
 */
export function parseBillCsv(text) {
  const rows = [], warnings = []
  const raw = String(text || '').replace(/^﻿/, '')
  const lines = raw.split(/\r?\n/)
  const provider = /微信支付/.test(raw) ? 'wechat' : /支付宝/.test(raw) ? 'alipay' : 'unknown'
  const header = detectHeader(lines)
  if (!header) return { provider, rows, skipped: 0, warnings: ['BILLS_HEADER_NOT_FOUND'] }
  let skipped = 0
  for (let i = header.index + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || /^-{5,}/.test(line.trim())) continue
    const cells = splitCsvLine(line)
    const pick = (key) => (header.map[key] === undefined ? '' : cells[header.map[key]] || '')
    const date = toDay(pick('date'))
    const amount = toAmount(pick('amount'))
    if (!date || amount === null) { skipped++; continue }
    const directionText = pick('direction')
    const direction = /支出/.test(directionText) ? 'out' : /收入/.test(directionText) ? 'in' : /不计收支/.test(directionText) ? 'none' : null
    if (!direction) { skipped++; continue }
    const status = pick('status')
    if (/关闭|失败|已撤销/.test(status)) { skipped++; continue }
    const counterparty = pick('counterparty')
    const description = pick('description')
    const externalId = pick('externalId')
    rows.push({
      date, time: toTime(pick('date')),
      direction, amount,
      counterparty: counterparty || null,
      description: description && description !== '/' ? description : null,
      method: pick('method') || null,
      status: status || null,
      externalId: externalId ? provider + ':' + externalId : null,
      category: guessCategory(pick('type'), counterparty, description),
      note: [counterparty, description].filter((v) => v && v !== '/').join(' · ') || null,
      type: pick('type') || null,
    })
  }
  if (!rows.length) warnings.push('BILLS_NO_ROWS')
  return { provider, header: header.cells, rows, skipped, warnings }
}

/** 预览统计：按方向与分类汇总，供导入前确认。 */
export function billPreview(parsed) {
  const counts = { total: parsed.rows.length, out: 0, in: 0, none: 0, categorized: 0 }
  const categories = new Map()
  let outTotal = 0, inTotal = 0
  const undated = new Set()
  for (const row of parsed.rows) {
    if (row.direction === 'out') { counts.out++; outTotal += row.amount }
    else if (row.direction === 'in') { counts.in++; inTotal += row.amount }
    else counts.none++
    if (row.category && LIFE_CATEGORIES[row.category]) {
      counts.categorized++
      categories.set(row.category, (categories.get(row.category) || 0) + (row.direction === 'in' ? row.amount : row.direction === 'out' ? -row.amount : 0))
    }
    undated.add(row.date.slice(0, 7))
  }
  return {
    provider: parsed.provider,
    counts: { ...counts, skipped: parsed.skipped },
    totals: { out: Number(outTotal.toFixed(2)), in: Number(inTotal.toFixed(2)) },
    categories: [...categories.entries()].map(([category, amount]) => ({ category, label: LIFE_CATEGORIES[category], amount: Number(amount.toFixed(2)) })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    months: [...undated].sort(),
    warnings: parsed.warnings,
    rows: parsed.rows.slice(0, 200),
  }
}
