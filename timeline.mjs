// 由流水逆推每日持仓与现金：当前持仓是事实，流水是变化量，
// 从今天倒推回第一笔流水之前，再正向重放得到每一天的收盘持仓。
// 只使用账本内已有的数据，缺流水时明确报告覆盖区间，不推测未知交易。
const upper = (v) => String(v || '').trim().toUpperCase()
const isCashHolding = (db, holding) => {
  const ins = (db.instruments || []).find((i) => i.id === holding.instrumentId)
  return String(ins?.symbol || '').toUpperCase().startsWith('CASH:') || String(ins?.assetClass || '').toLowerCase() === 'cash'
}
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null)

function instrumentIndex(db) {
  const byId = new Map(), byKey = new Map()
  for (const ins of db.instruments || []) {
    byId.set(ins.id, ins)
    byKey.set(upper(ins.market) + '|' + String(ins.symbol || '').trim(), ins)
  }
  return { byId, byKey }
}

// 已卖出/已清理的标的不一定还在 instruments 表里：按代码合成临时标的，
// 至少保证持仓与现金两条腿同时存在，不至于只记现金而丢掉证券。
function inferAssetClass(market, symbol) {
  if (market === 'HK') return 'stock'
  if (market === 'US') return 'stock'
  if (market === 'CN' && /^\d{6}$/.test(symbol)) {
    if (/^(11|12|13)\d{4}$/.test(symbol)) return 'bond'
    if (/^(5|15|16|18)\d{4,5}$/.test(symbol)) return 'etf'
    return 'stock'
  }
  return 'other'
}

/**
 * 把账本里的买卖流水与成交统一成持仓事件（按日期升序），并去重。
 * historyEvents 导入的买卖带 cashAmount；trades 只有数量与价格。
 * 同一笔同时存在两种记录时保留 historyEvent（现金字段更完整）。
 */
export function positionEvents(db, { accountId } = {}) {
  const { byKey } = instrumentIndex(db)
  const warnings = []
  const within = (row) => !accountId || row.accountId === accountId
  const events = [], synthetic = new Map()
  const resolve = (row) => {
    if (row.instrumentId) return row.instrumentId
    const market = upper(row.market), symbol = String(row.symbol || '').trim()
    if (!market || !symbol) return null
    const ins = byKey.get(market + '|' + symbol)
    if (ins) return ins.id
    // 带后缀的券商代码（如 2549.HK、US.BLBD）与期权代码交给合成标的；
    // 行情拉不到时会按平推价处理并告警，不会静默丢持仓。
    const id = 'SYM:' + market + ':' + symbol
    if (!synthetic.has(id)) synthetic.set(id, { id, symbol, market, assetClass: inferAssetClass(market, symbol), currency: market === 'HK' ? 'HKD' : market === 'US' ? 'USD' : 'CNY', name: symbol, synthetic: true })
    return id
  }
  for (const e of db.historyEvents || []) {
    if (!within(e)) continue
    const side = String(e.kind || '').toLowerCase()
    if (side !== 'buy' && side !== 'sell') continue
    const qty = num(e.qty)
    if (qty === null || qty <= 0) continue
    const instrumentId = resolve(e)
    if (!instrumentId) { warnings.push('TIMELINE_UNKNOWN_INSTRUMENT:' + (e.symbol || '?')); continue }
    events.push({
      date: e.date, instrumentId, side, qty,
      cashAmount: num(e.cashAmount), source: 'historyEvent', id: e.id, price: num(e.price),
    })
  }
  const seen = new Set(events.map((e) => `${e.date}|${e.instrumentId}|${e.side}|${e.qty}|${String(e.price ?? '')}`))
  let duplicates = 0
  for (const t of db.trades || []) {
    if (!within(t)) continue
    const side = String(t.side || '').toLowerCase()
    if (side !== 'buy' && side !== 'sell') continue
    const qty = num(t.qty)
    if (qty === null || qty <= 0) continue
    const instrumentId = resolve(t)
    if (!instrumentId) { warnings.push('TIMELINE_UNKNOWN_INSTRUMENT:' + (t.symbol || '?')); continue }
    const price = num(t.price)
    const key = `${t.date}|${instrumentId}|${side}|${qty}|${String(price ?? '')}`
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key)
    const gross = price === null ? null : qty * price
    const fee = num(t.fee) ?? 0
    events.push({
      date: t.date, instrumentId, side, qty,
      cashAmount: gross === null ? null : (side === 'buy' ? -(gross + fee) : gross - fee),
      source: 'trade', id: t.id, price,
    })
  }
  if (duplicates) warnings.push('TIMELINE_DEDUPED_TRADES:' + duplicates)
  events.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)))
  if (synthetic.size) warnings.push('TIMELINE_SYNTHETIC_INSTRUMENTS:' + synthetic.size)
  return { events, warnings, synthetic: [...synthetic.values()] }
}

/** 账本里所有影响现金的流水（含非买卖类型），按日期升序。 */
export function cashEvents(db, { accountId } = {}) {
  const rows = []
  for (const e of db.historyEvents || []) {
    if (accountId && e.accountId !== accountId) continue
    const amount = num(e.cashAmount)
    if (amount === null || amount === 0) continue
    rows.push({ date: e.date, currency: e.currency || 'CNY', amount, id: e.id })
  }
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/**
 * 推定入金（下限）：证券流水不含银证转账，现金逆推转负时，缺口必然来自未记录的外部转入。
 * 按缺口首次出现的时点归月，累计为下限估计；出金无法以此推断（出金只会减少现金，与消费/买入不可区分）。
 */
export function inferredTransfers(db, { accountIds } = {}) {
  const ids = [...new Set((accountIds || []).map(String).filter(Boolean))]
  const timelines = ids.length
    ? ids.map((id) => reconstructTimeline(db, { accountId: id }))
    : [reconstructTimeline(db)]
  const timeline = timelines.length > 1 ? mergeTimelines(timelines) : timelines[0]
  const base = db.baseCurrency || 'CNY'
  const fx = { ...(db.fx || {}), [base]: 1 }
  const byMonth = new Map()
  let total = 0, previousShortfall = 0
  for (const state of timeline.states || []) {
    let cash = 0, missing = false
    for (const [currency, amount] of Object.entries(state.cash || {})) {
      const rate = fx[currency]
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) { missing = true; continue }
      cash += amount * rate
    }
    if (missing) continue
    const shortfall = Math.max(0, -cash)
    const delta = shortfall - previousShortfall
    previousShortfall = shortfall
    if (delta > 0.01) {
      const month = String(state.date).slice(0, 7)
      byMonth.set(month, (byMonth.get(month) || 0) + delta)
      total += delta
    }
  }
  const round2 = (n) => Number(n.toFixed(2))
  return {
    baseCurrency: base,
    total: round2(total),
    byMonth: [...byMonth.entries()].map(([month, amount]) => ({ month, amount: round2(amount) })).sort((a, b) => a.month.localeCompare(b.month)),
    coverage: { from: timeline.from, to: timeline.to, events: (timeline.events || []).length },
    note: '推定入金为下限估计：券商流水不含银证转账，现金缺口只能说明确有外部转入；出金与转账日期无法反推，补录银行流水后更准确。',
  }
}

/** 合并多个账户的时间线：按日期对齐后相加，用于组合视图。 */
export function mergeTimelines(list) {
  const live = (list || []).filter((t) => t && Array.isArray(t.states) && t.states.length)
  if (!live.length) return (list || [])[0] || { from: null, to: null, start: { positions: {}, cash: {} }, states: [], events: [], warnings: [] }
  if (live.length === 1) return live[0]
  const dates = [...new Set(live.flatMap((t) => t.states.map((s) => s.date)))].sort()
  const pointers = live.map(() => -1)
  const states = dates.map((date) => {
    const positions = {}, cash = {}
    live.forEach((t, i) => {
      while (pointers[i] + 1 < t.states.length && t.states[pointers[i] + 1].date <= date) pointers[i]++
      const st = pointers[i] < 0 ? t.start : t.states[pointers[i]]
      for (const [id, qty] of Object.entries(st.positions)) positions[id] = (positions[id] || 0) + qty
      for (const [currency, amount] of Object.entries(st.cash)) cash[currency] = (cash[currency] || 0) + amount
    })
    return { date, positions, cash }
  })
  const start = { positions: {}, cash: {} }
  for (const t of live) {
    for (const [id, qty] of Object.entries(t.start.positions)) start.positions[id] = (start.positions[id] || 0) + qty
    for (const [currency, amount] of Object.entries(t.start.cash)) start.cash[currency] = (start.cash[currency] || 0) + amount
  }
  return {
    from: dates[0], to: live[0].to, start, states,
    events: live.flatMap((t) => t.events),
    syntheticInstruments: live.flatMap((t) => t.syntheticInstruments || []),
    warnings: [...new Set(live.flatMap((t) => t.warnings))],
    coverage: { firstFlow: dates[0], lastFlow: dates[dates.length - 1], events: live.reduce((n, t) => n + t.events.length, 0), flows: 0, instruments: Object.keys(start.positions).length },
  }
}

/**
 * 逆推：返回起始状态（第一笔流水之前）与逐日状态。
 * states 表示每个有流水的交易日结束后的持仓与现金。
 */
export function reconstructTimeline(db, { accountId, today = new Date() } = {}) {
  const todayISO = today.toISOString().slice(0, 10)
  const { events, warnings, synthetic } = positionEvents(db, { accountId })
  const flows = cashEvents(db, { accountId })

  // 当前持仓（事实）：除现金外的证券按标的；现金按币种。
  const positions = new Map(), cash = new Map()
  for (const h of db.holdings || []) {
    if (accountId && h.accountId !== accountId) continue
    const qty = num(h.qty) ?? 0
    if (isCashHolding(db, h)) {
      const currency = h.currency || db.baseCurrency || 'CNY'
      cash.set(currency, (cash.get(currency) || 0) + qty)
    } else {
      positions.set(h.instrumentId, (positions.get(h.instrumentId) || 0) + qty)
    }
  }
  // 倒推全部事件与现金流。
  const startPositions = new Map(positions)
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    const current = startPositions.get(e.instrumentId) || 0
    startPositions.set(e.instrumentId, e.side === 'buy' ? current - e.qty : current + e.qty)
  }
  const startCash = new Map(cash)
  for (let i = flows.length - 1; i >= 0; i--) {
    const f = flows[i]
    startCash.set(f.currency, (startCash.get(f.currency) || 0) - f.amount)
  }
  // 正向重放，记录每日结束状态。
  const states = []
  const currentPositions = new Map(startPositions), currentCash = new Map(startCash)
  const dates = [...new Set([...events.map((e) => e.date), ...flows.map((f) => f.date)])].sort()
  let ei = 0, fi = 0
  for (const date of dates) {
    while (ei < events.length && events[ei].date === date) {
      const e = events[ei++]
      currentPositions.set(e.instrumentId, (currentPositions.get(e.instrumentId) || 0) + (e.side === 'buy' ? e.qty : -e.qty))
    }
    while (fi < flows.length && flows[fi].date === date) {
      const f = flows[fi++]
      currentCash.set(f.currency, (currentCash.get(f.currency) || 0) + f.amount)
    }
    states.push({ date, positions: Object.fromEntries(currentPositions), cash: Object.fromEntries(currentCash) })
  }
  // 一致性核对：终态应等于当前持仓（浮点容差）。
  const mismatch = []
  for (const [id, qty] of positions) {
    const end = currentPositions.get(id) || 0
    if (Math.abs(end - qty) > 1e-6) mismatch.push({ instrumentId: id, expected: qty, reconstructed: end })
  }
  if (mismatch.length) warnings.push('TIMELINE_ENDPOINT_MISMATCH:' + mismatch.length)
  const negativeCash = states.filter((s) => Object.values(s.cash).some((v) => v < -0.01))
  if (negativeCash.length) warnings.push('TIMELINE_NEGATIVE_CASH:' + negativeCash.length)
  const untracked = [...positions.keys()].filter((id) => !events.some((e) => e.instrumentId === id))
  if (untracked.length) warnings.push('TIMELINE_NO_TRADE_HISTORY:' + untracked.length)
  return {
    from: dates[0] || null, to: todayISO,
    start: { date: dates[0] || null, positions: Object.fromEntries(startPositions), cash: Object.fromEntries(startCash) },
    states, events, warnings, syntheticInstruments: synthetic || [],
    coverage: { firstFlow: dates[0] || null, lastFlow: dates[dates.length - 1] || null, events: events.length, flows: flows.length, instruments: positions.size },
  }
}
