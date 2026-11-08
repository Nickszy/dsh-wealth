# dsh-wealth 发布材料（Product Hunt 用）

> 本文件是发布物料草稿，随产品能力更新。所有数字指标以应用内真实数据为准，不虚构用户量或收益。

## 一句话定位

**中文：** 把券商、基金和生活账单放进一个本机账本，让 AI 帮你算清楚、看懂、提醒你。

**English:** One local-first ledger for your brokerage accounts, funds and daily spending — with an AI that reads, updates and explains it.

## Product Hunt Listing

**Name:** dsh-wealth

**Tagline (60 chars):** Your entire financial life in one local ledger, with AI

**Short description：**

> Connect Chinese brokers (THS, Futu, Longbridge, IB), import WeChat/Alipay bills, and get a unified balance sheet, cash-flow view, history-based NAV, forecasts and reminders. All data stays on your machine; the AI assistant reads and edits the same ledger you see.

**First comment（作者自述）：**

> I built dsh-wealth because my money was spread across brokers, fund apps and WeChat Pay, and every "wealth app" either ignored China or wanted my brokerage password in the cloud.
>
> What it does today:
> - **Auto-sync**: 同花顺投资账本 / 富途 / 长桥 / IB via their own APIs/MCP — positions, balances and transaction history.
> - **One balance sheet**: cash / funds / ETFs / stocks, split by sector and growth-value style.
> - **History from data you already have**: reconstructs daily positions from your trade flows and fetches historical prices, so you can see how the account actually moved — not just since you installed the app.
> - **Bookkeeping, not just investing**: import WeChat/Alipay CSV, auto-categorize (餐饮/交通/居住/购物…), monthly budgets with overspending alerts.
> - **AI that can act**: ask it to fix a price, record a rent payment, or set a budget; every change is shown as a proposal before it is applied.
> - **Local-first**: the ledger and credentials stay on your machine (AES-GCM encrypted secrets), and any local script/session can read the same data via CLI.
>
> It's a DSH plugin, so it runs inside DeepSeek Harness rather than a separate cloud account.

## 与竞品的定位

| | dsh-wealth | Ghostfolio | Portfolio Performance | 随手记 / MoneyWiz |
|---|---|---|---|---|
| 中国市场券商直连（同花顺/富途/长桥） | ✅ | ❌ | ❌ | ❌ |
| 微信 / 支付宝账单 + 生活分类 | ✅ | ❌ | ❌ | ✅ |
| 投资 + 记账同一份账本 | ✅ | ❌ | ❌ | 部分 |
| 历史净值回补（流水 × 历史行情） | ✅ | ✅（需自部署） | ✅（桌面） | ❌ |
| AI 直接读改写账本 | ✅ | ❌ | ❌ | ❌ |
| 数据留在本机 | ✅ | 自部署可实现 | ✅ | 部分 |

**差异化一句话：** 竞品要么懂投资不懂生活，要么懂记账不懂券商——我们把两者放进同一份本机账本，并让 AI 直接操作它。

## 截图清单（发布前补齐）

1. 总览：总资产 + 今日提醒 + 账户列表
2. 分析：资产类别 / 行业 / 风格分布 + 资产负债表
3. 账户详情：历史净值曲线 + 最大回撤（注明"按流水与历史行情回补"）
4. 生活账单：12 个月分类汇总 + 预算进度
5. 流水：行内生活分类选择
6. 授权账户弹窗：一次登录 = 一条授权
7. 资产助手：一条自然语言请求 → 待确认操作

## 定价与隐私

- **隐私故事**：账本、凭据都在本机；凭据 AES-256-GCM 加密，界面与日志不展示密钥；同步只走用户自己配置的券商接口。
- **定价建议（待验证）**：插件免费；未来可选"高级报表/提醒"订阅。避免在未验证前承诺永久免费。
- **诚实说明**：券商流水不含银证转账，现金时间线用"推定入金（下限）"修复并标注为估算；美股期权等无公开日线的标的不计入历史净值。

## 发布前检查清单

- [ ] 英文界面（至少核心页面：总览 / 账户 / 分析 / 流水 / 设置）
- [ ] 演示视频（60–90 秒：连接同花顺 → 看到净值曲线 → 导入微信账单 → 问 AI）
- [ ] 截图按上表补齐（浅色 + 深色各一套）
- [ ] 首次启动引导已验证（三步 onboarding）
- [ ] 错误路径演示：同步失败、重复导入、授权失效的处理文案
- [ ] 隐私说明与数据目录文档
- [ ] DSH 插件安装说明与版本号

## 已知限制（发布时如实说明）

- 同花顺 / 富途等来源的流水不含银行侧转账，现金与入金为估算下限。
- 历史净值依赖公开行情接口；停牌、退市可转债、美股期权可能缺价。
- AI 写入是"先预览后应用"，不会静默改账。
