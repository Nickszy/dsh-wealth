window.__ModuleLoader__.load({
  id: 'dsh-wealth',
  factory(require) {
    const React = require('react')
    // ---------- i18n ----------
    // 运行时字典：叶子字符串命中文案即翻译（英文界面覆盖核心页面），
    // 未收录的长句保持原文，避免机器翻译误导。语言切换后整棵树重渲染。
    const EN = {
      '其他': 'Other', '币种': 'Currency', '账户': 'Accounts', '资产助手': 'Assistant', '未知': 'Unknown',
      '浮动盈亏': 'Unrealized P&L', '费用': 'Fees', '读取中…': 'Loading…', '现金': 'Cash', '尚未同步': 'Not synced yet',
      '数量': 'Qty', '刷新账本': 'Refresh ledger', '资产合计': 'Total assets', '净资产': 'Net worth',
      '买入': 'Buy', '卖出': 'Sell', '股票': 'Stocks', '基金': 'Funds', '债券': 'Bonds', 'ETF': 'ETF',
      '富途': 'Futu', '长桥': 'Longbridge', '同花顺': 'THS', '爱基金': 'Aijijin', '保存失败': 'Save failed',
      '授权账号': 'Authorizations', '已授权': 'Authorized', '补录账单': 'Backfill', '删除': 'Delete',
      '按资产类别': 'By asset class', '按币种': 'By currency', '补充历史流水': 'Backfill history',
      '接入方式': 'Connection', '持仓': 'Holdings', '流水': 'Transactions', '分析': 'Analysis',
      '收起助手': 'Hide assistant', '账户 / 持仓': 'Accounts / positions', '今日提醒': 'Today',
      '我的账户': 'My accounts', '已导入': 'Imported', '分析范围': 'Analysis scope',
      '全部账户合并': 'All accounts combined', '已选': 'Selected', '成长': 'Growth', '价值': 'Value',
      '均衡': 'Blend', '资产类别': 'Asset class', '资产负债表': 'Balance sheet', '年度现金流': 'Yearly cash flow',
      '年份': 'Year', '入金': 'Deposits', '出金': 'Withdrawals', '分红': 'Dividends', '利息': 'Interest',
      '税费': 'Taxes', '预计收支': 'Forecast', '生活账单': 'Life bills', '数据健康': 'Data health',
      '读取失败': 'Load failed', '同花顺投资账本': 'THS Ledger', '文件导入': 'File import',
      '高级 API / MCP': 'Advanced API / MCP', '操作失败': 'Operation failed', '授权异常': 'Authorization issue',
      '待重新授权': 'Re-authorization needed', '重新授权': 'Re-authorize', '移除': 'Remove',
      '手动账户': 'Manual account', '负债合计': 'Total liabilities', '同步中…': 'Syncing…',
      '请选择账户并填写代码': 'Select an account and enter a symbol', '按行业': 'By sector',
      '按风格': 'By style', '按市场': 'By market', '按账户': 'By account', '操作': 'Action',
      '代码': 'Symbol', '市场': 'Market', '数字资产': 'Crypto', '取消': 'Cancel', '状态': 'Status',
      '文件回补': 'File backfill', '上一页': 'Prev', '下一页': 'Next', '无记录': 'No records',
      '未指定': 'Unspecified', '导入账户': 'Import account', '同步成功': 'Synced', '同步失败': 'Sync failed',
      '总览': 'Overview', '设置': 'Settings', '资产总览': 'Portfolio', '资产账本': 'Wealth Ledger',
      '菜单': 'Menu', '资产导航': 'Asset navigation', '单账户视图': 'Single account',
      '连接你的资产，建立清晰全貌': 'Connect your assets for a clear picture',
      '刷新': 'Refresh', '正在整理资产全貌…': 'Loading your portfolio…',
      '账本保存在本机 · 估值以已录入价格和汇率计算': 'Ledger stays on this machine · valued with your prices and FX rates',
      '资产助手使用 DSH 默认模型，提问时附带当前账本。': "The assistant uses DSH's default model and includes the current ledger with each question.",
      '估值提示': 'Valuation notes', '持仓总成本': 'Total cost', '知道了': 'Got it',
      '每天首次打开显示一次；可让资产助手复述或追问。': 'Shown once per day; ask the assistant to repeat it.',
      '管理账户 ↗': 'Manage accounts ↗', '三步，拥有一个完整的资产管家': 'Three steps to a complete money hub',
      '① 连接券商': '① Connect a broker', '② 导入账单': '② Import statements', '③ 问资产助手': '③ Ask the assistant',
      '　同花顺投资账本 / 富途 / 长桥 / IB，一次登录自动同步账户、持仓与流水': '　THS Ledger / Futu / Longbridge / IB — one login syncs accounts, positions and flows',
      '　微信 / 支付宝 CSV 自动归类，补齐生活账本': '　WeChat / Alipay CSV auto-categorized into your life ledger',
      '　让 AI 核对数据、补录流水、生成分析与提醒': '　Let AI check data, backfill flows, and produce analysis and reminders',
      '开始 · 添加账户': 'Get started · Add account', '查看账户详情': 'View account', '资产占比': 'Allocation',
      '浮盈': 'Unrealized', '生活账单读取失败': 'Failed to load life bills', '预算保存失败': 'Failed to save budget',
      '账单解析失败': 'Failed to parse the statement', '请选择入账账户': 'Choose an account',
      '导入失败': 'Import failed', '分析读取失败': 'Failed to load analysis', '预计收支读取失败': 'Failed to load forecast',
      '历史净值读取失败': 'Failed to load history', '分析层准备中…': 'Preparing analysis…',
      '时间加权收益 TWR': 'Time-weighted return', '需要至少两天快照': 'Needs two days of snapshots',
      '资金加权年化 XIRR': 'Money-weighted XIRR', '个人真实年化回报': 'Your true annualized return',
      '最大回撤': 'Max drawdown', '历史净值': 'History', '历史净值走势': 'Portfolio value history',
      '按流水 × 历史行情回补': 'Rebuilt from flows × historical prices',
      '口径为每日市值：持仓由流水逆推，价格取历史收盘/净值；出入金与买卖会造成台阶，不等同投资收益率。': 'Daily market value: positions replayed from flows, priced at historical closes/NAV. Deposits, withdrawals and trades create steps — this is not an investment return.',
      '入金（同花顺）': 'Deposits (THS)', '出金（同花顺）': 'Withdrawals (THS)', '账户累计盈亏': 'Lifetime account P&L',
      '回扫入金/出金明细 ↗': 'Backfill deposit/withdrawal details ↗', '回扫中…（可能需要几分钟）': 'Scanning… (may take minutes)',
      // ---- 第二批：设置 / 授权 / 表格 / 状态 ----
      'HKD 港币': 'HKD', 'USD 美元': 'USD', 'CNH 离岸人民币': 'CNH', '按月': 'By month', '月份': 'Month',
      '支出': 'Expenses', '收入': 'Income', '行情': 'Quotes', '新增': 'New', '重复': 'Duplicates',
      '冲突': 'Conflicts', '完成': 'Done', '凭据': 'Credentials', '停用': 'Disable', '启用': 'Enable',
      '账户名': 'Account name', '未分类': 'Uncategorized', '已清仓': 'Closed', '区间外': 'Outside range',
      '同步中': 'Syncing', '有警告': 'Warnings', '已停用': 'Disabled', '已配置': 'Configured',
      '回扫失败': 'Scan failed', '推算中…': 'Estimating…', '汇率币种': 'FX currency', '关闭提示': 'Dismiss',
      '证券账户': 'Brokerage', '基金账户': 'Fund', '其他手工': 'Other manual', '账户币种': 'Account currency',
      '创建账户': 'Create account', '移除授权': 'Remove authorization', '账户概况': 'Account overview',
      '账户视图': 'Account views', '账户持仓': 'Account holdings', '全部持仓': 'All holdings',
      '账户流水': 'Account transactions', '全部流水': 'All transactions', '历史批次': 'Batches',
      '尚无记录': 'No records yet', '基金账本': 'Fund book', '重新登录': 'Sign in again',
      '真实账户': 'Real', '模拟账户': 'Paper', '交易市场': 'Trading market', '资金币种': 'Funding currency',
      '兑换中…': 'Exchanging…', '保存中…': 'Saving…', '保存连接': 'Save connection', '添加连接': 'Add connection',
      '启用连接': 'Enable connection', '刷新状态': 'Refresh status', '部分成功': 'Partial',
      '上次成功': 'Last success', '上次尝试': 'Last attempt', '上游上传': 'Source upload', '行情日期': 'Quote date',
      '立即同步': 'Sync now', '编辑配置': 'Edit config', '导入类型': 'Import type', '持仓快照': 'Positions snapshot',
      '交易流水': 'Trade flows', '数据来源': 'Data source', '导入数据': 'Import data', '识别中…': 'Recognizing…',
      '请求失败': 'Request failed', '思考中…': 'Thinking…', '发送 ↗': 'Send ↗', '切换到中文': 'Switch to Chinese',
      '设为本位币': 'Set as base', '按账户筛选': 'Filter by account', '浏览器登录': 'Browser sign-in',
      '浏览器授权': 'Browser authorization', '香港 HK': 'Hong Kong', '美国 US': 'US', '沪深 CN': 'China',
      '长桥授权码': 'Longbridge auth code', '兑换授权码': 'Exchange code', '账户不存在': 'Account not found',
      '仅手动同步': 'Manual sync only', '来源未提供': 'Not provided by source', '识别并预览': 'Recognize & preview',
      '已写入账本': 'Written to ledger', '正在处理…': 'Processing…', '保存账户信息': 'Save account',
      '← 全部账户': '← All accounts', '连接已保存。': 'Connection saved.', '✓ 授权成功': '✓ Authorized',
      '尚未读取账户': 'Accounts not fetched yet', '✓ 已获得 MCP Token': '✓ MCP token obtained',
      '✓ 授权成功，正在读取账户…': '✓ Authorized, fetching accounts…', '登录并读取账本': 'Sign in & read ledger', '一键授权': 'Authorize once',
      '授权并读取账户': 'Authorize & read account', '读取/更新账户': 'Fetch / refresh accounts',
      '保存预算': 'Save budget', '预算进度': 'Budget progress',
      '预计支出': 'Projected spending', '预计收入': 'Projected income', '未来 30 天': 'Next 30 days',
      // ---- 首页重构（ui/home-redesign）----
      '资产轨迹': 'Net worth trail', '记录今日快照': 'Snapshot today', '资产配置': 'Allocation',
      '按类别': 'By class', '总资产': 'Total assets', '每日估值快照': 'Daily value snapshots',
      '第一份快照，已经就位': 'Your first snapshot is in place', '你的资产故事，从这里开始': 'Your asset story starts here',
      '至少两个日期的快照后显示趋势': 'Trend appears after two dated snapshots',
      '曲线包含出入金、交易与汇率影响，不代表投资收益率。': 'The curve includes deposits, trades and FX moves — it is not an investment return.',
      '导入持仓后显示分布': 'Import positions to see the breakdown',
      '资产轨迹历史快照': 'Net worth trail snapshots', '资产占比环形图': 'Allocation donut chart',
      '银行 / 现金': 'Bank / cash', '信用卡 / 借款': 'Credit card / loan',
      '券商与交易账户': 'Brokerage & trading', '基金与理财': 'Funds & wealth products',
      '活期、储蓄与现金': 'Current, savings and cash', '负债账户': 'Liability accounts', '手工维护的资产': 'Manually tracked assets',
      '未分类账户': 'Unclassified accounts',
      '推定入金（下限估算）': 'Inferred deposits (lower bound)', '分红 / 利息': 'Dividends / interest',
      '费用 / 税费': 'Fees / taxes', '配置与集中度': 'Allocation & concentration', '行业': 'Sector', '风格': 'Style',
      '暂无持仓分类': 'No classifications yet', '按年份汇总': 'Yearly summary', '资产构成': 'Composition',
      '按账户类别': 'By account group', '资产': 'Assets', '负债': 'Liabilities', '标 的': 'Asset',
      '标的': 'Asset', '成本': 'Cost', '现价': 'Price', '市值': 'Value', '盈亏': 'P&L', '日期': 'Date',
      '类型': 'Type', '金额': 'Amount', '分类': 'Category', '备注': 'Note', '来源': 'Source',
      '新增账户': 'Add account', '编辑账户': 'Edit account', '账户名称': 'Account name',
      '币种设置': 'Currency', '删除账户': 'Delete account', '保存': 'Save', '关闭': 'Close',
      '本月': 'This month', '预算': 'Budget', '剩余': 'Left', '超支': 'Over budget', '导入账单': 'Import statement',
      '选择文件': 'Choose file', '确认导入': 'Confirm import', '分类汇总': 'By category',
      '最近同步': 'Last sync', '流水已同步至': 'Flows synced to', '同步到最新': 'Sync now',
      '编辑': 'Edit', '全部账户': 'All accounts', '个股': 'By symbol', '返回': 'Back',
      '持仓成本': 'Position cost', '持有盈亏（券商）': 'Holding P&L (broker)', '手动维护': 'Maintained manually',
      '涨跌幅': 'Change', '今日盈亏': "Today's P&L", '净值': 'NAV',
      '按行业分布': 'By sector', '按风格分布': 'By style', '分布维度': 'Dimension',
      '月度预算': 'Monthly budget', '今日': 'Today', '提醒': 'Reminder', '设置币种': 'Set currency',
    }
    let LANG = 'zh'
    try { LANG = localStorage.getItem('wealth-lang') === 'en' ? 'en' : 'zh' } catch { /* storage may be blocked */ }
    const langListeners = new Set()
    const tr = (s) => {
      if (LANG !== 'en') return s
      const hit = EN[s]
      return hit === undefined ? s : hit
    }
    const TR_PROPS = new Set(['title', 'placeholder', 'aria-label', 'alt'])
    const trNode = (node) => typeof node === 'string' ? tr(node) : Array.isArray(node) ? node.map(trNode) : node
    const trProps = (props) => {
      if (!props || typeof props !== 'object' || Array.isArray(props)) return props
      let out = null
      for (const key of Object.keys(props)) {
        if (TR_PROPS.has(key) && typeof props[key] === 'string') {
          const value = tr(props[key])
          if (value !== props[key]) { out ||= { ...props }; out[key] = value }
        }
      }
      return out || props
    }
    const h = (type, props, ...children) => React.createElement(type, trProps(props), ...children.map(trNode))

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
        ? {
            bg: 'radial-gradient(1100px 640px at 18% -12%, #232e52 0%, #141a2c 55%, #0d1120 100%)',
            panel: '#151a29', card: '#1b2130', border: '#2a3247', text: '#e9edf8', sub: '#8e99b0',
            accent: '#5b8cff', accent2: '#7ba6ff', green: '#38c97f', red: '#ff6b7a',
            input: '#141a28', soft: '#202738', terra: '#e05a80', hover: '#232b3e', scroll: '#333c52',
            shell: 'linear-gradient(180deg,#101527,#0d1120)',
            shadow: '0 12px 30px rgba(0,0,0,.38)',
            cat: ['#5b8cff', '#bd8422', '#e05a80', '#8b6ef5', '#2fae6d'],
          }
        : {
            bg: 'linear-gradient(155deg,#a9b4f7 0%,#b8c2fb 45%,#a7b3f6 100%)',
            panel: '#ffffff', card: '#ffffff', border: '#e7ebf5', text: '#171c2b', sub: '#8b93a7',
            accent: '#2f6fed', accent2: '#5c95ff', green: '#149c5b', red: '#dd4655',
            input: '#f6f8fd', soft: '#eef3fe', terra: '#e8567e', hover: '#f3f6fe', scroll: '#d7ddec',
            shell: 'linear-gradient(180deg,#f4f6fc,#eef2fa)',
            shadow: '0 10px 28px rgba(35,48,95,.07)',
            cat: ['#2f6fed', '#b97c1f', '#e8567e', '#7b61e8', '#149c5b'],
          }
    }

    // BoardUI FREE MIT token adaptations; see BOARDUI-NOTICE.txt and ui-theme.js.
    // Embedded so the host loader only requires its own React, without a CSS build.
    const WEALTH_CSS = `
.wealth-shell{container-type:inline-size;box-sizing:border-box;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13.5px;line-height:1.55;color:var(--wealth-text)}
.wealth-shell *{box-sizing:border-box}
.wealth-shell button,.wealth-shell input,.wealth-shell select,.wealth-shell textarea{font:inherit;color:inherit}
.wealth-shell button{transition:transform .16s ease,box-shadow .16s ease,filter .16s ease}
.wealth-shell button:hover:not(:disabled){filter:brightness(.985)}
.wealth-shell button:active:not(:disabled){transform:translateY(1px)}
.wealth-shell button:disabled{opacity:.55;cursor:default!important}
.wealth-shell :is(button,input,select,textarea):focus-visible{outline:2px solid var(--wealth-accent);outline-offset:2px}
.wealth-shell input:not([type=checkbox]):not([type=radio]),.wealth-shell select{min-height:38px}
.wealth-shell table{border-collapse:collapse;min-width:560px}
.wealth-shell td,.wealth-shell th{font-variant-numeric:tabular-nums}
.wealth-shell th{letter-spacing:.03em}
.wealth-shell tbody tr{transition:background .12s ease}
.wealth-shell tbody tr:hover{background:var(--wealth-hover)}
.wealth-shell tbody tr:last-child td{border-bottom:0!important}
.wealth-shell ::-webkit-scrollbar{width:9px;height:9px}
.wealth-shell ::-webkit-scrollbar-thumb{background:var(--wealth-scroll);border-radius:999px}
.wealth-shell ::-webkit-scrollbar-track{background:transparent}
.wealth-shell .wealth-topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:10px 24px;min-height:58px;border-bottom:1px solid var(--wealth-border);background:var(--wealth-panel)}
.wealth-shell .wealth-wordmark{font-size:17px;font-weight:750;letter-spacing:-.4px;white-space:nowrap;display:flex;align-items:center;gap:9px}
.wealth-shell .wealth-wordmark:before{content:'';width:30px;height:30px;border-radius:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='15' fill='%2317233a'/%3E%3Crect x='12' y='16.5' width='19' height='8' rx='4' fill='%23e2a089'/%3E%3Crect x='12' y='28' width='31' height='8' rx='4' fill='%239fb9ff'/%3E%3Crect x='12' y='39.5' width='40' height='8' rx='4' fill='%23f5f3ee'/%3E%3Ccircle cx='46' cy='20.5' r='4' fill='%23f5f3ee'/%3E%3C/svg%3E");background-size:100% 100%;display:inline-block}
.wealth-shell .wealth-wordmark small{font-size:9.5px;letter-spacing:1.6px;font-weight:700;color:var(--wealth-sub)}
.wealth-shell .wealth-tabs{display:flex;gap:4px;overflow-x:auto;flex:1;min-width:0}
.wealth-shell .wealth-tab{border:1px solid transparent;background:transparent;color:var(--wealth-sub);padding:8px 15px;border-radius:999px;cursor:pointer;white-space:nowrap;font-weight:600;font-size:13px}
.wealth-shell .wealth-tab:hover{background:var(--wealth-hover);color:var(--wealth-text)}
.wealth-shell .wealth-tab[aria-current=page]{background:var(--wealth-soft);color:var(--wealth-accent);font-weight:750}
.wealth-shell .wealth-body{flex:1;min-width:0;display:flex;align-items:stretch;overflow:auto}
.wealth-shell .wealth-main{flex:1;min-width:0;padding:24px 26px 40px;background:var(--wealth-shell);container-type:inline-size}
.wealth-shell .wealth-main>div{max-width:1360px;margin-left:auto;margin-right:auto}
.wealth-shell .wealth-page-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}
.wealth-shell .wealth-eyebrow{font-size:10px;letter-spacing:2px;color:var(--wealth-sub);text-transform:uppercase;font-weight:700}
.wealth-shell .wealth-title{font-size:24px;letter-spacing:-.6px;margin:4px 0;font-weight:780}
.wealth-shell .wealth-chat{width:310px;flex-shrink:0;border-left:1px solid var(--wealth-border);position:sticky;top:0;height:100%;background:var(--wealth-panel)}
.wealth-shell .wealth-hero{background:var(--wealth-card);border:1px solid var(--wealth-border);border-radius:24px;padding:22px 24px 14px;margin-bottom:16px;box-shadow:var(--wealth-shadow)}
.wealth-shell .wealth-asset-value{font-size:clamp(32px,3.3vw,42px);font-weight:780;letter-spacing:-1.4px;line-height:1.2;font-variant-numeric:tabular-nums;margin:8px 0 16px}
.wealth-shell .wealth-asset-value small{font-size:12px;font-weight:600;letter-spacing:0;margin-left:9px;color:var(--wealth-sub)}
.wealth-shell .wealth-metrics{display:flex;gap:26px;flex-wrap:wrap;padding-bottom:16px}
.wealth-shell .wealth-metrics strong{display:block;font-size:17px;font-weight:750;margin-top:4px;font-variant-numeric:tabular-nums}
.wealth-shell .wealth-charts{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:20px;border-top:1px solid var(--wealth-border);padding-top:16px}
.wealth-shell .wealth-charts>section{min-width:0;background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important}
.wealth-shell .wealth-empty{min-height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:9px;padding:20px;color:var(--wealth-sub)}
.wealth-shell .wealth-empty-mark{width:52px;height:52px;border:1px solid var(--wealth-border);border-radius:17px;display:grid;place-items:center;color:var(--wealth-accent);font-size:22px;background:var(--wealth-soft)}
.wealth-shell .wealth-acct-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,300px);gap:16px;align-items:start}
.wealth-shell .wealth-account-row{display:grid;grid-template-columns:42px minmax(100px,1fr) minmax(100px,1fr) auto;gap:13px;align-items:center;padding:13px 8px;border-bottom:1px solid var(--wealth-border);border-radius:12px}
.wealth-shell .wealth-account-row:last-child{border-bottom:0}
.wealth-shell .wealth-account-row:hover{background:var(--wealth-hover)}
.wealth-shell .wealth-acct-row{display:grid;grid-template-columns:38px minmax(90px,1.4fr) minmax(70px,1fr) auto;gap:10px;align-items:center;padding:10px 10px;border-radius:14px;cursor:pointer;min-width:0}
.wealth-shell .wealth-acct-row:hover{background:var(--wealth-hover)}
.wealth-shell .wealth-acct-row.is-open{background:var(--wealth-soft)}
.wealth-shell .wealth-account-badge{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-weight:750;font-size:15px;background:var(--wealth-soft);color:var(--wealth-accent);flex:none}
.wealth-shell .wealth-bar{height:4px;border-radius:5px;background:var(--wealth-border);overflow:hidden;margin-top:7px}
.wealth-shell .wealth-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--wealth-accent),var(--wealth-accent2));border-radius:5px}
.wealth-shell .wealth-nested{padding:0 8px 12px 52px}
.wealth-shell .wealth-nested-card{background:var(--wealth-soft);border:1px solid var(--wealth-border);border-radius:16px;padding:6px 14px;overflow-x:auto}
.wealth-shell .wealth-nested-card table{min-width:0;width:100%}
.wealth-shell .wealth-nested-card th,.wealth-shell .wealth-nested-card td{padding:8px 8px;font-size:12px;white-space:nowrap}
.wealth-shell .wealth-summary{position:sticky;top:74px}
.wealth-shell .wealth-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(10,16,34,.5);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;overflow:auto}
.wealth-shell .wealth-modal{width:min(760px,100%);background:var(--wealth-card);color:var(--wealth-text);border:1px solid var(--wealth-border);border-radius:22px;box-shadow:0 30px 80px rgba(12,20,45,.4);padding:22px 24px}
.wealth-shell .wealth-modal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}
.wealth-shell .wealth-method-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.wealth-shell .wealth-subtabs{display:flex;gap:4px;border-bottom:1px solid var(--wealth-border);margin:18px 0 16px;overflow-x:auto}
.wealth-shell .wealth-subtab{border:0;background:transparent;padding:9px 14px;color:var(--wealth-sub);border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;font-weight:600}
.wealth-shell .wealth-subtab[aria-current=page]{color:var(--wealth-accent);border-bottom-color:var(--wealth-accent)}
.wealth-shell .wealth-acct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
.wealth-shell .wealth-chip{border:1px solid var(--wealth-border);background:var(--wealth-card);color:var(--wealth-sub);border-radius:999px;padding:6px 13px;cursor:pointer;font-size:12.5px;font-weight:600}
.wealth-shell .wealth-chip[aria-pressed=true]{background:var(--wealth-soft);border-color:var(--wealth-accent);color:var(--wealth-accent);font-weight:700}
.wealth-shell .wealth-chat-intro{padding:24px 0 20px}
.wealth-shell .wealth-chat-intro h3{font-weight:600;font-size:21px;letter-spacing:-.4px;margin:14px 0 8px}
.wealth-shell .wealth-chat form{padding:10px;border:1px solid var(--wealth-border);border-radius:16px;background:var(--wealth-card);box-shadow:var(--wealth-shadow)}
.wealth-shell .wealth-chat form textarea{border:0!important;background:transparent!important;box-shadow:none!important;min-height:80px}
.wealth-shell .wealth-source-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:20px 0}
.wealth-shell .wealth-source-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:13px}
.wealth-shell .wealth-source-actions{display:flex;gap:8px;flex-wrap:wrap}
.wealth-shell .wealth-source-panel{overflow-wrap:anywhere}
.wealth-shell .wealth-source-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}
.wealth-shell .wealth-main table{width:100%}
.wealth-shell .wealth-table-wrap{overflow-x:auto}

.wealth-shell .wealth-frame{height:100%;max-width:1480px;margin:0 auto;display:flex;background:var(--wealth-shell);border-radius:24px;overflow:hidden;box-shadow:0 26px 60px rgba(28,40,88,.22)}
.wealth-shell .wealth-rail{width:212px;flex:none;background:var(--wealth-panel);border-right:1px solid var(--wealth-border);padding:20px 14px;display:flex;flex-direction:column;gap:4px;overflow-y:auto}
.wealth-shell .wealth-brand{display:flex;align-items:center;gap:10px;padding:2px 8px 14px}
.wealth-shell .wealth-logo{width:36px;height:36px;border-radius:11px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='t' x1='32' y1='0' x2='32' y2='64' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%231c2c49'/%3E%3Cstop offset='1' stop-color='%23131c2c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='15' fill='url(%23t)'/%3E%3Crect x='12' y='16.5' width='19' height='8' rx='4' fill='%23e2a089'/%3E%3Crect x='12' y='28' width='31' height='8' rx='4' fill='%239fb9ff'/%3E%3Crect x='12' y='39.5' width='40' height='8' rx='4' fill='%23f5f3ee'/%3E%3Ccircle cx='46' cy='20.5' r='4' fill='%23f5f3ee'/%3E%3C/svg%3E");background-size:100% 100%;display:inline-block;flex:none;box-shadow:0 8px 18px rgba(23,35,58,.24)}
.wealth-shell .wealth-navlist{display:flex;flex-direction:column;gap:4px}
.wealth-shell .wealth-nav{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;border:1px solid transparent;background:transparent;color:var(--wealth-sub);font-weight:600;cursor:pointer;text-align:left;width:100%}
.wealth-shell .wealth-nav:hover{background:var(--wealth-hover);color:var(--wealth-text)}
.wealth-shell .wealth-nav[aria-current=page]{background:var(--wealth-soft);color:var(--wealth-accent);font-weight:750}
.wealth-shell .wealth-rail-foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--wealth-border);display:flex;flex-direction:column;gap:4px}
.wealth-shell .wealth-kpis{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:14px;margin-bottom:16px}
.wealth-shell .wealth-chart-row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(270px,1fr);gap:16px;margin-bottom:16px;align-items:stretch}
@container(max-width:1100px){.wealth-kpis{grid-template-columns:1fr 1fr}.wealth-chart-row{grid-template-columns:1fr}.wealth-acct-layout{grid-template-columns:1fr}.wealth-summary{position:static}}
@container(max-width:760px){.wealth-acct-row .wealth-alloc{display:none}.wealth-acct-row{grid-template-columns:36px minmax(90px,1fr) auto}}
@container(max-width:620px){.wealth-kpis{grid-template-columns:1fr}}
@container(max-width:1200px){.wealth-shell .wealth-acct-layout{grid-template-columns:1fr}.wealth-shell .wealth-summary{position:static}.wealth-shell .wealth-chat{width:270px}.wealth-shell .wealth-charts{grid-template-columns:1fr}.wealth-shell .wealth-charts>section:last-child{border-top:1px solid var(--wealth-border)!important;padding-top:16px!important}}
@container(max-width:900px){.wealth-shell .wealth-rail{width:66px;padding:16px 8px}.wealth-shell .wealth-brand>div,.wealth-shell .wealth-nav-label{display:none}.wealth-shell .wealth-brand{justify-content:center;padding:0 0 12px}.wealth-shell .wealth-nav{justify-content:center;padding:10px 6px}.wealth-shell .wealth-body{flex-wrap:wrap}.wealth-shell .wealth-main{flex:0 0 100%;width:100%;padding:20px 16px}.wealth-shell .wealth-chat{width:100%;position:relative;top:0;height:520px;min-height:0;border-left:0;border-top:1px solid}.wealth-shell .wealth-topbar{padding:8px 12px;gap:10px}.wealth-shell .wealth-topbar .wealth-wordmark{display:none}.wealth-shell .wealth-modal{padding:18px 16px}.wealth-shell .wealth-acct-row{grid-template-columns:36px minmax(90px,1fr) auto}.wealth-shell .wealth-acct-row .wealth-alloc{display:none}.wealth-shell .wealth-nested{padding-left:12px}.wealth-shell .wealth-title{font-size:22px}}
@media(prefers-reduced-motion:reduce){.wealth-shell *{transition:none!important;animation:none!important}}
`

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
    function fmtPct(n) { if (n === null || !Number.isFinite(n)) return '—'; return (n >= 0 ? '+' : '') + (Math.round(n * 10000) / 100) + '%' }
    function fmtCompact(n) {
      const a = Math.abs(n)
      if (a >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
      if (a >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万'
      return String(Math.round(n))
    }

    const T = {
      th: (c, t) => h('th', { style: { textAlign: 'left', padding: '0 12px 10px', fontSize: 10.5, letterSpacing: .7, color: t.sub, fontWeight: 700, borderBottom: '1px solid ' + t.border, whiteSpace: 'nowrap' } }, c),
      td: (c, t, extra) => h('td', { style: Object.assign({ padding: '11px 12px', fontSize: 13, color: t.text, borderBottom: '1px solid ' + t.border, verticalAlign: 'middle' }, extra || {}) }, c),
      btn: (t, active) => ({ padding: '7px 14px', fontSize: 12.5, borderRadius: 999, minHeight: 34, fontWeight: 650, cursor: 'pointer', border: '1px solid ' + (active ? 'transparent' : t.border), background: active ? 'linear-gradient(135deg,' + t.accent + ',' + t.accent2 + ')' : t.card, color: active ? '#fff' : t.text, boxShadow: active ? '0 8px 18px ' + t.accent + '33' : t.shadow }),
      input: (t) => ({ padding: '8px 11px', fontSize: 13, borderRadius: 11, border: '1px solid ' + t.border, background: t.input, color: t.text, outline: 'none', width: '100%', boxSizing: 'border-box' }),
      card: (t) => ({ background: t.card, border: '1px solid ' + t.border, borderRadius: 20, padding: 18, boxShadow: t.shadow, overflowX: 'auto' }),
      label: (t) => ({ fontSize: 11.5, color: t.sub, marginBottom: 5, display: 'block', fontWeight: 650 }),
    }

    // ---------- main page ----------
    const NAV_PATHS = {
      overview: ['M4 10.5 12 4l8 6.5', 'M6 9.8V20h12V9.8'],
      accounts: ['M4 8.5A2.5 2.5 0 0 1 6.5 6H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 15.5z', 'M4 9h16', 'M15.5 13.5h2'],
      holdings: ['M12 3a9 9 0 1 0 9 9h-9z', 'M12 3v9h9'],
      trades: ['M4 8h13', 'm14 5 3 3-3 3', 'M20 16H7', 'm10 13-3 3 3 3'],
      analysis: ['M4 19V5', 'M4 19h16', 'M7 15l3-4 3 2 4-6'],
      settings: ['M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8', 'M12 2.5v2.2', 'M12 19.3v2.2', 'M2.5 12h2.2', 'M19.3 12h2.2', 'm5 5 1.6 1.6', 'm17.4 17.4 1.6 1.6', 'm19 5-1.6 1.6', 'm6.6 17.4L5 19'],
      refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v5h-5'],
      chat: ['M21 12a8 8 0 0 1-8 8H6l-3 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z'],
      spark: ['M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3', 'm5.6 5.6 2.1 2.1', 'm16.3 16.3 2.1 2.1', 'm18.4 5.6-2.1 2.1', 'm7.7 16.3-2.1 2.1'],
    }
    function NavIcon({ id, size = 17 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, (NAV_PATHS[id] || []).map((d, i) => h('path', { key: i, d })))
    }

    function PortfolioPage() {
      const dark = useIsDark(); const t = palette(dark)
      const [tab, setTabRaw] = React.useState('overview')
      const [detailId, setDetailId] = React.useState('')
      const [chatOpen, setChatOpen] = React.useState(true)
      const setTab = id => { setDetailId(''); setTabRaw(id) }
      const openAccount = id => { setTabRaw('accounts'); setDetailId(id || '') }
      const [state, setState] = React.useState(null)
      const [err, setErr] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      // 语言切换：模块级 LANG + 订阅，切换后整棵树按新语言重渲染。
      const [, forceLang] = React.useState(0)
      React.useEffect(() => {
        const fn = () => forceLang((v) => v + 1)
        langListeners.add(fn)
        return () => { langListeners.delete(fn) }
      }, [])
      const toggleLang = () => {
        LANG = LANG === 'zh' ? 'en' : 'zh'
        try { localStorage.setItem('wealth-lang', LANG) } catch { /* storage may be blocked */ }
        langListeners.forEach((fn) => fn())
      }

      const reload = React.useCallback(async () => {
        try { const s = await getState(); if (s.ok) { setState(s); setErr('') } else setErr(s.error?.message || '读取失败') }
        catch (e) { setErr('无法连接插件服务：' + e.message) }
      }, [])
      React.useEffect(() => { reload() }, [reload])

      const call = async (op, payload) => {
        setBusy(true)
        try { const r = await runOp(op, payload); if (r.ok) { setState(prev => ({ ok: true, version: prev?.version, ledger: r.ledger, summary: r.summary, analysis: r.analysis, dataSource: prev?.dataSource })); setErr('') } else setErr(r.error?.message || '操作失败'); return r }
        catch (e) { setErr('操作失败：' + e.message); return { ok: false } }
        finally { setBusy(false) }
      }

      const tabs = [['overview', '总览'], ['accounts', '账户'], ['holdings', '持仓'], ['trades', '流水'], ['analysis', '分析'], ['settings', '设置']]
      React.useEffect(() => {
        const timer = setInterval(() => { if (!document.hidden) reload() }, 15000)
        return () => clearInterval(timer)
      }, [reload])
      const detailAccount = detailId && state ? state.ledger.accounts.find(a => a.id === detailId) : null
      const title = detailAccount ? detailAccount.name : tabs.find(x => x[0] === tab)?.[1] || '资产总览'
      return h('div', { className: 'wealth-shell', style: { height: '100%', overflow: 'hidden', background: t.bg, padding: 14, color: t.text, '--wealth-accent': t.accent, '--wealth-accent2': t.accent2, '--wealth-border': t.border, '--wealth-panel': t.panel, '--wealth-card': t.card, '--wealth-text': t.text, '--wealth-sub': t.sub, '--wealth-soft': t.soft, '--wealth-hover': t.hover, '--wealth-scroll': t.scroll, '--wealth-shadow': t.shadow, '--wealth-shell': t.shell } },
        h('style', null, WEALTH_CSS),
        h('div', { className: 'wealth-frame' },
          h('aside', { className: 'wealth-rail' },
            h('div', { className: 'wealth-brand' },
              h('span', { className: 'wealth-logo', 'aria-hidden': true }),
              h('div', null,
                h('div', { style: { fontSize: 16, fontWeight: 780, letterSpacing: -.3 } }, '资产账本'),
                h('div', { style: { fontSize: 9, letterSpacing: 1.6, color: t.sub, fontWeight: 700, marginTop: 1 } }, 'WEALTH LEDGER'))),
            h('div', { style: { fontSize: 10, letterSpacing: 1.4, color: t.sub, fontWeight: 700, padding: '12px 12px 6px' } }, '菜单'),
            h('nav', { className: 'wealth-navlist', 'aria-label': '资产导航' },
              tabs.map(([id, name]) => h('button', { key: id, className: 'wealth-nav', 'aria-current': tab === id ? 'page' : undefined, onClick: () => setTab(id) },
                h(NavIcon, { id }), h('span', { className: 'wealth-nav-label' }, name)))),
            h('div', { style: { flex: 1, minHeight: 10 } }),
            h('div', { className: 'wealth-rail-foot' },
              h('button', { className: 'wealth-nav', onClick: reload, disabled: busy, title: '刷新账本' }, h(NavIcon, { id: 'refresh' }), h('span', { className: 'wealth-nav-label' }, '刷新账本')),
              h('button', { className: 'wealth-nav', 'aria-pressed': chatOpen, onClick: () => setChatOpen(!chatOpen), title: '资产助手' }, h(NavIcon, { id: 'chat' }), h('span', { className: 'wealth-nav-label' }, chatOpen ? '收起助手' : '资产助手')),
              h('div', { style: { textAlign: 'center', fontSize: 9.5, color: t.sub, padding: '8px 0 2px', letterSpacing: .3 } }, 'dsh-wealth' + (state?.version ? ' v' + state.version : '')))),
          h('div', { className: 'wealth-body' },
            h('main', { className: 'wealth-main' },
              h('header', { className: 'wealth-page-head' },
                h('div', null,
                  h('h1', { className: 'wealth-title' }, title),
                  h('div', { style: { fontSize: 12, color: t.sub, marginTop: 2 } }, state?.summary ? (detailAccount ? (detailAccount.currency + ' · 单账户视图') : '全部账户 · 本位币 ' + state.summary.baseCurrency) : '连接你的资产，建立清晰全貌')),
                h('div', { style: { display: 'flex', gap: 8 } },
                  h('button', { style: T.btn(t, false), onClick: toggleLang, title: LANG === 'zh' ? 'Switch to English' : '切换到中文' }, LANG === 'zh' ? 'EN' : '中文'),
                  h('button', { style: T.btn(t, false), onClick: reload, disabled: busy, title: '刷新账本' }, '刷新'),
                  h('button', { style: T.btn(t, chatOpen), onClick: () => setChatOpen(!chatOpen), 'aria-pressed': chatOpen }, chatOpen ? '收起助手' : '资产助手'))),
              err ? h('div', { role: 'alert', style: { ...T.card(t), borderColor: t.red, color: t.red, marginBottom: 12 } }, err) : null,
              !state ? h('div', { className: 'wealth-empty', role: 'status' }, h('span', { className: 'wealth-empty-mark' }, '◈'), '正在整理资产全貌…') :
                tab === 'overview' ? h(Overview, { t, state, call, busy, navigate: setTab, openAccount }) :
                tab === 'analysis' ? h(Analysis, { t, state, navigate: setTab }) :
                tab === 'accounts' ? (detailAccount ? h(AccountDetail, { key: detailAccount.id, t, state, call, busy, reload, accountId: detailAccount.id, back: () => setDetailId('') }) : h(AccountsHub, { t, state, call, busy, reload, openAccount })) :
                tab === 'holdings' ? h(Holdings, { t, state, call, busy, reload }) :
                tab === 'trades' ? h(Trades, { t, state, call, busy, openAccount }) :
                h(Settings, { t, state, call, busy, reload }),
              h('footer', { style: { marginTop: 24, fontSize: 10, color: t.sub, lineHeight: 1.8 } }, '账本保存在本机 · 估值以已录入价格和汇率计算', h('br'), '资产助手使用 DSH 默认模型，提问时附带当前账本。')),
            state && chatOpen ? h(Chat, { t, state, reload, busy }) : null)))
    }

    function Spark({ t, values, color, height = 46 }) {
      if (!values || values.length < 2) return null
      const width = 160
      const lo = Math.min(...values)
      const hi = Math.max(...values)
      const span = hi - lo || 1
      const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 4 - ((v - lo) / span) * (height - 8)])
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
      const area = line + ' L' + width + ',' + height + ' L0,' + height + ' Z'
      const gid = 'zw-kpi-' + String(color).replace('#', '')
      return h('svg', { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height, preserveAspectRatio: 'none', 'aria-hidden': true, style: { display: 'block' } },
        h('defs', null, h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: color, stopOpacity: .3 }),
          h('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }))),
        h('path', { d: area, fill: 'url(#' + gid + ')' }),
        h('path', { d: line, fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function Overview({ t, state, call, busy, navigate, openAccount }) {
      const s = state.summary, db = state.ledger, cur = s.baseCurrency
      const positiveTotal = s.accounts.reduce((sum, a) => sum + Math.max(0, a.valueBase || 0), 0)
      const history = (s.history || []).filter(x => x.baseCurrency === cur && Number.isFinite(x.totalValueBase))
      const histValues = history.map(x => x.totalValueBase)
      const lastV = histValues.length ? histValues[histValues.length - 1] : s.totalValueBase
      const prevV = histValues.length > 7 ? histValues[histValues.length - 8] : (histValues.length > 1 ? histValues[0] : null)
      const trend = prevV != null ? lastV - prevV : null
      const trendPct = prevV ? trend / prevV : null
      // 类型计数只统计实际存在的类型（与账户页分组一致，空分类不展示）。
      const typeCounts = ACCOUNT_GROUP_DEFS.map((def) => ({
        label: def.label,
        count: s.accounts.filter((a) => { const acc = db.accounts.find((x) => x.id === a.accountId); return accountGroup(acc && acc.type) === def.id }).length,
      })).filter((x) => x.count > 0)
      const [digest, setDigest] = React.useState(null)
      const todayKey = new Date().toISOString().slice(0, 10)
      // 每日提醒：当天首次打开时显示一次，点「知道了」后当天不再出现，次日自动恢复。
      const [digestHidden, setDigestHidden] = React.useState(() => {
        try { return localStorage.getItem('wealth-digest-dismissed') === todayKey } catch { return false }
      })
      const dismissDigest = () => {
        setDigestHidden(true)
        try { localStorage.setItem('wealth-digest-dismissed', todayKey) } catch { /* ignore */ }
      }
      React.useEffect(() => {
        let live = true
        fetch('/portfolio/api/digest?days=7', { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => { if (live && d.ok) setDigest(d) }).catch(() => {})
        return () => { live = false }
      }, [db.updatedAt])
      const pill = (up, text) => h('span', { style: { display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: (up ? t.green : t.red) + '18', color: up ? t.green : t.red } }, text)
      const kpi = (opts) => h('div', { style: { background: t.card, border: '1px solid ' + t.border, borderRadius: 20, padding: '16px 18px', boxShadow: t.shadow, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { width: 30, height: 30, borderRadius: 10, background: (opts.color || t.accent) + '16', color: opts.color || t.accent, display: 'grid', placeItems: 'center', flex: 'none' } }, h(NavIcon, { id: opts.icon, size: 16 })),
          h('span', { style: { fontSize: 11.5, color: t.sub, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, opts.label)),
        h('div', { style: { fontSize: opts.big ? 30 : 23, fontWeight: 780, letterSpacing: -.9, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: opts.valueColor || t.text } }, opts.value),
        opts.sub ? h('div', { style: { fontSize: 11.5, color: t.sub, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } }, opts.sub) : null,
        opts.spark ? h('div', { style: { marginTop: 'auto', paddingTop: 4 } }, opts.spark) : null)
      const pnlPct = s.totalCostBase > 0 ? s.totalPnlBase / s.totalCostBase : null
      const unknownCostWarnings = (s.warnings || []).filter(w => w && w.code === 'unknown-cost').length
      const digestLines = (digest && digest.lines) || []
      return h('div', null,
        (s.warnings || []).length ? h('details', { style: { background: t.red + '0d', border: '1px solid ' + t.red + '30', borderRadius: 14, padding: '10px 14px', marginBottom: 14, color: t.sub, fontSize: 12 } },
          h('summary', { style: { cursor: 'pointer', color: t.red, fontWeight: 650 } }, '估值提示 · ' + s.warnings.length + ' 项价格或汇率信息需要核对'),
          unknownCostWarnings ? h('div', { style: { marginTop: 8 } }, unknownCostWarnings + ' 条持仓成本未知，未计入成本与盈亏') : null,
          s.warnings.filter(w => !w || w.code !== 'unknown-cost').map((w, i) => { const position = db.holdings.find(p => p.id === w.holdingId); const ins = db.instruments.find(x => x.id === position?.instrumentId); return h('div', { key: i, style: { marginTop: 8 } }, (ins ? ins.name + ' · ' : '') + w.message) })) : null,
        h('div', { className: 'wealth-kpis' },
          kpi({ label: '总资产 · ' + cur, icon: 'holdings', value: fmtMoney(s.totalValueBase), big: true,
            sub: trend != null ? pill(trend >= 0, (trend >= 0 ? '▲ ' : '▼ ') + fmtMoney(Math.abs(trend)) + ' · ' + fmtPct(trendPct) + ' 近 7 天') : pill(s.totalPnlBase >= 0, (s.totalPnlBase >= 0 ? '▲ ' : '▼ ') + fmtPct(pnlPct)),
            spark: h(Spark, { t, values: histValues, color: t.accent }) }),
          kpi({ label: '持仓成本', icon: 'analysis', value: fmtMoney(s.totalCostBase), color: t.terra,
            sub: h('span', null, db.holdings.length + ' 项持仓 · ' + db.accounts.length + ' 个账户') }),
          kpi({ label: '浮动盈亏', icon: 'overview', value: fmtMoney(s.totalPnlBase), color: s.totalPnlBase >= 0 ? t.green : t.red, valueColor: s.totalPnlBase >= 0 ? t.green : t.red,
            sub: h('span', null, '成本回报 ' + fmtPct(pnlPct) + (s.holdingsWithoutCost ? ' · ' + s.holdingsWithoutCost + ' 条成本未知' : '')) }),
          kpi({ label: '账户 / 持仓', icon: 'accounts', value: db.accounts.length + ' / ' + db.holdings.length, color: t.accent2 || t.accent,
            sub: h('span', null, typeCounts.map((x) => x.count + ' ' + x.label).join(' · ')) })),
        h(DashboardCharts, { t, state, call, busy }),
        digest && !digestHidden ? h('div', { role: 'status', style: { display: 'flex', alignItems: 'flex-start', gap: 10, background: t.accentSoft || t.soft, border: '1px solid ' + t.accent + '30', borderRadius: 16, padding: '11px 15px', marginBottom: 16 } },
          h('span', { style: { color: t.accent, flex: 'none', marginTop: 1 } }, h(NavIcon, { id: 'spark', size: 17 })),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 10.5, fontWeight: 750, letterSpacing: .8, color: t.accent, marginBottom: 2 } }, '今日提醒' + (digest.date ? ' · ' + digest.date : '')),
            digestLines.length ? h('div', { style: { fontSize: 12.5, color: t.text, lineHeight: 1.7 } }, digestLines[0]) : null,
            digestLines.length > 1 ? h('div', { style: { fontSize: 11.5, color: t.sub, lineHeight: 1.7, marginTop: 2 } }, digestLines.slice(1).join(' · ')) : null),
          h('button', { style: { ...T.btn(t, false), padding: '3px 9px', fontSize: 11, minHeight: 26 }, onClick: dismissDigest }, '知道了')) : null,
        h('section', { style: { background: t.card, border: '1px solid ' + t.border, borderRadius: 20, padding: '16px 18px', boxShadow: t.shadow }, 'aria-label': '我的账户' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
            h('strong', { style: { fontSize: 15, fontWeight: 750, flex: 1 } }, '我的账户'),
            h('span', { style: { fontSize: 11, fontWeight: 700, color: t.accent, background: t.accentSoft || t.soft, borderRadius: 999, padding: '2px 9px' } }, db.accounts.length),
            h('button', { style: T.btn(t, false), onClick: () => navigate('accounts') }, '管理账户 ↗')),
          !s.accounts.length ? h('div', { className: 'wealth-empty' },
            h('span', { className: 'wealth-empty-mark' }, '▣'),
            h('strong', { style: { fontSize: 16, fontWeight: 500, color: t.text } }, '三步，拥有一个完整的资产管家'),
            h('div', { style: { display: 'grid', gap: 6, textAlign: 'left', maxWidth: 380, fontSize: 12, lineHeight: 1.7 } },
              h('div', null, h('strong', { color: t.text }, '① 连接券商'), '　同花顺投资账本 / 富途 / 长桥 / IB，一次登录自动同步账户、持仓与流水'),
              h('div', null, h('strong', { color: t.text }, '② 导入账单'), '　微信 / 支付宝 CSV 自动归类，补齐生活账本'),
              h('div', null, h('strong', { color: t.text }, '③ 问资产助手'), '　让 AI 核对数据、补录流水、生成分析与提醒')),
            h('button', { style: { ...T.btn(t, true), marginTop: 9 }, onClick: () => navigate('accounts') }, '开始 · 添加账户')) : s.accounts.map((a, i) => {
            const account = db.accounts.find(x => x.id === a.accountId)
            const share = positiveTotal ? Math.max(0, a.valueBase || 0) / positiveTotal * 100 : 0
            return h('div', { key: a.accountId, className: 'wealth-account-row', role: 'button', tabIndex: 0, title: '查看账户详情', style: { cursor: 'pointer' }, onClick: () => openAccount(a.accountId), onKeyDown: e => { if (e.key === 'Enter') openAccount(a.accountId) } },
              h('div', { className: 'wealth-account-badge', style: i % 2 ? { color: t.terra, background: t.panel } : {} }, (account?.name || '账').slice(0, 1)),
              h('div', null, h('div', { style: { fontSize: 13, fontWeight: 650 } }, account?.name || a.accountId), h('div', { style: { color: t.sub, fontSize: 11, marginTop: 3 } }, (account?.currency || cur) + ' · ' + a.holdings + ' 项持仓')),
              h('div', { className: 'wealth-account-allocation', style: { padding: '0 22px' } }, h('div', { style: { fontSize: 10, color: t.sub } }, '资产占比 ' + share.toFixed(1) + '%'), h('div', { className: 'wealth-bar' }, h('i', { style: { width: share + '%' } }))),
              h('div', { style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, h('strong', { style: { fontSize: 14, fontWeight: 650 } }, fmtMoney(a.valueBase, cur)), h('div', { style: { fontSize: 11, marginTop: 3, color: a.pnlBase >= 0 ? t.green : t.red } }, '浮盈 ' + fmtMoney(a.pnlBase, cur))))
          })))
    }
    function Analysis({ t, state, navigate, fixedAccounts, onBackfill }) {
      const [sel, setSel] = React.useState([])
      const [dim, setDim] = React.useState('class')
      const [scoped, setScoped] = React.useState(null), [scopeErr, setScopeErr] = React.useState('')
      const [fc, setFc] = React.useState(null), [fcErr, setFcErr] = React.useState('')
      const [perf, setPerf] = React.useState(null), [perfErr, setPerfErr] = React.useState('')
      const [bills, setBills] = React.useState(null), [billsErr, setBillsErr] = React.useState('')
      const [inf, setInf] = React.useState(null)
      const [thzScan, setThzScan] = React.useState(false), [thsAccountIds, setThsAccountIds] = React.useState([])
      // 同花顺股票账本：可深扫银证转账明细（asset_change 二分定位到日）。
      React.useEffect(() => {
        let live = true
        fetch('/portfolio/api/sources', { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => {
          if (!live || !d.ok) return
          setThsAccountIds((d.sources || []).filter(s => s.connector === 'ths' && String(s.thsBookType || 'common') === 'common' && s.accountId).map(s => s.accountId))
        }).catch(() => {})
        return () => { live = false }
      }, [])
      const runTransferScan = async () => {
        const scope = fixedAccounts || sel
        const targets = thsAccountIds.filter(id => !scope.length || scope.includes(id))
        if (!targets.length) return
        if (!window.confirm('回扫入金/出金明细：把「资金流动」区间总额二分定位到具体某天。首次全历史可能需要几分钟、几百个请求，之后每次同步只增量收尾。确认开始？')) return
        setThzScan(true)
        try {
          const results = []
          for (const accountId of targets) {
            const r = await fetch('/portfolio/api/transfers/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId, maxRequests: 600 }) })
            const d = await r.json()
            if (!r.ok || !d.ok) throw new Error((d.error && d.error.message) || '回扫失败')
            results.push(d)
          }
          const imported = results.reduce((s, d) => s + (d.imported || 0), 0)
          const requests = results.reduce((s, d) => s + (d.requests || 0), 0)
          const done = results.every(d => d.complete)
          window.alert('回扫完成：新增 ' + imported + ' 笔转账，共 ' + requests + ' 个请求' + (done ? '，全历史已扫完' : '，还有更早区间未扫完，可再次运行继续'))
          window.location.reload()
        } catch (err) { window.alert(err.message) } finally { setThzScan(false) }
      }
      const [billPrev, setBillPrev] = React.useState(null), [billMsg, setBillMsg] = React.useState(''), [billAccount, setBillAccount] = React.useState(''), [billBusy, setBillBusy] = React.useState(false)
      const perfAccount = fixedAccounts && fixedAccounts.length === 1 ? fixedAccounts[0] : null
      // 历史净值按分析范围取数：单账户、多账户合并、全部账户合并（空 = 全部）都支持。
      const perfScope = (fixedAccounts || sel).join(',')
      const loadBills = () => fetch('/portfolio/api/bills?months=12', { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => { if (d.ok) setBills(d); else setBillsErr(d.error?.message || '生活账单读取失败') }).catch(e => setBillsErr(e.message))
      const saveBudget = async (category, monthly) => {
        setBillBusy(true); setBillMsg('')
        try {
          const r = await fetch('/portfolio/api/op', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'budget.set', category, monthly }) })
          const d = await r.json()
          if (!r.ok || !d.ok) throw new Error((d.error && d.error.message) || '预算保存失败')
          await loadBills()
        } catch (err) { setBillMsg(err.message) } finally { setBillBusy(false) }
      }
      const pickBillFile = async (e) => {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        setBillBusy(true); setBillMsg(''); setBillPrev(null)
        try {
          const bytes = new Uint8Array(await file.arrayBuffer())
          let text
          try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { text = new TextDecoder('gbk').decode(bytes) }
          const r = await fetch('/portfolio/api/bills/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
          const d = await r.json()
          if (!r.ok || !d.ok) throw new Error((d.error && d.error.message) || '账单解析失败')
          setBillPrev({ ...d, text, fileName: file.name })
          if (!billAccount) setBillAccount((state.ledger.accounts.find(a => a.type === 'bank' || a.type === 'hand') || state.ledger.accounts[0] || {}).id || '')
          if (!d.counts || !d.counts.total) setBillMsg('没有识别到可导入的收支行，请确认是微信/支付宝导出的 CSV 账单')
        } catch (err) { setBillMsg(err.message) } finally { setBillBusy(false) }
      }
      const confirmBillImport = async () => {
        if (!billPrev) return
        if (!billAccount) { setBillMsg('请选择入账账户'); return }
        setBillBusy(true); setBillMsg('')
        try {
          const r = await fetch('/portfolio/api/bills/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId: billAccount, text: billPrev.text }) })
          const d = await r.json()
          if (!r.ok || !d.ok) throw new Error((d.error && d.error.message) || '导入失败')
          setBillMsg('已导入 ' + d.imported + ' 笔' + (d.duplicates ? '，跳过重复 ' + d.duplicates + ' 笔' : '') + (d.skipped ? '，忽略 ' + d.skipped + ' 行' : '') + '。可在「流水」里调整分类。')
          setBillPrev(null)
          await loadBills()
        } catch (err) { setBillMsg(err.message) } finally { setBillBusy(false) }
      }
      const key = (fixedAccounts || sel).join(',')
      React.useEffect(() => {
        if (!key) { setScoped(null); return }
        let live = true; setScopeErr('')
        fetch('/portfolio/api/analysis?accounts=' + encodeURIComponent(key), { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => { if (!live) return; if (d.ok) setScoped(d.analysis); else setScopeErr(d.error?.message || '分析读取失败') }).catch(e => { if (live) setScopeErr(e.message) })
        return () => { live = false }
      }, [key, state.ledger.updatedAt])
      // 推定入金：券商流水缺银证转账，用现金缺口给出下限估计（出金无法反推）。
      React.useEffect(() => {
        let live = true
        fetch('/portfolio/api/inferred-flows?accounts=' + encodeURIComponent(key), { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => { if (live && d.ok) setInf(d) }).catch(() => {})
        return () => { live = false }
      }, [key, state.ledger.updatedAt])
      // 预计收支按全账本推算（周期性流水是账户级事实，合并口径才有意义）。
      React.useEffect(() => {
        if (fixedAccounts) return
        let live = true
        fetch('/portfolio/api/forecast?days=30', { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => { if (!live) return; if (d.ok) setFc(d); else setFcErr(d.error?.message || '预计收支读取失败') }).catch(e => { if (live) setFcErr(e.message) })
        return () => { live = false }
      }, [state.ledger.updatedAt])
      // 生活账单汇总：与投资流水同一份归档，只统计已归类的生活收支。
      React.useEffect(() => {
        if (fixedAccounts) return
        loadBills()
      }, [state.ledger.updatedAt])
      // 历史净值回补：首次需要拉取历史行情，稍慢；之后走服务端缓存。
      React.useEffect(() => {
        let live = true; setPerfErr(''); setPerf(null)
        fetch('/portfolio/api/performance?accounts=' + encodeURIComponent(perfScope) + '&days=1095', { headers: { accept: 'application/json' } })
          .then(r => r.json()).then(d => { if (!live) return; if (d.ok) setPerf(d); else setPerfErr(d.error?.message || '历史净值读取失败') }).catch(e => { if (live) setPerfErr(e.message) })
        return () => { live = false }
      }, [perfScope, state.ledger.updatedAt])
      const a = key ? scoped : state.analysis
      const toggle = id => setSel(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
      const picker = fixedAccounts ? null : h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }, 'aria-label': '分析范围' },
        h('span', { style: { fontSize: 12, color: t.sub, marginRight: 4 } }, '分析范围'),
        h('button', { className: 'wealth-chip', 'aria-pressed': !sel.length, onClick: () => setSel([]) }, '全部账户合并'),
        state.ledger.accounts.map(acc => h('button', { key: acc.id, className: 'wealth-chip', 'aria-pressed': sel.includes(acc.id), onClick: () => toggle(acc.id) }, acc.name)),
        sel.length ? h('span', { style: { fontSize: 11, color: t.sub } }, '已选 ' + sel.length + ' 个账户合并分析') : null)
      if (!a) return h('div', null, picker, h('div', { className: 'wealth-empty', role: 'status' }, h('span', { className: 'wealth-empty-mark' }, '◔'), scopeErr || '分析层准备中…'))
      const p = a.performance || {}, f = a.flows || {}, q = a.quality || {}, nw = a.netWorth || {}, al = a.allocation || {}
      // 近 7 天到期提醒：来自周期性流水推算，不触发系统通知，只做界面提示。
      const soon = fc && fc.generatedFor ? (() => {
        const end = new Date(Date.parse(fc.generatedFor + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10)
        return (fc.series || []).filter(s => (s.dueDates || []).some(d => d >= fc.generatedFor && d <= end))
      })() : []
      const DIMS = { class: ['byClass', 'concentration', c => assetLabel(c.assetClass)], sector: ['bySector', 'sectorConcentration', c => c.sector], style: ['byStyle', 'styleConcentration', c => ({ growth: '成长', value: '价值', blend: '均衡', other: '其他' })[c.style] || c.style] }
      const [itemsKey, concKey, labelOf] = DIMS[dim] || DIMS.class
      const items = al[itemsKey] || []
      const conc = al[concKey] || {}
      // 资产负债表：credit 类账户是负债，其余是资产；口径与账户页分组一致。
      const summaryAccounts = state.summary.accounts || []
      const liabilities = summaryAccounts.filter(x => x.type === 'credit').reduce((s, x) => s + Math.abs(x.valueBase || 0), 0)
      const assets = summaryAccounts.filter(x => x.type !== 'credit').reduce((s, x) => s + Math.max(0, x.valueBase || 0), 0)
      const balanceSheet = !fixedAccounts
      // 同花顺「资金流动」累计转账：券商口径的银证转入/转出，优先于推定入金展示。
      const transferScope = fixedAccounts || sel
      const transfer = state.ledger.accounts.reduce((acc, x) => {
        if (transferScope.length && !transferScope.includes(x.id)) return acc
        if (x.currency !== a.baseCurrency) return acc
        const s = x.sourceTotals
        if (!s || (typeof s.transferIn !== 'number' && typeof s.transferOut !== 'number')) return acc
        acc.accounts += 1
        acc.names.push(x.name)
        acc.in += typeof s.transferIn === 'number' ? s.transferIn : 0
        acc.out += typeof s.transferOut === 'number' ? s.transferOut : 0
        if (typeof s.assetProfit === 'number') acc.profit += s.assetProfit
        if (s.transferTo && (!acc.to || s.transferTo > acc.to)) acc.to = s.transferTo
        return acc
      }, { accounts: 0, in: 0, out: 0, profit: 0, to: null, names: [] })
      const pct = (v, d = 2) => (typeof v === 'number' && Number.isFinite(v) ? (v > 0 ? '+' : '') + v.toFixed(d) + '%' : '—')
      const kpi = (label, value, sub, color) => h('div', { style: { ...T.card(t), flex: '1 1 150px', minWidth: 140 } },
        h('div', { style: { fontSize: 11, color: t.sub, letterSpacing: .3 } }, label),
        h('div', { style: { fontSize: 24, fontWeight: 600, margin: '6px 0 2px', fontVariantNumeric: 'tabular-nums', color: color || t.text } }, value),
        h('div', { style: { fontSize: 10.5, color: t.sub, lineHeight: 1.5 } }, sub || ''))
      const row = (label, value, tone) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid ' + t.border, fontSize: 12.5 } },
        h('span', { style: { color: t.sub } }, label), h('strong', { style: { color: tone || t.text, fontVariantNumeric: 'tabular-nums' } }, value))
      const tag = (text, color) => h('span', { style: { display: 'inline-block', padding: '2px 7px', borderRadius: 999, fontSize: 10.5, background: color || t.panel, color: t.sub, marginLeft: 6 } }, text)
      return h('div', null,
        picker,
        h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 } },
          kpi('时间加权收益 TWR', pct(p.twr && p.twr.value), p.twr && p.twr.value != null ? ('按外部现金流切段 · ' + (p.twr.periods || 0) + ' 段') : (p.twr && p.twr.reason) || '需要至少两天快照', (p.twr && p.twr.value) >= 0 ? t.green : t.red),
          kpi('资金加权年化 XIRR', pct(p.xirr && p.xirr.value), p.xirr && p.xirr.value != null ? '个人真实年化回报' : (p.xirr && p.xirr.reason) || '—', (p.xirr && p.xirr.value) >= 0 ? t.green : t.red),
          kpi('最大回撤', p.maxDrawdown && p.maxDrawdown.value != null ? pct(p.maxDrawdown.value) : '—', p.maxDrawdown && p.maxDrawdown.peakDate ? (p.maxDrawdown.peakDate + ' → ' + (p.maxDrawdown.troughDate || '—')) : (p.maxDrawdown && p.maxDrawdown.reason) || '', t.red),
          kpi('快照覆盖', (nw.snapshotCount || 0) + ' 天', (nw.spanDays ? '跨度 ' + nw.spanDays + ' 天 · ' : '') + '变动 ' + fmtMoney(nw.change) + ' ' + a.baseCurrency, t.text)),
        h('div', { style: { fontSize: 11, color: t.sub, margin: '-4px 0 16px', lineHeight: 1.6 } }, p.note || ''),
        perfScope !== undefined ? (() => {
          const rows = perf && perf.series && perf.series.length > 1 ? perf.series : []
          const step = Math.max(1, Math.ceil(rows.length / 240))
          const sampled = rows.filter((_, i) => i % step === 0).concat(rows.length && rows.length % step ? [rows[rows.length - 1]] : [])
          const vals = sampled.map(x => x.totalValueBase)
          const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || Math.max(hi * .05, 1)
          const pts = vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * 560 + 20, 150 - ((v - lo) / span) * 110])
          const m = perf && perf.metrics
          const scopeTag = perfAccount ? null : sel.length ? '已选 ' + sel.length + ' 个账户合并' : '全部账户合并'
          return h('section', { style: { ...T.card(t), marginBottom: 14 }, 'aria-label': '历史净值' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('strong', { style: { fontSize: 15 } }, '历史净值走势', h('span', { style: { fontWeight: 400, color: t.sub, fontSize: 11, marginLeft: 7 } }, '按流水 × 历史行情回补'),
                scopeTag ? h('span', { style: { fontWeight: 500, color: t.sub, fontSize: 11, marginLeft: 7 } }, scopeTag) : null),
              m ? h('span', { style: { fontSize: 11, color: t.sub } }, perf.from + ' → ' + perf.to + ' · ' + m.days + ' 个交易日') : null),
            perfErr ? h('div', { role: 'alert', style: { fontSize: 12, color: t.red } }, perfErr) :
            rows.length ? h('div', null,
              h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', margin: '2px 0 10px', fontSize: 12 } },
                h('span', null, '区间涨跌 ', h('strong', { style: { color: (m.change || 0) >= 0 ? t.green : t.red } }, fmtMoney(m.change) + ' ' + perf.baseCurrency + (m.changePct == null ? '' : '（' + (m.changePct > 0 ? '+' : '') + m.changePct + '%）'))),
                h('span', null, '最大回撤 ', h('strong', { style: { color: t.red } }, m.maxDrawdown && m.maxDrawdown.value != null ? m.maxDrawdown.value + '%' : '—'), m.maxDrawdown && m.maxDrawdown.peakDate ? h('small', { style: { color: t.sub } }, ' ' + m.maxDrawdown.peakDate.slice(5) + ' → ' + String(m.maxDrawdown.troughDate || '').slice(5)) : null),
                h('span', null, '期末 ', h('strong', null, fmtMoney(m.endValue) + ' ' + perf.baseCurrency))),
              h('svg', { viewBox: '0 0 600 170', role: 'img', 'aria-label': '历史净值曲线', style: { width: '100%', height: 190, display: 'block' } },
                [30, 85, 140].map(y => h('line', { key: y, x1: 20, y1: y, x2: 580, y2: y, stroke: t.border, strokeDasharray: '4 5' })),
                h('polygon', { points: '20,155 ' + pts.map(p => p.join(',')).join(' ') + ' 580,155', fill: t.accent, opacity: .08 }),
                h('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: t.accent, strokeWidth: 2, strokeLinejoin: 'round' }),
                h('text', { x: 20, y: 168, fill: t.sub, fontSize: 10.5 }, sampled[0].date), h('text', { x: 580, y: 168, textAnchor: 'end', fill: t.sub, fontSize: 10.5 }, sampled[sampled.length - 1].date)),
              h('div', { style: { fontSize: 10.5, color: t.sub, lineHeight: 1.7, marginTop: 6 } },
                '口径为每日市值：持仓由流水逆推，价格取历史收盘/净值；出入金与买卖会造成台阶，不等同投资收益率。'
                + (m && m.cashEstimated ? ' 现金流水不全（券商接口不含银证转账），负现金按推定入金修复，属估算。' : '')
                + ((perf.warnings || []).length ? ' · ' + perf.warnings.slice(0, 4).join('　') : ''))) :
            h('div', { style: { fontSize: 12, color: t.sub } }, '正在回补历史行情与流水…（首次可能需要几秒）'))
        })() : null,
        h('div', { className: 'wealth-split', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 } },
          h('section', { style: T.card(t), 'aria-label': '资金流' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } }, h('strong', { style: { fontSize: 15 } }, '资金流总览'), h('span', { style: { fontSize: 10.5, color: t.sub } }, '入金出金为外部现金流')),
            row('累计入金', fmtMoney(f.totals && f.totals.externalIn) + ' ' + a.baseCurrency, t.text),
            row('累计出金', fmtMoney(f.totals && f.totals.externalOut) + ' ' + a.baseCurrency, t.text),
            row('净流入', fmtMoney(f.totals && f.totals.netExternal) + ' ' + a.baseCurrency, (f.totals && f.totals.netExternal) >= 0 ? t.green : t.red),
            transfer.accounts ? row('入金（同花顺）', '+' + fmtMoney(transfer.in) + ' ' + a.baseCurrency, t.green) : null,
            transfer.accounts ? row('出金（同花顺）', '-' + fmtMoney(transfer.out) + ' ' + a.baseCurrency, t.red) : null,
            transfer.accounts && transfer.profit ? row('账户累计盈亏', fmtMoney(transfer.profit) + ' ' + a.baseCurrency, transfer.profit >= 0 ? t.green : t.red) : null,
            inf && inf.total > 0 && !transfer.accounts ? row('推定入金（下限估算）', '+' + fmtMoney(inf.total) + ' ' + a.baseCurrency, t.terra) : null,
            row('分红 / 利息', fmtMoney(f.totals && f.totals.dividends) + ' / ' + fmtMoney(f.totals && f.totals.interest), t.green),
            row('费用 / 税费', fmtMoney(f.totals && f.totals.fees) + ' / ' + fmtMoney(f.totals && f.totals.taxes), t.red),
            transfer.accounts ? h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8, lineHeight: 1.6 } }, '同花顺账户的入金/出金取自其「资金流动」累计值' + (transfer.names.length ? '（' + transfer.names.join('、') + '）' : '') + (transfer.to ? '，截至 ' + transfer.to : '') + '；富途/IB 等来源的转账以逐笔流水计入上方累计入金/出金。单笔时点可「回扫」或补录券商资金流水。') : null,
            (() => {
              const scope = fixedAccounts || sel
              const targets = thsAccountIds.filter(id => !scope.length || scope.includes(id))
              if (!targets.length) return null
              const cursors = state.ledger.accounts.filter(x => targets.includes(x.id) && x.transferScan?.coveredFrom)
              const scanned = cursors.length ? '已回扫至 ' + cursors.map(x => x.transferScan.coveredFrom + (x.transferScan.complete ? '（全历史）' : '')).join('、') + '；' : ''
              return h('div', { style: { marginTop: 8 } },
                h('button', { style: { ...T.btn(t, false) }, disabled: thzScan, onClick: runTransferScan }, thzScan ? '回扫中…（可能需要几分钟）' : '回扫入金/出金明细 ↗'),
                cursors.length ? h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 6, lineHeight: 1.6 } }, scanned + '回扫后每次同步自动增量收尾。') : null)
            })(),
            inf && inf.total > 0 && !transfer.accounts ? h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8, lineHeight: 1.6 } }, '推定入金按现金缺口估算（券商流水不含银证转账）；出金与转账时点无法反推，补录银行流水后更准确。') : null,
            f.unknownCashRows ? h('div', { style: { fontSize: 10.5, color: t.terra, marginTop: 8 } }, '⚠ ' + f.unknownCashRows + ' 条流水缺少金额，以上为下限估算') : null),
          h('section', { style: T.card(t), 'aria-label': '配置与集中度' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap' } },
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, [['class', '资产类别'], ['sector', '行业'], ['style', '风格']].map(([v, n]) => h('button', { key: v, className: 'wealth-chip', 'aria-pressed': dim === v, onClick: () => setDim(v) }, n))),
              h('span', { style: { fontSize: 10.5, color: t.sub } }, 'HHI ' + (conc.hhi == null ? '—' : conc.hhi.toFixed(3)) + ' · 最大 ' + (conc.top1 == null ? '—' : conc.top1 + '%'))),
            items.length ? items.map((c, i) => h('div', { key: i, style: { marginBottom: 9 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 } }, h('span', null, labelOf(c)), h('span', { style: { color: t.sub, fontVariantNumeric: 'tabular-nums' } }, ((c.weight || 0) * 100).toFixed(1) + '%')),
              h('div', { className: 'wealth-bar' }, h('i', { style: { width: ((c.weight || 0) * 100) + '%' } })))) : h('div', { style: { fontSize: 12, color: t.sub } }, dim === 'class' ? '暂无持仓分类' : '还没有行业 / 风格分类；在持仓编辑里补充，或让 AI 助手为标的分类。'),
            conc.top3 != null ? h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, '前三合计 ' + conc.top3 + '% · 篮子 ' + conc.count + ' 类') : null),
          balanceSheet ? h('section', { style: T.card(t), 'aria-label': '资产负债表' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } }, h('strong', { style: { fontSize: 15 } }, '资产负债表'), h('span', { style: { fontSize: 10.5, color: t.sub } }, '按当前估值 · ' + a.baseCurrency)),
            row('资产合计', fmtMoney(assets) + ' ' + a.baseCurrency, t.text),
            (al.byClass || []).map((c, i) => row('　' + assetLabel(c.assetClass), fmtMoney(c.valueBase) + ' · ' + ((c.weight || 0) * 100).toFixed(1) + '%', t.sub)),
            row('负债合计（信用卡 / 借款）', fmtMoney(liabilities) + ' ' + a.baseCurrency, liabilities ? t.terra : t.sub),
            row('净资产', fmtMoney(assets - liabilities) + ' ' + a.baseCurrency, t.text),
            h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, '负债按正市值绝对值计入；净资产 = 资产 − 负债。历史净资产走势见「总览」的快照曲线。')) : null),
        h('section', { style: T.card(t), 'aria-label': '年度现金流' },
          h('strong', { style: { fontSize: 15 } }, '年度现金流', h('span', { style: { fontWeight: 400, color: t.sub, fontSize: 11, marginLeft: 7 } }, '按年份汇总')),
          (f.byYear || []).length ? h('div', { style: { marginTop: 8, overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
              h('thead', null, h('tr', null, ['年份', '入金', '出金', '买入', '卖出', '分红', '利息', '费用', '税费', '其他'].map((h2) => h('th', { key: h2, style: { textAlign: h2 === '年份' ? 'left' : 'right', padding: '6px 8px', color: t.sub, fontWeight: 500, borderBottom: '1px solid ' + t.border, whiteSpace: 'nowrap' } }, h2)))),
              h('tbody', null, (f.byYear || []).map((y) => h('tr', { key: y.year }, [y.year, y.externalIn, y.externalOut, y.buy, y.sell, y.dividends, y.interest, y.fees, y.taxes, y.other].map((v, i) => h('td', { key: i, style: { textAlign: i ? 'right' : 'left', padding: '6px 8px', borderBottom: '1px solid ' + t.border, fontVariantNumeric: 'tabular-nums', color: i ? t.text : t.sub } }, i ? fmtMoney(v) : v))))))) : h('div', { style: { fontSize: 12, color: t.sub, marginTop: 8 } }, '还没有归档流水，导入历史后这里会按年份汇总。')),
        !fixedAccounts ? h('section', { style: { ...T.card(t), marginTop: 14 }, 'aria-label': '预计收支' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8, flexWrap: 'wrap' } },
            h('strong', { style: { fontSize: 15 } }, '预计收支', h('span', { style: { fontWeight: 400, color: t.sub, fontSize: 11, marginLeft: 7 } }, '未来 30 天 · 按周期性流水推算')),
            fc && fc.projection ? h('span', { style: { fontSize: 10.5, color: t.sub } }, '预计支出 ' + fmtMoney(fc.projection.outBase) + ' · 预计收入 ' + fmtMoney(fc.projection.inBase) + ' · ' + a.baseCurrency) : null),
          fcErr ? h('div', { style: { fontSize: 12, color: t.terra } }, fcErr) :
          !fc ? h('div', { style: { fontSize: 12, color: t.sub } }, '推算中…') :
          fc.series && fc.series.length ? h('div', null,
            fc.series.map((s) => h('div', { key: s.key, style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid ' + t.border, fontSize: 12.5, flexWrap: 'wrap' } },
              h('span', { style: { color: t.text } }, s.label, h('small', { style: { display: 'block', color: t.sub } }, [s.cadenceLabel, s.accountName, '已发生 ' + s.occurrences + ' 次'].filter(Boolean).join(' · '))),
              h('span', { style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } },
                h('strong', { style: { color: s.inflow ? t.green : t.text } }, fmtMoney(s.medianAmountBase, a.baseCurrency) + (s.dueInHorizon > 1 ? ' × ' + s.dueInHorizon : '')),
                h('small', { style: { display: 'block', color: t.sub } }, '下次 ' + s.nextDue)))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 13 } },
              h('strong', null, '净 ' + fmtMoney(fc.projection.netBase, a.baseCurrency)),
              h('span', { style: { color: t.sub, fontSize: 11 } }, '共 ' + fc.projection.count + ' 笔 · 中位数估算，非保证')),
            soon.length ? h('div', { style: { marginTop: 8, fontSize: 11.5, color: t.terra } }, '⏰ 近 7 天：' + soon.map(s => s.label + ' ' + fmtMoney(s.medianAmountBase, a.baseCurrency)).join('　')) : null) :
          h('div', { style: { fontSize: 12, color: t.sub, lineHeight: 1.6 } }, '还没有识别到周期性收支。同一事项（如每月定投、房租、工资）按相同方向记录 3 次以上，就会在这里推算未来 30 天的预计支出与收入。'),
          (fc && (fc.warnings || []).length) ? h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, fc.warnings.map(w => '· ' + w).join('　')) : null) : null,
        !fixedAccounts ? h('section', { style: { ...T.card(t), marginTop: 14 }, 'aria-label': '生活账单' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
            h('strong', { style: { fontSize: 15 } }, '生活账单', h('span', { style: { fontWeight: 400, color: t.sub, fontSize: 11, marginLeft: 7 } }, '近 12 个月 · 按分类')),
            bills && bills.totals ? h('span', { style: { fontSize: 10.5, color: t.sub } }, '支出 ' + fmtMoney(bills.totals.out) + ' · 收入 ' + fmtMoney(bills.totals.in) + ' · ' + bills.baseCurrency) : null),
          h('div', null,
            billsErr ? h('div', { style: { fontSize: 12, color: t.terra } }, billsErr) :
            !bills ? h('div', { style: { fontSize: 12, color: t.sub } }, '读取中…') :
            !(bills && bills.categories && bills.categories.length) ? h('div', { style: { fontSize: 12, color: t.sub, lineHeight: 1.7 } }, '还没有归类的生活账单。用下方「导入微信 / 支付宝账单」自动归类，或在「流水」里给入金 / 出金选择分类（餐饮、居住、交通…）。') :
            h('div', null,
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 } },
                h('div', null,
                  h('div', { style: { fontSize: 11, color: t.sub, marginBottom: 6 } }, '近 12 个月分类'),
                  bills.categories.map((c) => h('div', { key: c.category, style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid ' + t.border, fontSize: 12.5 } },
                    h('span', null, c.label, h('small', { style: { color: t.sub, marginLeft: 6 } }, c.count + ' 笔')),
                    h('strong', { style: { fontVariantNumeric: 'tabular-nums', color: t.text } }, fmtMoney(c.out) + (c.in ? ' / +' + fmtMoney(c.in) : '')))),
                  (bills.budgetStatus || []).length ? h('div', { style: { marginTop: 10 } },
                    h('div', { style: { fontSize: 11, color: t.sub, marginBottom: 6 } }, '本月预算 · ' + bills.currentMonth),
                    bills.budgetStatus.map((b2) => h('div', { key: b2.category, style: { marginBottom: 8 } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5 } },
                        h('span', null, b2.label, b2.over ? h('small', { style: { color: t.red, marginLeft: 6 } }, '超支') : null),
                        h('span', { style: { color: b2.over ? t.red : t.sub, fontVariantNumeric: 'tabular-nums' } }, fmtMoney(b2.spent) + ' / ' + fmtMoney(b2.monthly))),
                      h('div', { className: 'wealth-bar' }, h('i', { style: { width: Math.min(100, Math.max(0, b2.pct)) + '%', background: b2.over ? t.red : b2.pct >= 80 ? t.terra : undefined } }))))) : null,
                  h('details', { style: { marginTop: 10, fontSize: 11.5 } },
                    h('summary', { style: { cursor: 'pointer', color: t.sub } }, '设置月度预算'),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6, marginTop: 8 } },
                      Object.entries(LIFE_CATEGORIES).map(([cat, label]) => {
                        const current = (bills.budgetStatus || []).find((b2) => b2.category === cat)
                        return h('label', { key: cat, style: { display: 'flex', gap: 6, alignItems: 'center' } },
                          h('span', { style: { color: t.sub, minWidth: 52 } }, label),
                          h('input', { type: 'number', min: 0, defaultValue: current ? String(current.monthly) : '', placeholder: '不限', disabled: billBusy,
                            onBlur: (e) => { const v = e.target.value.trim(); if ((current ? String(current.monthly) : '') !== v) saveBudget(cat, v === '' ? null : Number(v)) },
                            style: { ...T.input(t), width: 92 } }))
                      })))),
                h('div', null,
                  h('div', { style: { fontSize: 11, color: t.sub, marginBottom: 6 } }, '按月'),
                  h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 } },
                    h('thead', null, h('tr', null, ['月份', '支出', '收入', '净'].map((h2, i) => h('th', { key: h2, style: { textAlign: i ? 'right' : 'left', padding: '4px 6px', color: t.sub, fontWeight: 500, borderBottom: '1px solid ' + t.border } }, h2)))),
                    h('tbody', null, (bills.months || []).filter((m2) => m2.count).slice(-8).map((m2) => h('tr', { key: m2.month },
                      h('td', { style: { padding: '4px 6px', color: t.sub } }, m2.month), h('td', { style: { textAlign: 'right', padding: '4px 6px', fontVariantNumeric: 'tabular-nums' } }, fmtMoney(m2.out)),
                      h('td', { style: { textAlign: 'right', padding: '4px 6px', fontVariantNumeric: 'tabular-nums' } }, fmtMoney(m2.in)), h('td', { style: { textAlign: 'right', padding: '4px 6px', fontVariantNumeric: 'tabular-nums', color: m2.net >= 0 ? t.green : t.red } }, fmtMoney(m2.net))))))))),
              bills.uncategorized ? h('div', { style: { fontSize: 10.5, color: t.terra, marginTop: 8 } }, '另有 ' + bills.uncategorized + ' 笔入金 / 出金尚未归类，可在「流水」里逐笔补选，或用 AI 助手批量归类。') : null,
              h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, '生活账单与投资流水共用同一份归档：每笔只记一次，分类只影响汇总口径。')),
            h('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + t.border } },
              h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 } },
                h('label', { style: { ...T.btn(t, false), cursor: 'pointer', display: 'inline-block' } }, billBusy ? '处理中…' : '导入微信 / 支付宝账单',
                  h('input', { type: 'file', accept: '.csv,text/csv', style: { display: 'none' }, onChange: pickBillFile, disabled: billBusy })),
                billPrev
                  ? h('span', { style: { color: t.sub } }, (billPrev.provider === 'wechat' ? '微信' : billPrev.provider === 'alipay' ? '支付宝' : '账单') + '：' + billPrev.counts.total + ' 行 · 支出 ' + fmtMoney(billPrev.totals.out) + ' · 收入 ' + fmtMoney(billPrev.totals.in) + (billPrev.counts.skipped ? ' · 忽略 ' + billPrev.counts.skipped + ' 行' : ''))
                  : h('span', { style: { color: t.sub } }, '在微信「账单 → 常见问题 → 下载账单」或支付宝「导出交易记录」得到 CSV，导入后自动建议分类，可再调整。')),
              billPrev ? h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 } },
                h('select', { 'aria-label': '账单入账账户', value: billAccount, onChange: (e) => setBillAccount(e.target.value), style: { ...T.input(t), width: 'auto', fontSize: 12 } },
                  state.ledger.accounts.map((acc2) => h('option', { key: acc2.id, value: acc2.id }, acc2.name))),
                h('button', { style: T.btn(t, true), disabled: billBusy || !billAccount, onClick: confirmBillImport }, '确认导入'),
                h('button', { style: T.btn(t, false), onClick: () => { setBillPrev(null); setBillMsg('') } }, '取消'),
                (billPrev.categories || []).length ? h('span', { style: { fontSize: 10.5, color: t.sub } }, '分类建议：' + billPrev.categories.slice(0, 5).map((c) => c.label + ' ' + fmtMoney(c.amount)).join('　')) : null) : null,
              billMsg ? h('div', { role: 'status', style: { fontSize: 11.5, color: billMsg.startsWith('已导入') ? t.green : t.red, marginTop: 6 } }, billMsg) : null))) : null,
        h('section', { style: { ...T.card(t), marginTop: 14 }, 'aria-label': '数据健康' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } }, h('strong', { style: { fontSize: 15 } }, '数据健康'), h('span', { style: { fontSize: 10.5, color: t.sub } }, '决定指标可信度')),
          h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: t.sub, marginBottom: 8 } },
            h('span', null, '快照 ' + (q.snapshotCount || 0) + ' 天'),
            h('span', null, '无现价 ' + (q.unpricedHoldings || 0) + ' 条'),
            h('span', null, '未计入 ' + (q.excludedHoldings || 0) + ' 条'),
            h('span', null, '缺金额流水 ' + (q.unknownCashFlows || 0) + ' 条'),
            h('span', null, '历史批次 ' + (q.historyBatches || 0) + (q.incompleteBatches ? ' · 覆盖不全 ' + q.incompleteBatches : ''))),
          (q.warnings || []).length ? q.warnings.map((w, i) => h('div', { key: i, style: { fontSize: 11.5, color: t.terra, padding: '4px 0', borderTop: i ? '1px solid ' + t.border : 'none' } }, '⚠ ' + w)) : h('div', { style: { fontSize: 11.5, color: t.green } }, '✓ 暂无明显数据缺口'),
          h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, '口径：持仓=快照事实，流水=历史事实；分析只读，不改动账本。'),
          onBackfill ? h('button', { style: { ...T.btn(t, false), marginTop: 10 }, onClick: onBackfill }, '补录账单 ↗') : navigate ? h('button', { style: { ...T.btn(t, false), marginTop: 10 }, onClick: () => navigate('accounts') }, '到账户中同步或补录流水 ↗') : null))
    }
    function assetLabel(cls) {
      return ({ stock: '股票', fund: '基金', etf: 'ETF', cash: '现金', bond: '债券', crypto: '加密资产', other: '其他' })[cls] || cls || '其他'
    }
    // 与 symbols.mjs identityKey 同规则（客户端无模块导入，就地实现）：跨账户合并持仓按统一代码归并。
    function identityKeyOf(ins) {
      if (!ins) return ''
      const raw = String(ins.symbol || '').trim()
      const m = String(ins.market || '').trim().toUpperCase()
      let symbol = raw
      if (m === 'HK') {
        const code = raw.replace(/^HK(EX)?[.:]/i, '').replace(/\.HK$/i, '').replace(/^0+/, '')
        symbol = /^\d{1,5}$/.test(code) ? code.padStart(5, '0') : raw.toUpperCase()
      } else if (m === 'CN' || m === 'FUND') {
        const code = raw.replace(/^(SH|SZ)[.:]?/i, '')
        symbol = /^\d{6}$/.test(code) ? code : raw
      } else if (m === 'US') {
        symbol = raw.replace(/^US[.:]/i, '').toUpperCase()
      } else {
        symbol = raw.toUpperCase()
      }
      return m + '|' + symbol
    }
    function Settings({ t, state, call, busy, reload }) {
      const db = state.ledger, cur = db.baseCurrency
      const [baseSel, setBaseSel] = React.useState(cur)
      React.useEffect(() => { setBaseSel(cur) }, [cur])
      const [fxEdit, setFxEdit] = React.useState({ cur: '', rate: '' })
      const thsData = state.dataSource?.thsData || {}
      const westock = state.dataSource?.westock || {}
      const [dataToken, setDataToken] = React.useState('')
      const [dataNote, setDataNote] = React.useState(null)
      const [savingData, setSavingData] = React.useState(false)
      const [wAuthUrl, setWAuthUrl] = React.useState('')
      const [wBusy, setWBusy] = React.useState(false)
      const [wNote, setWNote] = React.useState(null)
      const [wProtocol, setWProtocol] = React.useState(!!westock.protocol)
      React.useEffect(() => { setWProtocol(!!westock.protocol) }, [westock.protocol])
      React.useEffect(() => {
        if (!wAuthUrl || westock.configured) return undefined
        const timer = setInterval(async () => {
          try {
            const r = await getJson('settings/westock/status')
            if (r.status === 'ready') {
              setWAuthUrl('')
              setWNote({ ok: true, text: '已连接腾讯自选股，沪深 / 港股行情将优先使用该数据源。' })
              await reload?.()
            } else if (r.status === 'error' || r.status === 'timeout') {
              setWAuthUrl('')
              setWNote({ ok: false, text: r.message || '授权失败' })
            }
          } catch { /* 下一个轮询周期再试 */ }
        }, 1500)
        return () => clearInterval(timer)
      }, [wAuthUrl, westock.configured, reload])
      const unregisterWestockProtocol = async () => {
        if (wBusy) return
        setWBusy(true); setWNote(null)
        try {
          await post('settings/westock/unregister-protocol', {})
          setWProtocol(false)
          setWNote({ ok: true, text: '已还原 workbuddy:// 协议处理。' })
          await reload?.()
        } catch (e) { setWNote({ ok: false, text: e.message }) }
        finally { setWBusy(false) }
      }
      const startWestock = async () => {
        if (wBusy) return
        setWBusy(true); setWNote(null)
        try { const r = await post('settings/westock/start', {}); setWAuthUrl(r.authorizeUrl); setWNote({ ok: true, text: '已打开授权页。用 QQ / 手机号 / 微信登录并同意，完成后会自动回到本机，不用复制地址。' }) }
        catch (e) { setWNote({ ok: false, text: e.message }) }
        finally { setWBusy(false) }
      }
      const disconnectWestock = async () => {
        if (wBusy) return
        setWBusy(true); setWNote(null)
        try { await post('settings/westock/disconnect', {}); setWNote({ ok: true, text: '已断开腾讯自选股，行情回落同花顺数据 / 东方财富。' }); await reload?.() }
        catch (e) { setWNote({ ok: false, text: e.message }) }
        finally { setWBusy(false) }
      }
      const saveDataToken = async (value) => {
        if (savingData) return
        setSavingData(true); setDataNote(null)
        try {
          const r = await post('settings/data-source', { token: value })
          setDataNote({ ok: true, text: r.thsData.configured ? '已保存并验证 API Key，历史净值 / 日线将优先使用同花顺数据。' : '已清除 API Key，历史行情回落东方财富公开接口。' })
          setDataToken('')
          await reload?.()
        } catch (e) { setDataNote({ ok: false, text: e.message }) }
        finally { setSavingData(false) }
      }
      return h('div', null,
        h('h2', { style: { fontSize: 17, margin: '0 0 8px' } }, '设置'),
        h('p', { style: { color: t.sub, fontSize: 12, marginBottom: 16 } }, '管理本位币与手工汇率，资产估值将统一折算为所选本位币。'),
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' } },
            h('div', null, h('label', { style: T.label(t) }, '本位币'), h('select', { value: baseSel, onChange: (e) => setBaseSel(e.target.value), style: { ...T.input(t), width: 120 } },
              [...new Set(['CNY', 'HKD', 'USD', ...Object.keys(db.fx)])].map((c) => h('option', { key: c, value: c }, c)))),
            h('button', { style: T.btn(t, false), disabled: busy, onClick: () => call('base.set', { currency: baseSel }) }, '设为本位币'),
            h('div', { style: { width: 1, height: 28, background: t.border } }),
            h('div', null, h('label', { style: T.label(t) }, '币种'), h('select', { value: fxEdit.cur, onChange: (e) => setFxEdit({ ...fxEdit, cur: e.target.value }), 'aria-label': '汇率币种', style: { ...T.input(t), width: 130 } },
              [['', '请选择'], ...currencyOptions(Object.keys(db.fx || {}))].map(([v, l]) => h('option', { key: v, value: v }, l)))),
            h('div', null, h('label', { style: T.label(t) }, '汇率(1单位=?' + cur + ')'), h('input', { value: fxEdit.rate, onChange: (e) => setFxEdit({ ...fxEdit, rate: e.target.value }), placeholder: '0.92', style: { ...T.input(t), width: 110 } })),
            h('button', { style: T.btn(t, false), disabled: busy, onClick: async () => { await call('fx.set', { currency: fxEdit.cur, rate: Number(fxEdit.rate) }); setFxEdit({ cur: '', rate: '' }) } }, '保存汇率'),
          ),
          h('div', { style: { marginTop: 10, fontSize: 12, color: t.sub } }, '当前汇率：' + Object.entries(db.fx).map(([c, r]) => c + '→' + cur + ' ' + r).join('　')),
        ),
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
            h('strong', { style: { fontSize: 14 } }, '腾讯自选股（行情数据源）'),
            h('span', { style: { fontSize: 11, color: westock.configured ? t.green : t.sub } }, westock.configured ? '● 已连接' : '○ 未连接')),
          h('p', { style: { color: t.sub, fontSize: 11.5, lineHeight: 1.65, margin: '0 0 10px' } },
            '授权后沪深 / 港股日线优先走腾讯自选股官方接口（免费，前复权口径），覆盖比东方财富更稳；场外基金净值与未覆盖标的自动回落同花顺数据 / 东方财富。授权只需一次，token 过期自动续期。'),
          westock.configured
            ? h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('button', { style: T.btn(t, false), disabled: busy || wBusy, onClick: disconnectWestock }, '断开连接'),
                wProtocol ? h('button', { style: T.btn(t, false), disabled: busy || wBusy, onClick: unregisterWestockProtocol }, '还原 workbuddy 协议') : null)
            : h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
                h('button', { style: T.btn(t, true), disabled: busy || wBusy, onClick: startWestock }, wBusy ? '请稍候…' : '① 发起授权'),
                wAuthUrl ? h('a', { href: wAuthUrl, target: '_blank', rel: 'noreferrer', style: { ...T.btn(t, false), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '② 打开授权页面 ↗') : null,
                ),
          wAuthUrl ? h('p', { style: { marginTop: 8, fontSize: 11, color: t.sub, lineHeight: 1.6 } }, '如果浏览器没有自动打开，点右边的链接。同意授权后页面会跳回本机，这里会自动变成已连接。') : null,
          wNote ? h('div', { role: wNote.ok ? 'status' : 'alert', style: { marginTop: 8, fontSize: 11.5, color: wNote.ok ? t.green : t.red } }, wNote.text) : null,
        ),
        h('div', { style: { ...T.card(t), marginBottom: 14 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
            h('strong', { style: { fontSize: 14 } }, '行情与净值数据源'),
            h('span', { style: { fontSize: 11, color: thsData.configured ? t.green : t.sub } }, thsData.configured ? '● 同花顺数据已启用' : '○ 未配置，使用东方财富公开接口')),
          h('p', { style: { color: t.sub, fontSize: 11.5, lineHeight: 1.65, margin: '0 0 10px' } },
            '填入同花顺金融数据 API Key 后，历史日线与基金净值优先走该接口（覆盖沪深股票、ETF 与场外基金；港股仍用东方财富）。历史数据缓存在本机，之后只增量同步最新部分，不会每天整段重拉。未配置或接口失败时自动回落东方财富。'),
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' } },
            h('div', { style: { flex: '1 1 260px' } },
              h('label', { style: T.label(t) }, '同花顺金融数据 API Key'),
              h('input', { type: 'password', autoComplete: 'off', value: dataToken, onChange: (e) => setDataToken(e.target.value), placeholder: thsData.configured ? '已保存 · 输入新 Key 可替换' : '粘贴 API Key', style: T.input(t) })),
            h('button', { style: T.btn(t, true), disabled: busy || savingData || !dataToken.trim(), onClick: () => saveDataToken(dataToken.trim()) }, savingData ? '验证中…' : '保存并验证'),
            thsData.configured ? h('button', { style: T.btn(t, false), disabled: busy || savingData, onClick: () => saveDataToken('') }, '清除') : null,
          ),
          h('div', { style: { marginTop: 8, fontSize: 11, color: t.sub } },
            h('a', { href: thsData.adminUrl || 'https://fuyao.aicubes.cn/admin', target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '签发 / 管理 API Key ↗'), '　·　同花顺金融数据 API（fuyao.aicubes.cn）'),
          dataNote ? h('div', { role: dataNote.ok ? 'status' : 'alert', style: { marginTop: 8, fontSize: 11.5, color: dataNote.ok ? t.green : t.red } }, dataNote.text) : null,
        ),
      )
    }

    // ---------- shared UI pieces ----------
    function Modal({ t, title, onClose, children, wide }) {
      React.useEffect(() => { const k = e => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
      return h('div', { className: 'wealth-modal-backdrop' },
        h('div', { className: 'wealth-modal', role: 'dialog', 'aria-modal': true, 'aria-label': title, style: wide ? { width: 'min(980px,100%)' } : undefined },
          h('div', { className: 'wealth-modal-head' }, h('strong', { style: { fontSize: 17, fontWeight: 600 } }, title), h('button', { style: T.btn(t, false), onClick: onClose, 'aria-label': '关闭' }, '✕')),
          children))
    }
    async function getJson(path) {
      const r = await fetch('/portfolio/api/' + path, { headers: { accept: 'application/json' } })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error?.message || '读取失败')
      return d
    }
    const CONNECTOR_LABEL = { ths: '同花顺投资账本', futu: '富途', longbridge: '长桥', qieman: '且慢', tiger: '老虎证券', fosun: '复星证券', ib: 'Interactive Brokers', custom: '高级接口' }
    // 币种一律从有限集合里选，避免手输产生 CNH/CNY、小写、拼写错误等脏数据。
    const CURRENCY_OPTIONS = [['CNY', 'CNY 人民币'], ['HKD', 'HKD 港币'], ['USD', 'USD 美元'], ['CNH', 'CNH 离岸人民币'], ['SGD', 'SGD 新加坡元'], ['EUR', 'EUR 欧元'], ['JPY', 'JPY 日元'], ['GBP', 'GBP 英镑'], ['AUD', 'AUD 澳元'], ['CAD', 'CAD 加元'], ['CHF', 'CHF 瑞郎']]
    const currencyOptions = (extra = []) => {
      const base = CURRENCY_OPTIONS.map(([v, l]) => [v, l])
      const seen = new Set(base.map(([v]) => v))
      return [...base, ...[...new Set((extra || []).filter(Boolean))].filter((v) => !seen.has(v)).map((v) => [v, v])]
    }
    // 与 symbols.mjs normalizeSymbol 同规则：统计视图按统一代码归并，记录本身保持分开。
    const normSym = (symbol, market) => {
      const raw = String(symbol || '').trim(), m = String(market || '').trim().toUpperCase()
      if (!raw) return { symbol: '', market: m }
      if (m === 'HK') {
        const code = raw.replace(/^HK(EX)?[.:]/i, '').replace(/\.HK$/i, '').replace(/^0+/, '')
        return { symbol: /^\d{1,5}$/.test(code) ? code.padStart(5, '0') : raw.toUpperCase(), market: m }
      }
      if (m === 'CN' || m === 'FUND') {
        const code = raw.replace(/^(SH|SZ)[.:]?/i, '')
        return { symbol: /^\d{6}$/.test(code) ? code : raw, market: m }
      }
      if (m === 'US') return { symbol: raw.replace(/^US[.:]/i, '').toUpperCase(), market: m }
      return { symbol: raw.toUpperCase(), market: m }
    }
    const symKey = (symbol, market) => { const n = normSym(symbol, market); return n.market + '|' + n.symbol }
    const ADD_METHODS = [
      ['ths', '同花顺', '投资账本 · 股票与爱基金 / 基金账本', '同'],
      ['futu', '富途', '官方 MCP 浏览器授权', '富'],
      ['longbridge', '长桥', '官方 MCP 授权码', '长'],
      ['qieman', '且慢', '盈米官方 MCP · 长期 API Key', '且'],
      ['tiger', '老虎证券', '官方远程 MCP · 浏览器授权', '虎'],
      ['fosun', '复星证券', '星财富 OpenAPI · 长期密钥', '复'],
      ['ib', 'Interactive Brokers', 'Client Portal Gateway', 'IB'],
      ['manual', '手动添加', '自己录入持仓和流水', '✎'],
      ['file', '文件导入', 'CSV / TSV 表格', '↥'],
      ['custom', '高级 API / MCP', '标准化快照接口', '⌘'],
    ]
    const ADD_GROUPS = [
      { key: 'sync', title: '登录券商，自动同步', note: '一次登录 / 授权就是一个账号，下面列出它的全部子账户。', ids: ['ths', 'futu', 'longbridge', 'qieman', 'tiger', 'fosun', 'ib'] },
      { key: 'manual', title: '手工添加与导入', note: '自己录入，或从文件、接口导入已有数据。', ids: ['manual', 'file', 'custom'] },
    ]
    function useSources() {
      const [sources, setSources] = React.useState([])
      const [authorizations, setAuthorizations] = React.useState([])
      const refresh = React.useCallback(() => getJson('sources').then(r => { setSources(r.sources || []); setAuthorizations(r.authorizations || []); return r }).catch(() => null), [])
      React.useEffect(() => { refresh(); const timer = setInterval(() => { if (!document.hidden) refresh() }, 15000); return () => clearInterval(timer) }, [refresh])
      return [sources, refresh, authorizations]
    }
    function useAccountSync(reload, refreshSources) {
      const [syncing, setSyncing] = React.useState(''), [note, setNote] = React.useState(null)
      const run = async account => {
        if (syncing) return
        setSyncing(account.id); setNote(null)
        try {
          const r = await post('accounts/sync', { accountId: account.id })
          const hs = r.history
          const flow = r.historyError ? '流水同步失败：' + (r.historyError.message || r.historyError) : !hs ? '' : hs.skipped ? '流水：' + (hs.reason || '此来源暂不支持自动读取流水，可在「补录账单」导入') : '流水新增 ' + (hs.imported || 0) + ' 条' + (hs.duplicates ? '、已有 ' + hs.duplicates + ' 条' : '') + (hs.observedFrom ? '（' + hs.observedFrom + ' ～ ' + hs.observedTo + '）' : '')
          setNote({ ok: true, text: '「' + account.name + '」已同步到最新：持仓已更新' + (flow ? '；' + flow : '') + '。', warnings: (hs?.warnings || []).map(w => typeof w === 'string' ? w : w?.message).filter(Boolean) })
        } catch (e) { setNote({ ok: false, text: '「' + account.name + '」同步失败：' + e.message }) }
        finally { setSyncing(''); await reload(); if (refreshSources) refreshSources() }
      }
      return { syncing, note, setNote, run }
    }
    function SyncNote({ t, note, onClose }) {
      if (!note) return null
      return h('div', { role: note.ok ? 'status' : 'alert', style: { ...T.card(t), color: note.ok ? t.accent : t.red, marginBottom: 14, fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 10 } },
        h('div', null, note.text, (note.warnings || []).length ? h('details', { style: { color: t.sub, marginTop: 6 } }, h('summary', { style: { cursor: 'pointer' } }, '同步提示 · ' + note.warnings.length + ' 项'), note.warnings.map((w, i) => h('div', { key: i, style: { marginTop: 4 } }, w))) : null),
        h('button', { style: { ...T.btn(t, false), padding: '2px 8px', minHeight: 26 }, onClick: onClose, 'aria-label': '关闭提示' }, '✕'))
    }
    const sourceErrorText = e => !e ? '' : typeof e === 'string' ? e : e.message || JSON.stringify(e)
    const dateTimeText = v => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN', { hour12: false }) }

    function AccountForm({ t, account, call, busy, onDone }) {
      const [form, setForm] = React.useState({ name: account?.name || '', type: account?.type || 'broker', currency: account?.currency || 'CNY', note: account?.note || '' })
      const [msg, setMsg] = React.useState('')
      const submit = async () => {
        if (!form.name.trim()) { setMsg('请填写账户名'); return }
        if (!/^[A-Z]{3}$/.test(form.currency)) { setMsg('币种须为三位字母代码，如 CNY / HKD / USD'); return }
        const r = await call('account.upsert', { account: { ...(account ? { id: account.id } : {}), ...form, name: form.name.trim() } })
        if (r.ok) onDone(r); else setMsg(r.error?.message || '保存失败')
      }
      const fld = (label, key, props) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { value: form[key], onChange: e => setForm({ ...form, [key]: key === 'currency' ? e.target.value.toUpperCase() : e.target.value }), style: T.input(t), ...props }))
      return h('div', null,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 } },
          fld('账户名', 'name', { placeholder: '如 招商银行理财', autoFocus: true }),
          h('label', null, h('span', { style: T.label(t) }, '类型'), h('select', { value: form.type, onChange: e => setForm({ ...form, type: e.target.value }), style: T.input(t) }, [['broker', '证券账户'], ['fund', '基金账户'], ['bank', '银行 / 现金'], ['credit', '信用卡 / 借款（负债）'], ['hand', '其他手工']].map(([v, n]) => h('option', { key: v, value: v }, n)))),
          h('label', null, h('span', { style: T.label(t) }, '币种'), h('select', { value: form.currency, onChange: e => setForm({ ...form, currency: e.target.value }), 'aria-label': '账户币种', style: T.input(t) },
            currencyOptions([form.currency]).map(([v, l]) => h('option', { key: v, value: v }, l)))),
          fld('备注', 'note')),
        msg ? h('div', { role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 10 } }, msg) : null,
        h('div', { style: { display: 'flex', gap: 10, marginTop: 18 } }, h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, account ? '保存账户信息' : '创建账户')))
    }

    function AddAccountModal({ t, state, call, busy, reload, authorizations = [], reauthAuth, onClose, onCreated }) {
      const [method, setMethod] = React.useState(reauthAuth ? reauthAuth.connector : '')
      const picked = ADD_METHODS.find(m => m[0] === method)
      const title = reauthAuth ? '重新授权 · ' + (reauthAuth.label || CONNECTOR_LABEL[reauthAuth.connector] || reauthAuth.connector) : picked ? '新增账户 · ' + picked[1] : '新增账户'
      const authCount = id => authorizations.filter(a => a.connector === id).length
      return h(Modal, { t, title, onClose, wide: !!method && method !== 'manual' },
        reauthAuth ? h(DataSources, { t, state, call, busy, reload, mode: 'wizard', initialChoice: reauthAuth.connector, reauthAuth, authorizations, onDone: r => onCreated(r?.account?.id || r?.source?.accountId) }) :
        !method ? h('div', null,
          h('p', { style: { color: t.sub, fontSize: 12, margin: '0 0 6px', lineHeight: 1.8 } }, '选择账户来源。券商来源会完成一次登录 / 授权；同一次登录下的多个子账户都归在同一条授权里，可以分批导入，之后还能回来补导入。'),
          ADD_GROUPS.map(group => h('section', { key: group.key, style: { marginTop: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
              h('strong', { style: { fontSize: 12, letterSpacing: .4, color: t.text } }, group.title),
              h('span', { style: { fontSize: 11, color: t.sub } }, group.note)),
            h('div', { className: 'wealth-method-grid' }, group.ids.map(id => {
              const [, name, desc, badge] = ADD_METHODS.find(m => m[0] === id)
              const count = authCount(id)
              return h('button', { key: id, onClick: () => setMethod(id), style: { ...T.card(t), textAlign: 'left', cursor: 'pointer', color: t.text, padding: 14 } },
                h('span', { className: 'wealth-account-badge', style: { width: 30, height: 30, borderRadius: 9, fontSize: 12 } }, badge),
                h('strong', { style: { display: 'block', fontSize: 13, margin: '10px 0 4px' } }, name),
                h('span', { style: { color: t.sub, fontSize: 11, lineHeight: 1.5 } }, desc),
                count ? h('span', { style: { display: 'block', fontSize: 10.5, color: t.accent, marginTop: 6 } }, '已有 ' + count + ' 个授权') : null)
            }))))) :
        h('div', null,
          h('button', { style: { ...T.btn(t, false), marginBottom: 14 }, onClick: () => setMethod('') }, '← 选择其他方式'),
          method === 'manual' ? h(AccountForm, { t, call, busy, onDone: r => { const before = new Set(state.ledger.accounts.map(a => a.id)); const created = (r.ledger?.accounts || []).find(a => !before.has(a.id)); onCreated(created?.id) } }) :
          method === 'file' ? h(Input, { t, state, call, busy }) :
          h(DataSources, { t, state, call, busy, reload, mode: 'wizard', initialChoice: method, authorizations, onDone: r => onCreated(r?.account?.id || r?.source?.accountId) })))
    }

    function EditAccountModal({ t, state, call, busy, reload, account, source, authorization, onClose }) {
      return h(Modal, { t, title: '编辑账户 · ' + account.name, onClose, wide: !!source },
        h(AccountForm, { t, account, call, busy, onDone: onClose }),
        source ? h('section', { style: { borderTop: '1px solid ' + t.border, marginTop: 22, paddingTop: 16 } },
          h('strong', { style: { fontSize: 14 } }, '同步连接 · ' + (CONNECTOR_LABEL[source.connector] || source.connector)),
          authorization ? h('div', { style: { fontSize: 12, color: t.sub, marginTop: 6 } }, '来自授权「' + (authorization.label || authorization.id) + '」。连接参数由授权统一管理；要换账号或重新登录，请回到「账户 → 授权账号」点「重新授权」。') : null,
          h(DataSources, { t, state, call, busy, reload, mode: 'edit', editSource: source, reauthAuth: authorization, onDone: onClose })) : null)
    }

    function authImportedSource(auth, sources, account) {
      const key = auth.connector === 'ths' ? 'portfolioId' : 'brokerAccountId'
      return sources.find(s => (s.authId || s.id) === auth.id && String(s[key]) === String(account.id) && (auth.connector !== 'ths' || (s.thsBookType || 'common') === (account.thsType || 'common')))
    }
    function Authorizations({ t, state, busy, authorizations, sources, onRefresh, onOpenAccount, onReauth, onImported }) {
      const [working, setWorking] = React.useState('')
      if (!authorizations.length) return null
      const run = async (key, fn) => {
        if (working) return
        setWorking(key)
        try { await fn(); await onRefresh() } catch (e) { window.alert(e.message || '操作失败') } finally { setWorking('') }
      }
      const thsBook = a => a.thsType === 'ijj' ? '爱基金' : a.thsType === 'manFund' ? '基金账本' : ''
      const importAccount = auth => account => run('import:' + auth.id + ':' + account.id, async () => {
        const source = { authId: auth.id, [auth.connector === 'ths' ? 'portfolioId' : 'brokerAccountId']: String(account.id), schedule: { kind: 'daily', time: '21:00' }, enabled: true }
        if (auth.connector === 'ths') source.thsBookType = account.thsType || 'common'
        const r = await post('sources/connect', { source })
        if (onImported) onImported(r.account?.id)
      })
      return h('section', { style: { ...T.card(t), marginBottom: 16 }, 'aria-label': '授权账号' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
          h('strong', { style: { fontSize: 14 } }, '授权账号 · ' + authorizations.length),
          h('span', { style: { color: t.sub, fontSize: 11 } }, '一次授权对应一个登录；下面列出它能看到的所有子账户。')),
        authorizations.map(auth => {
          const accounts = auth.accounts || []
          const importedCount = accounts.filter(account => authImportedSource(auth, sources, account)).length
          const status = auth.lastError ? '授权异常' : auth.credentialsConfigured ? '已授权' : '待重新授权'
          const statusColor = auth.lastError ? t.red : auth.credentialsConfigured ? t.green : t.accent
          return h('div', { key: auth.id, style: { borderTop: '1px solid ' + t.border, paddingTop: 14, marginTop: 14 } },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' } },
              h('span', { className: 'wealth-account-badge', style: { width: 34, height: 34, borderRadius: 11, fontSize: 12 } }, (CONNECTOR_LABEL[auth.connector] || '授').slice(0, 1)),
              h('div', { style: { minWidth: 0, flex: 1 } },
                h('strong', { style: { fontSize: 14 } }, auth.label || (CONNECTOR_LABEL[auth.connector] || auth.connector)),
                h('div', { style: { fontSize: 11, color: t.sub, marginTop: 3 } },
                  (CONNECTOR_LABEL[auth.connector] || auth.connector) + ' · ',
                  h('span', { style: { color: statusColor } }, status),
                  (auth.authorizedAt ? ' · ' + dateTimeText(auth.authorizedAt) : ''),
                  ' · ' + (accounts.length ? accounts.length + ' 个账户' : '尚未读取账户'),
                  importedCount ? ' · 已导入 ' + importedCount : '')),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', { style: { ...T.btn(t, false), padding: '4px 9px', minHeight: 28 }, disabled: busy || !!working, onClick: () => run('scan:' + auth.id, async () => { await post('sources/auth/accounts', { authId: auth.id }) }) }, working === 'scan:' + auth.id ? '读取中…' : '读取账户'),
                h('button', { style: { ...T.btn(t, false), padding: '4px 9px', minHeight: 28 }, disabled: busy || !!working, onClick: () => onReauth(auth) }, '重新授权'),
                h('button', { style: { ...T.btn(t, false), padding: '4px 9px', minHeight: 28 }, disabled: busy || !!working, onClick: () => { const label = window.prompt('授权名称', auth.label || ''); if (label && label.trim()) run('rename:' + auth.id, async () => { await post('sources/auth/rename', { authId: auth.id, label: label.trim() }) }) } }, '重命名'),
                h('button', { style: { ...T.btn(t, false), padding: '4px 9px', minHeight: 28, color: t.red }, disabled: busy || !!working || (auth.sources || []).length > 0, title: (auth.sources || []).length ? '先移除这个授权下的已导入账户' : '移除授权', onClick: () => { if (window.confirm('移除授权「' + auth.label + '」？')) run('remove:' + auth.id, async () => { await post('sources/auth/remove', { authId: auth.id }) }) } }, '移除'))),
            auth.lastError ? h('div', { role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 8 } }, sourceErrorText(auth.lastError)) : null,
            accounts.length ? h('div', { style: { marginTop: 10, display: 'grid', gap: 6 } }, accounts.map(account => {
              const bound = authImportedSource(auth, sources, account)
              const accountName = bound ? state.ledger.accounts.find(x => x.id === bound.accountId)?.name : null
              return h('div', { key: String(account.id), style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', border: '1px solid ' + t.border, borderRadius: 9, background: t.panel } },
                h('div', { style: { minWidth: 0, flex: 1 } },
                  h('div', { style: { fontSize: 12 } }, account.name || String(account.id)),
                  h('div', { style: { fontSize: 10, color: t.sub, marginTop: 2 } }, String(account.id) + (account.currency ? ' · ' + account.currency : '') + (thsBook(account) ? ' · ' + thsBook(account) : ''))),
                bound ? h('button', { style: { ...T.btn(t, true), padding: '3px 9px', minHeight: 26 }, disabled: busy, onClick: () => onOpenAccount(bound.accountId) }, '已导入 → ' + (accountName || bound.accountId)) :
                  h('button', { style: { ...T.btn(t, true), padding: '3px 9px', minHeight: 26 }, disabled: busy || !!working, onClick: () => importAccount(auth)(account) }, working === 'import:' + auth.id + ':' + account.id ? '导入中…' : '导入'))
            })) : h('div', { style: { marginTop: 8, fontSize: 11, color: t.sub } }, '点「读取账户」列出这个授权能读取的全部子账户。'))
        }))
    }

    // ---------- accounts (grouped) ----------
    // 按账户类型分组：只展示实际存在的类型，空分组不再占位。
    const ACCOUNT_GROUP_DEFS = [
      { id: 'broker', label: '证券账户', hint: '券商与交易账户' },
      { id: 'fund', label: '基金账户', hint: '基金与理财' },
      { id: 'bank', label: '银行 / 现金', hint: '活期、储蓄与现金' },
      { id: 'credit', label: '信用卡 / 借款', hint: '负债账户' },
      { id: 'hand', label: '其他手工', hint: '手工维护的资产' },
      { id: 'other', label: '其他', hint: '未分类账户' },
    ]
    function accountGroup(type) {
      return ACCOUNT_GROUP_DEFS.some((g) => g.id === type) ? type : 'other'
    }
    const groupColor = (t, id) => (id === 'credit' ? t.terra : id === 'bank' ? t.green : id === 'fund' ? (t.accent2 || t.accent) : id === 'hand' || id === 'other' ? t.sub : t.accent)

    function Chevron({ open, color }) {
      return h('svg', {
        width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s ease', flex: 'none' },
      }, h('path', { d: 'm6 9 6 6 6-6' }))
    }

    // 坐标轴下标的唯一来源：数据点为空时必须返回空数组。
    // 曾经写成 [0, floor((len-1)/2), len-1] 再 filter 去重，空数组得到 [0, -1]，
    // 后续 dateOf(history[-1]) 取到 undefined 直接抛错，整页崩溃（新装用户首屏必现）。
    const axisMarks = (len) => len > 0
      ? Array.from(new Set([0, Math.floor((len - 1) / 2), len - 1])).sort((a, b) => a - b)
      : []

    function NetWorthChart({ t, history, cur }) {
      const points = history.map((x) => ({ v: x.totalValueBase, label: (x.date || x.at || '').slice(0, 10) }))
      const vals = points.map((p) => p.v)
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      const span = hi - lo || Math.max(hi * .06, 1)
      const W = 640, H = 195, PL = 48, PR = 14, PT = 14, PB = 28
      const iw = W - PL - PR
      const ih = H - PT - PB
      const x = (i) => PL + (iw * i) / Math.max(1, points.length - 1)
      const y = (v) => PT + ih - ((v - lo) / span) * ih
      const path = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ')
      const area = path + ' L' + x(points.length - 1) + ',' + (PT + ih) + ' L' + PL + ',' + (PT + ih) + ' Z'
      const gid = 'zw-nw-' + String(t.accent).replace('#', '')
      const ticks = [0, .5, 1].map((f) => lo + (hi - lo) * f)
      const marks = axisMarks(points.length)
      return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '净资产历史快照曲线', style: { width: '100%', height: 'auto', display: 'block', marginTop: 4 } },
        h('defs', null, h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: t.accent, stopOpacity: .22 }),
          h('stop', { offset: '100%', stopColor: t.accent, stopOpacity: 0 }))),
        ticks.map((v, i) => h('g', { key: i },
          h('line', { x1: PL, x2: W - PR, y1: y(v), y2: y(v), stroke: t.border, strokeWidth: 1 }),
          h('text', { x: PL - 8, y: y(v) + 3.5, textAnchor: 'end', fontSize: 10, fill: t.sub }, fmtCompact(v)))),
        h('path', { d: area, fill: 'url(#' + gid + ')' }),
        h('path', { d: path, fill: 'none', stroke: t.accent, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        points.map((p, i) => h('circle', { key: 'p' + i, cx: x(i), cy: y(p.v), r: 2.8, fill: t.accent, opacity: i === points.length - 1 ? 1 : .5 }, h('title', null, p.label + ' · ' + fmtMoney(p.v, cur)))),
        marks.map((i) => h('text', { key: 'd' + i, x: x(i), y: H - PB + 18, textAnchor: i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle', fontSize: 10, fill: t.sub }, (points[i]?.label || '').slice(5) || (points[i]?.label || ''))),
      )
    }

    function AccountsHub({ t, state, call, busy, reload, openAccount }) {
      const db = state.ledger
      const [sources, refreshSources, authorizations] = useSources()
      const sync = useAccountSync(reload, refreshSources)
      const [modal, setModal] = React.useState(null)
      const [openGroup, setOpenGroup] = React.useState({ cash: true, credit: true, invest: true })
      const cur = state.summary.baseCurrency
      const summaryRows = state.summary.accounts || []
      const accounts = db.accounts.map((a) => ({
        account: a,
        sa: summaryRows.find((x) => x.accountId === a.id) || { valueBase: 0, costBase: 0, pnlBase: 0, holdings: 0 },
        group: accountGroup(a.type),
      }))
      const groups = ACCOUNT_GROUP_DEFS
        .map((g) => ({ ...g, items: accounts.filter((a) => a.group === g.id) }))
        .filter((g) => g.items.length)
      const assets = accounts.filter((a) => a.group !== 'credit').reduce((sum, a) => sum + Math.max(0, a.sa.valueBase || 0), 0)
      const liabilities = accounts.filter((a) => a.group === 'credit').reduce((sum, a) => sum + Math.abs(a.sa.valueBase || 0), 0)
      const total = state.summary.totalValueBase || 0
      const pnl = state.summary.totalPnlBase || 0
      const history = (state.summary.history || []).filter((x) => x.baseCurrency === cur && Number.isFinite(x.totalValueBase))
      const closeModal = () => { setModal(null); refreshSources() }
      const row = (label, value, color) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid ' + t.border, fontSize: 12.5 } },
        h('span', { style: { color: t.sub } }, label),
        h('strong', { style: { color: color || t.text, fontVariantNumeric: 'tabular-nums' } }, value))

      const renderAccount = ({ account: a, sa }) => {
        const gid = accountGroup(a.type)
        const share = total > 0 ? Math.max(0, Math.min(1, (sa.valueBase || 0) / total)) : 0
        const src = sources.find((s) => s.accountId === a.id)
        const failed = src && ['error', 'failed'].includes(src.lastStatus)
        const authorization = authorizations.find((x) => x.id === (src?.authId || src?.id))
        return h('div', {
          key: a.id,
          className: 'wealth-acct-row',
          role: 'button', tabIndex: 0,
          onClick: () => openAccount(a.id),
          onKeyDown: (e) => { if (e.key === 'Enter') openAccount(a.id) },
        },
          h('div', { className: 'wealth-account-badge', style: { color: groupColor(t, gid) } }, (a.name || '账').slice(0, 1)),
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.name),
            h('div', { style: { fontSize: 11.5, color: failed ? t.red : t.sub, marginTop: 2 } },
              (authorization ? (authorization.label || '已授权') + ' · 同步' : src ? (CONNECTOR_LABEL[src.connector] || src.connector) + ' · 自动同步' : '手动账户') + ' · ' + a.currency + (failed ? ' · 同步失败' : ''))),
          h('div', { className: 'wealth-alloc' },
            h('div', { style: { fontSize: 10.5, color: t.sub } }, '占净值 ' + (share * 100).toFixed(1) + '%'),
            h('div', { className: 'wealth-bar' }, h('i', { style: { width: (share * 100).toFixed(1) + '%', background: groupColor(t, gid) } }))),
          h('div', { style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } },
            h('div', { style: { fontSize: 14, fontWeight: 750 } }, fmtMoney(sa.valueBase, cur)),
            h('div', { style: { fontSize: 11, marginTop: 2, color: (sa.pnlBase || 0) >= 0 ? t.green : t.red } }, fmtMoney(sa.pnlBase, cur))),
        )
      }

      return h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 } },
          h('div', { style: { fontSize: 12.5, color: t.sub } }, db.accounts.length + ' 个账户 · 点击账户行进入详情'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { style: T.btn(t, false), disabled: busy, onClick: () => setModal({ kind: 'auths' }) }, '授权账号' + (authorizations.length ? ' · ' + authorizations.length : '')),
            h('button', { style: T.btn(t, true), disabled: busy, onClick: () => setModal({ kind: 'add' }) }, '＋ 新增账户'))),
        h(SyncNote, { t, note: sync.note, onClose: () => sync.setNote(null) }),
        h('div', { className: 'wealth-acct-layout' },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } },
            h('section', { className: 'wealth-hero', 'aria-label': '净资产' },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' } },
                h('div', null,
                  h('div', { style: { fontSize: 10.5, letterSpacing: 1.6, fontWeight: 750, color: t.sub } }, 'NET WORTH · 净资产'),
                  h('div', { className: 'wealth-asset-value' }, fmtMoney(total), h('small', null, cur)),
                  h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: -4, fontSize: 12.5 } },
                    h('span', { style: { padding: '4px 11px', borderRadius: 999, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: (pnl >= 0 ? t.green : t.red) + '18', color: pnl >= 0 ? t.green : t.red } },
                      (pnl >= 0 ? '▲ ' : '▼ ') + fmtMoney(Math.abs(pnl), cur) + ' · ' + (state.summary.totalCostBase > 0 ? fmtPct(pnl / state.summary.totalCostBase) : '—')),
                    h('span', { style: { color: t.sub } }, '浮动盈亏'),
                    state.summary.holdingsWithoutCost ? h('span', { style: { color: t.sub, fontSize: 11 } }, '· ' + state.summary.holdingsWithoutCost + ' 条成本未知') : null))),
              h('div', { className: 'wealth-metrics', style: { paddingTop: 14 } },
                h('div', null, h('span', { style: T.label(t) }, '资产合计'), h('strong', null, fmtMoney(assets, cur))),
                h('div', null, h('span', { style: T.label(t) }, '负债合计'), h('strong', { style: { color: liabilities ? t.terra : t.text } }, fmtMoney(liabilities, cur))),
                h('div', null, h('span', { style: T.label(t) }, '账户 / 持仓'), h('strong', null, db.accounts.length + ' / ' + db.holdings.length))),
              history.length > 1
                ? h('div', { style: { borderTop: '1px solid ' + t.border, paddingTop: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: t.sub, marginBottom: 4 } },
                    h('span', null, '历史快照 · ' + history.length + ' 天'),
                    h('span', null, '曲线含出入金与汇率影响')),
                  h(NetWorthChart, { t, history, cur }))
                : h('div', { style: { borderTop: '1px solid ' + t.border, paddingTop: 12, fontSize: 12, color: t.sub } }, '至少两个日期的快照后，这里显示净资产走势。')),
            groups.map((g) => {
              const gTotal = g.items.reduce((sum, a) => sum + (a.sa.valueBase || 0), 0)
              const gShow = g.id === 'credit' ? Math.abs(gTotal) : gTotal
              const gPnl = g.items.reduce((sum, a) => sum + (a.sa.pnlBase || 0), 0)
              const open = openGroup[g.id]
              return h('section', { key: g.id, style: T.card(t) },
                h('div', {
                  role: 'button', tabIndex: 0,
                  style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexWrap: 'wrap' },
                  onClick: () => setOpenGroup((v) => ({ ...v, [g.id]: !v[g.id] })),
                  onKeyDown: (e) => { if (e.key === 'Enter') setOpenGroup((v) => ({ ...v, [g.id]: !v[g.id] })) },
                },
                  h(Chevron, { open, color: t.sub }),
                  h('span', { style: { width: 9, height: 9, borderRadius: 999, background: groupColor(t, g.id), flex: 'none' } }),
                  h('strong', { style: { fontSize: 15, fontWeight: 750 } }, g.label),
                  h('span', { style: { fontSize: 11.5, color: t.sub } }, g.items.length + ' 个账户 · ' + g.hint),
                  h('div', { style: { flex: 1 } }),
                  h('div', { style: { textAlign: 'right' } },
                    h('div', { style: { fontSize: 16, fontWeight: 780, fontVariantNumeric: 'tabular-nums', color: g.id === 'credit' ? t.terra : t.text } }, fmtMoney(gShow, cur)),
                    h('div', { style: { fontSize: 11, color: gPnl >= 0 ? t.green : t.red } }, fmtMoney(gPnl, cur)))),
                !open ? null : h('div', { style: { marginTop: 4 } }, g.items.map(renderAccount)),
              )
            }),
          ),
          h('aside', { className: 'wealth-summary', style: T.card(t) },
            h('div', { style: { fontSize: 15, fontWeight: 750 } }, '资产构成'),
            h('div', { style: { fontSize: 11.5, color: t.sub, marginTop: 2, marginBottom: 14 } }, '按账户类别 · ' + cur),
            groups.map((g) => {
              const val = g.items.reduce((sum, a) => sum + (g.id === 'credit' ? Math.abs(a.sa.valueBase || 0) : Math.max(0, a.sa.valueBase || 0)), 0)
              const base = assets + liabilities
              const pct = base > 0 ? val / base * 100 : 0
              return h('div', { key: g.id, style: { marginBottom: 13 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 } },
                  h('span', { style: { width: 9, height: 9, borderRadius: 999, background: groupColor(t, g.id), flex: 'none' } }),
                  h('span', { style: { flex: 1, fontWeight: 650 } }, g.label),
                  h('span', { style: { fontVariantNumeric: 'tabular-nums', color: t.sub } }, pct.toFixed(1) + '%')),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: t.sub, marginTop: 2 } },
                  h('span', null, fmtMoney(val, cur)), h('span', null, g.items.length + ' 账户')),
                h('div', { className: 'wealth-bar', style: { marginTop: 5 } }, h('i', { style: { width: pct.toFixed(1) + '%', background: groupColor(t, g.id) } })))
            }),
            h('div', { style: { marginTop: 6 } },
              row('资产合计', fmtMoney(assets, cur)),
              row('负债合计', fmtMoney(liabilities, cur)),
              row('净资产', fmtMoney(total, cur))),
            h('div', { style: { marginTop: 14, fontSize: 11, color: t.sub, lineHeight: 1.7 } }, '信用类账户按绝对值计入负债，其余类型计入资产；没有账户的类型不会显示。同步连接与授权在「新增账户」中管理。'))
        ),
        modal?.kind === 'add' ? h(AddAccountModal, { t, state, call, busy, reload, authorizations, onClose: closeModal, onCreated: (id) => { closeModal(); if (id) openAccount(id) } }) : null,
        modal?.kind === 'reauth' ? h(AddAccountModal, { t, state, call, busy, reload, authorizations, reauthAuth: modal.auth, onClose: closeModal, onCreated: (id) => { closeModal(); if (id) openAccount(id) } }) : null,
        modal?.kind === 'auths' ? h(Modal, { t, title: '授权账号', onClose: closeModal, wide: true },
          authorizations.length
            ? h(Authorizations, { t, state, busy, authorizations, sources, onRefresh: refreshSources, onOpenAccount: (id) => { setModal(null); openAccount(id) }, onReauth: (auth) => setModal({ kind: 'reauth', auth }), onImported: () => { reload(); refreshSources() } })
            : h('p', { style: { color: t.sub, fontSize: 13, lineHeight: 1.8, margin: '4px 0 18px' } }, '还没有授权。点「新增账户」选择同花顺、富途、长桥或 IB，完成一次登录后，它会作为一条授权出现在这里，下面列出这次登录能看到的全部子账户。'),
          h('div', { style: { display: 'flex', gap: 10, marginTop: 8 } },
            h('button', { style: T.btn(t, true), onClick: () => setModal({ kind: 'add' }) }, '＋ 新增账户'),
            h('button', { style: T.btn(t, false), onClick: closeModal }, '关闭'))) : null,
        modal?.kind === 'edit' ? h(EditAccountModal, { t, state, call, busy, reload, account: modal.account, source: sources.find((s) => s.accountId === modal.account.id), authorization: authorizations.find((x) => x.id === (sources.find((s) => s.accountId === modal.account.id)?.authId)), onClose: closeModal }) : null)
    }
    function AccountDetail({ t, state, call, busy, reload, accountId, back }) {
      const db = state.ledger, cur = state.summary.baseCurrency
      const account = db.accounts.find(a => a.id === accountId)
      const [sources, refreshSources, authorizations] = useSources()
      const source = sources.find(s => s.accountId === accountId)
      const sync = useAccountSync(reload, refreshSources)
      const [sub, setSub] = React.useState('holdings'), [editing, setEditing] = React.useState(false)
      const removeAccount = async () => {
        if (!window.confirm('删除账户「' + account.name + '」及其全部持仓和流水？' + (source ? '它的自动同步连接也会一并移除。' : ''))) return
        try { if (source) await post('sources/remove', { id: source.id }) } catch (e) { window.alert('移除同步连接失败：' + e.message); return }
        await call('account.remove', { id: accountId })
        refreshSources(); back()
      }
      const sa = state.summary.accounts.find(x => x.accountId === accountId) || {}
      const hs = db.historySync?.[accountId]
      // 券商口径的累计持有盈亏（同步来源自带，如 THS 的 hold_profit 汇总 / 爱基金 now_profit），
      // 与快照无关、不依赖本机历史；sourceTotals 以来源币种计，按汇率折算展示。
      const brokerPnl = typeof account.sourceTotals?.holdingProfit === 'number' && Number.isFinite(account.sourceTotals.holdingProfit)
        ? account.sourceTotals.holdingProfit * (cur === account.currency ? 1 : (state.summary.fx[account.currency] || 1)) : null
      // 成本未知的持仓不计入成本与盈亏；在盈亏卡片上注明条数，避免把缺失当成 0。
      const accountHoldingIds = new Set(db.holdings.filter(h => h.accountId === accountId).map(h => h.id))
      const unknownCostRows = (state.summary.warnings || []).filter(w => w && w.code === 'unknown-cost' && accountHoldingIds.has(w.holdingId)).length
      // 与 quotes.mjs dayChange 一致：涨跌幅是 (现价-昨收)/昨收，今日盈亏 = 数量 × 现价 × 涨跌幅/(100+涨跌幅)。
      let dayPnl = 0, dayKnown = 0, dayMissing = 0
      for (const h of db.holdings) {
        if (h.accountId !== accountId || !(h.qty > 0)) continue
        const ins = db.instruments.find(i => i.id === h.instrumentId)
        const pct = h.quoteChangePct, price = h.quotePrice
        const move = typeof pct === 'number' && Number.isFinite(pct) && pct > -100 && typeof price === 'number' && price > 0
          ? h.qty * price * (pct / (100 + pct)) : null
        if (move == null) { if (ins && (ins.assetClass === 'stock' || ins.assetClass === 'etf')) dayMissing++; continue }
        const rate = h.currency === cur ? 1 : state.summary.fx[h.currency]
        if (typeof rate !== 'number' || !(rate > 0)) { dayMissing++; continue }
        dayPnl += move * rate
        dayKnown++
      }
      const dayBase = dayKnown && typeof sa.valueBase === 'number' ? sa.valueBase - dayPnl : null
      const dayPct = dayKnown && !dayMissing && dayBase > 0 ? dayPnl / dayBase * 100 : null
      const dayValue = !dayKnown ? '—' : h('span', null,
        (dayPnl > 0 ? '+' : '') + fmtMoney(dayPnl, cur),
        dayPct != null ? h('small', { style: { display: 'block', fontSize: 12, fontWeight: 650 } }, (dayPct > 0 ? '+' : '') + dayPct.toFixed(2) + '%') : null)
      const subs = [['holdings', '持仓'], ['trades', '流水'], ['symbols', '个股'], ['analysis', '分析'], ['backfill', '补录账单']]
      const metric = (label, value, color) => h('div', null, h('span', { style: T.label(t) }, label), h('strong', { style: { color, fontSize: typeof value === 'string' && value.length > 12 ? 12 : undefined } }, value))
      return h('div', null,
        h('button', { style: { ...T.btn(t, false), marginBottom: 14 }, onClick: back }, '← 全部账户'),
        h('section', { className: 'wealth-hero', 'aria-label': '账户概况' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' } },
            h('div', null,
              h('span', { style: { color: t.sub, fontSize: 12 } }, (source ? (CONNECTOR_LABEL[source.connector] || source.connector) + ' · 自动同步' : '手动账户') + ' · ' + account.currency),
              h('div', { className: 'wealth-asset-value', style: { margin: '6px 0 8px' } }, fmtMoney(sa.valueBase), h('small', null, cur))),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              source ? h('button', { style: T.btn(t, true), disabled: busy || !!sync.syncing, onClick: () => sync.run(account) }, sync.syncing ? '同步中…' : '⟳ 同步到最新') : null,
              h('button', { style: T.btn(t, false), disabled: busy, onClick: () => setEditing(true) }, '编辑'),
              h('button', { style: { ...T.btn(t, false), color: t.red }, disabled: busy, onClick: removeAccount }, '删除'))),
          h('div', { className: 'wealth-metrics', style: { paddingBottom: 12 } },
            metric('持仓成本', fmtMoney(sa.costBase, cur)),
            metric('今日盈亏' + (dayKnown && dayMissing ? ' · ' + dayMissing + ' 只未计入' : ''), dayValue, !dayKnown ? t.sub : dayPnl > 0 ? t.green : dayPnl < 0 ? t.red : undefined),
            metric('浮动盈亏' + (unknownCostRows ? ' · ' + unknownCostRows + ' 条成本未知' : ''), fmtMoney(sa.pnlBase, cur), (sa.pnlBase || 0) >= 0 ? t.green : t.red),
            brokerPnl != null ? metric('持有盈亏（券商）', fmtMoney(brokerPnl, cur), brokerPnl >= 0 ? t.green : t.red) : null,
            metric('最近同步', source ? (source.lastSuccessAt ? dateTimeText(source.lastSuccessAt) : '尚未同步') : '手动维护'),
            metric('流水已同步至', hs?.lastTo || (source ? '尚未同步' : '—')))),
        source && ['error', 'failed'].includes(source.lastStatus) && source.lastError ? h('div', { role: 'alert', style: { ...T.card(t), color: t.red, marginBottom: 14, fontSize: 12 } }, '上次同步失败：' + sourceErrorText(source.lastError)) : null,
        h(SyncNote, { t, note: sync.note, onClose: () => sync.setNote(null) }),
        h('nav', { className: 'wealth-subtabs', 'aria-label': '账户视图' }, subs.map(([id, name]) => h('button', { key: id, className: 'wealth-subtab', 'aria-current': sub === id ? 'page' : undefined, onClick: () => setSub(id) }, name))),
        sub === 'holdings' ? h(Holdings, { t, state, call, busy, accountId, reload }) :
        sub === 'trades' ? h(Trades, { t, state, call, busy, accountId, onBackfill: () => setSub('backfill') }) :
        sub === 'symbols' ? h(SymbolLedger, { t, state, accountId }) :
        sub === 'analysis' ? h(Analysis, { t, state, fixedAccounts: [accountId], onBackfill: () => setSub('backfill') }) :
        h(HistoryImport, { t, state, busy, reload, initialAccountId: accountId, lockAccount: true }),
        editing ? h(EditAccountModal, { t, state, call, busy, reload, account, source, authorization: authorizations.find(x => x.id === (source?.authId || source?.id)), onClose: () => { setEditing(false); refreshSources() } }) : null)
    }

    function Holdings({ t, state, call, busy, accountId, reload }) {
      const db = state.ledger
      const accMap = new Map(db.accounts.map((a) => [a.id, a]))
      const insMap = new Map(db.instruments.map((i) => [i.id, i]))
      const blank = () => ({ accountId: accountId || db.accounts[0]?.id || '', symbol: '', name: '', market: 'CN', assetClass: 'stock', sector: '', style: '', qty: '', avgCost: '', currency: '', manualPrice: '' })
      const [form, setForm] = React.useState(null), [editing, setEditing] = React.useState(false), [msg, setMsg] = React.useState(''), [acctFilter, setAcctFilter] = React.useState('')
      const [group, setGroup] = React.useState('class')
      const [quoting, setQuoting] = React.useState(false)
      const refreshQuotes = async () => {
        setQuoting(true); setMsg('')
        try {
          const r = await fetch('/portfolio/api/quotes/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
          const d = await r.json()
          if (!r.ok || !d.ok) throw new Error(d.error?.message || '行情更新失败')
          const missing = (d.warnings || []).filter(w => String(w).startsWith('QUOTE_')).length
          setMsg('已更新 ' + d.updated + ' 条行情现价' + (missing ? '；' + missing + ' 个标的暂无行情，保留原估值' : '') + '。手填价格仍然优先。')
          if (reload) await reload()
        } catch (e) { setMsg(e.message) }
        finally { setQuoting(false) }
      }
      const open = (f, isEdit) => { setForm(f); setEditing(!!isEdit); setMsg('') }
      const submit = async () => {
        if (!form.accountId || !form.symbol.trim()) { setMsg('请选择账户并填写代码'); return }
        // 成本留空 = 未知（null），与真实的 0 成本区分；输入的 0 仍按数字保存。
        const avgCost = String(form.avgCost ?? '').trim() === '' ? null : form.avgCost
        const r = await call('holding.upsert', { holding: { ...form, currency: form.currency || undefined, qty: form.qty, avgCost, manualPrice: form.manualPrice === '' ? null : form.manualPrice } })
        if (!r.ok) { setMsg(r.error?.message || '保存失败'); return }
        const ins = r.ledger.instruments.find(i => i.symbol === form.symbol && i.market === form.market)
        if (ins && (ins.assetClass !== form.assetClass || (form.name && ins.name !== form.name) || (form.sector || '') !== (ins.sector || '') || (form.style || '') !== (ins.style || ''))) {
          const meta = await call('instrument.upsert', { instrument: { id: ins.id, name: form.name || form.symbol, assetClass: form.assetClass, ...(form.sector.trim() ? { sector: form.sector.trim() } : {}), ...(form.style ? { style: form.style } : {}) } })
          if (!meta.ok) { setMsg(meta.error?.message || '标的信息保存失败'); return }
        }
        setForm(null)
      }
      const list = db.holdings.filter(ho => accountId ? ho.accountId === accountId : (!acctFilter || ho.accountId === acctFilter))
      // 与 quotes.mjs valuationPrice 一致：和券商快照相同的 manualPrice 是同步写入的昨收，不是手填。
      const usedPrice = (ho) => {
        const copied = ho.manualPrice != null && ho.sourcePrice != null && Number(ho.manualPrice) === Number(ho.sourcePrice)
        const hand = ho.manualPrice != null && !copied ? ho.manualPrice : null
        return { hand, price: hand ?? ho.quotePrice ?? ho.sourcePrice ?? ho.avgCost }
      }
      const fld = (label, key, props = {}) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { value: form[key], disabled: props.disabled, placeholder: props.placeholder, onChange: e => setForm({ ...form, [key]: props.upper ? e.target.value.toUpperCase() : props.trim ? e.target.value.trim() : e.target.value }), style: T.input(t) }))
      const sel = (label, key, options, disabled) => h('label', null, h('span', { style: T.label(t) }, label), h('select', { value: form[key], disabled, onChange: e => setForm({ ...form, [key]: e.target.value }), style: T.input(t) }, options.map(([v, n]) => h('option', { key: v, value: v }, n))))
      const styleLabel = key => ({ growth: '成长', value: '价值', blend: '均衡', other: '其他' })[key] || '未分类'
      const groupKey = ho => {
        const ins = insMap.get(ho.instrumentId)
        if (group === 'class') return assetLabel(ins?.assetClass)
        if (group === 'account' && !accountId) return accMap.get(ho.accountId)?.name || ho.accountId
        if (group === 'sector') return (ins?.sector || '').trim() || '未分类'
        if (group === 'style') return ins?.style ? styleLabel(ins.style) : '未分类'
        if (group === 'market') return ins?.market || '—'
        return ho.currency || '—'
      }
      // 全部账户视图按统一代码合并：同一标的一行（数量、成本合并计算），只读；
      // 选定单个账户或按账户分组时退回逐条展示。修改 / 删除只能在具体账户里做。
      const single = !!(accountId || acctFilter)
      const merged = !single && group !== 'account'
      const readOnly = !single
      const entries = []
      if (merged) {
        const byKey = new Map()
        for (const ho of list) {
          const ins = insMap.get(ho.instrumentId)
          const key = ins ? identityKeyOf(ins) : 'id:' + ho.instrumentId
          let e = byKey.get(key)
          if (!e) { e = { key, holdings: [], ins }; byKey.set(key, e); entries.push(e) }
          e.holdings.push(ho)
        }
      } else {
        for (const ho of list) entries.push({ key: 'h:' + ho.id, holdings: [ho], ins: insMap.get(ho.instrumentId) })
      }
      // 合并行取值：数量求和；成本按数量加权（任一条成本未知则整体未知，绝不编造）；
      // 现价取估值链最高优先级来源（手填 > 行情 > 券商 > 成本），涨跌幅跟行情；市值按条分别估值后求和。
      const entryView = (e) => {
        const rows = e.holdings
        const priced = rows.map(ho => {
          const u = usedPrice(ho)
          const rate = ho.currency === db.baseCurrency ? 1 : db.fx[ho.currency]
          const mv = Number.isFinite(rate) && rate > 0 && u.price != null ? ho.qty * u.price * rate : null
          return { ho, hand: u.hand, price: u.price, mv }
        })
        const qty = rows.reduce((s, x) => s + (Number(x.qty) || 0), 0)
        const withCost = rows.filter(x => x.avgCost != null && Number.isFinite(Number(x.avgCost)))
        const costQty = withCost.reduce((s, x) => s + (Number(x.qty) || 0), 0)
        const avgCost = withCost.length === rows.length && costQty > 0 ? withCost.reduce((s, x) => s + (Number(x.qty) || 0) * Number(x.avgCost), 0) / costQty : null
        let best = null
        for (const p of [x => x.hand != null, x => x.ho.quotePrice != null, x => x.ho.sourcePrice != null]) { best = priced.find(p); if (best) break }
        if (!best) best = priced[0]
        const pct = rows.map(x => x.quoteChangePct).find(v => typeof v === 'number' && Number.isFinite(v))
        const mvs = priced.map(x => x.mv).filter(v => v != null)
        return {
          ...e, priced, qty,
          avgCost, best,
          pct: pct == null ? null : pct,
          currency: rows[0].currency,
          mv: mvs.length ? mvs.reduce((s, x) => s + x, 0) : null,
          accIds: [...new Set(rows.map(x => x.accountId))],
        }
      }
      const views = entries.map(entryView)
      const groups = []
      for (const v of views) {
        const key = groupKey(v.holdings[0])
        let g = groups.find(x => x.key === key)
        if (!g) { g = { key, rows: [], mv: 0 }; groups.push(g) }
        if (v.mv != null) g.mv += v.mv
        g.rows.push(v)
      }
      const totalMv = groups.reduce((s, g) => s + g.mv, 0)
      return h('div', null,
        h('div', { style: T.card(t) },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
            h('strong', null, (accountId ? '账户持仓' : '全部持仓') + ' · ' + views.length + (merged && views.length !== list.length ? '（合并自 ' + list.length + ' 条）' : '')),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              accountId ? null : h('select', { value: acctFilter, onChange: (e) => setAcctFilter(e.target.value), 'aria-label': '按账户筛选', style: { ...T.input(t), minHeight: 30, width: 180, fontSize: 12 } },
                h('option', { value: '' }, '全部账户'),
                db.accounts.map((a) => h('option', { key: a.id, value: a.id }, a.name))),
              h('select', { 'aria-label': '持仓分组', value: group, onChange: e => setGroup(e.target.value), style: { ...T.input(t), minHeight: 30, width: 'auto', fontSize: 12 } },
                (accountId ? [['class', '按资产类别'], ['sector', '按行业'], ['style', '按风格'], ['market', '按市场'], ['currency', '按币种']] : [['class', '按资产类别'], ['account', '按账户'], ['sector', '按行业'], ['style', '按风格'], ['market', '按市场'], ['currency', '按币种']]).map(([v, n]) => h('option', { key: v, value: v }, n))),
              h('button', { style: T.btn(t, false), disabled: busy || quoting, onClick: refreshQuotes }, quoting ? '正在更新行情…' : '⟳ 更新行情'),
              h('button', { style: T.btn(t, true), disabled: busy || !db.accounts.length, onClick: () => open(blank()) }, '＋ 添加持仓'))),
          readOnly ? h('div', { style: { fontSize: 11, color: t.sub, margin: '-2px 0 10px' } }, merged ? '同一代码的持仓已合并计算，此视图只读；编辑 / 删除请进入对应账户。' : '此视图只读；编辑 / 删除请进入对应账户。') : null,
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null, T.th('标的', t), T.th('数量', t), T.th('成本', t), T.th('现价', t), T.th('涨跌幅', t), T.th('币种', t), T.th('市值(本位币)', t), T.th('操作', t))),
            h('tbody', null, views.length ? groups.map((g) => [
              h('tr', { key: 'g:' + g.key }, T.td(h('span', { style: { fontWeight: 650, fontSize: 12 } }, g.key, h('small', { style: { display: 'block', color: t.sub, fontWeight: 400 } }, g.rows.length + ' 项 · ' + fmtMoney(g.mv, db.baseCurrency) + (totalMv ? ' · ' + (g.mv / totalMv * 100).toFixed(1) + '%' : ''))), t, { colSpan: 8 })),
              g.rows.map((v) => {
                const ho = v.holdings[0], ins = v.ins
                // 估值链：手填价 > 行情价 > 券商快照价 > 平均成本；全空时市值为「—」，绝不按 0 计。
                const { hand, price } = readOnly ? { hand: null, price: v.best.price } : usedPrice(ho)
                const mv = v.mv
                const quoteTag = hand == null && v.best.ho.quotePrice != null ? h('small', { style: { display: 'block', color: t.sub, fontSize: 10 } }, (v.best.ho.quoteSource === 'tencent-fund' ? '净值' : '行情') + (v.best.ho.quoteAt ? ' ' + String(v.best.ho.quoteAt).slice(5, 10) : '')) : null
                const sourceTag = hand == null && v.best.ho.quotePrice == null && v.best.ho.sourcePrice != null ? h('small', { style: { display: 'block', color: t.sub, fontSize: 10 } }, '券商价') : null
                const handTag = hand != null ? h('small', { style: { display: 'block', color: t.sub, fontSize: 10 } }, '手填') : null
                const pct = v.pct == null ? null : v.pct
                const pctText = pct == null ? '—' : (pct > 0 ? '+' : '') + pct.toFixed(2) + '%'
                const qtyText = v.accIds.length > 1 ? String(Number(v.qty.toFixed(6))) : String(ho.qty)
                return h('tr', { key: v.key },
                  T.td(h('span', null, (ins ? ins.name + ' ' + ins.symbol : ho.instrumentId), ins?.sector ? h('small', { style: { display: 'block', color: t.sub } }, ins.sector + (ins.style ? ' · ' + styleLabel(ins.style) : '')) : null), t),
                  T.td(qtyText, t),
                  T.td(readOnly && v.accIds.length > 1 && v.avgCost == null ? h('span', { title: '部分持仓成本未知' }, '—') : readOnly && v.accIds.length > 1 ? fmtMoney(v.avgCost) : fmtMoney(ho.avgCost), t),
                  T.td(h('span', null,
                    !readOnly && hand != null
                      ? h('input', { key: ho.id + ':' + hand, defaultValue: String(hand), placeholder: '手填', title: '手填价格（清空则改用行情）', onBlur: (e) => { const v2 = e.target.value; if (String(hand) !== v2) call('price.set', { holdingId: ho.id, price: v2 === '' ? null : Number(v2) }) }, style: { ...T.input(t), width: 78 } })
                      : h('span', { style: { fontWeight: 650, fontVariantNumeric: 'tabular-nums' } }, price == null ? '—' : String(price)),
                    handTag, quoteTag, sourceTag), t),
                  T.td(pctText, t, { color: pct == null || pct === 0 ? t.sub : pct > 0 ? t.green : t.red, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }),
                  T.td(v.currency, t),
                  T.td(fmtMoney(mv, db.baseCurrency), t),
                  readOnly
                    ? T.td(h('span', { style: { color: t.sub, fontSize: 11 } }, '只读 · 到账户中编辑'), t)
                    : T.td(h('span', null,
                    h('button', { style: { ...T.btn(t, false), padding: '3px 8px', marginRight: 6 }, disabled: busy, onClick: () => open({ accountId: ho.accountId, symbol: ins?.symbol || '', name: ins?.name || '', market: ins?.market || 'CN', assetClass: ins?.assetClass || 'stock', sector: ins?.sector || '', style: ins?.style || '', qty: String(ho.qty), avgCost: String(ho.avgCost ?? ''), currency: ho.currency || '', manualPrice: hand == null ? '' : String(hand) }, true) }, '编辑'),
                    h('button', { style: { ...T.btn(t, false), padding: '3px 8px', borderColor: t.red, color: t.red }, disabled: busy, onClick: () => { if (window.confirm('删除该持仓？')) call('holding.remove', { id: ho.id }) } }, '删除')), t))
              }),
            ]) : h('tr', null, T.td('还没有持仓', t, { color: t.sub }))))),
        !form && msg ? h('div', { role: 'status', style: { ...T.card(t), color: msg.includes('已更新') || msg.includes('已保存') || msg.includes('已录入') ? t.accent : t.red, marginTop: 12, fontSize: 12 } }, msg) : null,
        form ? h(Modal, { t, title: editing ? '编辑持仓' : '添加持仓', onClose: () => setForm(null) },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 } },
            accountId ? null : sel('账户', 'accountId', db.accounts.map(a => [a.id, a.name]), editing),
            fld('代码', 'symbol', { placeholder: '600519', disabled: editing, trim: true }),
            fld('名称', 'name', { placeholder: '贵州茅台' }),
            sel('市场', 'market', ['CN', 'HK', 'US', 'SG', 'FUND', 'OTHER'].map(x => [x, x]), editing),
            sel('资产类别', 'assetClass', [['stock', '股票'], ['fund', '基金'], ['etf', 'ETF'], ['cash', '现金'], ['bond', '债券'], ['crypto', '数字资产'], ['other', '其他']]),
            fld('行业（可选）', 'sector', { placeholder: '如 白酒 / 银行 / 半导体', trim: true }),
            sel('风格（可选）', 'style', [['', '未分类'], ['growth', '成长'], ['value', '价值'], ['blend', '均衡'], ['other', '其他']]),
            fld('数量', 'qty'), fld('成本价', 'avgCost'), fld('现价（手填，可空）', 'manualPrice'), h('label', null, h('span', { style: T.label(t) }, '币种'), h('select', { value: form.currency, onChange: e => setForm({ ...form, currency: e.target.value }), 'aria-label': '币种', style: T.input(t) },
              [['', '自动（跟随账户）'], ...currencyOptions([form.currency])].map(([v, l]) => h('option', { key: v, value: v }, l))))),
          editing ? h('p', { style: { fontSize: 11, color: t.sub, marginTop: 10 } }, '代码与市场决定持仓身份，如需更换请删除后重新添加。自动同步的账户下次同步可能覆盖手工修改。') : null,
          msg ? h('div', { role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 10 } }, msg) : null,
          h('div', { style: { display: 'flex', gap: 10, marginTop: 18 } }, h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, editing ? '保存' : '添加'), h('button', { style: T.btn(t, false), onClick: () => setForm(null) }, '取消'))) : null)
    }

    const HISTORY_KINDS = { buy: '买入', sell: '卖出', dividend: '分红', interest: '利息', deposit: '入金', withdrawal: '出金', tax: '税费', fee: '费用', cash: '现金变动', cash_in: '现金转入', cash_out: '现金转出', transfer: '转账 / 转托管', transfer_in: '转入', transfer_out: '转出', security_in: '证券转入', security_out: '证券转出', repo: '回购', repo_open: '回购开仓', repo_close: '回购到期', repo_interest: '回购利息', ipo: '新股', ipo_subscription: '新股申购', ipo_allotment: '新股配售', ipo_refund: '新股退款', split: '拆股', corporate_action: '公司行动', other: '其他' }
    // 与 model.mjs LIFE_CATEGORIES 保持一致；用于流水行内归类与报表展示。
    const LIFE_CATEGORIES = { food: '餐饮', transport: '交通', housing: '居住', shopping: '购物', entertainment: '娱乐', health: '医疗', education: '教育', social: '人情往来', telecom: '通讯', other: '其他' }
    const historyKind = row => HISTORY_KINDS[row.kind] || row.kind || '其他'
    const historyValue = (value, missing = '—') => value === null || value === undefined || value === '' ? missing : String(value)
    const isRepo = row => /repo|回购|逆回购/i.test((row.kind || '') + ' ' + (row.originalType || ''))
    const historyStatus = status => ({ new: '新增', duplicate: '重复 · 跳过', conflict: '冲突 · 待修正', outside: '区间外 · 跳过' })[status] || status || '已归档'
    function HistoryTable({ t, rows, showStatus, showAccount, showAction, call, busy }) {
      return h('div', { style: { overflowX: 'auto', marginTop: 12 } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 } },
        h('thead', null, h('tr', null, [...(showAccount ? ['账户'] : []), '日期 / 时间', '类型 / 原始类型', '代码 / 名称', '数量', '价格 / 利率', '原始金额', '净现金', '费用', '币种', ...(showStatus ? ['状态'] : []), ...(showAccount || showAction ? ['操作'] : [])].map(label => T.th(label, t)))),
        h('tbody', null, rows.map((row, index) => h('tr', { key: row.id || index },
          showAccount ? T.td(row.accountName || row.accountId, t) : null,
          T.td(h('span', { style: { whiteSpace: 'nowrap' } }, row.date || '—', row.time ? h('small', { style: { display: 'block', color: t.sub } }, row.time) : null), t),
          T.td(h('span', null, historyKind(row), h('small', { style: { display: 'block', color: t.sub } }, row.originalType || '—'),
            call && row.eventId && ['deposit', 'withdrawal'].includes(row.kind) ? h('select', {
              'aria-label': '生活账单分类', value: row.category || '', disabled: busy,
              onChange: async (e) => {
                const r = await call('historyEvent.update', { id: row.eventId, category: e.target.value || null })
                if (!r.ok) alert(r.error?.message || '分类保存失败')
              },
              style: { ...T.input(t), marginTop: 4, padding: '2px 5px', fontSize: 10.5, minHeight: 22, width: 'auto' },
            }, [['', '生活分类：未归类'], ...Object.entries(LIFE_CATEGORIES)].map(([v, n]) => h('option', { key: v, value: v }, n))) : null), t),
          T.td(h('span', null, row.symbol || '—', h('small', { style: { display: 'block', color: t.sub } }, [row.name, row.market].filter(Boolean).join(' · '))), t),
          T.td(historyValue(row.qty), t), T.td((isRepo(row) ? '利率 ' : '') + historyValue(row.price), t), T.td(historyValue(row.grossAmount), t), T.td(historyValue(row.cashAmount), t), T.td(historyValue(row.fee, '未知'), t), T.td(row.currency || '未知', t),
          showStatus ? T.td(h('span', { style: { color: row.status === 'conflict' ? t.red : row.status === 'new' ? t.accent : t.sub } }, historyStatus(row.status), h('small', { style: { display: 'block', color: t.sub } }, [row.sheet, row.row != null ? '第 ' + row.row + ' 行' : ''].filter(Boolean).join(' · '))), t) : null, showAccount || showAction ? T.td(row.action || '同步归档', t) : null)))))
    }

    function ledgerEvents(db, accountId) {
      const accMap = new Map(db.accounts.map((a) => [a.id, a]))
      const insMap = new Map(db.instruments.map((i) => [i.id, i]))
      return [...(db.trades || []).filter(tr => !accountId || tr.accountId === accountId).map(tr => {
        const ins = insMap.get(tr.instrumentId), gross = Number(tr.qty) * Number(tr.price)
        const knownFee = tr.fee !== null && tr.fee !== undefined && tr.fee !== ''
        return { ...tr, legacyId: tr.id, id: 'trade:' + tr.id, kind: tr.side, symbol: ins?.symbol || tr.symbol, name: ins?.name || tr.name, market: ins?.market || tr.market, currency: tr.currency || accMap.get(tr.accountId)?.currency, grossAmount: tr.grossAmount ?? gross, cashAmount: tr.cashAmount ?? (knownFee && ['buy', 'sell'].includes(tr.side) ? (tr.side === 'buy' ? -gross : gross) - Number(tr.fee) : null), provenance: [tr.source?.provider || (typeof tr.source === 'string' ? tr.source : ''), tr.source?.externalId].filter(Boolean).join(' · ') || '手工记账' }
      }), ...(db.historyEvents || []).filter(row => !accountId || row.accountId === accountId).map(row => ({ ...row, eventId: row.id, id: 'history:' + row.id, provenance: [row.provider || '文件回补', row.batchId ? '批次 ' + row.batchId : '', row.sheet, row.row != null ? '第 ' + row.row + ' 行' : '', row.importedAt ? '导入于 ' + row.importedAt : ''].filter(Boolean).join(' · ') }))]
        .map(row => ({ ...row, accountName: accMap.get(row.accountId)?.name }))
        .sort((a, b) => (String(b.date || '') + (b.time || '')).localeCompare(String(a.date || '') + (a.time || '')))
    }

    function Trades({ t, state, call, busy, accountId, onBackfill, openAccount }) {
      const db = state.ledger
      const blank = () => ({ accountId: accountId || db.accounts[0]?.id || '', symbol: '', market: 'CN', side: 'buy', qty: '', price: '', fee: '', date: new Date().toLocaleDateString('en-CA'), currency: '' })
      const [form, setForm] = React.useState(null), [msg, setMsg] = React.useState('')
      const [page, setPage] = React.useState(0), [query, setQuery] = React.useState(''), [kind, setKind] = React.useState('')
      const all = ledgerEvents(db, accountId)
      const q = query.trim().toLowerCase()
      const events = all.filter(r => (!kind || r.kind === kind) && (!q || [r.symbol, r.name, r.originalType, r.note, r.accountName].some(v => String(v || '').toLowerCase().includes(q))))
        .map(row => row.legacyId ? { ...row, action: h('button', { style: { ...T.btn(t, false), color: t.red }, disabled: busy, onClick: () => { if (window.confirm('删除这条手工流水？（不会自动回算持仓）')) call('trade.remove', { id: row.legacyId }) } }, '删除') } : row)
      const kinds = [...new Set(all.map(r => r.kind).filter(Boolean))]
      const pages = Math.max(1, Math.ceil(events.length / 100)), shownPage = Math.min(page, pages - 1)
      const submit = async () => {
        if (!form.accountId || !form.symbol.trim()) { setMsg('请选择账户并填写代码'); return }
        const r = await call('trade.add', { trade: { ...form, currency: form.currency || undefined, qty: form.qty, price: form.price, fee: form.fee === '' ? 0 : form.fee } })
        if (r.ok) setForm(null); else setMsg(r.error?.message || '保存失败')
      }
      const fld = (label, key, props = {}) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { type: props.type, value: form[key], placeholder: props.placeholder, onChange: e => setForm({ ...form, [key]: props.upper ? e.target.value.toUpperCase() : e.target.value }), style: T.input(t) }))
      const sel = (label, key, options) => h('label', null, h('span', { style: T.label(t) }, label), h('select', { value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }), style: T.input(t) }, options.map(([v, n]) => h('option', { key: v, value: v }, n))))
      return h('div', null,
        h('div', { style: T.card(t) },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
            h('strong', null, (accountId ? '账户流水' : '全部流水') + ' · ' + events.length + (events.length !== all.length ? ' / ' + all.length : '')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              onBackfill ? h('button', { style: T.btn(t, false), disabled: busy, onClick: onBackfill }, '补录账单') : null,
              h('button', { style: T.btn(t, true), disabled: busy || !db.accounts.length, onClick: () => { setMsg(''); setForm(blank()) } }, '＋ 记一笔'))),
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 } },
            h('input', { value: query, onChange: e => { setQuery(e.target.value); setPage(0) }, placeholder: '搜索代码 / 名称 / 类型', 'aria-label': '搜索流水', style: { ...T.input(t), maxWidth: 260 } }),
            h('select', { value: kind, onChange: e => { setKind(e.target.value); setPage(0) }, 'aria-label': '流水类型', style: { ...T.input(t), maxWidth: 170 } }, h('option', { value: '' }, '全部类型'), kinds.map(k => h('option', { key: k, value: k }, HISTORY_KINDS[k] || k)))),
          h('p', { style: { color: t.sub, fontSize: 12 } }, accountId ? '自动同步的账户点「同步」即补齐全部历史流水；来源接口没有的记录（如银证转账）可在「补录账单」导入。' : '各账户流水由账户「同步」自动更新。金额按原币展示，费用缺失为未知；流水只归档，不改变当前持仓。'),
          events.length ? h(HistoryTable, { t, rows: events.slice(shownPage * 100, (shownPage + 1) * 100), showAccount: !accountId, showAction: true, call, busy }) : h('p', { style: { color: t.sub } }, all.length ? '没有符合条件的流水' : '还没有流水'),
          pages > 1 ? h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 } }, h('button', { style: T.btn(t, false), disabled: shownPage === 0, onClick: () => setPage(shownPage - 1) }, '上一页'), h('span', { style: { color: t.sub, fontSize: 12 } }, (shownPage + 1) + ' / ' + pages + ' 页 · 每页 100 条'), h('button', { style: T.btn(t, false), disabled: shownPage >= pages - 1, onClick: () => setPage(shownPage + 1) }, '下一页')) : null),
        form ? h(Modal, { t, title: '记一笔交易', onClose: () => setForm(null) },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 } },
            accountId ? null : sel('账户', 'accountId', db.accounts.map(a => [a.id, a.name])),
            fld('代码', 'symbol', { placeholder: '00700' }), sel('市场', 'market', ['CN', 'HK', 'US', 'SG', 'FUND', 'OTHER'].map(x => [x, x])), sel('方向', 'side', [['buy', '买入'], ['sell', '卖出']]),
            fld('数量', 'qty'), fld('价格', 'price'), fld('费用', 'fee', { placeholder: '0' }), fld('日期', 'date', { type: 'date' }), h('label', null, h('span', { style: T.label(t) }, '币种'), h('select', { value: form.currency, onChange: e => setForm({ ...form, currency: e.target.value }), 'aria-label': '币种', style: T.input(t) },
              [['', '自动（跟随账户）'], ...currencyOptions([form.currency])].map(([v, l]) => h('option', { key: v, value: v }, l))))),
          msg ? h('div', { role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 10 } }, msg) : null,
          h('div', { style: { display: 'flex', gap: 10, marginTop: 18 } }, h('button', { style: T.btn(t, true), disabled: busy, onClick: submit }, '记一笔'), h('button', { style: T.btn(t, false), onClick: () => setForm(null) }, '取消'))) : null)
    }

    function SymbolLedger({ t, state, accountId }) {
      const db = state.ledger
      const [open, setOpen] = React.useState(''), [query, setQuery] = React.useState('')
      const groups = new Map()
      for (const r of ledgerEvents(db, accountId)) {
        if (!r.symbol) continue
        // 按统一代码归并：2549.HK 与 HK.02549 在统计里是同一只证券（记录仍各自保存）。
        const k = symKey(r.symbol, r.market)
        let g = groups.get(k)
        if (!g) {
          const n = normSym(r.symbol, r.market)
          groups.set(k, g = { key: k, symbol: n.symbol, name: r.name, market: n.market, currency: r.currency, rows: [], buys: 0, sells: 0, buyQty: 0, sellQty: 0, buyCash: 0, sellCash: 0, income: 0, unknown: 0, first: r.date, last: r.date })
        }
        g.rows.push(r); if (!g.name && r.name) g.name = r.name
        const qty = Number(r.qty) || 0, cash = typeof r.cashAmount === 'number' && Number.isFinite(r.cashAmount) ? r.cashAmount : null
        if (r.kind === 'buy') { g.buys++; g.buyQty += qty; if (cash !== null) g.buyCash -= cash; else g.unknown++ }
        else if (r.kind === 'sell') { g.sells++; g.sellQty += qty; if (cash !== null) g.sellCash += cash; else g.unknown++ }
        else if (['dividend', 'interest', 'tax', 'fee'].includes(r.kind) && cash !== null) g.income += cash
        if (r.date && r.date < g.first) g.first = r.date
        if (r.date && r.date > g.last) g.last = r.date
      }
      const insMap = new Map(db.instruments.map(i => [i.id, i]))
      // 当前持有同样按统一代码汇总：两条来源记录的数量相加展示。
      const heldQty = g => db.holdings.filter(ho => (!accountId || ho.accountId === accountId) && (() => { const ins = insMap.get(ho.instrumentId); return ins && symKey(ins.symbol, ins.market) === g.key })()).reduce((s, ho) => s + (Number(ho.qty) || 0), 0)
      const q = query.trim().toLowerCase()
      const list = [...groups.values()].filter(g => !q || (g.symbol + ' ' + (g.name || '')).toLowerCase().includes(q)).sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')))
      const n = v => (Math.round(v * 100) / 100).toLocaleString('zh-CN')
      return h('div', { style: T.card(t) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('strong', null, '个股买卖 · ' + list.length + ' 只'),
          h('input', { value: query, onChange: e => setQuery(e.target.value), placeholder: '搜索代码 / 名称', 'aria-label': '搜索个股', style: { ...T.input(t), maxWidth: 240 } })),
        h('p', { style: { color: t.sub, fontSize: 12 } }, '按标的汇总该账户的历史买卖与分红税费。净现金 = 卖出 + 分红税费 − 买入；仍持有的部分不计入，缺少金额的记录不参与求和。点击一行查看逐笔明细。'),
        !list.length ? h('p', { style: { color: t.sub } }, '还没有可汇总的个股流水。') :
        h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 860 } },
          h('thead', null, h('tr', null, ['标的', '买入', '卖出', '买入金额', '卖出金额', '分红税费', '净现金', '当前持有', '区间'].map(x => T.th(x, t)))),
          h('tbody', null, list.flatMap(g => {
            const net = g.sellCash + g.income - g.buyCash, held = heldQty(g)
            const row = h('tr', { key: g.key, style: { cursor: 'pointer', background: open === g.key ? t.soft : undefined }, onClick: () => setOpen(open === g.key ? '' : g.key) },
              T.td(h('span', null, (open === g.key ? '▾ ' : '▸ ') + g.symbol, h('small', { style: { display: 'block', color: t.sub } }, [g.name, g.market, g.currency].filter(Boolean).join(' · '))), t),
              T.td(g.buys + ' 笔 · ' + n(g.buyQty), t), T.td(g.sells + ' 笔 · ' + n(g.sellQty), t),
              T.td(n(g.buyCash), t), T.td(n(g.sellCash), t), T.td(n(g.income), t),
              T.td(h('span', { style: { color: net >= 0 ? t.green : t.red } }, n(net), g.unknown ? h('small', { style: { display: 'block', color: t.terra } }, g.unknown + ' 笔缺金额') : null), t),
              T.td(held ? n(held) : '已清仓', t, { color: held ? t.text : t.sub }), T.td((g.first || '—') + ' → ' + (g.last || '—'), t, { fontSize: 11.5, color: t.sub }))
            return open === g.key ? [row, h('tr', { key: g.key + ':d' }, h('td', { colSpan: 9, style: { padding: '0 0 14px', borderBottom: '1px solid ' + t.border } }, h(HistoryTable, { t, rows: g.rows.slice(0, 300), showAction: false }), g.rows.length > 300 ? h('p', { style: { fontSize: 11, color: t.sub } }, '仅显示最近 300 笔') : null))] : [row]
          })))))
    }

    function HistoryImport({ t, state, busy, reload, initialAccountId, lockAccount }) {
      const [accountId, setAccountId] = React.useState(initialAccountId || '')
      const [method, setMethod] = React.useState('file'), [file, setFile] = React.useState(null), [text, setText] = React.useState('')
      const [currency, setCurrency] = React.useState(''), [from, setFrom] = React.useState(''), [to, setTo] = React.useState(''), [sheet, setSheet] = React.useState('')
      const [workbook, setWorkbook] = React.useState(null), [preview, setPreview] = React.useState(null), [page, setPage] = React.useState(0)
      const [caps, setCaps] = React.useState(null), [error, setError] = React.useState(''), [success, setSuccess] = React.useState(''), [working, setWorking] = React.useState('')
      const generation = React.useRef(0), mounted = React.useRef(true), committing = React.useRef(false), fileInput = React.useRef(null)
      React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++ } }, [])
      React.useEffect(() => {
        let live = true
        fetch('/portfolio/api/history/capabilities', { headers: { accept: 'application/json' } }).then(async r => { const data = await r.json(); if (!r.ok || !data.ok) throw new Error(data.error?.message || '无法读取回补能力'); if (live) setCaps(data) }).catch(e => { if (live) setError(e.message) })
        return () => { live = false }
      }, [])
      const reset = () => { generation.current++; setPreview(null); setPage(0); setError(''); setSuccess(''); setWorking('') }
      React.useEffect(() => { reset(); setAccountId(initialAccountId || '') }, [initialAccountId])
      const existing = state.ledger.accounts.find(a => a.id === accountId)
      const capability = caps?.accounts?.find(a => a.accountId === accountId)
      const apiAvailable = !!capability?.apiAvailable
      const maxBytes = Math.min(5 * 1024 * 1024, Number(caps?.limits?.maxFileBytes) || 5 * 1024 * 1024)
      const frozen = busy || working === 'commit'
      const change = setter => e => { if (committing.current) return; reset(); setter(e.target.value) }
      const summarySheet = name => /持仓|已平仓|已清仓|清仓|汇总|汇總|holding|position|closed|summary/i.test(name) && !/交易记录|交易紀錄|transaction/i.test(name)
      const chooseFile = async e => {
        if (committing.current) return
        const picked = e.target.files?.[0]; e.target.value = ''; if (!picked) return
        reset(); setFile(null); setText(''); setSheet(''); setWorkbook(null)
        const version = generation.current, current = () => mounted.current && generation.current === version
        if (picked.size > maxBytes) { setError('文件超过 ' + (maxBytes / 1024 / 1024).toFixed(1) + ' MiB，请拆分后导入'); return }
        if (!/\.(xlsx|csv|tsv|txt)$/i.test(picked.name)) { setError('请选择 XLSX、CSV 或 TSV 文件'); return }
        setWorking('read')
        try {
          const bytes = new Uint8Array(await picked.arrayBuffer()); if (!current()) return
          if (/\.xlsx$/i.test(picked.name)) {
            let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
            setFile({ fileName: picked.name, fileBase64: window.btoa(binary), size: picked.size })
          } else {
            let content = new TextDecoder('utf-8').decode(bytes)
            if (content.includes('\ufffd')) content = new TextDecoder('gb18030').decode(bytes)
            setText(content); setFile({ fileName: picked.name, size: picked.size })
          }
        } catch (e) { if (current()) setError('读取文件失败：' + e.message) }
        finally { if (current()) setWorking('') }
      }
      const inspect = async () => {
        if (frozen || working || !existing || !caps) return
        reset()
        if (method === 'api' && !apiAvailable) { setError(capability?.description || '此账户暂不支持 API 历史回补，请使用文件导入'); return }
        if (method === 'api' && (!from || !to)) { setError('API 回补需要填写开始和结束日期'); return }
        if (from && to && from > to) { setError('开始日期不能晚于结束日期'); return }
        if (method === 'file' && !file?.fileBase64 && !text.trim()) { setError('请选择文件或粘贴表格'); return }
        if (method === 'file' && !file?.fileBase64 && new TextEncoder().encode(text).length > maxBytes) { setError('文本超过文件大小上限，请拆分后导入'); return }
        if (method === 'file' && sheet && summarySheet(sheet)) { setError('持仓 / 已平仓汇总不是交易流水，请选择交易记录工作表'); return }
        const version = generation.current, current = () => mounted.current && generation.current === version
        setWorking('preview')
        try {
          const r = await post('history/preview', { accountId, method, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(method === 'file' ? { ...(file?.fileBase64 ? { fileBase64: file.fileBase64 } : { text }), ...(file?.fileName ? { fileName: file.fileName } : {}), ...(sheet ? { sheet } : {}), ...(currency ? { defaultCurrency: currency } : {}) } : {}) })
          if (!current()) return
          if (r.selectedSheet && summarySheet(r.selectedSheet)) throw new Error('服务返回了汇总工作表，请改选交易记录后重新预览')
          setPreview(r); setWorkbook({ sheets: r.sheets || [], ignoredSheets: r.ignoredSheets || [] }); setSheet(r.selectedSheet || sheet); setPage(0)
        } catch (e) { if (current()) setError(e.message) }
        finally { if (current()) setWorking('') }
      }
      const rows = preview?.rows || [], counts = preview?.summary || {}
      const conflicts = Math.max(Number(counts.conflict) || 0, rows.filter(row => row.status === 'conflict').length)
      const newCount = counts.new ?? rows.filter(row => row.status === 'new').length
      const invalid = (preview?.errors || []).length > 0 || conflicts > 0
      const commit = async () => {
        if (committing.current || frozen || working || !preview?.token || invalid || !newCount || !existing) return
        committing.current = true; setWorking('commit'); setError('')
        const version = generation.current, current = () => mounted.current && generation.current === version
        try {
          const r = await post('history/commit', { token: preview.token })
          if (!current()) { await reload(); return }
          setPreview(null); setText(''); setFile(null); setWorkbook(null); setSheet('')
          setSuccess('历史流水已归档：新增 ' + (r.result?.imported ?? 0) + ' 条，跳过重复 ' + (r.result?.duplicates ?? 0) + ' 条' + (r.result?.batchId ? ' · 批次 ' + r.result.batchId : '') + '。当前持仓未变。')
          await reload()
        } catch (e) { if (current()) { setError(e.message + '；请重新预览后再导入'); setPreview(null) } }
        finally { committing.current = false; if (current()) setWorking('') }
      }
      const pages = Math.max(1, Math.ceil(rows.length / 100)), observedFrom = counts.observedFrom || preview?.coverage?.observedFrom, observedTo = counts.observedTo || preview?.coverage?.observedTo
      const batches = (state.ledger.historyBatches || []).filter(batch => batch.accountId === accountId).slice().reverse()
      const field = (label, value, setter) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { type: 'date', value, disabled: frozen, onChange: change(setter), style: T.input(t) }))
      return h('div', null,
        h('section', { style: { ...T.card(t), marginBottom: 18 }, 'aria-label': '补充历史流水' },
          h('strong', { style: { fontSize: 17, fontWeight: 600 } }, lockAccount ? '补录账单' : '让历史，也回到账本'),
          h('p', { style: { color: t.sub, fontSize: 12, lineHeight: 1.8 } }, lockAccount ? '「同步」已自动读取来源接口能提供的全部流水。这里用于补录接口没有的记录（如银证转账），上传券商导出的账单文件，先预览再归档；不改变当前持仓，金额按原币照录。' : '选择已有账户，先预览、再归档。仅补充历史流水，不创建或绑定账户，也不改变当前持仓。原始金额按文件或来源原币照录，不做汇率换算。'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 } },
            lockAccount ? null : h('label', null, h('span', { style: T.label(t) }, '已有账户'), h('select', { value: accountId, disabled: frozen, onChange: change(setAccountId), style: T.input(t), 'aria-label': '历史回补账户' }, h('option', { value: '' }, '请选择已有账户'), state.ledger.accounts.map(a => h('option', { key: a.id, value: a.id }, a.name + ' · ' + a.currency)))),
            field(method === 'api' ? '开始日期（必填）' : '开始日期（可留空）', from, setFrom), field(method === 'api' ? '结束日期（必填）' : '结束日期（可留空）', to, setTo)),
          !state.ledger.accounts.length ? h('p', { style: { color: t.sub } }, '尚无已有账户，请先到数据源页导入账户，再补充历史。') : null,
          h('div', { style: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' } }, h('button', { style: T.btn(t, method === 'file'), disabled: frozen, 'aria-pressed': method === 'file', onClick: () => { if (!committing.current) { reset(); setMethod('file') } } }, '文件回补'), h('button', { style: T.btn(t, method === 'api'), disabled: frozen || !apiAvailable, title: capability?.description || '先选择支持历史 API 的已有账户', 'aria-pressed': method === 'api', onClick: () => { reset(); setMethod('api') } }, 'API 回补')),
          h('p', { style: { color: t.sub, fontSize: 12 } }, !caps ? '正在读取各账户回补能力…' : capability?.description || '此账户没有可用历史 API，可用券商导出文件补充历史流水。'),
          method === 'file' ? h('div', null,
            h('p', { style: { color: t.sub, fontSize: 12 } }, '支持 XLSX / CSV / TSV，最大 ' + (maxBytes / 1024 / 1024).toFixed(1) + ' MiB' + (caps?.limits?.maxRows ? '、' + caps.limits.maxRows + ' 行' : '') + '。日期均留空时读取全部可用流水。XLSX 优先选择「交易记录」；持仓和已平仓汇总不作为流水导入。源文件保持原样。'),
            h('div', { style: { display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
              h('button', { style: T.btn(t, false), disabled: frozen, onClick: () => fileInput.current?.click() }, working === 'read' ? '正在读取…' : '选择 XLSX / CSV / TSV'), h('input', { ref: fileInput, type: 'file', accept: '.xlsx,.csv,.tsv,.txt', disabled: frozen, style: { display: 'none' }, onChange: chooseFile }),
              file ? h('span', { style: { fontSize: 12, color: t.sub } }, file.fileName, ' · ', Math.ceil(file.size / 1024), ' KiB') : null,
              h('label', { style: { minWidth: 190 } }, h('span', { style: T.label(t) }, '文件缺少币种列时使用'), h('select', { value: currency, disabled: frozen, onChange: change(setCurrency), style: T.input(t), 'aria-label': '历史回补默认币种' }, [['','请选择（不自动推断）'],['CNY','CNY 人民币'],['HKD','HKD 港币'],['USD','USD 美元'],['CNH','CNH 离岸人民币']].map(([v, label]) => h('option', { key: v, value: v }, label)))),
              (workbook?.sheets || []).length > 1 ? h('label', null, h('span', { style: T.label(t) }, '交易工作表'), h('select', { value: sheet, disabled: frozen, onChange: change(setSheet), style: T.input(t), 'aria-label': '历史回补工作表' }, workbook.sheets.map(name => h('option', { key: name, value: name, disabled: summarySheet(name) }, name + (summarySheet(name) ? '（汇总，不导入）' : ''))))) : null),
            !file?.fileBase64 ? h('textarea', { value: text, disabled: frozen, onChange: e => { reset(); setFile(null); setWorkbook(null); setSheet(''); setText(e.target.value) }, rows: 6, placeholder: '也可粘贴含表头的 CSV / TSV 流水', 'aria-label': '历史流水文本', style: { ...T.input(t), fontFamily: 'monospace', resize: 'vertical' } }) : null,
            h('small', { style: { display: 'block', color: t.sub, marginTop: 8 } }, '币种列存在时保留原币；没有币种列时必须明确选择。不会根据港股代码或账户币种推断港元。')) : h('p', { style: { color: t.sub, fontSize: 12 } }, 'API 按所选账户能力读取，需要明确日期。来源可能限制可查历史；实际返回记录区间不代表完整覆盖。'),
          h('button', { style: { ...T.btn(t, true), marginTop: 16 }, disabled: frozen || !!working || !existing || !caps || (method === 'api' && !apiAvailable), onClick: inspect }, working === 'preview' ? '正在预览…' : '读取并预览')),
        error ? h('div', { role: 'alert', style: { ...T.card(t), color: t.red, marginBottom: 14 } }, error) : null,
        success ? h('div', { role: 'status', style: { ...T.card(t), color: t.accent, marginBottom: 14 } }, success) : null,
        preview ? h('section', { style: T.card(t), 'aria-label': '历史流水只读预览' },
          h('strong', { style: { fontSize: 16 } }, '只读预览 · ' + (counts.total ?? rows.length) + ' 条'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 } }, [['new','新增'],['duplicate','重复'],['conflict','冲突'],['outside','区间外']].map(([key,label]) => h('span', { key, style: { color: key === 'conflict' && conflicts ? t.red : t.sub } }, label + ' ', h('strong', { style: { color: key === 'conflict' && conflicts ? t.red : t.text } }, counts[key] ?? rows.filter(row => row.status === key).length)))),
          h('p', { style: { color: t.sub, fontSize: 12 } }, '类型分布：' + Object.entries(counts.byKind || rows.reduce((all,row) => { all[row.kind || 'other'] = (all[row.kind || 'other'] || 0) + 1; return all }, {})).map(([kind,count]) => (HISTORY_KINDS[kind] || kind) + ' ' + count).join(' · ')),
          h('p', { style: { color: t.sub, fontSize: 12 } }, '实际记录区间：' + (observedFrom || '无记录') + ' ～ ' + (observedTo || '无记录') + '。仅描述此次可见记录，不代表完整历史覆盖。'),
          preview.coverage?.note ? h('p', { style: { color: t.sub, fontSize: 12 } }, preview.coverage.note) : null,
          (preview.ignoredSheets || []).length ? h('p', { style: { color: t.sub, fontSize: 12 } }, '未导入工作表：' + preview.ignoredSheets.join('、')) : null,
          (preview.errors || []).map((item,i) => h('div', { key: 'e' + i, role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 6 } }, (item.row != null ? '第 ' + item.row + ' 行 ' : '') + (item.field ? item.field + '：' : '') + item.message)),
          (preview.warnings || []).length ? h('details', { style: { color: t.terra, fontSize: 12, marginTop: 10 } }, h('summary', { style: { cursor: 'pointer' } }, '导入提示 · ' + preview.warnings.length + ' 项（展开核对）'), preview.warnings.map((item,i) => h('div', { key: 'w' + i, style: { marginTop: 6 } }, typeof item === 'string' ? item : item.message))) : null,
          h('small', { style: { display: 'block', color: t.sub, marginTop: 10 } }, '费用未提供时显示「未知」；回购价格为利率。未知业务类型保留为其他，不丢弃原始类型。'),
          h(HistoryTable, { t, rows: rows.slice(page * 100, (page + 1) * 100), showStatus: true }),
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 } }, h('button', { style: T.btn(t, false), disabled: page === 0, onClick: () => setPage(page - 1) }, '上一页'), h('span', { style: { color: t.sub, fontSize: 12 } }, (page + 1) + ' / ' + pages + ' 页 · 每页 100 条'), h('button', { style: T.btn(t, false), disabled: page >= pages - 1, onClick: () => setPage(page + 1) }, '下一页')),
          invalid ? h('p', { style: { color: t.red, fontSize: 12 } }, '有错误或冲突，请修正后重新预览；本次不能导入。') : !newCount ? h('p', { style: { color: t.sub, fontSize: 12 } }, '没有新增记录，无需归档；重复和区间外记录已标出。') : null,
          h('button', { style: { ...T.btn(t, true), marginTop: 18 }, disabled: frozen || !!working || invalid || !preview.token || !newCount || !existing, onClick: commit }, working === 'commit' ? '正在归档…' : '确认归档 ' + newCount + ' 条历史流水'),
          h('small', { style: { display: 'block', color: t.sub, marginTop: 8 } }, '重复和区间外记录会跳过。始终只归档，不修改当前持仓。')) : null,
        batches.length ? h('details', { style: { ...T.card(t), marginTop: 18 } }, h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, '此账户回补记录 · ' + batches.length + ' 批次'), batches.map((batch,i) => h('div', { key: batch.id || batch.batchId || i, style: { marginTop: 14, color: t.sub, fontSize: 12 } }, h('strong', { style: { color: t.text } }, batch.id || batch.batchId || '历史批次'), ' · 新增 ' + (batch.imported ?? batch.result?.imported ?? '未知') + ' · 重复 ' + (batch.duplicates ?? batch.result?.duplicates ?? '未知'), h('div', null, '请求区间：' + (batch.requestedFrom || batch.coverage?.requestedFrom || batch.request?.from || '未指定') + ' ～ ' + (batch.requestedTo || batch.coverage?.requestedTo || batch.request?.to || '未指定')), h('div', null, '实际记录：' + (batch.observedFrom || batch.coverage?.observedFrom || batch.summary?.observedFrom || '未知') + ' ～ ' + (batch.observedTo || batch.coverage?.observedTo || batch.summary?.observedTo || '未知') + ' · 非完整覆盖证明')))) : null)
    }

    function DataSources({ t, state, call, busy, reload, openAccounts, openHistory, mode, initialChoice, editSource, reauthAuth, authorizations = [], onDone }) {
      const embedded = !!mode, reauth = reauthAuth || null
      const options = [
        ['manual', '文件导入', 'CSV / TSV 或粘贴表格', '↥'],
        ['ths', '同花顺', '官方 MCP · 一键授权', '同'],
        ['futu', '富途', '官方 MCP 浏览器授权 · 支持本机 OpenD', '富'],
        ['longbridge', '长桥', '官方 MCP 授权码连接', '长'],
        ['qieman', '且慢', '盈米官方 MCP · 长期 API Key', '且'],
        ['tiger', '老虎证券', '官方远程 MCP · 浏览器授权', '虎'],
        ['fosun', '复星证券', '星财富 OpenAPI · 长期密钥', '复'],
        ['ib', 'Interactive Brokers', '官方 Client Portal Gateway', 'IB'],
        ['custom', '高级 API / MCP', '标准化快照接口或只读工具', '⌘'],
      ]
      // 自动更新默认每天 21:00（用户要求把默认更新放到晚上 9 点）。
      const emptyForm = connector => ({ name: '', connector, transport: connector === 'custom' ? 'http' : 'native', lbInterface: 'mcp', futuInterface: 'mcp', accountId: '', portfolioId: '', thsBookType: 'common', brokerAccountId: '', scheduleKind: 'daily', scheduleTime: '21:00', scheduleMinutes: '15', enabled: true, host: '127.0.0.1', port: '33333', tls: false, tradeEnvironment: 'REAL', tradeMarket: 'HK', currency: 'HKD', gatewayUrl: connector === 'ib' ? 'https://localhost:5000/v1/api' : '', trustLocalGateway: false, mcpEndpoint: '', url: '', toolName: '', args: '{}', credentialRef: '' })
      const [choice, setChoice] = React.useState(reauth ? reauth.connector : (initialChoice || 'manual'))
      const [form, setForm] = React.useState(() => {
        if (reauth) return { ...emptyForm(reauth.connector), ...(reauth.config || {}), name: reauth.label || '', lbInterface: reauth.connector === 'longbridge' ? (reauth.transport === 'mcp' ? 'mcp' : 'sdk') : 'mcp', futuInterface: reauth.connector === 'futu' ? (reauth.transport === 'mcp' ? 'mcp' : 'sdk') : 'mcp' }
        return emptyForm(initialChoice && initialChoice !== 'manual' ? initialChoice : 'ths')
      })
      const [credentials, setCredentials] = React.useState({}), [sources, setSources] = React.useState([])
      const [loading, setLoading] = React.useState(true), [working, setWorking] = React.useState(''), [error, setError] = React.useState(''), [message, setMessage] = React.useState('')
      const [accounts, setAccounts] = React.useState([]), [warnings, setWarnings] = React.useState([]), [discovered, setDiscovered] = React.useState(false)
      const [login, setLogin] = React.useState(null)
      const [imported, setImported] = React.useState(null)
      const [auth, setAuth] = React.useState(reauth || null)
      const [authFromList, setAuthFromList] = React.useState(false)
      const lock = React.useRef(false), loginStart = React.useRef(0), generation = React.useRef(0), mounted = React.useRef(true), loginAttempt = React.useRef(0), adopted = React.useRef(0)
      React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; loginAttempt.current++ } }, [])
      const get = async path => { const r = await fetch('/portfolio/api/' + path, { headers: { accept: 'application/json' } }); const data = await r.json().catch(() => null); if (!r.ok || !data?.ok) throw new Error(data?.error?.message || (r.ok ? '读取失败' : '服务暂不可用（HTTP ' + r.status + '）')); return data }
      const accept = r => { if (mounted.current) setSources(r.sources || []) }
      React.useEffect(() => {
        let live = true
        get('sources').then(r => { if (live) accept(r) }).catch(e => { if (live) setError(e.message) }).finally(() => { if (live) setLoading(false) })
        const timer = setInterval(() => { if (!document.hidden && !lock.current) get('sources').then(r => { if (live && !lock.current) accept(r) }).catch(() => {}) }, 15000)
        return () => { live = false; clearInterval(timer) }
      }, [])
      React.useEffect(() => {
        if (!login || !['opening', 'waiting'].includes(login.status) || choice !== 'ths') return
        let live = true, inflight = false
        const attempt = loginAttempt.current, version = generation.current
        const current = () => live && mounted.current && attempt === loginAttempt.current && version === generation.current
        const timer = setInterval(async () => {
          if (inflight || !current()) return
          if (Date.now() - loginStart.current > 600000) { clearInterval(timer); setLogin({ status: 'error', message: '登录等待已超时，请重新发起。' }); return }
          inflight = true
          try { const r = await get('sources/login/status'); if (current()) setLogin({ status: r.status, message: r.message, authorizeUrl: r.authorizeUrl }) }
          catch (e) { if (current()) setLogin({ status: 'error', message: e.message }) }
          finally { inflight = false }
        }, 2000)
        return () => { live = false; clearInterval(timer) }
      }, [login?.status, choice])
      React.useEffect(() => {
        if (choice !== 'futu' || form.futuInterface !== 'mcp' || !['opening', 'waiting'].includes(login?.status)) return
        let live = true, inflight = false
        const attempt = loginAttempt.current, version = generation.current
        const current = () => live && mounted.current && attempt === loginAttempt.current && version === generation.current
        const timer = setInterval(async () => {
          if (inflight || !current()) return
          inflight = true
          try { const r = await get('sources/futu/mcp/status'); if (current() && r.status !== 'waiting') setLogin({ status: r.status, message: r.message }) }
          catch (e) { /* keep waiting; transient errors stay silent */ }
          finally { inflight = false }
        }, 2000)
        return () => { live = false; clearInterval(timer) }
      }, [login?.status, choice, form.futuInterface])
      const startFutuMcp = () => { if (disabled || lock.current) return; invalidate(); loginAttempt.current++; const attempt = loginAttempt.current; return act('futu-mcp', async current => { await post('sources/futu/mcp/start', { authId: auth?.id || reauth?.id }); if (!current() || attempt !== loginAttempt.current) return; const s = await get('sources/futu/mcp/status'); if (current()) setLogin({ status: s.status, message: s.message, authorizeUrl: s.authorizeUrl }) }) }
      const disabled = busy || loading || !!working
      const act = async (key, fn) => { if (lock.current || busy || loading || !mounted.current) return; const version = generation.current; const current = () => mounted.current && generation.current === version; lock.current = true; setWorking(key); setError(''); setMessage(''); try { await fn(current) } catch(e) { if (current()) setError(e.message || '操作失败') } finally { lock.current = false; if (mounted.current) setWorking('') } }
      const invalidate = () => { generation.current++; setLogin(null); setAccounts([]); setDiscovered(false); setWarnings([]); setImported(null) }
      const update = (key, value) => { setForm(old => ({ ...old, [key]: value, ...(['host','port','tls','tradeEnvironment','tradeMarket','currency','gatewayUrl','trustLocalGateway','lbInterface','futuInterface'].includes(key) ? { portfolioId: '', brokerAccountId: '' } : {}) })); if (['host','port','tls','tradeEnvironment','tradeMarket','currency','gatewayUrl','trustLocalGateway','lbInterface','futuInterface'].includes(key)) { invalidate(); if (!reauth) setAuth(null) } }
      const choose = id => { if (disabled) return; setChoice(id); setForm(emptyForm(id)); setCredentials({}); invalidate(); if (!reauth) setAuth(null); setAuthFromList(false); setError(''); setMessage(''); setLogin(null) }
      const cleanCredentials = () => Object.fromEntries(Object.entries(credentials).filter(([, value]) => typeof value === 'string' && value.trim()))
      // 预填来源记录里的 schedule；旧记录只有 intervalMinutes 时按它回退。
      const scheduleFields = source => {
        const schedule = source?.schedule
        if (schedule?.kind === 'interval' && Number.isInteger(schedule.minutes)) return { scheduleKind: 'interval', scheduleMinutes: String(schedule.minutes) }
        if (schedule?.kind === 'daily' && schedule.time) return { scheduleKind: 'daily', scheduleTime: schedule.time }
        if (Number.isInteger(source?.intervalMinutes)) return { scheduleKind: 'interval', scheduleMinutes: String(source.intervalMinutes) }
        return { scheduleKind: 'daily', scheduleTime: '21:00' }
      }
      const scheduleValue = () => {
        if (form.scheduleKind === 'interval') {
          const minutes = Number(form.scheduleMinutes)
          if (form.scheduleMinutes === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) throw new Error('同步间隔须为 0–1440 的整数分钟（0 = 仅手动）')
          return { kind: 'interval', minutes }
        }
        const time = String(form.scheduleTime || '')
        const match = /^(\d{2}):(\d{2})$/.exec(time)
        if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error('同步时间须为 HH:MM（00:00–23:59）')
        return { kind: 'daily', time }
      }
      const config = () => {
        const mcp = transportOf() === 'mcp'
        const source = { id: form.id, name: form.name.trim(), connector: choice, transport: choice === 'custom' ? form.transport : (mcp ? 'mcp' : 'native'), accountId: form.accountId, schedule: scheduleValue(), enabled: !!form.enabled }
        if (choice === 'ths') { source.portfolioId = form.portfolioId; source.thsBookType = form.thsBookType || 'common' }
        if (['futu','longbridge','qieman','tiger','fosun','ib'].includes(choice)) source.brokerAccountId = (choice === 'longbridge' && mcp) ? 'main' : form.brokerAccountId
        if (choice === 'futu' && !mcp) Object.assign(source, { host: form.host.trim(), port: Number(form.port), tls: !!form.tls, tradeEnvironment: form.tradeEnvironment, tradeMarket: form.tradeMarket, currency: form.currency })
        if (choice === 'futu' && mcp && form.currency) source.currency = form.currency
        if (choice === 'fosun') source.gatewayUrl = form.gatewayUrl.trim()
        if (choice === 'ib') Object.assign(source, { gatewayUrl: form.gatewayUrl.trim(), trustLocalGateway: !!form.trustLocalGateway })
        if (choice === 'custom') { if (form.transport === 'http') Object.assign(source, { url: form.url.trim(), credentialRef: form.credentialRef.trim() || undefined }); else { let args; try { args = JSON.parse(form.args) } catch (_) { throw new Error('工具参数须为有效 JSON 对象') }; if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('工具参数须为 JSON 对象'); Object.assign(source, { toolName: form.toolName.trim(), args }) } }
        return source
      }
      const payload = source => { const creds = cleanCredentials(); return { source, ...(Object.keys(creds).length ? { credentials: creds } : {}) } }
      const transportOf = () => {
        if (choice === 'custom') return form.transport
        if (choice === 'ths') {
          if (login?.status === 'ready') return 'mcp'
          if (credentials.cookie) return 'native'
          if (form.id && form.transport) return form.transport
          return 'mcp'
        }
        return (choice === 'qieman' || choice === 'tiger' || ((choice === 'longbridge' && form.lbInterface === 'mcp') || (choice === 'futu' && form.futuInterface === 'mcp')) ? 'mcp' : 'native')
      }
      const authSettings = () => {
        const out = {}
        if (choice === 'futu' && form.futuInterface === 'mcp') { if (form.currency) out.currency = form.currency }
        if (choice === 'futu' && form.futuInterface !== 'mcp') Object.assign(out, { host: form.host.trim(), port: Number(form.port), tls: !!form.tls, tradeEnvironment: form.tradeEnvironment, tradeMarket: form.tradeMarket, currency: form.currency })
        if (choice === 'fosun' && form.gatewayUrl.trim()) out.gatewayUrl = form.gatewayUrl.trim().replace(/\/+$/,'')
        if (choice === 'ib') Object.assign(out, { gatewayUrl: form.gatewayUrl.trim(), trustLocalGateway: !!form.trustLocalGateway })
        return out
      }
      const occupied = a => state.ledger.holdings.some(x => x.accountId === a.id) || state.ledger.trades.some(x => x.accountId === a.id) || (state.ledger.historyEvents || []).some(x => x.accountId === a.id)
      const eligible = a => !sources.some(s => s.accountId === a.id && s.id !== form.id) && (choice !== 'ths' && choice !== 'qieman' || a.currency === 'CNY') && (sources.some(s => s.id === form.id && s.accountId === a.id) || !occupied(a))
      // One login = one authorization. Every account listed under it is imported through this same record.
      const requestAuth = async (extra = {}) => {
        const creds = { ...cleanCredentials(), ...extra }
        const body = { auth: { authId: auth?.id || reauth?.id, connector: choice, transport: transportOf(), label: form.name.trim() || auth?.label || undefined, config: authSettings() }, ...(Object.keys(creds).length ? { credentials: creds } : {}) }
        const created = await post('sources/auth/create', body)
        const saved = created.auth || (created.authorizations || []).find(a => body.auth.authId ? a.id === body.auth.authId : a.connector === choice)
        if (!saved) throw new Error('授权已保存，但未返回授权信息')
        const found = await post('sources/auth/accounts', { authId: saved.id })
        const latest = await get('sources')
        const refreshed = (latest.authorizations || []).find(a => a.id === saved.id) || saved
        return { auth: refreshed, accounts: found.accounts || [], warnings: found.warnings || [], sources: latest }
      }
      const applyAuth = out => {
        setAuth(out.auth)
        setSources(out.sources.sources || [])
        setAccounts(out.accounts)
        setWarnings(out.warnings)
        setDiscovered(true)
        setCredentials({})
        adopted.current = loginAttempt.current
      }
      const adopt = () => act('adopt', async current => { const out = await requestAuth(); if (current()) applyAuth(out) })
      const discover = () => act('accounts', async current => {
        if (!auth && ['ths','futu'].includes(choice)) {
          if (choice === 'ths' && !credentials.cookie && login?.status !== 'ready') throw new Error('请先点击一键授权，在浏览器中同意访问投资账本')
          if (choice === 'futu' && form.futuInterface === 'mcp' && login?.status !== 'ready') throw new Error('请先完成富途浏览器授权')
        }
        if (!auth && choice === 'longbridge' && form.lbInterface === 'mcp' && !credentials.mcpToken) throw new Error('请先在 open.longbridge.com/connect 生成授权码并点击兑换')
        if (!auth && choice === 'qieman' && !credentials.apiKey && !credentials.bearerToken && login?.status !== 'ready') throw new Error('请先完成且慢浏览器授权（账户与资产工具只对 OAuth 授权开放）')
        if (!auth && choice === 'tiger' && !credentials.accessToken) throw new Error('请先完成老虎浏览器授权')
        if (!auth && choice === 'fosun' && !(credentials.apiKey && credentials.privateKey && credentials.serverPublicKey) && login?.status !== 'ready') throw new Error('请先扫码开通，或填入 API Key（ak_ 开头）、客户端私钥与服务端公钥')
        const out = await requestAuth()
        if (!current()) return
        applyAuth(out)
        if (!out.accounts.length) setMessage('授权已保存，但没有读到账户，请检查登录、凭据和连接设置。')
      })
      const startLogin = () => { if (disabled || lock.current) return; invalidate(); setForm(old => ({ ...old, portfolioId: '', brokerAccountId: '' })); loginAttempt.current++; const attempt = loginAttempt.current; return act('login', async current => { const r = await post('sources/login/start', { authId: auth?.id || reauth?.id || undefined, sourceId: form.id || undefined }); if (!current() || attempt !== loginAttempt.current) return; loginStart.current = Date.now(); setLogin({ status: r.status || 'opening', message: r.message, authorizeUrl: r.authorizeUrl }); }) }
      React.useEffect(() => {
        if (!['ths','futu','tiger','qieman','fosun'].includes(choice) || login?.status !== 'ready' || !loginAttempt.current || adopted.current === loginAttempt.current || working || loading || busy || lock.current) return
        if (choice === 'futu' && form.futuInterface !== 'mcp') return
        adopted.current = loginAttempt.current
        adopt()
      }, [choice, login?.status, working, loading, busy, form.futuInterface])
      const selected = accounts.find(a => String(a.id) === String(form[choice === 'ths' ? 'portfolioId' : 'brokerAccountId']))
      const boundSource = account => {
        if (typeof account.imported === 'boolean') return account.imported ? sources.find(s => s.id === account.sourceId) || { id: account.sourceId, accountId: account.accountId, name: account.accountName || account.name, connector: choice, transport: 'native' } : undefined
        return sources.find(s => s.connector === choice && String(s[choice === 'ths' ? 'portfolioId' : 'brokerAccountId']) === String(account.id) && (choice !== 'ths' || (s.thsBookType || 'common') === (account.thsType || 'common')) && (choice !== 'futu' || (s.tradeEnvironment || 'REAL') === form.tradeEnvironment))
      }
      const openImported = source => act('open-source', async current => { const r = await get('sources'); if (!current()) return; accept(r); const latest = r.sources?.find(s => s.id === source.id); if (latest) edit(latest); else throw new Error('此账户状态已变化，请重新读取账户列表') })
      const formFromAuth = target => ({ ...emptyForm(target.connector), ...(target.config || {}), name: target.label || '', lbInterface: target.connector === 'longbridge' ? (target.transport === 'mcp' ? 'mcp' : 'sdk') : 'mcp', futuInterface: target.connector === 'futu' ? (target.transport === 'mcp' ? 'mcp' : 'sdk') : 'mcp' })
      // Reuse a saved login instead of forcing another browser authorization.
      const pickAuthorization = target => act('pick-auth', async current => {
        const found = await post('sources/auth/accounts', { authId: target.id })
        if (!current()) return
        setForm(formFromAuth(target))
        setAuth({ ...target, accounts: found.accounts || target.accounts || [] })
        setAccounts(found.accounts || [])
        setWarnings(found.warnings || [])
        setDiscovered(true)
        setAuthFromList(true)
        setLogin(null)
        setCredentials({})
      })
      const [lbCode, setLbCode] = React.useState('')
      const exchangeLbCode = () => act('lb-exchange', async current => {
        const code = String(lbCode || '').trim()
        if (!code) throw new Error('请先在 open.longbridge.com/connect 生成授权码并粘贴到输入框')
        const r = await fetch('/portfolio/api/sources/longbridge/mcp/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
        const data = await r.json().catch(() => ({}))
        if (!r.ok || !data.ok) throw new Error(data.error?.message || '授权码兑换失败')
        const out = await requestAuth({ mcpToken: data.token })
        if (!current()) return
        setLbCode('')
        applyAuth(out)
      })
      const startFosunOnboard = () => {
        if (disabled || lock.current) return
        invalidate()
        loginAttempt.current++
        const attempt = loginAttempt.current
        return act('fosun-onboard', async current => {
          const r = await post('sources/fosun/onboard/start', { authId: auth?.id || reauth?.id, gatewayUrl: form.gatewayUrl.trim() || undefined })
          if (!current() || attempt !== loginAttempt.current) return
          setLogin({ status: r.status || 'waiting', message: r.message, openUrl: r.openUrl, qrDataUrl: r.qrDataUrl, expiresAt: r.expiresAt })
        })
      }
      React.useEffect(() => {
        if (choice !== 'fosun' || login?.status !== 'waiting') return
        let live = true, inflight = false
        const version = generation.current
        const current = () => live && mounted.current && version === generation.current
        const timer = setInterval(async () => {
          if (inflight || !current()) return
          inflight = true
          try {
            const r = await get('sources/fosun/onboard/status')
            if (current() && r.status !== 'waiting') setLogin({ status: r.status, message: r.message, openUrl: login?.openUrl, qrDataUrl: login?.qrDataUrl })
          } catch { /* keep waiting; transient polling errors stay silent */ }
          finally { inflight = false }
        }, 3000)
        return () => { live = false; clearInterval(timer) }
      }, [login?.status, choice])
      const completeFosunManual = () => act('fosun-complete', async () => {
        await post('sources/fosun/onboard/complete', { apiKey: (credentials.apiKey || '').trim(), serverPublicKey: (credentials.serverPublicKey || '').trim() })
      })
      const startQiemanAuth = () => {
        if (disabled || lock.current) return
        invalidate()
        loginAttempt.current++
        const attempt = loginAttempt.current
        return act('qieman-auth', async current => {
          const r = await post('sources/qieman/mcp/start', { authId: auth?.id || reauth?.id })
          if (!current() || attempt !== loginAttempt.current) return
          setLogin({ status: r.status || 'waiting', message: r.message, authorizeUrl: r.authorizeUrl })
        })
      }
      React.useEffect(() => {
        if (choice !== 'qieman' || login?.status !== 'waiting') return
        let live = true, inflight = false
        const version = generation.current
        const current = () => live && mounted.current && version === generation.current
        const timer = setInterval(async () => {
          if (inflight || !current()) return
          inflight = true
          try {
            const r = await get('sources/qieman/mcp/status')
            if (current() && r.status !== 'waiting') setLogin({ status: r.status, message: r.message, authorizeUrl: login?.authorizeUrl })
          } catch { /* keep waiting; transient polling errors stay silent */ }
          finally { inflight = false }
        }, 2000)
        return () => { live = false; clearInterval(timer) }
      }, [login?.status, choice])
      // 主路径：浏览器授权码流（官方 MCP 客户端同款），本机回环接回调。
      const startTigerAuth = () => {
        if (disabled || lock.current) return
        invalidate()
        loginAttempt.current++
        const attempt = loginAttempt.current
        return act('tiger-auth', async current => {
          const r = await post('sources/tiger/login/start', { authId: auth?.id || reauth?.id })
          if (!current() || attempt !== loginAttempt.current) return
          setLogin({ status: r.status || 'waiting', message: r.message, authorizeUrl: r.authorizeUrl })
        })
      }
      React.useEffect(() => {
        if (choice !== 'tiger' || login?.status !== 'waiting') return
        let live = true, inflight = false
        const version = generation.current
        const current = () => live && mounted.current && version === generation.current
        const timer = setInterval(async () => {
          if (inflight || !current()) return
          inflight = true
          try {
            const r = await get('sources/tiger/login/status')
            if (current() && r.status !== 'waiting') setLogin({ status: r.status, message: r.message, authorizeUrl: login?.authorizeUrl })
          } catch { /* keep waiting; transient polling errors stay silent */ }
          finally { inflight = false }
        }, 2000)
        return () => { live = false; clearInterval(timer) }
      }, [login?.status, choice])
      const selectAccount = account => { update(choice === 'ths' ? 'portfolioId' : 'brokerAccountId', String(account.id)); if (choice === 'ths') update('thsBookType', account.thsType || 'common'); if (!form.id) update('accountId', '') }
      const connect = () => act('connect', async current => {
        if (!auth) throw new Error('请先完成授权并读取账户')
        if (!selected || !discovered) throw new Error('请先明确选择一个来源账户')
        if (boundSource(selected)) throw new Error('此来源账户已导入，可以继续导入这个授权下的其他账户')
        const source = { authId: auth.id, [choice === 'ths' ? 'portfolioId' : 'brokerAccountId']: String(selected.id), schedule: scheduleValue(), enabled: !!form.enabled }
        if (choice === 'ths') source.thsBookType = selected.thsType || form.thsBookType || 'common'
        const r = await post('sources/connect', { source })
        if (!current()) return
        setCredentials({}); setImported(r.account || null); setForm(old => ({ ...old, portfolioId: '', brokerAccountId: '' }))
        setMessage(r.alreadyImported ? '此账户已经导入，可以继续导入这个授权下的其他账户。' : '已导入「' + (r.account?.name || selected.name) + '」。可以继续导入这个授权下的其他账户，或点「完成」。')
        const latest = await get('sources')
        if (!current()) return
        const refreshed = (latest.authorizations || []).find(a => a.id === auth.id)
        if (refreshed) setAuth(refreshed)
        setSources(latest.sources || [])
        const found = await post('sources/auth/accounts', { authId: auth.id })
        if (!current()) return
        setAccounts(found.accounts || []); setWarnings(found.warnings || [])
        await reload()
      })
      const save = () => act('save', async current => {
        if (!form.name.trim()) throw new Error('请填写连接名称')
        const account = state.ledger.accounts.find(a => a.id === form.accountId)
        if (!account || !eligible(account)) throw new Error('请选择可绑定的专用空账户；可先到「账户」页创建')
        if (choice !== 'custom' && !(choice === 'ths' ? form.portfolioId : form.brokerAccountId)) throw new Error('请先读取来源账户，并明确选择要同步的账户')
        if (choice === 'futu' && form.futuInterface !== 'mcp' && (!form.host.trim() || !Number.isInteger(Number(form.port)) || Number(form.port) < 1 || Number(form.port) > 65535)) throw new Error('请填写 OpenD 地址和有效端口')
        if (choice === 'custom' && form.transport === 'http') { let u; try { u = new URL(form.url.trim()) } catch (_) { throw new Error('请填写有效的快照接口 URL') }; if (!['http:','https:'].includes(u.protocol) || u.username || u.password) throw new Error('接口仅支持 HTTP(S)，地址内不可含凭据'); if (form.credentialRef && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(form.credentialRef)) throw new Error('凭据引用须为环境变量名称') }
        if (choice === 'custom' && form.transport === 'mcp' && !form.toolName.trim()) throw new Error('请填写完整的只读 MCP 工具名')
        const r = await post('sources/save', payload(config())); if (!current()) return; accept(r); setCredentials({}); setForm(emptyForm(choice)); invalidate(); setMessage('连接已保存。'); if (onDone) onDone(r)
      })
      const edit = source => { setChoice(source.connector); setForm({ ...emptyForm(source.connector), ...source, lbInterface: source.connector === 'longbridge' ? (source.transport === 'mcp' ? 'mcp' : 'sdk') : emptyForm(source.connector).lbInterface, futuInterface: source.connector === 'futu' ? (source.transport === 'mcp' ? 'mcp' : 'sdk') : emptyForm(source.connector).futuInterface, args: JSON.stringify(source.args || {}, null, 2), ...scheduleFields(source) }); setCredentials({}); invalidate(); setLogin(null); setMessage('凭据留空将保留已保存的凭据。'); setError('') }
      React.useEffect(() => { if (mode === 'edit' && editSource) edit(editSource) }, [])
      const safeSource = source => {
        const allowed = ['id','name','connector','transport','accountId','intervalMinutes','schedule','enabled','portfolioId','thsBookType','host','port','tls','tradeEnvironment','tradeMarket','currency','brokerAccountId','mcpEndpoint','gatewayUrl','trustLocalGateway','url','toolName','args','credentialRef']
        return Object.fromEntries(allowed.filter(key => source[key] !== undefined).map(key => [key,source[key]]))
      }
      const sync = source => act('sync:' + source.id, async current => { await post('sources/sync', { id: source.id }); if (!current()) return; await reload(); if (!current()) return; const r = await get('sources'); if (!current()) return; accept(r); setMessage('「' + source.name + '」已同步，请核对来源警告与行情日期。') })
      const syncAll = () => act('sync-all', async current => {
        const r = await post('sources/sync-all', {})
        if (!current()) return
        const results = r.results || [], failed = results.filter(x => !x.ok)
        await reload(); if (!current()) return
        const latest = await get('sources'); if (!current()) return; accept(latest)
        setMessage(failed.length
          ? '已同步 ' + (results.length - failed.length) + ' 个来源；' + failed.length + ' 个失败：' + failed.map(x => (x.name || x.id) + '：' + (x.error || '未知错误')).join('；')
          : '已同步 ' + results.length + ' 个来源，请核对来源警告与行情日期。')
      })
      const toggle = source => act('toggle:' + source.id, async current => { const r = await post('sources/save', { source: { ...safeSource(source), enabled: !source.enabled } }); if (!current()) return; accept(r); setMessage(source.enabled ? '自动同步已停止。' : '连接已启用；按设置的每天定时或固定间隔执行。') })
      const remove = source => { if (!window.confirm('移除「' + source.name + '」连接？已同步的账户数据会保留。')) return; act('remove:' + source.id, async current => { await post('sources/remove', { id: source.id }); if (!current()) return; const r = await get('sources'); if (!current()) return; accept(r); if (form.id === source.id) { setForm(emptyForm(choice)); setCredentials({}); invalidate() }; setMessage('连接已移除，账户数据已保留。') }) }
      const warningText = w => typeof w === 'string' ? w : w?.message || JSON.stringify(w)
      const dateText = value => { if (!value) return '尚无记录'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('zh-CN') }
      const loginText = (status, message, labels) => { const label = (labels || {})[status] || status || ''; return label + (message && message !== label ? ' · ' + message : '') }
      const field = (label, key, props) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { value: form[key] || '', onChange: e => update(key, e.target.value), disabled, style: T.input(t), ...props }))
      const secret = (label, key) => h('label', null, h('span', { style: T.label(t) }, label), h('input', { type: 'password', value: credentials[key] || '', onChange: e => { setCredentials(old => ({ ...old, [key]: e.target.value })); invalidate(); setForm(old => ({ ...old, portfolioId: '', brokerAccountId: '' })) }, placeholder: form.id ? '留空保留已保存凭据' : '仅发送到本机服务端', autoComplete: 'new-password', spellCheck: false, disabled, style: T.input(t) }))
      const selectField = (label, key, values) => h('label', null, h('span', { style: T.label(t) }, label), h('select', { value: form[key], onChange: e => update(key, e.target.value), disabled, style: T.input(t) }, values.map(([value, name]) => h('option', { key: value, value }, name))))
      const check = (label, key) => h('label', { style: { display: 'flex', alignItems: 'center', gap: 7, color: t.sub, fontSize: 12 } }, h('input', { type: 'checkbox', checked: !!form[key], disabled, onChange: e => update(key, e.target.checked) }), label)
      const scheduleControl = () => h('div', { style: { display: 'grid', gap: 10 } },
        selectField('更新方式', 'scheduleKind', [['daily', '每天定时'], ['interval', '固定间隔']]),
        form.scheduleKind === 'interval'
          ? field('更新间隔（分钟）', 'scheduleMinutes', { type: 'number', min: 0, max: 1440, placeholder: '0 = 仅手动；默认 15' })
          : field('更新时间（本机时区）', 'scheduleTime', { type: 'time' }))
      const scheduleSummary = source => {
        const schedule = source.schedule
        if (schedule?.kind === 'interval') return schedule.minutes > 0 ? '每 ' + schedule.minutes + ' 分钟' : '仅手动同步'
        if (schedule?.kind === 'daily' && schedule.time) return '每天 ' + schedule.time
        if (Number.isInteger(source.intervalMinutes)) return source.intervalMinutes > 0 ? '每 ' + source.intervalMinutes + ' 分钟' : '仅手动同步'
        return '每天 21:00'
      }
      const accountKey = choice === 'ths' ? 'portfolioId' : 'brokerAccountId'
      const thsBookLabel = a => a.thsType === 'ijj' ? '爱基金' : a.thsType === 'manFund' ? '基金账本' : null
      const descriptions = {
        ths: '同花顺投资账本官方 MCP。点「一键授权」会打开系统浏览器，登录同花顺并同意后，本机保存授权并读取股票、ETF 与爱基金 / 基金账本。授权会记住，过期自动续期。',
        futu: '两种接入：官方 MCP（推荐）在浏览器完成富途授权，插件自动读取持仓、余额与流水，无需安装 OpenD；或本机 OpenD 直连（需启用 WebSocket，核对交易环境、市场和资金币种）。不需要其他 DSH 插件。',
        longbridge: '官方 MCP 接入：在 open.longbridge.com/connect 生成一次性授权码，兑换后自动读取持仓、余额与流水；也可改用 OpenAPI 凭据（App Key / Secret / Access Token）。不需要其他 DSH 插件。',
        qieman: '盈米 / 且慢官方 MCP。点「浏览器授权」用且慢账号登录，插件通过官方 OAuth（动态注册 + PKCE + 本机回环）获取长期凭据并自动续期，读取总账户 / 子账户的基金持仓、资产与收益。且慢不提供逐笔流水，历史记录可用账单文件补录。',
        tiger: '老虎官方远程 MCP（mcp.tigerfintech.com）。点「浏览器授权」登录老虎账户、勾选全部 5 项权限并选择授权账户；官方 OAuth（动态注册 + PKCE + 本机回环）与官方客户端同款。授权记录最长 15 天，到期后重新授权一次即可。无需安装 OpenD。',
        fosun: '复星证券 / 星财富官方 OpenAPI（默认网关 openapi.fosunxcz.com）。点「扫码开通」，用星财富 App 扫码完成授权，插件本机生成密钥对并自动保存 API Key、服务端公钥与客户端私钥；之后按官方 ECDH + 签名 + AES-GCM 协议读取账户、持仓、现金与资金流水。',
        ib: '需先启动并登录官方 IB Client Portal Gateway。本插件使用其账户接口；本地自签名证书须明确勾选信任。',
        custom: '高级选项：连接标准化持仓快照接口或已有只读 MCP 工具。请勿将密钥写入 URL 或工具参数。',
      }
      return h('div', { className: 'wealth-source-panel' },
        embedded ? null : h('p', { style: { color: t.sub, fontSize: 12, lineHeight: 1.8, margin: '0 0 12px' } }, '把分散的资产，带回同一个视野。券商与基金平台（同花顺、富途、长桥、且慢、老虎、复星、IB）均原生接入；也可随时手动导入。'),
        embedded ? null : h('div', { className: 'wealth-source-options' }, options.map(([id, name, description, badge]) => h('button', { key: id, disabled, 'aria-pressed': choice === id, onClick: () => choose(id), style: { ...T.card(t), textAlign: 'left', cursor: 'pointer', color: t.text, padding: 15, minWidth: 0, borderColor: choice === id ? t.accent : t.border, background: choice === id ? t.soft : t.card } }, h('span', { className: 'wealth-account-badge', style: { width: 30, height: 30, borderRadius: 9, fontSize: 12 } }, badge), h('strong', { style: { display: 'block', fontSize: 12, margin: '12px 0 5px' } }, name), h('span', { style: { color: t.sub, fontSize: 10, lineHeight: 1.6 } }, description)))),
        error ? h('div', { role: 'alert', style: { ...T.card(t), color: t.red, marginBottom: 12 } }, error) : null,
        message ? h('div', { role: 'status', style: { ...T.card(t), color: t.accent, marginBottom: 12, fontSize: 12 } }, message) : null,
        auth ? h('div', { style: { ...T.card(t), borderColor: t.green, marginBottom: 12, background: t.panel } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
            h('strong', { style: { color: t.green, fontSize: 13 } }, authFromList ? '✓ 已选择已有授权' : '✓ 授权成功'),
            h('span', { style: { fontSize: 12 } }, auth.label || CONNECTOR_LABEL[auth.connector] || auth.connector),
            h('span', { style: { fontSize: 11, color: t.sub } }, (auth.authorizedAt ? dateTimeText(auth.authorizedAt) + ' · ' : '') + (accounts.length ? accounts.length + ' 个账户' : '尚未读取账户'))),
          h('div', { style: { fontSize: 11, color: t.sub, marginTop: 6 } }, authFromList ? '这是之前保存的登录，可以直接导入它的子账户；要换账号请点下面的「重新授权」。' : '这个登录会保留在「账户 → 授权账号」；以后可以直接导入它的其他子账户，不需要重新授权。')) : null,
        loading ? h('p', { role: 'status', style: { color: t.sub } }, '正在读取连接…') : null,
        choice === 'manual' ? h(Input, { t, state, call, busy: disabled, openHistory }) : h('section', { style: { ...T.card(t), marginBottom: 22 }, 'aria-label': '数据源连接配置' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' } }, h('strong', { style: { fontSize: 15 } }, (form.id ? '编辑连接 · ' : '连接 · ') + options.find(x => x[0] === choice)?.[1]), form.id && !embedded ? h('button', { style: T.btn(t, false), disabled, onClick: () => choose(choice) }, '取消编辑') : null),
          h('p', { style: { color: t.sub, fontSize: 12, lineHeight: 1.8 } }, descriptions[choice]),
          choice !== 'custom' && !form.id && !reauth && authorizations.some(a => a.connector === choice) ? h('div', { style: { border: '1px solid ' + t.border, borderRadius: 12, padding: 12, margin: '14px 0 0', background: t.panel }, 'aria-label': '已有授权' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
              h('strong', { style: { fontSize: 12 } }, '已有授权 · ' + authorizations.filter(a => a.connector === choice).length),
              h('span', { style: { fontSize: 11, color: t.sub } }, '直接用上次的登录导入，不必重新授权')),
            authorizations.filter(a => a.connector === choice).map(a => {
              const list = a.accounts || []
              const importedCount = list.filter(account => authImportedSource(a, sources, account)).length
              const active = auth?.id === a.id
              const stateText = a.lastError ? '授权异常' : a.credentialsConfigured ? '已授权' : '待重新授权'
              return h('div', { key: a.id, style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', border: '1px solid ' + (active ? t.accent : t.border), borderRadius: 9, background: active ? t.soft : t.card, marginTop: 6 } },
                h('div', { style: { minWidth: 0, flex: 1 } },
                  h('div', { style: { fontSize: 12 } }, a.label || CONNECTOR_LABEL[a.connector] || a.connector),
                  h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 2 } }, stateText + ' · ' + (list.length ? list.length + ' 个账户' : '尚未读取账户') + (importedCount ? ' · 已导入 ' + importedCount : ''))),
                h('button', { style: { ...T.btn(t, false), padding: '3px 9px', minHeight: 26 }, disabled: disabled || active, onClick: () => pickAuthorization(a) }, working === 'pick-auth' ? '读取中…' : active ? '当前授权' : '使用此授权'),
                h('button', { style: { ...T.btn(t, false), padding: '3px 9px', minHeight: 26, color: t.red }, disabled: disabled || (a.sources || []).length > 0, title: (a.sources || []).length ? '先移除这个授权下的已导入账户' : '移除这条授权（连同保存的凭据）', onClick: () => { if (window.confirm('移除授权「' + (a.label || CONNECTOR_LABEL[a.connector] || a.connector) + '」？其保存的凭据会一并删除。')) act('remove-auth:' + a.id, async () => { await post('sources/auth/remove', { authId: a.id }); if (auth?.id === a.id) { setAuth(null); setAuthFromList(false) } const r = await get('sources'); accept(r) }) } }, '移除'))
            })) : null,
          choice !== 'custom' && !form.id ? h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: t.sub, margin: '18px 0' }, 'aria-label': '导入步骤' }, h('strong', { style: { color: !discovered ? t.accent : t.sub } }, '1 登录 / 授权'), h('strong', { style: { color: discovered && !selected ? t.accent : t.sub } }, '2 选择来源账户'), h('strong', { style: { color: selected ? t.accent : t.sub } }, '3 导入账户')) : null,
          form.id || choice === 'custom' ? h('div', { className: 'wealth-source-fields', style: { marginTop: 16 } },
            field('连接名称', 'name', { placeholder: '如 我的港股账户', maxLength: 120 }),
            form.id ? h('div', null, h('span', { style: T.label(t) }, '已导入账户'), h('div', { style: { paddingTop: 8, fontSize: 12 } }, state.ledger.accounts.find(a => a.id === form.accountId)?.name || form.accountId)) : h('label', null, h('span', { style: T.label(t) }, '使用账户'), h('select', { value: form.accountId, disabled, onChange: e => update('accountId', e.target.value), style: T.input(t) }, h('option', { value: '' }, '请选择专用空账户'), state.ledger.accounts.filter(eligible).map(a => h('option', { key: a.id, value: a.id }, a.name + ' · ' + a.currency)))),
            scheduleControl()) : null,
          choice === 'custom' && !form.id ? h('div', { style: { marginTop: 12, color: t.sub, fontSize: 11 } }, '高级接口使用专用空账户。', h('button', { disabled, onClick: openAccounts, style: { ...T.btn(t, false), marginLeft: 8 } }, '创建本地账户 ↗')) : null,
          choice === 'ths' ? h('div', { style: { marginTop: 18 } },
            h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } }, h('button', { style: T.btn(t, true), disabled: disabled || ['opening','waiting'].includes(login?.status), onClick: startLogin }, ['opening','waiting'].includes(login?.status) ? '等待浏览器授权…' : login?.status === 'ready' || auth ? '重新授权' : '一键授权'), h('span', { style: { color: login?.status === 'error' ? t.red : login?.status === 'ready' ? t.accent : t.sub, fontSize: 11 }, role: 'status' }, login ? loginText(login.status, login.message, { opening: '正在打开授权页面', waiting: '请在浏览器完成同花顺授权', ready: '投资账本已连接，可读取账本', error: '授权未完成' }) : '推荐：点一次即可，浏览器里登录并同意')),
            login?.authorizeUrl && ['opening','waiting'].includes(login.status) ? h('p', { style: { marginTop: 8, fontSize: 11 } }, h('a', { href: login.authorizeUrl, target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '如果没有自动打开，点这里完成同花顺授权 ↗')) : null,
            h('div', { className: 'wealth-source-fields', style: { marginTop: 14 } }, secret('备用：同花顺 Cookie / session', 'cookie')),
            h('small', { style: { display: 'block', marginTop: 8, color: t.sub, fontSize: 11, lineHeight: 1.7 } }, '备用方式：在你已登录投资账本的浏览器里按 F12 → 网络，随便选一个请求，把请求头里整段 Cookie 复制粘贴到这里（留空则保留已保存的值）。平时用上面的「一键授权」就够了。')) : null,
          choice === 'futu' ? h('div', { style: { marginTop: 18 } },
            selectField('接入方式', 'futuInterface', [['mcp','官方 MCP（浏览器授权，推荐）'],['sdk','本机 OpenD（WebSocket）']]),
            form.futuInterface === 'mcp' ? h('div', { style: { marginTop: 12 } },
              h('div', { className: 'wealth-source-fields' }, selectField('资金币种（无标的资金流水用，可选）', 'currency', [['HKD','HKD 港币'],['USD','USD 美元'],['CNH','CNH 离岸人民币']])),
              h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } },
                h('button', { style: T.btn(t, false), disabled: disabled || ['opening','waiting'].includes(login?.status), onClick: startFutuMcp }, working === 'futu-mcp' ? '正在打开授权…' : ['opening','waiting'].includes(login?.status) ? '等待浏览器授权…' : login?.status === 'ready' || auth || credentials.mcpToken ? '重新授权' : '浏览器授权'),
                h('span', { style: { color: login?.status === 'error' ? t.red : login?.status === 'ready' ? t.accent : t.sub, fontSize: 11 }, role: 'status' }, login ? loginText(login.status, login.message, { opening: '正在打开授权页面', waiting: '请在浏览器完成富途授权', ready: '富途授权已保存，可读取账户', error: '授权未完成' }) : credentials.mcpToken ? '✓ 已获得 MCP Token' : '授权后会自动读取持仓、余额与流水')),
              login?.authorizeUrl && ['opening','waiting'].includes(login.status) ? h('p', { style: { marginTop: 8, fontSize: 11 } }, h('a', { href: login.authorizeUrl, target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '如果没有自动打开，点这里完成富途授权 ↗')) : null) :
            h('div', { className: 'wealth-source-fields', style: { marginTop: 12 } }, field('OpenD 主机', 'host'), field('WebSocket 端口', 'port', { type: 'number', min: 1, max: 65535 }), selectField('交易环境', 'tradeEnvironment', [['REAL','真实账户'],['SIMULATE','模拟账户']]), selectField('交易市场', 'tradeMarket', [['HK','香港 HK'],['US','美国 US'],['CN','沪深 CN']]), selectField('资金币种', 'currency', [['HKD','HKD 港币'],['USD','USD 美元'],['CNH','CNH 离岸人民币']]), secret('OpenD WebSocket Key（可选）', 'websocketKey'), check('通过 TLS 连接 OpenD', 'tls'))) : null,
          choice === 'longbridge' ? h('div', { style: { marginTop: 18 } },
            selectField('接入方式', 'lbInterface', [['mcp','官方 MCP（授权码，推荐）'],['sdk','OpenAPI 凭据（App Key / Secret / Token）']]),
            form.lbInterface === 'mcp' ? h('div', { style: { marginTop: 12 } },
              h('div', { className: 'wealth-source-fields', style: { marginTop: 10 } }, h('label', null, h('span', { style: T.label(t) }, '长桥授权码'), h('input', { value: lbCode, onChange: e => { setLbCode(e.target.value); invalidate() }, placeholder: '在 open.longbridge.com/connect 生成，10 分钟内有效', autoComplete: 'off', spellCheck: false, disabled, style: T.input(t) }))),
              h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } },
                h('button', { style: T.btn(t, false), disabled, onClick: exchangeLbCode }, working === 'lb-exchange' ? '兑换中…' : credentials.mcpToken || auth ? '重新兑换授权码' : '兑换授权码'),
                credentials.mcpToken ? h('span', { style: { color: t.accent, fontSize: 11 } }, '✓ 已获得 MCP Token') : h('span', { style: { color: t.sub, fontSize: 11 } }, h('a', { href: 'https://open.longbridge.com/connect', target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '打开 open.longbridge.com/connect ↗'), ' 生成授权码后兑换'))) :
            h('div', { className: 'wealth-source-fields', style: { marginTop: 18 } }, secret('App Key', 'appKey'), secret('App Secret', 'appSecret'), secret('Access Token', 'accessToken'))) : null,
          choice === 'qieman' ? h('div', { style: { marginTop: 18 } },
            h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } },
              h('button', { style: T.btn(t, false), disabled: disabled || login?.status === 'waiting', onClick: startQiemanAuth }, working === 'qieman-auth' ? '正在准备授权…' : login?.status === 'waiting' ? '等待浏览器授权…' : credentials.bearerToken || auth ? '重新授权' : '浏览器授权（读取账户）'),
              h('span', { style: { color: login?.status === 'error' ? t.red : login?.status === 'ready' ? t.accent : t.sub, fontSize: 11 }, role: 'status' }, login ? loginText(login.status, login.message, { waiting: '请在浏览器完成且慢登录并授权', ready: '且慢授权已保存，可读取账户', error: '授权未完成' }) : credentials.bearerToken ? '✓ 已获得且慢 Token' : '授权一次后自动续期，无需重复登录')),
            login?.authorizeUrl && login?.status === 'waiting' ? h('p', { style: { marginTop: 8, fontSize: 11 } }, h('a', { href: login.authorizeUrl, target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '如果没有自动打开，点这里完成且慢授权 ↗')) : null,
            h('details', { style: { marginTop: 10, fontSize: 12, color: t.sub } }, h('summary', { style: { cursor: 'pointer' } }, '研究工具 API Key（可选，读不到账户资产）'), h('div', { style: { marginTop: 10 } }, secret('且慢 MCP API Key', 'apiKey'), secret('Bearer Token', 'bearerToken'))),
            h('small', { style: { display: 'block', marginTop: 10, color: t.sub, fontSize: 11 } }, '「账户与资产」工具只对且慢账号的 OAuth 授权开放；API Key（ai.yingmi.com 申请）只能调用基金研究类工具。授权后会列出总账户与各子账户（盈米宝 / 四笔钱）。')) : null,
          choice === 'tiger' ? h('div', { style: { marginTop: 18 } },
            h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } },
              h('button', { style: T.btn(t, false), disabled: disabled || login?.status === 'waiting', onClick: startTigerAuth }, working === 'tiger-auth' ? '正在准备授权…' : login?.status === 'waiting' ? '等待浏览器授权…' : credentials.accessToken || auth ? '重新授权' : '浏览器授权'),
              h('span', { style: { color: login?.status === 'error' ? t.red : login?.status === 'ready' ? t.accent : t.sub, fontSize: 11 }, role: 'status' }, login ? loginText(login.status, login.message, { waiting: '请在浏览器完成授权', ready: '老虎授权已保存，可读取账户', error: '授权未完成' }) : credentials.accessToken ? '✓ 已获得老虎 Token' : '授权后自动续期，无需反复登录')),
            login?.authorizeUrl && login?.status === 'waiting' ? h('div', { style: { marginTop: 10, padding: 10, border: '1px solid ' + t.border, borderRadius: 10, background: t.panel, fontSize: 12 } },
              h('div', null, h('a', { href: login.authorizeUrl, target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, '打开老虎授权页面 ↗')),
              h('div', { style: { marginTop: 6, color: t.sub, fontSize: 11 } }, '登录后请勾选全部 5 项权限（基础数据 / 行情 / 资讯 / 账户信息 / 交易查询）、选择要导入的账户并确认；完成后自动返回本页。')) : null) : null,
          choice === 'fosun' ? h('div', { style: { marginTop: 18 } },
            h('div', { className: 'wealth-source-actions', style: { alignItems: 'center' } },
              h('button', { style: T.btn(t, false), disabled: disabled || login?.status === 'waiting', onClick: startFosunOnboard }, working === 'fosun-onboard' ? '正在签发开通码…' : login?.status === 'waiting' ? '等待扫码开通…' : credentials.apiKey || auth ? '重新扫码开通' : '扫码开通'),
              h('span', { style: { color: login?.status === 'error' ? t.red : login?.status === 'ready' ? t.accent : t.sub, fontSize: 11 }, role: 'status' }, login ? loginText(login.status, login.message, { waiting: '请在手机上完成开通后自动返回', ready: '复星开通完成，凭据已保存', error: '开通未完成' }) : credentials.apiKey ? '✓ 已保存复星凭据' : '扫码后自动生成本机密钥并保存三元组')),
            login?.openUrl && login?.status === 'waiting' ? h('div', { style: { marginTop: 10, padding: 12, border: '1px solid ' + t.border, borderRadius: 10, background: t.panel, fontSize: 12, display: 'flex', gap: 12, alignItems: 'flex-start' } },
              login?.qrDataUrl ? h('img', { src: login.qrDataUrl, alt: '复星 OpenAPI 开通二维码', width: 132, height: 132, style: { borderRadius: 8, border: '1px solid ' + t.border } }) : null,
              h('div', { style: { minWidth: 0 } },
                h('div', null, '用「星财富」App 扫码，或在手机浏览器打开：'),
                h('div', { style: { marginTop: 4, wordBreak: 'break-all', fontSize: 11 } }, h('a', { href: login.openUrl, target: '_blank', rel: 'noreferrer', style: { color: t.accent } }, login.openUrl)),
                h('div', { style: { marginTop: 6, color: t.sub, fontSize: 11 } }, '完成后回到本页，凭据（API Key、服务端公钥、本机私钥）会自动保存。'))) : null,
            login?.status === 'waiting' ? h('div', { style: { marginTop: 10, padding: 12, border: '1px solid ' + t.border, borderRadius: 10, background: t.panel } },
              h('div', { style: { fontSize: 12, fontWeight: 600 } }, '手机页面已显示 Key 和公钥？直接粘贴完成（私钥无需输入）'),
              h('div', { style: { marginTop: 8, display: 'grid', gap: 8 } },
                secret('API Key（ak_ 开头）', 'apiKey'),
                h('label', null, h('span', { style: T.label(t) }, '服务端公钥（PEM）'), h('textarea', { value: credentials.serverPublicKey || '', onChange: e => setCredentials(old => ({ ...old, serverPublicKey: e.target.value })), placeholder: '-----BEGIN PUBLIC KEY-----', rows: 3, spellCheck: false, disabled, style: { ...T.input(t), fontFamily: 'monospace', resize: 'vertical' } }))),
              h('button', { style: { ...T.btn(t, true), marginTop: 8 }, disabled: busy || !!working || !(credentials.apiKey || '').trim() || !(credentials.serverPublicKey || '').includes('BEGIN PUBLIC KEY'), onClick: completeFosunManual }, working === 'fosun-complete' ? '校验中…' : '校验并完成开通')) : null,
            h('div', { className: 'wealth-source-fields', style: { marginTop: 12 } },
              field('OpenAPI 网关地址（默认官方网关）', 'gatewayUrl', { type: 'url', placeholder: 'https://openapi.fosunxcz.com', autoComplete: 'off' })),
            h('small', { style: { display: 'block', marginTop: 10, color: t.sub, fontSize: 11 } }, '扫码后插件在本机生成密钥对并自动保存三元组（API Key、服务端公钥、本机私钥）——私钥只存在你电脑的加密库里，页面不显示、也不需要手动输入。平台型 Key（fsk_ 等）不适用于 OpenAPI。')) : null,
          choice === 'ib' ? h('div', { className: 'wealth-source-fields', style: { marginTop: 18 } }, field('Client Portal Gateway URL', 'gatewayUrl', { type: 'url' }), check('信任本机 Gateway 的自签名证书', 'trustLocalGateway')) : null,
          choice !== 'custom' ? h('div', { style: { marginTop: 18 } },
            h('button', { style: T.btn(t, false), disabled: disabled || ['opening','waiting'].includes(login?.status), onClick: discover }, (working === 'accounts' || working === 'adopt') ? '读取中…' : auth ? '读取/更新账户' : choice === 'ths' ? '登录并读取账本' : '授权并读取账户'),
            form.id ? h('div', { style: { marginTop: 12, color: t.sub, fontSize: 12 } }, '来源账户：' + form[accountKey]) : null,
            discovered ? h('fieldset', { style: { border: 0, padding: 0, margin: '18px 0 0', minWidth: 0 } }, h('legend', { style: { fontWeight: 600, marginBottom: 10 } }, '2 选择来源账户'), accounts.length ? accounts.map(a => {
              const bound = boundSource(a), boundName = state.ledger.accounts.find(x => x.id === bound?.accountId)?.name || bound?.name
              return h('div', { key: a.id, style: { border: '1px solid ' + (String(form[accountKey]) === String(a.id) ? t.accent : t.border), borderRadius: 10, padding: 12, marginBottom: 8, background: String(form[accountKey]) === String(a.id) ? t.soft : t.card } },
                h('label', { style: { display: 'flex', gap: 9, alignItems: 'center', cursor: bound && bound.id !== form.id ? 'default' : 'pointer' } }, h('input', { type: 'radio', name: 'wealth-source-account', value: String(a.id), checked: String(form[accountKey]) === String(a.id), disabled: disabled || (!!bound && bound.id !== form.id), onChange: () => selectAccount(a) }), h('span', null, h('strong', { style: { fontSize: 12 } }, a.name || a.id), h('span', { style: { display: 'block', fontSize: 11, color: t.sub } }, String(a.id) + (a.currency ? ' · ' + a.currency : '') + (a.broker ? ' · ' + a.broker : '') + (thsBookLabel(a) ? ' · ' + thsBookLabel(a) : ''))), bound ? h('span', { style: { marginLeft: 'auto', color: t.accent, fontSize: 11 } }, '已导入 · ' + boundName) : null),
                bound ? h('div', { style: { marginTop: 9, display: 'flex', gap: 8 } }, embedded ? null : h('button', { style: T.btn(t, false), disabled, onClick: () => openImported(bound) }, '查看连接配置'), h('button', { style: T.btn(t, false), disabled, onClick: () => onDone ? onDone({ account: { id: bound.accountId } }) : openAccounts && openAccounts() }, '查看账户 ↗'), openHistory ? h('button', { style: T.btn(t, false), disabled: disabled || !bound.accountId, onClick: () => openHistory(bound.accountId) }, '补充历史流水') : null) : null)
            }) : h('p', { style: { color: t.sub, fontSize: 12 } }, '暂无可用来源账户，请检查授权和连接设置。')) : null,
            h('small', { style: { display: 'block', color: t.sub, fontSize: 10, marginTop: 8 } }, '凭据仅发送到本机服务端；编辑时留空保留。来源账户需要明确选择。'), warnings.map((w,i) => h('div', { key: i, style: { fontSize: 11, color: t.sub, marginTop: 7 } }, warningText(w)))) : h('div', { style: { marginTop: 18 } }, selectField('接入方式', 'transport', [['http','HTTP 标准快照接口'],['mcp','DSH 只读 MCP 工具']]), h('div', { style: { marginTop: 12 } }, form.transport === 'http' ? h('div', { className: 'wealth-source-fields' }, field('快照接口 URL', 'url', { type: 'url', placeholder: 'http://127.0.0.1:端口/snapshot' }), field('Bearer 凭据环境变量名（可选）', 'credentialRef', { autoComplete: 'off' })) : h('div', null, field('完整只读 MCP 工具名', 'toolName'), h('label', null, h('span', { style: { ...T.label(t), marginTop: 12 } }, '工具参数（JSON）'), h('textarea', { value: form.args, disabled, onChange: e => update('args', e.target.value), rows: 4, style: T.input(t), spellCheck: false }))))),
           choice !== 'custom' && !form.id && selected && !boundSource(selected) ? h('section', { style: { borderTop: '1px solid ' + t.border, marginTop: 22, paddingTop: 18 }, 'aria-label': '导入账户' },
             h('strong', { style: { fontSize: 14 } }, '3 导入账户'),
             h('p', { style: { fontSize: 13, color: t.text } }, selected.name || selected.id, h('span', { style: { color: t.sub, marginLeft: 8, fontSize: 12 } }, selected.currency || (choice === 'futu' ? form.currency : state.ledger.baseCurrency))),
             h('p', { style: { fontSize: 12, color: t.sub } }, '账户、当前持仓和来源能提供的全部历史流水将一起导入，之后点账户上的「同步」即可更新到最新。'),
             h('details', { style: { marginTop: 14, fontSize: 12, color: t.sub } }, h('summary', { style: { cursor: 'pointer' } }, '自动更新设置'), h('div', { style: { marginTop: 12 } }, scheduleControl()), h('div', { style: { marginTop: 12 } }, check('启用自动更新', 'enabled'))),
             h('button', { style: { ...T.btn(t, true), marginTop: 18 }, disabled, onClick: connect }, working === 'connect' ? '正在导入账户和持仓…' : '导入此账户')) : null,
          auth && !form.id ? h('div', { className: 'wealth-source-actions', style: { marginTop: 18, alignItems: 'center' } },
            h('button', { style: T.btn(t, true), disabled, onClick: () => onDone ? onDone({ account: imported }) : (openAccounts && openAccounts()) }, imported ? '完成，查看账户' : '完成'),
            h('small', { style: { color: t.sub } }, auth.accounts?.length ? '这个授权下共 ' + auth.accounts.length + ' 个账户，可继续选择导入。' : '可稍后回到「账户 → 授权账号」补导入。')) : null,
          choice === 'custom' || form.id ? h('div', { className: 'wealth-source-actions', style: { marginTop: 20, alignItems: 'center' } }, h('button', { style: T.btn(t, true), disabled, onClick: save }, working === 'save' ? '保存中…' : form.id ? '保存连接' : '添加连接'), check('启用连接', 'enabled'), h('small', { style: { color: t.sub } }, 'DSH 运行时执行自动同步')) : null),
        imported && !embedded ? h('button', { style: { ...T.btn(t, true), marginBottom: 16 }, disabled, onClick: openAccounts }, '查看导入的账户 ↗') : null,
        embedded ? null : h('section', { style: { marginTop: 24 }, 'aria-label': '已配置的数据源' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 } }, h('strong', { style: { fontWeight: 600 } }, '已连接 · ' + sources.length), h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('button', { style: T.btn(t, true), disabled: disabled || !sources.some(s => s.enabled), onClick: syncAll }, working === 'sync-all' ? '同步中…' : '全部同步'),
            h('button', { style: T.btn(t, false), disabled, onClick: () => act('refresh', async () => accept(await get('sources'))) }, '刷新状态'))),
          !sources.length ? h('div', { style: T.card(t) }, h('div', { style: { color: t.sub, fontSize: 12 } }, '还没有自动数据源。选择上方来源，开始连接你的投资账户。')) : sources.map(source => {
            const account = state.ledger.accounts.find(a => a.id === source.accountId)
            const status = ({ never:'尚未同步',success:'同步成功',ok:'同步成功',error:'同步失败',failed:'同步失败',syncing:'同步中',partial:'部分成功',warning:'有警告' })[source.lastStatus] || source.lastStatus || '尚未同步'
            const reauthTag = source.needsReauth ? h('span', { style: { marginLeft: 6, padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: t.red + '18', color: t.red } }, '需重新授权') : null
            const scheduleTag = h('span', { style: { marginLeft: 6, padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: t.soft, color: t.sub } }, scheduleSummary(source))
            return h('article', { key: source.id, style: { ...T.card(t), marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 16 } }, h('div', null, h('strong', null, source.name), h('div', { style: { color: t.sub, fontSize: 11, marginTop: 5 } }, (options.find(x => x[0] === source.connector)?.[1] || source.connector) + ' · ' + source.transport + ' → ' + (account?.name || '账户不存在'))), h('span', { style: { color: t.sub, fontSize: 11 } }, source.enabled ? '自动更新已启用' : '已停用')),
              h('div', { className: 'wealth-source-meta' }, [['状态',h('span', null, reauthTag ? h('span', null, status, reauthTag) : status, scheduleTag)],['上次成功',dateText(source.lastSuccessAt)],['上次尝试',dateText(source.lastAttemptAt)],['上游上传',dateText(source.uploadedAt)],['行情日期',source.quoteDate || '来源未提供'],['凭据',source.credentialsConfigured ? '已配置' : '未配置 / 无需凭据']].map(([label,value]) => h('div', { key: label }, h('span', { style: T.label(t) }, label), h('span', { style: { fontSize: 11 } }, value)))),
              source.lastError ? h('div', { role: 'alert', style: { color: t.red, fontSize: 12, marginTop: 10 } }, warningText(source.lastError)) : null,
              (source.warnings || []).map((w,i) => h('div', { key: i, style: { color: t.sub, fontSize: 11, marginTop: 7 } }, warningText(w))),
              h('div', { className: 'wealth-source-actions', style: { marginTop: 16 } }, h('button', { style: T.btn(t, true), disabled: disabled || source.lastStatus === 'syncing', onClick: () => sync(source) }, working === 'sync:' + source.id ? '同步中…' : '立即同步'), h('button', { style: T.btn(t, false), disabled: disabled || !account, onClick: () => openHistory(source.accountId) }, '补充历史流水'), h('button', { style: T.btn(t, false), disabled, onClick: () => edit(source) }, '编辑配置'), h('button', { style: T.btn(t, false), disabled, onClick: () => toggle(source) }, source.enabled ? '停用' : '启用'), h('button', { style: { ...T.btn(t, false), color: t.red }, disabled, onClick: () => remove(source) }, '移除')))
          })))
    }
    function Input({ t, state, call, busy, openHistory }) {
      const [mode,setMode] = React.useState('holdings'), [source,setSource] = React.useState('generic'), [accountId,setAccountId] = React.useState(''), [text,setText] = React.useState(''), [preview,setPreview] = React.useState(null), [msg,setMsg] = React.useState(''), [loading,setLoading] = React.useState(false), [applyHoldings,setApplyHoldings] = React.useState(false)
      const invalidate = fn => e => { fn(e.target.value); setPreview(null); setMsg('') }
      const inspect = async () => { setLoading(true);setMsg('');try {setPreview(await post('import/preview',{text,mode,source,accountId}))}catch(e){setMsg(e.message)}finally{setLoading(false)} }
      const commit = async () => { const r=await call('import.'+mode,{rows:preview.rows,source,applyHoldings});if(r.ok){setMsg('已导入 '+(r.result?.imported ?? preview.rows.length)+' 条，跳过 '+(r.result?.skipped || 0)+' 条重复记录');setPreview(null);setText('')} }
      const sample = mode==='holdings' ? '账户名,代码,名称,市场,数量,成本,币种,现价,资产类别\n我的账户,00700,腾讯控股,HK,200,380,HKD,410,stock' : '账户名,代码,方向,数量,价格,费用,日期,币种,市场\n我的账户,00700,买入,200,380,5,2026-11-06,HKD,HK'
      return h('div', {style:T.card(t)},
        h('div',{style:{fontSize:17,fontWeight:650,marginBottom:6}},'CSV / TSV 导入工具'), h('p',{style:{color:t.sub,fontSize:12,lineHeight:1.8}},'这里可导入持仓快照和旧版买卖 CSV / TSV。已有账户的 XLSX、现金、税费、回购、新股或转账记录，请在账户详情的「补录账单」中导入；不规则文字可交给右侧资产助手整理。'), openHistory ? h('button', {style:{...T.btn(t,false),marginBottom:12},disabled:busy,onClick:()=>openHistory(accountId)},'前往历史回补 ↗') : null,
        h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}},h('select',{'aria-label':'导入类型',value:mode,onChange:invalidate(setMode),style:{...T.input(t),width:130}},h('option',{value:'holdings'},'持仓快照'),h('option',{value:'trades'},'交易流水')),h('select',{'aria-label':'数据来源',value:source,onChange:invalidate(setSource),style:{...T.input(t),width:170}},[['generic','通用 / 其他海外券商'],['ths','同花顺投资账本'],['aifund','爱基金'],['futu','富途导出文件'],['longbridge','长桥导出文件']].map(([v,n])=>h('option',{key:v,value:v},n))),h('select',{'aria-label':'导入账户',value:accountId,onChange:invalidate(setAccountId),style:{...T.input(t),width:190}},h('option',{value:''},'从账户列识别'),state.ledger.accounts.map(a=>h('option',{key:a.id,value:a.id},a.name)))),
        h('label',{style:{...T.btn(t,false),display:'inline-block',marginBottom:12}},'选择 CSV / TSV 文件',h('input',{type:'file',accept:'.csv,.tsv,.txt',style:{display:'none'},onChange:async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>3000000){setMsg('文件超过 3 MB，请拆分后导入');return}const buffer=await file.arrayBuffer();let content=new TextDecoder('utf-8').decode(buffer);if(content.includes('\ufffd'))content=new TextDecoder('gb18030').decode(buffer);setText(content);setPreview(null);setMsg('已读取 '+file.name)}})),
        h('textarea',{'aria-label':'导入数据',value:text,onChange:invalidate(setText),placeholder:sample,rows:10,style:{...T.input(t),fontFamily:'monospace',resize:'vertical'}}),
        mode==='trades' ? h('label',{style:{display:'block',fontSize:12,color:t.sub,marginTop:10}},h('input',{type:'checkbox',checked:applyHoldings,onChange:e=>setApplyHoldings(e.target.checked)}),' 同时更新持仓（历史流水默认仅存档；已有持仓快照时保持不勾选）') : null,
        h('div',{style:{display:'flex',gap:10,marginTop:12}},h('button',{style:T.btn(t,true),disabled:loading||busy||!text.trim(),onClick:inspect},loading?'识别中…':'识别并预览'),h('button',{style:T.btn(t,false),onClick:()=>{setText(sample);setPreview(null)}},'查看格式示例')),
        msg?h('div',{role:'status',style:{marginTop:12,fontSize:13,color:t.accent}},msg):null,
        preview?h('div',{style:{marginTop:18}},h('strong',null,'导入预览 · '+preview.rows.length+' 条有效记录'),(preview.errors||[]).map((e,i)=>h('div',{key:'e'+i,role:'alert',style:{color:t.red,fontSize:12,marginTop:6}},'第 '+e.row+' 行：'+e.message)),(preview.warnings||[]).map((w,i)=>h('div',{key:'w'+i,style:{color:t.sub,fontSize:12,marginTop:6}},w.message)),h('div',{style:{overflowX:'auto',maxHeight:300,marginTop:10}},h('table',{style:{width:'100%',borderCollapse:'collapse'}},h('thead',null,h('tr',null,['账户','代码 / 市场','数量','成本 / 价格','币种'].map(l=>T.th(l,t)))),h('tbody',null,preview.rows.slice(0,100).map((r,i)=>h('tr',{key:i},T.td(state.ledger.accounts.find(a=>a.id===r.accountId)?.name||r.accountId,t),T.td(r.symbol+' / '+r.market,t),T.td(r.qty,t),T.td(mode==='holdings'?(r.avgCost ?? '—'):r.price,t),T.td(r.currency,t)))))),h('button',{style:{...T.btn(t,true),marginTop:12},disabled:busy||loading||!preview.rows.length||preview.errors.length>0,onClick:commit},'确认导入 '+preview.rows.length+' 条'),h('small',{style:{display:'block',marginTop:8,color:t.sub}},'持仓按账户和标的更新；错误行修正后再导入。预览最多展示 100 条。')):null)
    }

    async function post(path, body) {
      const r = await fetch('/portfolio/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) throw new Error(data?.error?.message || (r.ok ? '请求失败' : '服务暂不可用（HTTP ' + r.status + '）；请完全重启 the agent harness 后重试'))
      return data
    }

    function DashboardCharts({ t, state, call, busy }) {
      const s = state.summary, cur = s.baseCurrency
      const [group, setGroup] = React.useState('accounts')
      const history = (s.history || []).filter(x => x.baseCurrency === cur && Number.isFinite(x.totalValueBase))
      const rows = (group === 'accounts'
        ? (s.accounts || []).map(a => ({ label: state.ledger.accounts.find(x => x.id === a.accountId)?.name || a.accountId, value: a.valueBase }))
        : (s[group] || []).map(a => ({ label: group === 'currencies' ? a.currency : assetLabel(a.assetClass), value: a.valueBase })))
        .filter(a => a.value > 0)
        .sort((a, b) => b.value - a.value)
      const total = rows.reduce((sum, a) => sum + a.value, 0)
      const colors = t.cat || [t.accent, t.terra, t.green]
      let offset = 0
      const segments = rows.map((a, i) => {
        const from = offset
        offset += a.value / total * 100
        return colors[i % colors.length] + ' ' + from.toFixed(2) + '% ' + offset.toFixed(2) + '%'
      })
      const vals = history.map(x => x.totalValueBase)
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      const span = hi - lo || Math.max(hi * .05, 1)
      const W = 640, H = 210, PL = 46, PR = 14, PT = 14, PB = 26
      const iw = W - PL - PR
      const ih = H - PT - PB
      const x = (i) => PL + (iw * i) / Math.max(1, history.length - 1)
      const y = (v) => PT + ih - ((v - lo) / span) * ih
      const pts = vals.map((v, i) => [x(i), y(v)])
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
      const area = line + ' L' + x(vals.length - 1) + ',' + (PT + ih) + ' L' + PL + ',' + (PT + ih) + ' Z'
      const gid = 'zw-area-' + String(t.accent).replace('#', '')
      const ticks = [0, .5, 1].map(f => lo + (hi - lo) * f)
      const marks = axisMarks(history.length)
      const dateOf = (row) => (row.date || row.at || '').slice(0, 10)
      const card = { background: t.card, border: '1px solid ' + t.border, borderRadius: 20, padding: '18px 20px', boxShadow: t.shadow, minWidth: 0 }

      const trendHeader = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
        h('div', { style: { flex: 1, minWidth: 120 } },
          h('div', { style: { fontSize: 15, fontWeight: 750 } }, '资产轨迹'),
          h('div', { style: { fontSize: 11.5, color: t.sub, marginTop: 2 } },
            history.length > 1 ? history.length + ' 天快照 · ' + dateOf(history[0]) + ' → ' + dateOf(history[history.length - 1]) : '每日估值快照')),
        h('button', { style: T.btn(t, false), disabled: busy, onClick: () => call('state') }, '记录今日快照'))

      const gridLines = ticks.map((v, i) => h('g', { key: 'g' + i },
        h('line', { x1: PL, x2: W - PR, y1: y(v), y2: y(v), stroke: t.border, strokeWidth: 1 }),
        h('text', { x: PL - 8, y: y(v) + 3.5, textAnchor: 'end', fontSize: 10, fill: t.sub }, fmtCompact(v))))

      const dots = pts.map((p, i) => h('circle', {
        key: 'p' + i, cx: p[0], cy: p[1], r: 2.8, fill: t.accent, opacity: i === pts.length - 1 ? 1 : .55,
      }, h('title', null, dateOf(history[i]) + ' · ' + fmtMoney(vals[i], cur))))

      const xLabels = marks.map((i) => h('text', {
        key: 'd' + i, x: x(i), y: H - PB + 18,
        textAnchor: i === 0 ? 'start' : i === history.length - 1 ? 'end' : 'middle',
        fontSize: 10, fill: t.sub,
      }, dateOf(history[i] || {}).slice(5)))

      const trendChart = history.length > 1
        ? h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '资产轨迹历史快照', style: { width: '100%', height: 'auto', display: 'block' } },
          h('defs', null, h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%', stopColor: t.accent, stopOpacity: .22 }),
            h('stop', { offset: '100%', stopColor: t.accent, stopOpacity: 0 }))),
          gridLines,
          h('path', { d: area, fill: 'url(#' + gid + ')' }),
          h('path', { d: line, fill: 'none', stroke: t.accent, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          dots,
          xLabels)
        : h('div', { className: 'wealth-empty', style: { minHeight: 170 } },
          h('span', { className: 'wealth-empty-mark' }, '⌁'),
          h('span', { style: { fontSize: 13 } }, history.length ? '第一份快照，已经就位' : '你的资产故事，从这里开始'),
          h('small', { style: { fontSize: 11 } }, '至少两个日期的快照后显示趋势'))

      const legend = rows.length
        ? h('div', { style: { flex: 1, minWidth: 150 } }, rows.slice(0, 6).map((a, i) => h('div', {
          key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid ' + t.border : 'none' },
        },
          h('span', { style: { width: 8, height: 8, borderRadius: 999, background: colors[i % colors.length], flex: 'none' } }),
          h('span', { style: { flex: 1, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.label),
          h('span', { style: { fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, (a.value / total * 100).toFixed(1) + '%'),
          h('span', { style: { fontSize: 11, color: t.sub, fontVariantNumeric: 'tabular-nums', minWidth: 58, textAlign: 'right' } }, fmtMoney(a.value)))))
        : h('div', { className: 'wealth-empty', style: { minHeight: 110 } }, '导入持仓后显示分布')

      const donut = rows.length
        ? h('div', {
          role: 'img', 'aria-label': '资产占比环形图',
          style: { width: 132, height: 132, borderRadius: '50%', background: 'conic-gradient(' + segments.join(',') + ')', display: 'grid', placeItems: 'center', flexShrink: 0 },
        },
          h('div', { style: { width: 96, height: 96, borderRadius: '50%', background: t.card, display: 'grid', placeContent: 'center', textAlign: 'center' } },
            h('strong', { style: { fontSize: 17, fontWeight: 780, fontVariantNumeric: 'tabular-nums' } }, fmtCompact(total)),
            h('span', { style: { fontSize: 10, color: t.sub, marginTop: 1 } }, '总资产')))
        : null

      const configHeader = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 15, fontWeight: 750 } }, '资产配置'),
          h('div', { style: { fontSize: 11.5, color: t.sub, marginTop: 2 } }, rows.length + ' 项 · ' + cur)),
        h('select', {
          'aria-label': '分布维度', value: group, onChange: e => setGroup(e.target.value),
          style: { ...T.input(t), width: 104, minHeight: 32, padding: '5px 9px', fontSize: 12 },
        }, [['accounts', '按账户'], ['assetClasses', '按类别'], ['currencies', '按币种']].map(([v, l]) => h('option', { key: v, value: v }, l))))

      return h('div', { className: 'wealth-chart-row' },
        h('section', { style: card, 'aria-label': '资产轨迹' },
          trendHeader,
          trendChart,
          h('div', { style: { fontSize: 10.5, color: t.sub, marginTop: 8 } }, '曲线包含出入金、交易与汇率影响，不代表投资收益率。')),
        h('section', { style: card, 'aria-label': '资产配置' },
          configHeader,
          rows.length
            ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' } }, donut, legend)
            : legend))
    }

    function Chat({ t, state, reload, busy }) {
      const [messages, setMessages] = React.useState([]), [text, setText] = React.useState(''), [sending, setSending] = React.useState(false), [error, setError] = React.useState(''), [model, setModel] = React.useState(null)
      const end = React.useRef(null)
      React.useEffect(() => { fetch('/portfolio/api/model').then(r=>r.json()).then(r=>setModel(r.model)).catch(()=>{}) }, [])
      React.useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages, sending])
      const send = async (message) => {
        if (!message.trim() || sending) return
        setSending(true); setError(''); setText('')
        const history = messages.map(m => ({ role: m.role, text: m.text })).slice(-12)
        setMessages(old => [...old, { role: 'user', text: message }])
        try { const r = await post('chat', { message, history }); setMessages(old => [...old, { role: 'assistant', text: r.reply, ops: r.ops, revision: r.revision, model: r.model }]) }
        catch(e) { setError(e.message); setText(message) } finally { setSending(false) }
      }
      const apply = async (m, index) => {
        setSending(true); setError('')
        try { await post('chat/apply', { ops: m.ops, revision: m.revision }); setMessages(old=>old.map((x,i)=>i===index?{...x,applied:true}:x)); await reload() }
        catch(e) { setError(e.message) } finally { setSending(false) }
      }
      return h('aside', { className: 'wealth-chat', style: { borderColor: t.border, background: t.panel, display: 'flex', flexDirection: 'column', padding: '25px 18px 18px' }, 'aria-label': '资产助手' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 } }, h('span', { className: 'wealth-account-badge', style: { width: 30, height: 30, borderRadius: 10 } }, '✧'), h('strong', { style: { fontSize: 14, fontWeight: 600 } }, '资产助手'), h('span', { style: { marginLeft: 'auto', fontSize: 9, color: t.sub, letterSpacing: 1 } }, 'AI')), h('div', { title: model?.label || model?.model || '', style: { color: t.sub, fontSize: 10, marginBottom: 20, padding: '7px 9px', border: '1px solid ' + t.border, borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, h('span', { style: { color: model ? t.green : t.sub } }, '● '), model ? (model.label || model.model) : '在 DSH 设置默认模型'),
        h('div', { style: { flex: 1, overflowY: 'auto', minHeight: 80 } },
          messages.length ? messages.map((m,i)=>h('div', { key:i, style:{ padding: 11, borderRadius: 9, marginBottom: 12, background: m.role === 'user' ? t.card : 'transparent', border: '1px solid '+t.border, fontSize:13, lineHeight:1.75, whiteSpace:'pre-wrap', overflowWrap:'anywhere' } }, h('small', {style:{color:t.sub}}, m.role==='user'?'你':'资产助手'), h('div',null,m.text), m.ops?.length ? h('details', { style:{fontSize:11,marginTop:8} }, h('summary',null,'待写入 '+m.ops.length+' 项变更'), h('pre',{style:{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},JSON.stringify(m.ops,null,2))) : null, m.ops?.length ? h('button',{style:{...T.btn(t,true),marginTop:8},disabled:sending||busy||m.applied,onClick:()=>apply(m,i)},m.applied?'已写入账本':'应用这些变更') : null)) : h('div', {className:'wealth-chat-intro',style:{color:t.sub,fontSize:12,lineHeight:1.9}}, h('span',{style:{fontSize:28,color:t.terra}},'✧'), h('h3',{style:{color:t.text}},'看见数字背后的全貌'), h('p',null,'一起核对资产、梳理持仓，或把一段交易记录整理入账。写入前，你会看到具体变更。'), ['我的资产分布如何？','哪些持仓还缺少现价？','帮我核对各账户币种和汇率'].map(q=>h('button',{key:q,style:{...T.btn(t,false),display:'block',marginTop:9,textAlign:'left',width:'100%',fontSize:11,padding:'10px 11px',background:t.card,borderRadius:10},onClick:()=>send(q),disabled:sending},q))),
          sending ? h('div',{role:'status',style:{fontSize:12,color:t.sub}},'正在处理…') : null, h('div',{ref:end})),
        error ? h('div',{role:'alert',style:{color:t.red,fontSize:12,marginBottom:8}},error) : null,
        h('form',{onSubmit:e=>{e.preventDefault();send(text)},style:{marginTop:12}},h('textarea',{'aria-label':'向资产助手提问',value:text,onChange:e=>setText(e.target.value),placeholder:'问账本，或粘贴需要整理的数据…',rows:3,maxLength:30000,style:{...T.input(t),resize:'vertical'},onKeyDown:e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send(text)}}}),h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:8}},h('kbd',{style:{fontSize:10,color:t.sub,background:t.panel,borderRadius:999,padding:'3px 7px',fontFamily:'inherit'}},'Ctrl / ⌘ + Enter'),h('button',{type:'submit',disabled:sending||!text.trim(),style:{...T.btn(t,true),fontSize:12}},sending ? '思考中…' : '发送 ↗'))))
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
        h('rect', { x: 3.5, y: 5, width: 8.5, height: 3.4, rx: 1.7, fill: 'currentColor', opacity: 0.62 }),
        h('rect', { x: 3.5, y: 10.3, width: 13, height: 3.4, rx: 1.7, fill: 'currentColor', opacity: 0.82 }),
        h('rect', { x: 3.5, y: 15.6, width: 17, height: 3.4, rx: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 17.2, cy: 6.7, r: 1.6, fill: 'currentColor' }),
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
