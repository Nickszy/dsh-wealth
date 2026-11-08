// Read-only history preview. No account lookup, file writes, network, or ledger mutation.
// A chosen defaultCurrency labels the file's monetary unit; it never converts amounts.
import { inflateRawSync } from 'node:zlib'
import { posix } from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 25000
const MAX_ENTRIES = 512
const MAX_ENTRY_BYTES = 16 * 1024 * 1024
const MAX_INFLATED_BYTES = 32 * 1024 * 1024
const ALIASES = {
  date: ['日期', '成交日期', '交易日期', '发生日期', '业务日期', '交割日期', '日期时间', '成交日期时间', '交易日期时间', 'date', 'tradedate', 'transactiondate', 'executiondate', 'filleddate', 'datetime', 'date/time', 'tradedatetime', 'executiondatetime'],
  time: ['时间', '成交时间', '交易时间', 'time', 'tradetime', 'executiontime', 'filledtime'],
  symbol: ['代码', '证券代码', '股票代码', '基金代码', '标的代码', '产品代码', 'symbol', 'ticker', 'stockcode', 'securitycode', 'fundcode'],
  name: ['名称', '证券名称', '股票名称', '基金名称', '产品名称', 'name', 'securityname', 'stockname', 'fundname'],
  kind: ['交易类别', '交易类型', '业务类型', '业务名称', '操作', '方向', '买卖方向', '交易方向', '买卖', 'kind', 'type', 'transactiontype', 'tradetype', 'side', 'action', 'direction', 'buysell'],
  qty: ['数量', '成交数量', '交易数量', '证券数量', 'qty', 'quantity', 'shares', 'filledqty', 'filledquantity', 'executedquantity'],
  price: ['价格', '成交价', '成交价格', '交易价格', 'price', 'tradeprice', 'filledprice', 'executionprice'],
  grossAmount: ['成交金额', '交易金额', '毛额', '毛金额', 'gross', 'grossamount', 'grosscash', 'grosscashamount', 'grossproceeds', 'tradeamount', 'transactionamount', 'principal'],
  cashAmount: ['发生金额', '资金发生额', '资金发生金额', '资金变动', '资金变动金额', '收支金额', '现金金额', '净额', '净金额', '清算金额', '结算金额', 'cashamount', 'cash', 'net', 'netamount', 'netcash', 'netcashamount', 'netproceeds', 'cashflow', 'cashchange', 'settlementamount', 'proceeds', 'amount'],
  fee: ['费用', '手续费', '交易费用', '总费用', 'fee', 'fees', 'commission', 'totalfees'],
  currency: ['币种', '货币', '币别', '结算币种', 'currency', 'ccy', 'settlementcurrency', 'tradingcurrency'],
  market: ['市场', '交易市场', '证券市场', 'market', 'exchange'],
  // An order may have multiple executions. Order IDs must never become execution IDs.
  externalId: ['成交编号', '成交号', '成交单号', '成交序号', '交易编号', '流水号', 'externalid', 'tradeid', 'executionid', 'executionnumber', 'dealid', 'transactionid'],
  note: ['备注', '说明', '摘要', 'note', 'notes', 'description', 'memo'],
}
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[\s_\-()（）]/g, '')
const HEADERS = new Map(Object.entries(ALIASES).flatMap(([field, aliases]) => aliases.map((alias) => [normalize(alias), field])))
const KIND_ALIASES = {
  buy: ['buy', 'bought', '买入', '证券买入', '买'],
  sell: ['sell', 'sold', '卖出', '证券卖出', '卖'],
  deposit: ['deposit', 'cashdeposit', '银行转证券', '银行转入', '银证转入', '资金转入', '入金', '存入'],
  withdrawal: ['withdrawal', 'withdraw', 'cashwithdrawal', '证券转银行', '银行转出', '银证转出', '资金转出', '出金', '取出'],
  dividend: ['dividend', 'cashdividend', '除权除息', '红利入账', '红利入帐', '股息入账', '股息', '分红', '派息'],
  tax: ['tax', 'dividendtax', 'withholdingtax', '股息个税征收', '股息红利税', '红利税', '代扣税'],
  repo_open: ['repo_open', 'repoopen', '融券回购', '通用回购逆回购', '逆回购', '国债逆回购'],
  repo_close: ['repo_close', 'repoclose', '融券购回', '通用回购逆回购购回', '逆回购到期', '逆回购购回'],
  ipo: ['ipo', '新股入帐', '新股入账', '新股配售', '新股上市'],
  security_out: ['security_out', 'securityout', '股份转出', '证券转出'],
  security_in: ['security_in', 'securityin', '股份转入', '证券转入'],
  other: ['other', '其他'],
}
const KINDS = new Map(Object.entries(KIND_ALIASES).flatMap(([kind, aliases]) => aliases.map((alias) => [normalize(alias), kind])))
const blank = (value) => value === null || value === undefined || (typeof value === 'string' && !value.trim())
const textOf = (value) => blank(value) ? '' : String(value).trim()
const issue = (row, sheet, field, message) => ({ row, sheet, field, message })
const emptyResult = (sheets = [], selectedSheet = null) => ({ rows: [], errors: [], warnings: [], sheets, selectedSheet, ignoredSheets: sheets.filter((sheet) => sheet !== selectedSheet) })
const summarySheet = (name) => /^(?:持仓(?:数据|明细|汇总)?|已清仓|清仓(?:数据|明细|汇总)?|holdings?|positions?|closed(?:positions|holdings)?|summary)$/i.test(normalize(name))

function currencyOf(value) {
  const raw = textOf(value).toUpperCase()
  return ({ 人民币: 'CNY', 人民币元: 'CNY', RMB: 'CNY', 港币: 'HKD', 港元: 'HKD', 美元: 'USD', 美金: 'USD', 'US$': 'USD', 'HK$': 'HKD' })[raw] || raw
}
function marketOf(value) {
  const raw = textOf(value).toUpperCase()
  return ({ 港股: 'HK', 香港: 'HK', HKEX: 'HK', SEHK: 'HK', 美股: 'US', 美国: 'US', NASDAQ: 'US', NYSE: 'US', ARCA: 'US', 沪深: 'CN', 'A股': 'CN', 沪股: 'CN', 深股: 'CN', SH: 'CN', SS: 'CN', SZ: 'CN', SSE: 'CN', SZSE: 'CN' })[raw] || raw || null
}
function numberOf(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = textOf(value)
  // Decimal or correctly grouped thousands only; no coercion of blanks, hex or formulas.
  if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d*)?)$/.test(raw)) return null
  const number = Number(raw.replaceAll(',', ''))
  return Number.isFinite(number) ? number : null
}
function timeOf(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(11, 19) : null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value >= 1) return null
    const seconds = Math.round(value * 86400)
    return seconds < 86400 ? [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':') : null
  }
  const raw = textOf(value)
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(raw) || /^(\d{2})(\d{2})(\d{2})$/.exec(raw)
  if (!match || +match[1] > 23 || +match[2] > 59 || +(match[3] || 0) > 59) return null
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`
}
function dateOf(value, date1904 = false) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? { date: value.toISOString().slice(0, 10), time: value.getUTCHours() || value.getUTCMinutes() || value.getUTCSeconds() ? timeOf(value) : null } : null
  if (typeof value === 'number' && value < 10000000) {
    if (!Number.isFinite(value) || value < (date1904 ? 0 : 1) || value > 2958465 || (!date1904 && Math.floor(value) === 60)) return null
    const days = Math.floor(value), base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, days < 60 ? 31 : 30)
    const date = new Date(base + days * 86400000)
    return { date: date.toISOString().slice(0, 10), time: value % 1 ? timeOf(value % 1) : null }
  }
  const match = /^(\d{4})(?:[-/年](\d{1,2})[-/月](\d{1,2})(?:日)?|(\d{2})(\d{2}))(?:[ T](\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:Z|[+\-]\d{2}:?\d{2})?)?$/.exec(textOf(value))
  if (!match) return null
  const date = `${match[1]}-${(match[2] || match[4]).padStart(2, '0')}-${(match[3] || match[5]).padStart(2, '0')}`
  const parsed = new Date(`${date}T00:00:00Z`), time = match[6] ? timeOf(match[6]) : null
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && (!match[6] || time) ? { date, time } : null
}

function delimiterOf(text) {
  let quoted = false, start = 0, fallback = ','
  // A preamble may itself contain commas. Prefer the delimiter on a recognized
  // trade header rather than the first punctuation in the file.
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i]
    if (ch === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted }
    else if (!quoted && (i === text.length || ch === '\r' || ch === '\n')) {
      const record = text.slice(start, i)
      for (const delimiter of ['\t', ',']) {
        const fields = record.split(delimiter).map((cell) => HEADERS.get(normalize(cell.replace(/^\s*"|"\s*$/g, ''))))
        if (fields.includes('date') && fields.includes('kind')) return delimiter
      }
      if (record.includes('\t')) fallback = '\t'
      start = i + 1
    }
  }
  return fallback
}
function parseDelimited(text, sheet, errors) {
  const delimiter = delimiterOf(text), records = []
  let cells = [], value = '', quoted = false, closed = false, line = 1, start = 1
  const flush = () => {
    cells.push(value.trim())
    if (cells.some((cell) => cell !== '')) records.push({ cells, row: start })
    cells = []; value = ''; closed = false
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { value += '"'; i++ } else { quoted = false; closed = true } }
      else if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; value += '\n'; line++ }
      else value += ch
    } else if (ch === delimiter) { cells.push(value.trim()); value = ''; closed = false }
    else if (ch === '\r' || ch === '\n') { flush(); if (ch === '\r' && text[i + 1] === '\n') i++; line++; start = line }
    else if (ch === '"' && !value.trim() && !closed) { quoted = true; value = '' }
    else if (ch === '"' || (closed && !/\s/.test(ch))) { errors.push(issue(start, sheet, null, '引号格式错误 / malformed quoted field')); value += ch }
    else value += ch
    // Cap records during parsing too; preamble lines cannot cause unbounded arrays.
    if (records.length > MAX_ROWS + 1000) { errors.push(issue(start, sheet, null, `最多允许 ${MAX_ROWS} 条历史记录 / row limit`)); return [] }
  }
  if (quoted) errors.push(issue(start, sheet, null, '引号未闭合 / unterminated quoted field'))
  if (cells.length || value !== '' || closed) flush()
  return records
}
function recordsOf(rows) {
  return rows.map((record, index) => Array.isArray(record) ? { cells: record, row: index + 1 } : record)
}
function headerOf(records) {
  for (let i = 0; i < records.length; i++) {
    if (!Array.isArray(records[i]?.cells)) continue
    const fields = records[i].cells.map((cell) => HEADERS.get(normalize(cell)) || null)
    // Symbol/quantity alone also occur in holdings and closed-position summaries.
    if (fields.includes('date') && fields.includes('kind')) return { index: i, fields, row: records[i].row }
  }
  return null
}

/**
 * Pure canonicalization of worksheet arrays (or [{cells,row}] for physical CSV lines).
 * Invalid rows are excluded and diagnosed; all unknown transaction types survive as other.
 * Monetary amounts are only taken from explicit amount columns, including repo events.
 * Options sheet/defaultCurrency are public; date1904/formulaCells/symbolFormats carry XLSX metadata.
 */
export function parseHistoryRows(rows, { sheet = null, defaultCurrency, date1904 = false, formulaCells = new Set(), symbolFormats = new Map() } = {}) {
  const result = emptyResult(sheet === null ? [] : [sheet], sheet), { errors, warnings } = result
  if (!Array.isArray(rows)) { errors.push(issue(0, sheet, null, 'rows 必须是 worksheet 数组')); return result }
  if (summarySheet(sheet)) { errors.push(issue(0, sheet, 'sheet', '持仓或已清仓汇总工作表不能作为交易流水 / summary sheet')); return result }
  const currencyDefault = currencyOf(defaultCurrency)
  if (currencyDefault && !/^[A-Z]{3}$/.test(currencyDefault)) { errors.push(issue(0, sheet, 'defaultCurrency', 'defaultCurrency 必须是明确选择的三位币种代码')); return result }
  const records = recordsOf(rows), header = headerOf(records)
  if (!header) { errors.push(issue(0, sheet, null, '未找到交易流水表头，需要日期及交易类别 / missing trade headers')); return result }
  const { fields } = header, seen = new Set()
  fields.forEach((field, index) => {
    if (!field) warnings.push(issue(header.row, sheet, null, `忽略未识别列: ${textOf(records[header.index].cells[index])}`))
    else if (seen.has(field)) errors.push(issue(header.row, sheet, field, `多个列映射到 ${field} / ambiguous column`))
    else seen.add(field)
    if (field && formulaCells.has(`${header.row}:${index}`)) errors.push(issue(header.row, sheet, field, '表头不接受公式 / formula header'))
  })
  const dataRecords = records.slice(header.index + 1).filter((record) => Array.isArray(record?.cells) && record.cells.some((cell) => !blank(cell)))
  if (dataRecords.length > MAX_ROWS) errors.push(issue(0, sheet, null, `最多允许 ${MAX_ROWS} 条历史记录 / row limit`))
  if (errors.length) return result
  if (!dataRecords.length) { errors.push(issue(header.row + 1, sheet, null, '表头后没有历史记录')); return result }
  for (const record of dataRecords) {
    const row = record.row, before = errors.length, data = {}
    if (record.cells.length > fields.length && record.cells.slice(fields.length).some((cell) => !blank(cell))) { errors.push(issue(row, sheet, null, '数据列多于表头 / column count')); continue }
    fields.forEach((field, index) => {
      if (!field) return
      data[field] = record.cells[index]
      if (formulaCells.has(`${row}:${index}`)) errors.push(issue(row, sheet, field, '不接受公式单元格，即使含缓存结果 / formula cell'))
    })
    const date = dateOf(data.date, date1904)
    if (!date) errors.push(issue(row, sheet, 'date', '日期必须是有效的 Excel 日期、YYYY-MM-DD、YYYY/MM/DD 或 YYYYMMDD'))
    const time = blank(data.time) ? date?.time ?? null : timeOf(data.time)
    if (!blank(data.time) && time === null) errors.push(issue(row, sheet, 'time', '时间必须是有效的 HH:mm:ss 或 Excel 时间'))
    const originalType = textOf(data.kind), kind = KINDS.get(normalize(originalType)) || 'other'
    if (!originalType) errors.push(issue(row, sheet, 'kind', '缺少交易类别 / missing transaction type'))
    else if (!KINDS.has(normalize(originalType))) warnings.push(issue(row, sheet, 'kind', `未知交易类别保留为 other: ${originalType}`))
    let symbol = textOf(data.symbol) || null, market = marketOf(data.market)
    if (typeof data.symbol === 'number') {
      if (!Number.isSafeInteger(data.symbol) || data.symbol < 0) errors.push(issue(row, sheet, 'symbol', '数字代码必须是非负安全整数'))
      const width = symbolFormats.get(`${row}:${fields.indexOf('symbol')}`)
      if (width && symbol) symbol = symbol.padStart(width, '0')
    }
    const suffix = symbol && /\.(HK|US|SH|SZ|SS)$/i.exec(symbol)
    if (suffix) {
      const suffixMarket = marketOf(suffix[1])
      if (market && market !== suffixMarket) errors.push(issue(row, sheet, 'market', '证券代码后缀与市场列冲突'))
      market ||= suffixMarket; symbol = symbol.slice(0, -suffix[0].length) || null
    }
    if (symbol && /[\s,\r\n=]/.test(symbol)) errors.push(issue(row, sheet, 'symbol', '标的代码包含无效字符'))
    if (market && !['CN', 'HK', 'US'].includes(market)) errors.push(issue(row, sheet, 'market', `无法识别市场: ${textOf(data.market)}`))
    const currency = currencyOf(blank(data.currency) ? currencyDefault : data.currency) || null
    if (currency && !/^[A-Z]{3}$/.test(currency)) errors.push(issue(row, sheet, 'currency', '币种必须是三位代码或常见中文币种名称'))
    if (currency === null) warnings.push(issue(row, sheet, 'currency', '未提供币种；请明确选择文件金额单位 defaultCurrency，不能由代码推断币种'))
    const out = { date: date?.date ?? null, time, kind, originalType, symbol, name: textOf(data.name), market, currency, qty: null, price: null, grossAmount: null, cashAmount: null, fee: null, note: textOf(data.note), sheet, row }
    for (const field of ['qty', 'price', 'grossAmount', 'cashAmount', 'fee']) {
      if (blank(data[field])) continue
      const number = numberOf(data[field])
      if (number === null || (['qty', 'price'].includes(field) && number < 0)) errors.push(issue(row, sheet, field, `${field} 必须是有限${['qty', 'price'].includes(field) ? '非负' : ''}十进制数，收到: ${textOf(data[field])}`))
      else out[field] = number
    }
    if (kind === 'buy' || kind === 'sell') {
      if (!symbol) errors.push(issue(row, sheet, 'symbol', '买卖交易缺少证券代码'))
      for (const field of ['qty', 'price']) if (out[field] === null || out[field] <= 0) errors.push(issue(row, sheet, field, `买卖交易 ${field} 必须是正数`))
    }
    if (out.fee === null) warnings.push(issue(row, sheet, 'fee', '未提供费用，保留 null，未按零费用处理'))
    if (out.cashAmount === null) warnings.push(issue(row, sheet, 'cashAmount', '未提供现金发生金额，保留 null，未由数量或报价推算'))
    if (!blank(data.externalId)) out.externalId = textOf(data.externalId)
    if (errors.length === before) result.rows.push(out)
  }
  return result
}

function decodeBase64(value) {
  if (typeof value !== 'string' || !value.length) throw new Error('fileBase64 必须是非空 Base64 字符串')
  if (value.length > Math.ceil(MAX_BYTES / 3) * 4 + 4096) throw new Error('文件解码后大小不能超过 5 MiB / decoded size limit')
  const base64 = value.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1 || (base64.includes('=') && base64.length % 4 !== 0)) throw new Error('fileBase64 格式错误')
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.toString('base64').replace(/=+$/, '') !== base64.replace(/=+$/, '')) throw new Error('fileBase64 格式错误')
  if (bytes.length > MAX_BYTES) throw new Error('文件解码后大小不能超过 5 MiB / decoded size limit')
  return bytes
}
function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true }).decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true }).decode(bytes)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

// ZIP preflight happens BEFORE read-excel-file allocates or parses workbook data.
// Inspect actual inflated bytes too: advertised sizes alone cannot stop forged ZIP bombs.
function inspectZip(bytes) {
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break }
  }
  if (end < 0) throw new Error('XLSX ZIP 目录损坏 / invalid ZIP directory')
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16)
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count || count === 0xffff || size === 0xffffffff || start === 0xffffffff) throw new Error('不支持多卷或 ZIP64 XLSX')
  if (!count || count > MAX_ENTRIES || start + size !== end) throw new Error(`XLSX ZIP 条目或目录超限，最多 ${MAX_ENTRIES} 项`)
  const entries = new Map(), localSpans = []; let offset = start, inflated = 0
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('XLSX ZIP 条目损坏')
    const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10), crc = bytes.readUInt32LE(offset + 16), compressedSize = bytes.readUInt32LE(offset + 20), inflatedSize = bytes.readUInt32LE(offset + 24)
    const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32), local = bytes.readUInt32LE(offset + 42)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (next > end || local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50) throw new Error('XLSX ZIP 条目范围错误')
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    if (!name || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || name.includes('\0') || entries.has(name)) throw new Error('XLSX ZIP 路径无效或重复')
    if ((flags | bytes.readUInt16LE(local + 6)) & (1 | 64)) throw new Error('不支持加密 XLSX / encrypted ZIP')
    if (![0, 8].includes(method) || bytes.readUInt16LE(local + 8) !== method) throw new Error('XLSX ZIP 压缩方法不受支持')
    if (inflatedSize > MAX_ENTRY_BYTES || compressedSize === 0xffffffff || local === 0xffffffff || inflated + inflatedSize > MAX_INFLATED_BYTES) throw new Error('XLSX ZIP 解压大小超限 / inflated size limit')
    if (bytes.readUInt16LE(offset + 34)) throw new Error('不支持多卷 XLSX ZIP')
    if (/vbaProject|(?:^|\/)EncryptionInfo$|(?:^|\/)EncryptedPackage$/i.test(name)) throw new Error('不支持宏或加密工作簿 / macro or encrypted workbook')
    const localNameLength = bytes.readUInt16LE(local + 26), localExtraLength = bytes.readUInt16LE(local + 28), dataStart = local + 30 + localNameLength + localExtraLength
    if (dataStart + compressedSize > start || bytes.subarray(local + 30, local + 30 + localNameLength).toString('utf8') !== name || bytes.readUInt16LE(local + 6) !== flags) throw new Error('XLSX ZIP 本地条目不匹配')
    let localEnd = dataStart + compressedSize
    if (flags & 8) {
      // Streaming ZIP writers put CRC and sizes in a descriptor after the data.
      const descriptor = localEnd + (localEnd + 4 <= start && bytes.readUInt32LE(localEnd) === 0x08074b50 ? 4 : 0)
      if (descriptor + 12 > start || bytes.readUInt32LE(descriptor) !== crc || bytes.readUInt32LE(descriptor + 4) !== compressedSize || bytes.readUInt32LE(descriptor + 8) !== inflatedSize) throw new Error('XLSX ZIP 数据描述符无效')
      localEnd = descriptor + 12
    } else if (bytes.readUInt32LE(local + 14) !== crc || bytes.readUInt32LE(local + 18) !== compressedSize || bytes.readUInt32LE(local + 22) !== inflatedSize) throw new Error('XLSX ZIP 本地与目录大小不一致')
    localSpans.push({ start: local, end: localEnd })
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize)
    let data
    try { data = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.max(1, inflatedSize + 1) }) }
    catch { throw new Error('XLSX ZIP 解压失败或实际大小超限 / invalid inflated size') }
    if (data.length !== inflatedSize) throw new Error('XLSX ZIP 实际解压大小不匹配 / inflated size mismatch')
    inflated += data.length; entries.set(name, data); offset = next
  }
  // The library streams local headers, so reject hidden/unindexed entries and overlaps.
  let localCursor = 0
  for (const span of localSpans.sort((a, b) => a.start - b.start)) {
    if (span.start !== localCursor) throw new Error('XLSX ZIP 存在未索引条目、间隙或重叠')
    localCursor = span.end
  }
  if (localCursor !== start || offset !== end || !entries.has('[Content_Types].xml') || !entries.has('xl/workbook.xml')) throw new Error('文件不是支持的 XLSX 工作簿')
  for (const [name, data] of entries) if (name.endsWith('.xml') && /<!DOCTYPE|<!ENTITY/i.test(data.toString('utf8'))) throw new Error('不支持包含 DTD 或实体声明的 XLSX XML')
  const defaults = new Map(), overrides = new Map()
  for (const match of entries.get('[Content_Types].xml').toString('utf8').matchAll(/<(?:[\w.-]+:)?(Default|Override)\b([^>]*)\/?\s*>/g)) {
    const attr = attributes(match[2])
    if (match[1] === 'Default') defaults.set(attr.Extension?.toLowerCase(), attr.ContentType)
    else overrides.set(attr.PartName?.replace(/^\//, ''), attr.ContentType)
  }
  // Some exporters list an unused macro-enabled .bin default even for ordinary XLSX.
  // Only effective content types of files actually present indicate a macro workbook.
  for (const name of entries.keys()) {
    const type = overrides.get(name) || defaults.get(name.split('.').at(-1).toLowerCase()) || ''
    if (/macroEnabled|vbaProject/i.test(type)) throw new Error('不支持宏工作簿 / macro workbook')
  }
  return entries
}
function xmlValue(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' }
    if (named[entity]) return named[entity]
    const number = entity.startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1))
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity
  })
}
function attributes(value) {
  return Object.fromEntries([...value.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1], xmlValue(match[2] ?? match[3])]))
}
function metadataOf(entries) {
  const book = entries.get('xl/workbook.xml').toString('utf8'), relationships = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || ''
  const rels = new Map([...relationships.matchAll(/<(?:[\w.-]+:)?Relationship\b([^>]*)\/?\s*>/g)].map((match) => { const attr = attributes(match[1]); return [attr.Id, attr] }))
  const formats = new Map(), zeroWidths = new Map(), sheets = new Map()
  const styles = entries.get('xl/styles.xml')?.toString('utf8') || ''
  for (const match of styles.matchAll(/<(?:[\w.-]+:)?numFmt\b([^>]*)\/?\s*>/g)) {
    const attr = attributes(match[1]); if (/^0{5,6}$/.test(attr.formatCode || '')) formats.set(attr.numFmtId, attr.formatCode.length)
  }
  const cellXfs = /<(?:[\w.-]+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?cellXfs\s*>/.exec(styles)?.[1] || ''
  let styleIndex = 0
  for (const match of cellXfs.matchAll(/<(?:[\w.-]+:)?xf\b([^>]*)>/g)) { const width = formats.get(attributes(match[1]).numFmtId); if (width) zeroWidths.set(String(styleIndex), width); styleIndex++ }
  const date1904 = /<(?:[\w.-]+:)?workbookPr\b[^>]*\bdate1904\s*=\s*["'](?:1|true)["']/.test(book)
  for (const match of book.matchAll(/<(?:[\w.-]+:)?sheet\b([^>]*)\/?\s*>/g)) {
    const attr = attributes(match[1]), rel = rels.get(attr['r:id'])
    if (!rel || rel.TargetMode === 'External') throw new Error('XLSX 工作表关系无效或指向外部资源')
    const path = rel.Target?.startsWith('/') ? rel.Target.slice(1) : posix.normalize(posix.join('xl', rel.Target || ''))
    const content = entries.get(path)?.toString('utf8')
    if (!content) throw new Error('XLSX 缺少工作表 XML')
    const formulaCells = new Set(), symbolFormats = new Map(); let rowCount = 0, maxRow = 0, maxColumn = 0
    for (const match of content.matchAll(/<(?:[\w.-]+:)?row\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/g)) {
      rowCount++
      const row = attributes(match[1]).r
      if (rowCount > MAX_ROWS + 1001 || (row && (!/^[1-9]\d*$/.test(row) || Number(row) > MAX_ROWS + 1001))) throw new Error(`XLSX 工作表超过 ${MAX_ROWS} 条记录限制`)
    }
    for (const cell of content.matchAll(/<(?:[\w.-]+:)?c\b((?:[^"'<>]|"[^"]*"|'[^']*')*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?c\s*>)/g)) {
      const attrs = attributes(cell[1]), reference = /^([A-Z]+)([1-9]\d*)$/i.exec(attrs.r || '')
      if (!reference) throw new Error('XLSX 单元格缺少有效坐标')
      let column = 0
      for (const ch of reference[1].toUpperCase()) column = column * 26 + ch.charCodeAt(0) - 64
      const row = Number(reference[2])
      if (row > MAX_ROWS + 1001 || column > 1024) throw new Error('XLSX 工作表行列范围超限')
      maxRow = Math.max(maxRow, row); maxColumn = Math.max(maxColumn, column)
      const key = `${row}:${column - 1}`
      if (/<(?:[\w.-]+:)?f\b/.test(cell[2] || '')) formulaCells.add(key)
      if (zeroWidths.has(attrs.s)) symbolFormats.set(key, zeroWidths.get(attrs.s))
    }
    if (maxRow * maxColumn > 2000000) throw new Error('XLSX 稀疏工作表展开后单元格过多 / sparse cell limit')
    if (!attr.name || sheets.has(attr.name)) throw new Error('XLSX 工作表名称缺失或重复')
    sheets.set(attr.name, { formulaCells, symbolFormats })
  }
  if (!sheets.size) throw new Error('XLSX 没有可读取的工作表')
  return { date1904, sheets }
}

/**
 * async readHistoryFile({text?,fileBase64?,fileName?,sheet?,defaultCurrency?})
 * returns {rows,errors,warnings,sheets,selectedSheet,ignoredSheets}.
 * CSV/TSV is UTF-8 (or BOM UTF-16); XLSX is read through read-excel-file/node.
 * Exactly one input is required. File validation failures are returned as diagnostics.
 */
export async function readHistoryFile({ text, fileBase64, fileName = '', sheet, defaultCurrency } = {}) {
  let result = emptyResult()
  try {
    const hasText = text !== undefined, hasBase64 = fileBase64 !== undefined
    if (hasText === hasBase64) throw new Error('请仅提供 text 或 fileBase64 之一')
    if (typeof fileName !== 'string') throw new Error('fileName 必须是字符串')
    if (sheet !== undefined && (typeof sheet !== 'string' || !sheet.trim())) throw new Error('sheet 必须是工作表名称')
    const extension = /\.([^.\\/]+)$/.exec(fileName)?.[1].toLowerCase()
    if (extension && !['csv', 'tsv', 'txt', 'xlsx'].includes(extension)) throw new Error('仅支持 CSV、TSV、XLSX；不支持 XLS、宏或加密工作簿')
    const bytes = hasBase64 ? decodeBase64(fileBase64) : null
    if (hasText && typeof text !== 'string') throw new Error('text 必须是 CSV/TSV 字符串')
    if (hasText && Buffer.byteLength(text, 'utf8') > MAX_BYTES) throw new Error('文件大小不能超过 5 MiB / decoded size limit')
    const isZip = bytes?.length >= 4 && bytes.readUInt32LE(0) === 0x04034b50
    if (extension === 'xlsx' || isZip) {
      if (!bytes || !isZip) throw new Error('XLSX 必须提供有效的 Base64 ZIP 工作簿')
      const entries = inspectZip(bytes), metadata = metadataOf(entries)
      const { readSheet } = await import('read-excel-file/node')
      const sheets = [...metadata.sheets.keys()]
      result = emptyResult(sheets)
      let selected = sheet
      if (!selected && sheets.includes('交易记录')) selected = '交易记录'
      if (selected && !sheets.includes(selected)) throw new Error(`未找到工作表 / sheet: ${selected}`)
      if (selected && summarySheet(selected)) throw new Error('持仓或已清仓汇总工作表不能作为交易流水 / summary sheet')
      let selectedRows
      if (!selected) {
        const candidates = []
        for (const name of sheets) {
          if (summarySheet(name)) continue
          const rows = await readSheet(bytes, name)
          if (headerOf(recordsOf(rows))) candidates.push({ name, rows })
        }
        if (candidates.length !== 1) throw new Error(candidates.length ? '多个工作表包含交易表头，请选择 sheet / ambiguous sheets' : '没有找到包含交易流水表头的工作表 / missing trade sheet')
        selected = candidates[0].name; selectedRows = candidates[0].rows
      }
      result = emptyResult(sheets, selected)
      selectedRows ||= await readSheet(bytes, selected)
      const parsed = parseHistoryRows(selectedRows, { sheet: selected, defaultCurrency, date1904: metadata.date1904, ...metadata.sheets.get(selected) })
      return { ...parsed, sheets, selectedSheet: selected, ignoredSheets: sheets.filter((name) => name !== selected) }
    }
    if (bytes?.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))) throw new Error('不支持 XLS 或加密 Office 工作簿')
    const selected = sheet ?? 'CSV'
    result = emptyResult([selected], selected)
    const records = parseDelimited((hasText ? text : decodeText(bytes)).replace(/^\uFEFF/, ''), selected, result.errors)
    if (result.errors.length) return result
    return parseHistoryRows(records, { sheet: selected, defaultCurrency })
  } catch (error) {
    result.rows = []
    result.errors.push(issue(0, result.selectedSheet, null, `历史文件读取失败: ${error?.message || String(error)}`))
    return result
  }
}
