# dsh-wealth 标准数据模型（DATA-MODEL v2）

> 目的：把长桥（余额/持仓/流水）、同花顺投资账本（股票账本 + 爱基金/基金账本）、富途、
> IB、账单文件五种来源，抽象成**一套标准结构**。账本存储、历史归档、dashboard 与
> 后续分析（收益率、现金流、资产配置回溯）都只面向这套结构，不再面向各来源的原生字段。
>
> 配套可执行注册表：`dsh-portfolio/model.mjs`（枚举、方向、类别的唯一来源）。
> 本文档是契约：来源适配器 → 标准结构 → 存储/分析，单向映射，不做反向推导。

## 0. 总览：五个标准实体

| 实体 | 存放位置 | 语义 | 对应来源概念 |
|---|---|---|---|
| Account 账户 | `ledger.accounts[]` | 资金的容器（券商账户/投资账本/基金账本） | 长桥 account_channel；同花顺 fund_key / custid；IB 账户号 |
| Instrument 标的 | `ledger.instruments[]` | 可持有东西的元数据 | 长桥 symbol；基金 fundcode；现金行 |
| Holding 持仓 | `ledger.holdings[]` | 某账户当前持有某标的的数量与成本（**唯一事实**） | 长桥 stock_positions/fund_positions/account_balance；同花顺 stock_position / merge_fund |
| Flow 流水 | `ledger.trades[]` + `ledger.historyEvents[]` | 时间轴上发生过的事件（交易/现金/费用/划转/公司行为） | 长桥 history_executions/cash_flow；同花顺 get_money_history / 交易记录 sheet |
| Snapshot 快照 | `ledger.snapshots[]` | 某天的组合切片（来源官方总额单独留痕） | 长桥 net_assets/total_cash；同花顺 total_asset/total_cost |

两条铁律（沿承 0.5.0 设计，不变）：

1. **持仓是快照事实，流水是历史事实**：来源的持仓接口覆盖 holdings；历史导入只追加
   historyEvents，绝不回放持仓（applyTradeToHolding 只用于用户手工记账/手工流水）。
2. **金额不猜**：来源没给的值保持 `null`（未知），不用 0 冒充；所有金额都是原币照录 +
   可选 base 换算，汇率缺失时排除并警告，不虚构汇率。

## 1. Account 账户

```jsonc
{
  "id": "ACC_3C354DB1",            // 插件内部 id（来源无关）
  "name": "长桥账户 · MCP",          // 展示名，来自来源官方名或用户输入
  "type": "broker",                 // broker | fund | bank | manual（展示用）
  "currency": "HKD",                // 展示币种；多币种账户指主要币种，现金行仍是多币种
  "note": "", "archived": false, "createdAt": "…"
}
```

来源身份不在 account 里，在 source 配置中（`sources.json`）：connector、transport、
portfolioId（同花顺 fund_key/custid）、thsBookType、brokerAccountId（券商通道）、
mcpEndpoint。同一来源账户可以对应多个模型账户的情况被 fingerprint 判重阻止（v0.4 起不变）。

## 2. Instrument 标的

```jsonc
{
  "id": "INS_42A1B6C8",
  "symbol": "700.HK",              // 来源原生代码；基金为 6 位 fundcode；现金行 HKD.CASH
  "name": "腾讯控股",
  "market": "HK",                  // CN | HK | US | SG | FUND | CASH | OTHER（canonicalMarket 归一）
  "assetClass": "stock",           // stock | fund | etf | cash | bond | crypto | other（固定枚举）
  "currency": "HKD",               // 计价/交易币种，ISO 4217
  "sector": "通信服务",             // 可选，行业：自由文本 ≤24 字，仅来自用户或可靠资料，空=未分类
  "style": "value",                // 可选，风格：growth | value | blend | other（model.mjs 归一）
  "note": "", "createdAt": "…"
}
```

分类规则：`sector`/`style` 是可选的人工 / AI 标注，不在任何导入路径中自动推断；摘要层把缺失值聚合为「未分类」（summary.sectors / summary.styles），快照按日保存这两个维度，供行业与风格集中度分析。AI 助手仅在用户明确说明或标的行业众所周知时才填写，不确定必须询问。

映射规则（适配器负责，不得再各自发明）：
- 长桥 `700.HK` → market HK；`SH/SZ` 后缀 → **CN**（长桥原义是交易所，我们归一为市场）；
  `counter_id` 末段 ISIN → market `FUND`。
- 同花顺基金 fundcode（6 位数字）→ market `FUND`、assetClass `fund`。
- 原币现金 → market `CASH`、assetClass `cash`，symbol 用 `币种.CASH`（如 `HKD.CASH`）。
- 同一 `(symbol, market)` 全局唯一；跨市场同代码（如 000001）不合并。

## 3. Holding 持仓（快照事实）

```jsonc
{
  "id": "POS_8E12F4A9",
  "accountId": "ACC_…", "instrumentId": "INS_…",
  "qty": 100,                       // ≥0；份额/股数
  "avgCost": 350.5,                 // 单位成本（原币）。基金=单位成本（percost），非总成本
  "currency": "HKD",                // 冗余自 instrument，账户内一致性由 store 校验
  "manualPrice": 380.2,             // 来源现价/净值；未知保持 null（按成本估值+警告）
  "note": "", "updatedAt": "…"
}
```

来源快照统一经过 `normalizeSnapshot`（connectors.mjs）：
`{holdings[], complete, warnings[], queriedAt, uploadedAt?, quoteDate?, sourceTotals?}`。

`sourceTotals`（来源官方总额，**只展示不参与持仓求和**，避免双计）：
`cash | totalValue | totalAsset | totalCost | totalLiability | investedPct | holdingProfit | dayProfit`。
长桥 `net_assets/total_cash`、同花顺 `total_asset/total_cost` 都落在这里。

现金也是持仓行（market CASH），`qty=现金金额`、`avgCost=1`；现金明细来自长桥
cash_infos（available+frozen+settling，withdraw 为子集不叠加）与同花顺 stock_position
的可用字段；来源不含现金明细时省略该行并把快照标 `complete:false`。

## 4. Flow 流水（历史事实）

流水有两个存放处，**同一个标准形状**：
- `ledger.trades[]`：用户手工记账的交易（buy/sell，会回放持仓）；
- `ledger.historyEvents[]`：一切来源回补的归档事件（archiveOnly，不回放持仓）。

归档事件的三个入口共用同一形状与去重约定：(1) 文件 / 官方接口回补（history.mjs 预览→确认，批量）；(2) 自动同步的一键增量（history.mjs syncAccount）；(3) **手工 / AI 逐条录入**（`historyEvent.add` op，store.mjs）：batch 的 `method:"model"`，`coverage.complete:false`，按 `accountId+externalId+kind` 幂等去重。生活账单收支（银行 / 现金账户的 deposit / withdrawal + note）也走这一入口。

标准 Flow 结构（history.mjs 白名单字段 + 归档元数据）：

```jsonc
{
  "id": "EVT_…",                    // historyEvents 才有；trades 无
  "accountId": "ACC_…",
  "provider": "longbridge",         // longbridge | futu | ths | ib | file | manual
  "kind": "buy",                    // 见下方枚举（model.mjs 唯一来源）
  "originalType": "股票交收",        // 来源原始业务名，永远保留（审计用）
  "date": "2026-11-03", "time": "08:31:00",   // time 未知为 null
  "symbol": "700.HK", "name": "腾讯控股", "market": "HK",
  "currency": "HKD",
  "qty": 10, "price": 360,          // 未知 null；回购的 price 是利率
  "grossAmount": null,              // 原始金额（毛额）；来源未拆时不猜
  "cashAmount": -3600,              // 净现金方向数（含方向，见 §4.1）
  "fee": null,                      // 费用原币；未知 null，不用 0 冒充
  "externalId": "t1",               // 来源唯一编号（vid/trade_id/trans_no…）；无编号为 null
  "note": "trans_no=…", "sheet": null, "row": null,   // 文件回补的溯源
  "batchId": "HIST_…", "importedAt": "…", "archiveOnly": true
}
```

### 4.1 kind 枚举与现金方向（FLOW_KINDS，model.mjs）

| kind | 标签 | category | cashSign | 需要标的 |
|---|---|---|---|---|
| buy | 买入 | trade | −1 | 是 |
| sell | 卖出 | trade | +1 | 是 |
| repo_open | 回购融出 | trade | −1 | 是 |
| repo_close | 回购购回 | trade | +1 | 是 |
| ipo | 新股入账 | corporate | 0 | 是 |
| security_in / security_out | 证券转入/转出 | transfer | 0 | 是 |
| dividend | 分红派息 | cash | +1 | 否 |
| interest | 利息 | cash | +1 | 否 |
| deposit / withdrawal | 入金/出金 | cash | ±1 | 否 |
| fee / tax | 费用/税费 | fee | −1 | 否 |
| other | 其他 | other | null（未知） | 否 |

规则：
- `cashAmount = cashSign(kind) × |来源金额|`；方向永远由 **kind** 决定，不由金额正负决定
  （同花顺 entry_money、长桥 balance 都是恒正的幅度）。
- `category` 用于分析聚合：交易损益看 `trade`，净现金流看 `cash`，摩擦成本看 `fee`。
- 未知业务 → `other` + 保留 originalType + 警告，绝不静默丢弃。

### 4.2 去重键（不变，0.5.0 契约）

- 强键：`hash(accountId, provider, kind, externalId)` —— 有唯一编号的记录。
- 弱键：`hash(经济字段全集) + multiplicity` —— 无编号记录按经济要素+出现次数多重集去重。
- 同编号不同内容 → 冲突阻断，要求人工核对。

### 4.3 来源字段映射（适配器契约，已实现）

| 来源 | 持仓来源 | 流水来源 | 唯一编号 | 特殊规则 |
|---|---|---|---|---|
| 同花顺股票账本 | stock_position | get_money_history op→kind | vid | entry_money 恒正按 op 定向；回购 price=利率；费用 ''=未知 |
| 同花顺基金账本 | merge_fund fund[] | get_money_history（custid/fundid 二选一） | vid（常空→弱键） | 申购/定投=buy、现金分红=dividend、赎回=sell、转入/转出=security_in/out、修改持仓=other(cash null) |
| 长桥 MCP | stock_positions+fund_positions+account_balance | history_executions + cash_flow | trade_id | cash_flow 无编号→弱键；business_type 含 dividend/股息→dividend，In/Out+出入金词→deposit/withdrawal |
| 富途 OpenD | GetPositionList/GetFunds | GetHistoryOrderFillList | fillID | 仅真实账户；订单级费用不分摊 |
| IB | Gateway positions | 文件（CSV/TSV） | — | Flex 未接入；不把汇总行当逐笔 |
| 账单文件 | — | XLSX/CSV/TSV 交易记录 sheet | 按文件 | 汇总表忽略；币种需显式选择 |

## 5. Snapshot 快照（分析用切片）

`ledger.snapshots[]`（每天每币种一条，save 时自动 upsert）：

```jsonc
{ "date": "2026-11-07", "baseCurrency": "CNY",
  "totalValueBase": …, "totalCostBase": …, "totalPnlBase": …,
  "excludedCount": 0, "warnings": [],
  "accounts": [{…valueBase/costBase/pnlBase/weight}],
  "assetClasses": […], "currencies": […] }
```

趋势/分布只读 snapshots，不重算历史；来源官方总额（sourceTotals）随来源同步展示，
不进 snapshots 求和。

## 6. 分析层（已实现：analytics.mjs）

分析层是纯函数、只读、绝不修改账本。`analyze(db)` 返回一份完整报告（index.js 暴露于
`GET /portfolio/api/analysis`，并随 `api/state`、`api/op`、`api/chat/apply` 一起返回）。

设计来源（2026-11-07 开源调研，结论已核实到官方仓库/文档）：

| 设计点 | 来源 | 在本插件的落法 |
|---|---|---|
| TWR/XIRR 双口径并列 | Portfolio Performance、Wealthfolio | `performance.twr`（按快照分段链式）+ `performance.xirr`（区间资金加权年化） |
| 外部现金流切段 | Portfolio Performance | 只有 deposit/withdrawal 进入 TWR/XIRR 现金流；分红/利息/费税是内部现金流 |
| 估值事件一等公民 | Maybe（仅概念，AGPL 已归档不抄代码） | 快照序列（snapshots）直接驱动净值曲线与收益，无流水也能算 |
| 快照账户与流水账户共存 | Wealthfolio Tracking Mode | 快照型来源（爱基金）与流水型来源（长桥）同一套 Account/Holding 模型 |
| balance 断言思想 | Beancount | 数据健康：来源 sourceTotals vs 持仓求和、coverage.complete、缺价/缺汇率计数集中在 `quality` |
| 指标精选 | QuantStats | maxDrawdown + 集中度（HHI/Top1/Top3）；后续可加 CAGR/波动/Sharpe（需日频序列，快照插值并标注置信度） |
| 统一行模型 | OpenBB | 本文档 + model.mjs 即标准 schema，各来源适配器只做映射 |
| 导入去重 | Actual Budget / Wealthfolio | 强键（唯一编号）+ 弱键（经济字段+出现次数），见 §4.2 |

`analyze()` 返回结构（v1）：

```jsonc
{
  "netWorth": { "series": [{date, totalValueBase, totalCostBase, totalPnlBase, excludedCount}], "first": …, "last": …, "change": …, "changePct": …, "snapshotCount": …, "spanDays": … },
  "allocation": { "byClass": […], "byAccount": […], "byCurrency": […], "concentration": {hhi, top1, top3, count} },
  "flows": { "byKind": […], "byYear": […], "totals": {externalIn, externalOut, netExternal, dividends, interest, fees, taxes}, "unknownCashRows": … },
  "performance": { "twr": {value, complete, periods, reason}, "xirr": {value, complete, reason}, "maxDrawdown": {value, peakDate, troughDate}, "note": … },
  "quality": { "snapshotCount", "unpricedHoldings", "excludedHoldings", "unknownCashFlows", "historyBatches", "incompleteBatches", "warnings": [...] },
  "catalog": { "kinds": [{kind,label,category,cashSign}], "categories": [...] }
}
```

约束（与两条铁律一致）：
- 快照不足两个时 TWR/回撤返回 `value:null` + 原因，不硬算；
- 区间内没有出入金时 XIRR 明确返回「与 TWR 等价，无需单独计算」；
- 出入金金额缺失时结果带 `complete:false` + 「下限估算」原因；
- `catalog` 原样暴露 model.mjs 枚举，AI 对话与 UI 标签都从这里取，不再各自硬编码。

## 7. 版本与迁移

- v1（现状存储）：字段不变——本模型 v2 是**命名与映射契约**，不改 ledger.json 结构。
- 未来若新增实体（如独立 cashAccounts、多腿公司行为），先改 `model.mjs` 注册表 +
  本文档 §0 表格，再动 store，`version` 字段递增并写迁移。
