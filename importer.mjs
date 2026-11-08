// File-import preview only. No network, filesystem access, or ledger mutation.
// rows are flat payloads for import.holdings / import.trades; callers must block
// commit when errors is nonempty. Diagnostics use physical, 1-based CSV lines.
const LEGACY = {
  holdings: ['account', 'symbol', 'name', 'market', 'qty', 'avgCost', 'currency', 'manualPrice', 'assetClass'],
  trades: ['account', 'symbol', 'side', 'qty', 'price', 'fee', 'date', 'currency', 'market'],
}
const ALIASES = {
  account: ['账户名', '账户', '帐号', '账号', '账户名称', 'account', 'accountname', 'accountid', '账户id', '证券账户'],
  symbol: ['代码', '证券代码', '股票代码', '基金代码', '标的代码', '产品代码', 'symbol', 'ticker', 'stockcode', 'securitycode', 'fundcode'],
  name: ['名称', '证券名称', '股票名称', '基金名称', '产品名称', 'name', 'securityname', 'stockname', 'fundname'],
  market: ['市场', '交易市场', '证券市场', 'market', 'exchange'],
  qty: ['数量', '持仓数量', '证券数量', '股票数量', '持有份额', '基金份额', '持有数量', '成交数量', '交易数量', 'qty', 'quantity', 'shares', 'position', 'positionqty', 'filledqty', 'filledquantity'],
  avgCost: ['成本', '成本价', '成本价格', '持仓成本', '平均成本', '平均成本价', '单位成本', 'avgcost', 'averagecost', 'costprice', 'averageprice', 'costbasisprice'],
  manualPrice: ['现价', '最新价', '市价', '当前价格', '最新净值', '单位净值', '净值', 'lastprice', 'currentprice', 'marketprice', 'nav', 'manualprice'],
  side: ['方向', '买卖方向', '交易方向', '操作', '业务名称', '交易类型', '买卖', 'side', 'action', 'buysell', 'direction'],
  price: ['价格', '成交价', '成交价格', '交易价格', 'price', 'tradeprice', 'filledprice', 'executionprice'],
  fee: ['费用', '手续费', '交易费用', '总费用', 'fee', 'fees', 'commission', 'totalfees'],
  date: ['日期', '成交日期', '成交时间', '交易日期', '交易时间', 'date', 'tradedate', 'tradetime', 'filledtime', 'executiontime'],
  currency: ['币种', '货币', '币别', '结算币种', 'currency', 'ccy'],
  assetClass: ['资产类别', '资产类型', '证券类型', '品种', 'assetclass', 'assettype', 'securitytype'],
  externalId: ['成交编号', '成交号', '成交单号', '交易编号', '流水号', '订单编号', '订单号', 'externalid', 'tradeid', 'executionid', 'dealid', 'orderid'],
  note: ['备注', '说明', 'note', 'notes', 'description'],
}
const normalize = (value) => String(value).trim().toLowerCase().replace(/[\s_\-()（）]/g, '')
const HEADERS = new Map(Object.entries(ALIASES).flatMap(([field, aliases]) => aliases.map((a) => [normalize(a), field])))
const SOURCES = new Map([['generic', 'generic'], ['ths', 'ths'], ['同花顺', 'ths'], ['aifund', 'aifund'], ['爱基金', 'aifund'], ['fund', 'fund'], ['futu', 'futu'], ['富途', 'futu'], ['longbridge', 'longbridge'], ['长桥', 'longbridge']])
const issue = (row, field, code, message) => ({ row, field, code, message })

function delimiterOf(text) {
  let quoted = false, commas = 0, tabs = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted }
    else if (!quoted && (ch === '\r' || ch === '\n')) { if (commas || tabs) break }
    else if (!quoted && ch === ',') commas++
    else if (!quoted && ch === '\t') tabs++
  }
  return tabs > commas ? '\t' : ','
}

function parse(text, errors) {
  const delimiter = delimiterOf(text), records = []
  let cells = [], value = '', quoted = false, closed = false, line = 1, start = 1
  const flush = () => {
    cells.push(value.trim())
    if (cells.some((c) => c !== '')) records.push({ cells, row: start })
    cells = []; value = ''; closed = false
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { value += '"'; i++ } else { quoted = false; closed = true } }
      else if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; value += '\n'; line++ }
      else value += ch
      continue
    }
    if (ch === delimiter) { cells.push(value.trim()); value = ''; closed = false }
    else if (ch === '\r' || ch === '\n') { flush(); if (ch === '\r' && text[i + 1] === '\n') i++; line++; start = line }
    else if (ch === '"' && !value.trim() && !closed) { quoted = true; value = '' }
    else if (ch === '"' || (closed && !/\s/.test(ch))) {
      errors.push(issue(start, null, 'csv-syntax', '引号格式错误 / malformed quoted field'))
      value += ch
    } else value += ch
  }
  if (quoted) errors.push(issue(start, null, 'csv-syntax', '引号未闭合 / unterminated quoted field'))
  if (cells.length || value !== '' || closed) flush()
  return records
}

function numberValue(raw) {
  // Accept decimal numbers and properly grouped thousands; never Number('') or hex.
  if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d*)?)$/.test(raw)) return null
  const n = Number(raw.replaceAll(',', ''))
  return Number.isFinite(n) ? n : null
}
function currencyOf(raw) {
  const map = { '人民币': 'CNY', '人民币元': 'CNY', RMB: 'CNY', CNH: 'CNH', '港币': 'HKD', '港元': 'HKD', '美元': 'USD', '美金': 'USD', 'US$': 'USD', 'HK$': 'HKD' }
  const upper = String(raw || '').trim().toUpperCase()
  return map[upper] || upper
}
function marketOf(raw) {
  const v = String(raw || '').trim().toUpperCase()
  return ({ '港股': 'HK', HKEX: 'HK', SEHK: 'HK', '香港': 'HK', '美股': 'US', NASDAQ: 'US', NYSE: 'US', '美国': 'US', '沪深': 'CN', 'A股': 'CN', '沪股': 'CN', '深股': 'CN', SH: 'CN', SZ: 'CN', SSE: 'CN', SZSE: 'CN', '基金': 'FUND' })[v] || v
}
function classOf(raw) {
  const v = String(raw || '').trim().toLowerCase()
  return ({ '股票': 'stock', '基金': 'fund', '现金': 'cash', '债券': 'bond', '加密货币': 'crypto', '其他': 'other', '交易所基金': 'etf' })[v] || v
}
function dateOf(raw) {
  const match = /^(\d{4})(?:[-/年](\d{1,2})[-/月](\d{1,2})(?:日)?|(\d{2})(\d{2}))(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(raw)
  if (!match || (match[6] !== undefined && (+match[6] > 23 || +match[7] > 59 || +(match[8] || 0) > 59))) return null
  const date = `${match[1]}-${(match[2] || match[4]).padStart(2, '0')}-${(match[3] || match[5]).padStart(2, '0')}`
  const parsed = new Date(date + 'T00:00:00Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null
}

/**
 * Synchronous, pure preview of a user-selected CSV/TSV export, not a broker connection.
 * columns: [{index,header,field}], diagnostics: [{row,field,code,message}].
 * Without a header, generic legacy column order is used. Missing market derives
 * from ticker suffix, fund source, then currency. Monetary totals are not unit costs.
 */
export function previewImport({ text, mode = 'holdings', accountId, source = 'generic' } = {}, db = {}) {
  const result = { rows: [], errors: [], warnings: [], columns: [] }
  const { errors, warnings } = result
  if (!LEGACY[mode]) { errors.push(issue(0, 'mode', 'invalid-mode', 'mode 必须是 holdings 或 trades')); return result }
  const selectedSource = SOURCES.get(String(source).trim().toLowerCase())
  if (!selectedSource) { errors.push(issue(0, 'source', 'invalid-source', '不支持的导出来源 source')); return result }
  if (typeof text !== 'string') { errors.push(issue(0, 'text', 'invalid-text', 'text 必须是 CSV/TSV 字符串')); return result }
  const records = parse(text.replace(/^\uFEFF/, ''), errors)
  if (errors.length) return result
  if (!records.length) { errors.push(issue(1, null, 'empty-input', '没有可导入的数据')); return result }
  const first = records[0].cells
  const mapped = first.map((c) => {
    let field = HEADERS.get(normalize(c)) || null
    if (mode === 'trades' && field === 'avgCost' && normalize(c) === 'averageprice') field = 'price'
    if (mode === 'holdings' && field === 'price') field = 'manualPrice'
    return field
  })
  const hasHeader = mapped.includes('symbol') || (mapped.filter(Boolean).length >= 3 && mapped.includes('qty'))
  const fields = hasHeader ? mapped : LEGACY[mode].slice(0, Math.max(first.length, LEGACY[mode].length))
  result.columns = fields.map((field, index) => ({ index, header: hasHeader ? first[index] : LEGACY[mode][index], field }))
  if (hasHeader) records.shift()
  else warnings.push(issue(records[0].row, null, 'legacy-order', '未识别表头，使用通用旧版列顺序'))
  const seen = new Set()
  for (const c of result.columns) {
    if (!c.field) warnings.push(issue(1, null, 'unknown-column', `忽略未识别列: ${c.header}`))
    else if (seen.has(c.field)) errors.push(issue(1, c.field, 'ambiguous-column', `多个列映射到 ${c.field}`))
    else seen.add(c.field)
  }
  if (errors.length) return result
  const accounts = Array.isArray(db.accounts) ? db.accounts.filter((a) => !a.archived) : []
  for (const record of records) {
    const row = record.row, before = errors.length, data = {}
    if (record.cells.length > fields.length) { errors.push(issue(row, null, 'column-count', '数据列多于表头或通用列数')); continue }
    fields.forEach((field, i) => { if (field) data[field] = record.cells[i] || '' })
    const accountRef = data.account || accountId || db.defaultAccountId || ''
    let matches = accountRef ? accounts.filter((a) => a.id === accountRef) : []
    if (!matches.length && accountRef) matches = accounts.filter((a) => a.name === accountRef)
    if (!accountRef) matches = accounts.length === 1 ? accounts : accounts.filter((a) => a.isDefault || a.default)
    const account = matches.length === 1 ? matches[0] : null
    if (!account) errors.push(issue(row, 'accountId', matches.length > 1 ? 'ambiguous-account' : 'missing-account', matches.length > 1 ? '账户不唯一，请使用账户 ID' : `未找到账户: ${accountRef || '请指定默认账户'}`))
    let symbol = String(data.symbol || '').trim()
    if (!symbol) errors.push(issue(row, 'symbol', 'missing-symbol', '缺少标的代码 symbol'))
    else if (/[\s,\r\n]/.test(symbol)) errors.push(issue(row, 'symbol', 'invalid-symbol', '标的代码包含空格或分隔符'))
    let suffixMarket = ''
    const suffix = /\.(HK|US|SH|SZ|SS)$/i.exec(symbol)
    if (suffix) {
      suffixMarket = marketOf(suffix[1] === 'SS' ? 'SH' : suffix[1]); symbol = symbol.slice(0, -suffix[0].length)
      if (!symbol) errors.push(issue(row, 'symbol', 'missing-symbol', '代码后缀前缺少标的代码'))
    }
    const fund = selectedSource === 'aifund' || selectedSource === 'fund'
    const currency = currencyOf(data.currency || (suffixMarket === 'HK' ? 'HKD' : suffixMarket === 'US' ? 'USD' : account?.currency))
    if (!/^[A-Z]{3}$/.test(currency)) errors.push(issue(row, 'currency', 'invalid-currency', '缺少或无法识别币种，请使用三位币种代码'))
    const market = marketOf(data.market) || suffixMarket || (fund ? 'FUND' : ({ CNY: 'CN', CNH: 'CN', HKD: 'HK', USD: 'US' })[currency])
    if (!market) errors.push(issue(row, 'market', 'missing-market', '无法推断市场，请填写 market'))
    if (data.market && suffixMarket && market !== suffixMarket) errors.push(issue(row, 'market', 'conflicting-market', '代码后缀与市场列冲突'))
    if (!data.market && market) warnings.push(issue(row, 'market', 'inferred-market', `已推断市场 ${market}，请核对`))
    const assetClass = classOf(data.assetClass) || (fund || market === 'FUND' ? 'fund' : 'stock')
    if (!['stock', 'fund', 'etf', 'cash', 'bond', 'crypto', 'other'].includes(assetClass)) errors.push(issue(row, 'assetClass', 'invalid-asset-class', `不支持的资产类别: ${data.assetClass}`))
    const out = { accountId: account?.id, symbol, name: data.name || symbol, market, currency, assetClass, source: selectedSource }
    if (data.externalId) out.externalId = data.externalId
    if (data.note) out.note = data.note
    const numeric = (field, { optional = false, positive = false } = {}) => {
      const raw = data[field] || ''
      if (optional && !raw) return
      const n = numberValue(raw)
      if (n === null || (positive ? n <= 0 : n < 0)) errors.push(issue(row, field, 'invalid-number', `${field} 必须是${positive ? '正数' : '非负数'}，收到: ${raw || '(空)'}`))
      else out[field] = n
    }
    numeric('qty', { positive: mode === 'trades' })
    if (mode === 'holdings') { numeric('avgCost'); numeric('manualPrice', { optional: true }) }
    else {
      out.side = ({ '买入': 'buy', '卖出': 'sell', BUY: 'buy', SELL: 'sell', '买': 'buy', '卖': 'sell' })[String(data.side || '').toUpperCase()]
      if (!out.side) errors.push(issue(row, 'side', 'invalid-side', '方向必须为 买入/卖出/BUY/SELL'))
      numeric('price', { positive: true }); numeric('fee', { optional: true })
      if (out.fee === undefined) { out.fee = 0; warnings.push(issue(row, 'fee', 'missing-fee', '未提供费用，使用 0；请核对导出是否包含全部费用')) }
      out.date = dateOf(data.date || '')
      if (!out.date) errors.push(issue(row, 'date', 'invalid-date', '日期必须是有效的 YYYY-MM-DD、YYYY/MM/DD 或 YYYYMMDD，可附成交时间'))
    }
    if (errors.length === before) result.rows.push(out)
  }
  if (!records.length) errors.push(issue(2, null, 'empty-input', '表头后没有可导入数据'))
  return result
}
