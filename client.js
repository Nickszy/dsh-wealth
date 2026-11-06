window.__ModuleLoader__.load({
  id: 'dsh-wealth',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------- palette ----------
    function useIsDark() {
      const [dark, setDark] = React.useState(() => {
        try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches } catch (_) { return true }
      })
      React.useEffect(() => {
        let mq
        try {
          mq = window.matchMedia('(prefers-color-scheme: dark)')
          const on = (e) => setDark(e.matches)
          mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on)
          return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on) }
        } catch (_) { /* ignore */ }
      }, [])
      return dark
    }
    function palette(dark) {
      return dark
        ? { bg: '#0f1115', panel: '#161a21', card: '#1d222b', border: '#2b323d', text: '#e6e8ee', sub: '#9aa3b2', accent: '#5b8cff', green: '#3ddc84', red: '#ff6161', input: '#12161d' }
        : { bg: '#f6f7f9', panel: '#ffffff', card: '#ffffff', border: '#e3e6eb', text: '#1b1f27', sub: '#6b7480', accent: '#2f6fed', green: '#1f9d55', red: '#d64545', input: '#ffffff' }
    }

    // ---------- data access ----------
    async function getState() {
      const r = await fetch('/portfolio/api/state', { headers: { accept: 'application/json' } })
      return r.json()
    }
    async function runOp(op, payload) {
      const r = await fetch('/portfolio/api/op', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op, ...(payload || {}) }),
      })
      return r.json()
    }

    function fmtMoney(n, cur) {
      if (n === null || n === undefined || Number.isNaN(n)) return '—'
      const v = Math.abs(n) >= 10000 ? Math.round(n).toLocaleString('zh-CN') : (Math.round(n * 100) / 100).toLocaleString('zh-CN')
      return (cur ? '' : '') + v + (cur ? ' ' + cur : '')
    }
    function fmtPct(n) { if (n === null || !Number.isFinite(n)) return '—'; return (n >= 0 ? '+' : '') + (Math.round(n * 100) / 100) + '%' }

    const T = {
      th: (c, t) => h('th', { style: { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: t.sub, fontWeight: 500, borderBottom: '1px solid ' + t.border, whiteSpace: 'nowrap' } }, c),
      td: (c, t, extra) => h('td', { style: Object.assign({ padding: '8px 10px', fontSize: 13, color: t.text, borderBottom: '1px solid ' + t.border, verticalAlign: 'middle' }, extra || {}) }, c),
      btn: (t, active) => ({ padding: '6px 12px', fontSize: 13, borderRadius: 7, cursor: 'pointer', border: '1px solid ' + (active ? t.accent : t.border), background: active ? t.accent : t.card, color: active ? '#fff' : t.text }),
      input: (t) => ({ padding: '7px 9px', fontSize: 13, borderRadius: 7, border: '1px solid ' + t.border, background: t.input, color: t.text, outline: 'none', width: '100%', boxSizing: 'border-box' }),
      card: (t) => ({ background: t.card, border: '1px solid ' + t.border, borderRadius: 10, padding: 14 }),
      label: (t) => ({ fontSize: 12, color: t.sub, marginBottom: 4, display: 'block' }),
    }

    // ---------- main page ----------
    function PortfolioPage() {
      const dark = useIsDark(); const t = palette(dark)
      const [tab, setTab] = React.useState('overview')
      const [state, setState] = React.useState(null)
      const [err, setErr] = React.useState('')
      const [busy, setBusy] = React.useState(false)

      const reload = React.useCallback(async () => {
        try { const s = await getState(); if (s.ok) { setState(s); setErr('') } else setErr(s.error?.message || '读取失败') }
        catch (e) { setErr('无法连接插件服务：' + e.message) }
      }, [])
      React.useEffect(() => { reload() }, [reload])

      const call = async (op, payload) => {
        setBusy(true)
        try { const r = await runOp(op, payload); if (r.ok) { setState({ ok: true, ledger: r.ledger, summary: r.summary }); setErr('') } else setErr(r.error?.message || '操作失败'); return r }
        catch (e) { setErr('操作失败：' + e.message); return { ok: false } }
        finally { setBusy(false) }
      }

      const tabs = [['overview', '总览'], ['accounts', '账户'], ['holdings', '持仓'], ['trades', '流水'], ['input', '录入/导入']]
      return h('div', { style: { height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' } },
        h('div', { style: { maxWidth: 1080, margin: '0 auto', padding: '18px 20px 40px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            h('div', { style: { fontSize: 18, fontWeight: 650 } }, '资产账本'),
            h('div', { style: { fontSize: 12, color: t.sub } }, state?.summary ? ('· 本位币 ' + state.summary.baseCurrency) : ''),
            h('div', { style: { flex: 1 } }),
            h('button', { style: T.btn(t, false), onClick: reload, disabled: busy }, '刷新'),
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' } },
            tabs.map(([id, name]) => h('button', { key: id, style: T.btn(t, tab === id), onClick: () => setTab(id) }, name)),
          ),
          err ? h('div', { role: 'alert', style: { ...T.card(t), borderColor: t.red, color: t.red, marginBottom: 12, fontSize: 13 } }, err) : null,
          !state ? h('div', { style: { color: t.sub, fontSize: 13 } }, '加载中…') :
            tab === 'overview' ? h(Overview, { t, state, call, busy }) :
            tab === 'accounts' ? h(Accounts, { t, state, call, busy }) :
            tab === 'holdings' ? h(Holdings, { t, state, call, busy }) :
            tab === 'trades' ? h(Trades, { t, state, call, busy }) :
            h(Input, { t, state, call, busy }),
          h('div', { style: { marginTop: 22, fontSize: 11, color: t.sub, lineHeight: 1.7 } },
            '数据全部保存在本机；行情取不到时可直接手填现价/成本。要用对话记账，打开左侧「资产管家」会话直接说，例如「把华泰账户买 200 股贵州茅台，价格 1600 记上」。'),
        ),
      )
    }

    function Overview({ t, state, call, busy }) {
      const s = state.summary, db = state.ledger
      const accMap = new Map(db.accounts.map((a) => [a.id, a]))
      const cur = db.baseCurrency
      const [baseSel, setBaseSel] = React.useState(cur)
      React.useEffect(() => { setBaseSel(cur) }, [cur])
      const [fxEdit, setFxEdit] = React.useState({ cur: '', rate: '' })
      return h('div', null,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 14 } },
          h('div', { style: T.card(t) }, h('div', { style: T.label(t) }, '总市值'), h('div', { style: { fontSize: 22, fontWeight: 650 } }, fmtMoney(s.totalValueBase, s.baseCurrency))),
          h('div', { style: T.card(t) }, h('div', { style: T.label(t) }, '总成本'), h('div', { style: { fontSize: 22, fontWeight: 650 } }, fmtMoney(s.totalCostBase, s.baseCurrency))),
          h('div', { style: T.card(t) }, h('div', { style: T.label(t) }, '浮动盈亏'), h('div', { style: { fontSize: 22, fontWeight: 650, color: s.totalPnlBase >= 0 ? t.green : t.red } }, fmtMoney(s.totalPnlBase, s.baseCurrency))),
        ),
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' } },
            h('div', null, h('label', { style: T.label(t) }, '本位币'), h('select', { value: baseSel, onChange: (e) => setBaseSel(e.target.value), style: { ...T.input(t), width: 120 } },
              [...new Set(['CNY', 'HKD', 'USD', ...Object.keys(db.fx)])].map((c) => h('option', { key: c, value: c }, c)))),
            h('button', { style: T.btn(t, false), disabled: busy, onClick: () => call('base.set', { currency: baseSel }) }, '设为本位币'),
            h('div', { style: { width: 1, height: 28, background: t.border } }),
            h('div', null, h('label', { style: T.label(t) }, '币种'), h('input', { value: fxEdit.cur, onChange: (e) => setFxEdit({ ...fxEdit, cur: e.target.value.toUpperCase() }), placeholder: 'HKD', style: { ...T.input(t), width: 90 } })),
            h('div', null, h('label', { style: T.label(t) }, '汇率(1单位=?' + cur + ')'), h('input', { value: fxEdit.rate, onChange: (e) => setFxEdit({ ...fxEdit, rate: e.target.value }), placeholder: '0.92', style: { ...T.input(t), width: 110 } })),
            h('button', { style: T.btn(t, false), disabled: busy, onClick: async () => { await call('fx.set', { currency: fxEdit.cur, rate: Number(fxEdit.rate) }); setFxEdit({ cur: '', rate: '' }) } }, '保存汇率'),
          ),
          h('div', { style: { marginTop: 10, fontSize: 12, color: t.sub } }, '当前汇率：' + Object.entries(db.fx).map(([c, r]) => c + '→' + cur + ' ' + r).join('　')),
        ),
        h('div', { style: T.card(t) },
          h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 } }, '各账户'),
          s.accounts.length === 0 ? h('div', { style: { color: t.sub, fontSize: 13 } }, '还没有账户，去「账户」页添加。') :
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null, T.th('账户', t), T.th('持仓数', t), T.th('市值', t), T.th('成本', t), T.th('盈亏', t))),
            h('tbody', null, s.accounts.map((a) => h('tr', { key: a.accountId },
              T.td((accMap.get(a.accountId)?.name || a.accountId) + (accMap.get(a.accountId) ? ' · ' + accMap.get(a.accountId).currency : ''), t),
              T.td(String(a.holdings), t),
              T.td(fmtMoney(a.valueBase, cur), t),
              T.td(fmtMoney(a.costBase, cur), t),
              T.td(fmtMoney(a.pnlBase, cur), t, { color: a.pnlBase >= 0 ? t.green : t.red }),
            ))),
          ),
        ),
      )
    }

    function Accounts({ t, state, call, busy }) {
      const db = state.ledger
      const [form, setForm] = React.useState({ name: '', type: 'broker', currency: 'CNY', note: '' })
      const [editId, setEditId] = React.useState(null)
      const submit = async () => {
        if (!form.name.trim()) return
        await call('account.upsert', { account: { id: editId || undefined, ...form } })
        setForm({ name: '', type: 'broker', currency: 'CNY', note: '' }); setEditId(null)
      }
      return h('div', null,
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 1.4fr auto', gap: 10, alignItems: 'end' } },
            h('div', null, h('label', { style: T.label(t) }, '账户名'), h('input', { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: '如 华泰证券', style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '类型'), h('select', { value: form.type, onChange: (e) => setForm({ ...form, type: e.target.value }), style: T.input(t) }, ['broker', 'bank', 'fund', 'hand'].map((x) => h('option', { key: x, value: x }, x)))),
            h('div', null, h('label', { style: T.label(t) }, '币种'), h('input', { value: form.currency, onChange: (e) => setForm({ ...form, currency: e.target.value.toUpperCase() }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '备注'), h('input', { value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }), style: T.input(t) })),
            h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, editId ? '保存' : '添加账户'),
          ),
        ),
        h('div', { style: T.card(t) },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null, T.th('账户', t), T.th('类型', t), T.th('币种', t), T.th('备注', t), T.th('操作', t))),
            h('tbody', null, db.accounts.length ? db.accounts.map((a) => h('tr', { key: a.id },
              T.td(a.name, t), T.td(a.type, t), T.td(a.currency, t), T.td(a.note || '—', t),
              T.td(h('span', null,
                h('button', { style: { ...T.btn(t, false), padding: '3px 8px', marginRight: 6 }, onClick: () => { setForm({ name: a.name, type: a.type, currency: a.currency, note: a.note || '' }); setEditId(a.id) } }, '编辑'),
                h('button', { style: { ...T.btn(t, false), padding: '3px 8px', borderColor: t.red, color: t.red }, onClick: () => { if (window.confirm('删除账户「' + a.name + '」及其全部持仓和流水？')) call('account.remove', { id: a.id }) } }, '删除'),
              ), t),
            )) : h('tr', null, T.td('还没有账户', t, { color: t.sub }))),
          ),
        ),
      )
    }

    function Holdings({ t, state, call, busy }) {
      const db = state.ledger
      const accMap = new Map(db.accounts.map((a) => [a.id, a]))
      const insMap = new Map(db.instruments.map((i) => [i.id, i]))
      const [form, setForm] = React.useState({ accountId: db.accounts[0]?.id || '', symbol: '', name: '', market: 'CN', qty: '', avgCost: '', currency: '', manualPrice: '' })
      const submit = async () => {
        if (!form.accountId || !form.symbol.trim()) return
        await call('holding.upsert', { holding: { ...form, qty: Number(form.qty) || 0, avgCost: Number(form.avgCost) || 0, manualPrice: form.manualPrice === '' ? null : Number(form.manualPrice) } })
        setForm({ ...form, symbol: '', name: '', qty: '', avgCost: '', manualPrice: '' })
      }
      return h('div', null,
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 0.9fr 1fr 0.6fr 0.7fr 0.7fr 0.7fr 0.8fr auto', gap: 8, alignItems: 'end' } },
            h('div', null, h('label', { style: T.label(t) }, '账户'), h('select', { value: form.accountId, onChange: (e) => setForm({ ...form, accountId: e.target.value }), style: T.input(t) }, db.accounts.map((a) => h('option', { key: a.id, value: a.id }, a.name)))),
            h('div', null, h('label', { style: T.label(t) }, '代码'), h('input', { value: form.symbol, onChange: (e) => setForm({ ...form, symbol: e.target.value.trim() }), placeholder: '600519', style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '名称'), h('input', { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: '贵州茅台', style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '市场'), h('select', { value: form.market, onChange: (e) => setForm({ ...form, market: e.target.value }), style: T.input(t) }, ['CN', 'HK', 'US', 'FUND'].map((x) => h('option', { key: x, value: x }, x)))),
            h('div', null, h('label', { style: T.label(t) }, '数量'), h('input', { value: form.qty, onChange: (e) => setForm({ ...form, qty: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '成本'), h('input', { value: form.avgCost, onChange: (e) => setForm({ ...form, avgCost: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '现价(手填)'), h('input', { value: form.manualPrice, onChange: (e) => setForm({ ...form, manualPrice: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '币种'), h('input', { value: form.currency, onChange: (e) => setForm({ ...form, currency: e.target.value.toUpperCase() }), placeholder: '自动', style: T.input(t) })),
            h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, '添加/更新'),
          ),
        ),
        h('div', { style: T.card(t) },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null, T.th('标的', t), T.th('账户', t), T.th('数量', t), T.th('成本', t), T.th('现价', t), T.th('币种', t), T.th('市值(本位币)', t), T.th('操作', t))),
            h('tbody', null, db.holdings.length ? db.holdings.map((ho) => {
              const ins = insMap.get(ho.instrumentId); const acc = accMap.get(ho.accountId)
              const price = ho.manualPrice ?? ho.avgCost ?? 0
              const rate = db.fx[ho.currency] ?? 1
              const mv = ho.qty * price * rate
              return h('tr', { key: ho.id },
                T.td((ins ? ins.name + ' ' + ins.symbol : ho.instrumentId), t),
                T.td(acc ? acc.name : ho.accountId, t),
                T.td(String(ho.qty), t),
                T.td(fmtMoney(ho.avgCost), t),
                T.td(h('input', { defaultValue: ho.manualPrice ?? '', placeholder: '手填', onBlur: (e) => { const v = e.target.value; if (v !== '' && String(ho.manualPrice ?? '') !== v) call('price.set', { holdingId: ho.id, price: Number(v) }) }, style: { ...T.input(t), width: 78 } }), t),
                T.td(ho.currency, t),
                T.td(fmtMoney(mv, db.baseCurrency), t),
                T.td(h('button', { style: { ...T.btn(t, false), padding: '3px 8px', borderColor: t.red, color: t.red }, onClick: () => { if (window.confirm('删除该持仓？')) call('holding.remove', { id: ho.id }) } }, '删除'), t),
              )
            }) : h('tr', null, T.td('还没有持仓', t, { color: t.sub }))),
          ),
        ),
      )
    }

    function Trades({ t, state, call, busy }) {
      const db = state.ledger
      const accMap = new Map(db.accounts.map((a) => [a.id, a]))
      const insMap = new Map(db.instruments.map((i) => [i.id, i]))
      const [form, setForm] = React.useState({ accountId: db.accounts[0]?.id || '', symbol: '', side: 'buy', qty: '', price: '', fee: '', date: new Date().toISOString().slice(0, 10), currency: '' })
      const submit = async () => {
        if (!form.accountId || !form.symbol.trim()) return
        await call('trade.add', { trade: { ...form, qty: Number(form.qty) || 0, price: Number(form.price) || 0, fee: Number(form.fee) || 0 } })
        setForm({ ...form, symbol: '', qty: '', price: '', fee: '' })
      }
      return h('div', null,
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.7fr 0.6fr 0.7fr 0.6fr 0.9fr 0.7fr auto', gap: 8, alignItems: 'end' } },
            h('div', null, h('label', { style: T.label(t) }, '账户'), h('select', { value: form.accountId, onChange: (e) => setForm({ ...form, accountId: e.target.value }), style: T.input(t) }, db.accounts.map((a) => h('option', { key: a.id, value: a.id }, a.name)))),
            h('div', null, h('label', { style: T.label(t) }, '代码'), h('input', { value: form.symbol, onChange: (e) => setForm({ ...form, symbol: e.target.value.trim() }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '方向'), h('select', { value: form.side, onChange: (e) => setForm({ ...form, side: e.target.value }), style: T.input(t) }, [['buy', '买入'], ['sell', '卖出']].map(([v, n]) => h('option', { key: v, value: v }, n)))),
            h('div', null, h('label', { style: T.label(t) }, '数量'), h('input', { value: form.qty, onChange: (e) => setForm({ ...form, qty: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '价格'), h('input', { value: form.price, onChange: (e) => setForm({ ...form, price: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '费用'), h('input', { value: form.fee, onChange: (e) => setForm({ ...form, fee: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '日期'), h('input', { type: 'date', value: form.date, onChange: (e) => setForm({ ...form, date: e.target.value }), style: T.input(t) })),
            h('div', null, h('label', { style: T.label(t) }, '币种'), h('input', { value: form.currency, onChange: (e) => setForm({ ...form, currency: e.target.value.toUpperCase() }), placeholder: '自动', style: T.input(t) })),
            h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, '记一笔'),
          ),
        ),
        h('div', { style: T.card(t) },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null, T.th('日期', t), T.th('账户', t), T.th('标的', t), T.th('方向', t), T.th('数量', t), T.th('价格', t), T.th('金额', t), T.th('操作', t))),
            h('tbody', null, db.trades.length ? [...db.trades].reverse().map((tr) => {
              const ins = insMap.get(tr.instrumentId); const acc = accMap.get(tr.accountId)
              return h('tr', { key: tr.id },
                T.td(tr.date, t), T.td(acc ? acc.name : tr.accountId, t), T.td(ins ? ins.name + ' ' + ins.symbol : tr.instrumentId, t),
                T.td(tr.side === 'buy' ? '买入' : '卖出', t, { color: tr.side === 'buy' ? t.red : t.green }),
                T.td(String(tr.qty), t), T.td(fmtMoney(tr.price), t), T.td(fmtMoney(tr.qty * tr.price), t),
                T.td(h('button', { style: { ...T.btn(t, false), padding: '3px 8px', borderColor: t.red, color: t.red }, onClick: () => { if (window.confirm('删除这条流水？（不会自动回算持仓）')) call('trade.remove', { id: tr.id }) } }, '删除'), t),
              )
            }) : h('tr', null, T.td('还没有流水', t, { color: t.sub }))),
          ),
        ),
      )
    }

    function Input({ t, state, call, busy }) {
      const db = state.ledger
      const [mode, setMode] = React.useState('holdings')
      const [text, setText] = React.useState('')
      const [msg, setMsg] = React.useState('')
      const sample = mode === 'holdings'
        ? '账户名,代码,名称,市场,数量,成本,币种\n华泰证券,600519,贵州茅台,CN,100,1600,CNY\n华泰证券,00700,腾讯控股,HK,200,380,HKD'
        : '账户名,代码,方向,数量,价格,费用,日期,币种\n华泰证券,600519,buy,100,1600,5,2026-11-06,CNY'
      const parse = (txt) => {
        const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        const rows = []
        for (let i = 0; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.trim())
          if (i === 0 && /账户|代码|方向|数量|成本/.test(cells.join(''))) continue // header
          rows.push(cells)
        }
        return rows
      }
      const doImport = async () => {
        setMsg('')
        const rows = parse(text)
        if (!rows.length) { setMsg('没有可导入的数据行'); return }
        const accByName = new Map(db.accounts.map((a) => [a.name, a]))
        const payload = []
        for (const c of rows) {
          const acc = accByName.get(c[0]); if (!acc) { setMsg('账户不存在：' + c[0] + '（请先在「账户」页添加同名账户）'); return }
          if (mode === 'holdings') payload.push({ accountId: acc.id, symbol: c[1], name: c[2], market: c[3] || 'CN', qty: Number(c[4]) || 0, avgCost: Number(c[5]) || 0, currency: c[6] || '' })
          else payload.push({ accountId: acc.id, symbol: c[1], side: c[2] || 'buy', qty: Number(c[3]) || 0, price: Number(c[4]) || 0, fee: Number(c[5]) || 0, date: c[6] || undefined, currency: c[7] || '' })
        }
        const r = await call(mode === 'holdings' ? 'import.holdings' : 'import.trades', { rows: payload })
        if (r.ok) { setMsg('已导入 ' + (r.result?.imported ?? payload.length) + ' 条'); setText('') }
      }
      return h('div', null,
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { style: T.btn(t, mode === 'holdings'), onClick: () => setMode('holdings') }, '导入持仓'),
            h('button', { style: T.btn(t, mode === 'trades'), onClick: () => setMode('trades') }, '导入流水'),
          ),
          h('div', { style: { fontSize: 12, color: t.sub, marginBottom: 6 } }, '按 CSV 粘贴（第一行表头可留）。列顺序：'),
          h('div', { style: { fontSize: 12, color: t.text, marginBottom: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap' } }, sample.split('\n')[0]),
          h('textarea', { value: text, onChange: (e) => setText(e.target.value), placeholder: sample, rows: 8, style: { ...T.input(t), fontFamily: 'monospace', fontSize: 12, resize: 'vertical' } }),
          h('div', { style: { marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' } },
            h('button', { style: T.btn(t, true), disabled: busy, onClick: doImport }, '开始导入'),
            h('button', { style: T.btn(t, false), onClick: () => setText(sample) }, '填入示例'),
            msg ? h('span', { style: { fontSize: 12, color: t.accent } }, msg) : null,
          ),
        ),
      )
    }

    // ---------- sidebar panel takeover (same pattern as market-clock) ----------
    let ctx = null
    const PANEL = 'dsh-wealth'
    let shellDispose = null
    let panelSession = null

    function closePanel() {
      const d = shellDispose; shellDispose = null; panelSession = null
      if (d) { try { d() } catch (_) {} }
    }
    function openPanel() {
      const layout = ctx && ctx.get && ctx.get('layout')
      if (!layout || typeof layout.selectPanel !== 'function') throw new Error('布局服务不可用，无法打开资产页。')
      if (!shellDispose) {
        const sidebar = ctx.get('sidebarRight')
        panelSession = (sidebar && sidebar.mounted && sidebar.mounted.getSnapshot && sidebar.mounted.getSnapshot()) || null
        shellDispose = ctx.slots.register({ name: 'main.conversation', priority: -10 }, NativePortfolio)
      }
      try { layout.selectPanel(null) } catch (e) { closePanel(); throw e }
    }

    function PortfolioIcon({ size = 20 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M4 19V5 M4 19h16', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'M7 15l3-4 3 2 4-6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('circle', { cx: 17, cy: 7, r: 1.4, fill: 'currentColor' }),
      )
    }

    function PortfolioPanelEntry() {
      const [error, setError] = React.useState('')
      React.useEffect(() => { try { openPanel() } catch (e) { setError(e.message || '打开失败') } }, [])
      return h('div', { role: 'status', style: { padding: 24 } }, error || '正在打开资产账本…')
    }

    function NativePortfolio({ sessionId }) {
      const mounted = React.useRef(false)
      React.useEffect(() => {
        mounted.current = true
        const owned = shellDispose
        return () => { mounted.current = false; queueMicrotask(() => { if (!mounted.current && shellDispose === owned) closePanel() }) }
      }, [])
      React.useEffect(() => { if (panelSession && sessionId !== panelSession) closePanel() }, [sessionId])
      return h(PortfolioPage)
    }

    return {
      inject: ['slots'],
      apply(c) {
        ctx = c
        c.effect(() => c.slots.inject('sidebar.panellist', () => c.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 30, label: '资产',
        }, PortfolioIcon)), 'dsh-portfolio: nav')
        c.effect(() => c.slots.inject('main', () => c.slots.register({
          name: 'main', key: PANEL,
        }, PortfolioPanelEntry)), 'dsh-portfolio: panel entry')
        c.effect(() => () => closePanel(), 'dsh-portfolio: restore shell')
      },
    }
  },
})
