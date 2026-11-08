import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { readHistoryFile, parseHistoryRows } from './history-file.mjs'

const headers = ['成交日期', '成交时间', '代码', '名称', '交易类别', '成交数量', '成交价格', '发生金额', '成交金额', '费用', '备注']
const parse = (rows, options = {}) => parseHistoryRows(rows, { sheet: '交易记录', ...options })
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const col = (index) => { let out = ''; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + (n - 1) % 26) + out; return out }
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)) }
  return (crc ^ 0xffffffff) >>> 0
}
// Small synthetic OOXML fixtures; no user workbook or production records.
function zip(entries, { deflate = false, flags = 0, inflatedSize } = {}) {
  const parts = [], central = []; let offset = 0
  for (const [name, value] of Object.entries(entries)) {
    const raw = Buffer.from(value), data = deflate ? deflateRawSync(raw) : raw, path = Buffer.from(name)
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6); local.writeUInt16LE(deflate ? 8 : 0, 8)
    local.writeUInt32LE(crc32(raw), 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(inflatedSize ?? raw.length, 22); local.writeUInt16LE(path.length, 26)
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(flags, 8); dir.writeUInt16LE(deflate ? 8 : 0, 10)
    dir.writeUInt32LE(crc32(raw), 16); dir.writeUInt32LE(data.length, 20); dir.writeUInt32LE(inflatedSize ?? raw.length, 24); dir.writeUInt16LE(path.length, 28); dir.writeUInt32LE(offset, 42)
    let descriptor = Buffer.alloc(0)
    if (flags & 8) {
      local.writeUInt32LE(0, 14); local.writeUInt32LE(0, 18); local.writeUInt32LE(0, 22)
      descriptor = Buffer.alloc(16); descriptor.writeUInt32LE(0x08074b50); descriptor.writeUInt32LE(crc32(raw), 4); descriptor.writeUInt32LE(data.length, 8); descriptor.writeUInt32LE(inflatedSize ?? raw.length, 12)
    }
    parts.push(local, path, data, descriptor); central.push(dir, path); offset += local.length + path.length + data.length + descriptor.length
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, directory, end])
}
function workbook(sheets, options = {}) {
  const entries = {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="${options.date1904 ? 1 : 0}"/><sheets>${sheets.map(([name], i) => `<sheet name="${xml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="000000"/><numFmt numFmtId="165" formatCode="00000"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
  }
  for (let i = 0; i < sheets.length; i++) {
    entries[`xl/worksheets/sheet${i + 1}.xml`] = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheets[i][1].map((cells, r) => `<row r="${r + 1}">${cells.map((cell, c) => {
      if (cell == null) return ''
      const ref = `${col(c)}${r + 1}`
      if (typeof cell === 'object') return `<c r="${ref}"${cell.style ? ` s="${cell.style}"` : ''}>${cell.formula ? `<f>${xml(cell.formula)}</f>` : ''}<v>${cell.value}</v></c>`
      return typeof cell === 'number' ? `<c r="${ref}"><v>${cell}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${xml(cell)}</t></is></c>`
    }).join('')}</row>`).join('')}</sheetData></worksheet>`
  }
  return zip({ ...entries, ...options.entries }, options).toString('base64')
}

test('all supplied transaction types are preserved with canonical kinds and source coordinates', () => {
  const types = { 银行转证券: 'deposit', 证券转银行: 'withdrawal', 买入: 'buy', 卖出: 'sell', 除权除息: 'dividend', 股息个税征收: 'tax', 融券回购: 'repo_open', 融券购回: 'repo_close', 新股入帐: 'ipo', 股份转出: 'security_out', 股份转入: 'security_in', 通用回购逆回购: 'repo_open', 通用回购逆回购购回: 'repo_close' }
  const r = parse([headers, ...Object.keys(types).map((kind) => ['2026/1/2', '09:03:04', '000001', '示例证券', kind, 100, 3.5, -350, 350, null, 'synthetic'])], { defaultCurrency: '人民币' })
  assert.deepEqual(r.errors, [])
  assert.equal(r.rows.length, Object.keys(types).length)
  r.rows.forEach((row, i) => {
    assert.equal(row.kind, types[row.originalType]); assert.equal(row.date, '2026-01-02'); assert.equal(row.time, '09:03:04')
    assert.equal(row.symbol, '000001'); assert.equal(row.fee, null); assert.equal(row.cashAmount, -350); assert.equal(row.grossAmount, 350)
    assert.equal(row.currency, 'CNY'); assert.equal(row.sheet, '交易记录'); assert.equal(row.row, i + 2); assert.ok(!('accountId' in row))
  })
})

test('cash events keep absent qty/price null and repo rates never become cash', () => {
  const r = parse([headers,
    ['20260102', null, null, null, '银行转证券', null, null, 1000, null, null],
    ['20260102', null, '131810', '逆回购', '融券回购', 1000, 2.1, null, null, null],
    ['20260102', null, null, null, '未知业务', 0, 0, -2, 0, 0],
  ])
  assert.deepEqual(r.errors, []); assert.equal(r.rows.length, 3)
  assert.equal(r.rows[0].qty, null); assert.equal(r.rows[0].price, null); assert.equal(r.rows[0].symbol, null)
  assert.equal(r.rows[1].cashAmount, null); assert.equal(r.rows[1].grossAmount, null)
  assert.equal(r.rows[2].kind, 'other'); assert.equal(r.rows[2].originalType, '未知业务'); assert.equal(r.rows[2].qty, 0)
  assert.ok(r.warnings.some((w) => w.field === 'kind' && w.row === 4))
  assert.ok(r.warnings.some((w) => w.field === 'currency'))
})

test('quoted CSV/TSV discovers a header after preamble and reports physical lines', async () => {
  const text = '\uFEFF导出交易流水,仅供核对\r\n生成时间：2026-01-03\r\nTrade Date\tTrade Time\tSymbol\tName\tAction\tFilled Quantity\tExecution Price\tNet Amount\tGross Amount\tCommission\tCurrency\tExecution ID\tOrder ID\tNotes\r\n2026-01-02\t10:20:30\t00005.HK\t"a ""quote"""\tBUY\t2\t3\t-6.1\t6\t0.1\tHKD\t000042\torder-1\t"line\r\nend"\r\n2026-01-03\t\tAAPL.US\tx\tSELL\tbad\t4\t4\t4\t\tUSD\t\torder-2\t'
  const r = await readHistoryFile({ text, fileName: 'synthetic.tsv' })
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].row, 4); assert.equal(r.rows[0].symbol, '00005'); assert.equal(r.rows[0].market, 'HK')
  assert.equal(r.rows[0].name, 'a "quote"'); assert.equal(r.rows[0].note, 'line\nend'); assert.equal(r.rows[0].externalId, '000042')
  assert.ok(r.errors.some((e) => e.field === 'qty' && e.row === 6))
  const order = await readHistoryFile({ text: 'Date,Type,Order ID,Cash Amount\n2026-01-02,deposit,order1,2' })
  assert.ok(!('externalId' in order.rows[0]))
})

test('currency is explicit, never inferred from suffix or market, and default is only a unit', () => {
  const rows = [['Date', 'Type', 'Symbol', 'Quantity', 'Price', 'Cash Amount', 'Currency'], ['2026-01-02', 'BUY', '00700.HK', 1, 3, -3, '']]
  const missing = parse(rows); assert.equal(missing.rows[0].currency, null)
  const chosen = parse(rows, { defaultCurrency: 'USD' }); assert.equal(chosen.rows[0].currency, 'USD'); assert.equal(chosen.rows[0].cashAmount, -3)
  rows[1][6] = '港元'; assert.equal(parse(rows, { defaultCurrency: 'USD' }).rows[0].currency, 'HKD')
  rows[1][6] = 'invalid'; assert.ok(parse(rows, { defaultCurrency: 'USD' }).errors.some((e) => e.field === 'currency'))
})

test('dates accept serials, Date values, compact text and embedded time with calendar validation', () => {
  const r = parse([['Date', 'Type'], [new Date('2024-02-29T00:00:00Z'), 'dividend'], [45351.5, 'dividend'], ['20260102 09:10:11', 'dividend']])
  assert.deepEqual(r.errors, []); assert.equal(r.rows[0].date, '2024-02-29'); assert.equal(r.rows[1].date, '2024-02-29'); assert.equal(r.rows[1].time, '12:00:00')
  assert.equal(r.rows[2].date, '2026-01-02'); assert.equal(r.rows[2].time, '09:10:11')
  for (const value of ['2026-02-29', '2026-01-02 25:00:00', 60, Infinity, '=TODAY()']) assert.ok(parse([['Date', 'Type'], [value, 'tax']]).errors.some((e) => e.field === 'date'), String(value))
  assert.equal(parse([['Date', 'Type'], [0, 'tax']], { date1904: true }).rows[0].date, '1904-01-01')
})

test('malformed values fail without zero coercion; nontrades may contain zeroes', async () => {
  for (const value of ['NaN', 'Infinity', '0x10', '1e3', '1,23', '=1+1']) {
    const r = parse([['Date', 'Type', 'Cash Amount'], ['2026-01-02', 'deposit', value]])
    assert.equal(r.rows.length, 0); assert.ok(r.errors.some((e) => e.field === 'cashAmount'), value)
  }
  assert.equal(parse([['Date', 'Type', 'Qty', 'Price'], ['2026-01-02', 'tax', 0, 0]]).rows.length, 1)
  assert.equal(parse([['Date', 'Type', 'Qty', 'Price'], ['2026-01-02', 'buy', 0, 0]]).rows.length, 0)
  for (const text of ['Date,Type\n2026-01-02,"buy', 'Date,Type\n2026-01-02,"buy"bad', 'Date,Type\n2026-01-02,b"uy']) {
    const r = await readHistoryFile({ text }); assert.equal(r.rows.length, 0); assert.ok(r.errors.length)
  }
})

test('missing trade headers, duplicate aliases, overlong rows, and invalid options are explicit', async () => {
  assert.ok(parse([['代码', '持仓数量', '成本'], ['000001', 100, 2]]).errors.length)
  assert.ok(parse([['Date', 'Trade Date', 'Type'], ['2026-01-02', '2026-01-02', 'buy']]).errors.some((e) => e.field === 'date'))
  assert.ok(parse([['Date', 'Type'], ['2026-01-02', 'tax', 'extra']]).errors.length)
  assert.ok((await readHistoryFile({ text: '' })).errors.length)
  assert.ok((await readHistoryFile({ text: 'Date,Type\n2026-01-02,tax', fileBase64: 'eA==' })).errors.length)
  assert.ok((await readHistoryFile({ fileBase64: 'not-base64', fileName: 'a.xlsx' })).errors.length)
  assert.ok((await readHistoryFile({ text: 'Date,Type\n2026-01-02,tax', defaultCurrency: 'invalid' })).errors.length)
})

test('decoded size and 25000 data-row caps apply before returning preview rows', async () => {
  const huge = await readHistoryFile({ text: '中'.repeat(Math.ceil(5 * 1024 * 1024 / 3)) })
  assert.equal(huge.rows.length, 0); assert.ok(huge.errors.some((e) => /5.*MiB|size|大小/i.test(e.message)))
  const rows = [['Date', 'Type'], ...Array.from({ length: 25001 }, () => ['2026-01-02', 'tax'])]
  const r = parse(rows); assert.equal(r.rows.length, 0); assert.ok(r.errors.some((e) => /25000/.test(e.message)))
})

test('XLSX selects exact transaction sheet and ignores holding and closed summaries', async () => {
  const fileBase64 = workbook([
    ['持仓数据', [['代码', '数量', '成本'], ['000001', 100, 2]]],
    ['已清仓', [['代码', '买入日期', '卖出日期', '利润'], ['000001', '2025-01-01', '2026-01-01', 20]]],
    ['交易记录', [headers, ['2026-01-02', '09:30:00', '000001', '示例', '买入', 100, 2, -201, 200, 1]]],
  ])
  const r = await readHistoryFile({ fileBase64, fileName: 'synthetic.xlsx', defaultCurrency: 'CNY' })
  assert.deepEqual(r.errors, []); assert.equal(r.rows.length, 1); assert.equal(r.selectedSheet, '交易记录')
  assert.deepEqual(r.sheets, ['持仓数据', '已清仓', '交易记录']); assert.deepEqual(r.ignoredSheets, ['持仓数据', '已清仓'])
  assert.equal(r.rows[0].symbol, '000001'); assert.equal(r.rows[0].cashAmount, -201)
})

test('XLSX auto selection is unambiguous and an explicit summary sheet is never parsed as trades', async () => {
  const trade = [['Date', 'Type', 'Cash Amount'], ['2026-01-02', 'deposit', 10]]
  const unique = await readHistoryFile({ fileName: 'a.xlsx', fileBase64: workbook([['Holdings', [['Symbol', 'Quantity']]], ['Fills', trade]]) })
  assert.deepEqual(unique.errors, []); assert.equal(unique.selectedSheet, 'Fills')
  const fileBase64 = workbook([['Fills', trade], ['Activity', trade], ['持仓数据', [['Date', 'Type', 'Quantity'], ['2026-01-02', 'tax', 0]]]])
  assert.ok((await readHistoryFile({ fileBase64, fileName: 'a.xlsx' })).errors.some((e) => /sheet|工作表/i.test(e.message)))
  assert.equal((await readHistoryFile({ fileBase64, fileName: 'a.xlsx', sheet: 'Activity' })).selectedSheet, 'Activity')
  assert.ok((await readHistoryFile({ fileBase64, fileName: 'a.xlsx', sheet: '持仓数据' })).errors.length)
  assert.ok((await readHistoryFile({ fileBase64, fileName: 'a.xlsx', sheet: 'missing' })).errors.length)
})

test('XLSX detects relevant formulas, preserves zero formats, and supports 1904 dates', async () => {
  const fileBase64 = workbook([['交易记录', [['Date', 'Type', 'Symbol', 'Qty', 'Price', 'Net Amount', 'unused'], [1, 'buy', { value: 1, style: 1 }, 100, 2, -200, { formula: '1+1', value: 2 }], [2, 'buy', { value: 5, style: 2 }, 100, { formula: '1+1', value: 2 }, -200]]]], { date1904: true })
  const r = await readHistoryFile({ fileBase64, fileName: 'a.xlsx' })
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].symbol, '000001'); assert.equal(r.rows[0].date, '1904-01-02')
  assert.ok(r.errors.some((e) => e.field === 'price' && e.row === 3 && /formula|公式/i.test(e.message)))
})

test('valid deflated streaming ZIP and unused macro defaults remain readable', async () => {
  const data = [['Date', 'Type', 'Cash Amount'], ['2026-01-02', 'deposit', 10]]
  const fileBase64 = workbook([['交易记录', data]], { deflate: true, flags: 8, entries: {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="bin" ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  } })
  const r = await readHistoryFile({ fileBase64, fileName: 'a.xlsx' })
  assert.deepEqual(r.errors, []); assert.equal(r.rows[0].cashAmount, 10)
})

test('XLSX protects against unindexed entries, local size conflicts and sparse row allocations', async () => {
  const normal = Buffer.from(workbook([['交易记录', [['Date', 'Type'], ['2026-01-02', 'tax']]]]), 'base64')
  const mismatched = Buffer.from(normal); mismatched.writeUInt32LE(1, 22)
  const junk = Buffer.alloc(7); const hidden = Buffer.concat([junk, normal])
  const sparse = workbook([['交易记录', [['Date', 'Type']]]], { entries: {
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1000000000"/></sheetData></worksheet>',
  } })
  for (const buffer of [mismatched, hidden, Buffer.from(sparse, 'base64')]) {
    const r = await readHistoryFile({ fileName: 'a.xlsx', fileBase64: buffer.toString('base64') })
    assert.equal(r.rows.length, 0); assert.ok(r.errors.length)
  }
})

test('base64 delimited files decode safely, retain physical rows, and do not mutate arrays', async () => {
  const text = 'Date,Type,Cash Amount\r\n2026-01-02,deposit,"1,234.50"'
  for (const bytes of [Buffer.from(text), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')])]) {
    const r = await readHistoryFile({ fileBase64: bytes.toString('base64'), fileName: 'a.csv' })
    assert.deepEqual(r.errors, []); assert.equal(r.rows[0].cashAmount, 1234.5); assert.equal(r.rows[0].row, 2)
  }
  const rows = Object.freeze([Object.freeze(['Date', 'Type', 'Cash Amount']), Object.freeze(['2026-01-02', 'deposit', 0])])
  assert.equal(parse(rows).rows[0].cashAmount, 0)
})

test('XLSX ZIP guards reject encrypted, macro, oversize, malformed, and forged inflated sizes', async () => {
  const entries = { 'xl/workbook.xml': '<workbook/>' }
  const cases = [
    zip(entries, { flags: 1 }),
    zip({ ...entries, 'xl/vbaProject.bin': 'macro' }),
    zip(entries, { inflatedSize: 17 * 1024 * 1024 }),
    zip(entries, { deflate: true, inflatedSize: 1 }),
    Buffer.from('PK\x03\x04garbage'),
  ]
  for (const buffer of cases) {
    const r = await readHistoryFile({ fileBase64: buffer.toString('base64'), fileName: 'a.xlsx' })
    assert.equal(r.rows.length, 0); assert.ok(r.errors.length)
  }
  for (const fileName of ['a.xls', 'a.xlsm', 'a.xlsb']) assert.ok((await readHistoryFile({ fileBase64: zip(entries).toString('base64'), fileName })).errors.length)
})
