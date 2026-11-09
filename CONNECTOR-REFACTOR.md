# 来源连接器改造方案

基线：`main@709ca16`，`npm test` 381/381 通过。

## 进度（2026-11-09）

- **P0 完成**，**P1 完成**：`npm test` 433/433 通过；P1 期间 426 条原有测试未改动。
- **P2 完成**（2026-11-09 晚）：`npm test` 478/478。成本可空（全部适配器不再伪造/因缺成本跳行，null 直接入库）；分段覆盖 coverage（mergeSnapshot 只删 full 段的消失持仓；etf 映射 stock 段）；警告分级（字符串默认 degraded、info 警告不再把来源打成 partial；warningDetails/coverage 持久化到来源记录）；核心对账 TOTAL_MISMATCH；水位死锁修复（拒绝也记哈希 + 账本同内容即放行）；THS quoteDate 只取净值日期；snapshot-schema.mjs 抽出打断全部循环引用；富途/长桥原生认证错误透传「请重新授权」；展示层成本「—」/「券商价」标签/编辑表单 null 往返；snapshot-schema.mjs 已加入 package.json files。
- **P3 完成**（2026-11-09）：`npm test` 485/485。认证失败（脱敏消息匹配 AUTH_ERROR）写 `needsReauth` 且不计 `failCount`，tick 跳过、手动同步仍允许；成功、createAuthorization / THS 重新登录、saveSource 存入新凭据时清除，来源行显示「需重新授权」徽标。非认证失败 `failCount+1`，tick 到期改为 `min(intervalMinutes, 5*2^(failCount-1))` 分钟（成功清零，永不超过配置间隔；空消息的通用提示不作为认证依据）。tick 按连接器分组：同连接器串行、跨连接器并行（Promise.all 等全部链结束），保留 inFlight 去重与 disposed 中断。周六/周日自动同步默认跳过（来源 `syncWeekends: true` 可退出，手动同步不受限）。UI：估值提示把 unknown-cost 合并为一行「N 条持仓成本未知，未计入成本与盈亏」；导入预览 null 成本显示「—」。
- 生产实测（只读，`%TEMP%\conn-probe\probe.mjs` / `e2e.mjs`）：真实同步服务跑在账本与 `sources.json` 的临时副本上，凭据只读并去掉 `refreshToken`，因此不会触发续期，生产文件不会被写入。8 个来源中 7 个同步成功，无持仓被误删；老虎由旧代码的失败变为 partial 成功（融资负债另有告警）。剩下的同花顺爱基金账本被水位拦截，见待办第 3 条。授权账户列表：6 条授权中 5 条可读，复星握手失败（服务端 `Handshake signature verification failed`，需在 H5 页面做「OpenAPI 参数重置」，与代码无关）。
- 审查时补的修复：数量为 0 视为已清仓，不降级覆盖（富途、长桥 MCP）；长桥 MCP 的认证错误照常抛出，不降级为 partial；老虎负现金不写入 `sourceTotals.cash`。

### 遗留项状态（2026-11-09 更新）

1. 原生 SDK/IB 缺成本整份失败 → P2 v2.1 统一为 null 入库（进行中）。
2. 同花顺 onwayfund/clearfund → **已结**：只读探查确认 onwayfund 是在途申购（未确认份额，字段 onway/onway_amount 挂在确认行上）、clearfund 是清盘残留，都不是可入账持仓；维持跳过 + 警告 + 不影响覆盖（ths-client.mjs 有注释与测试）。
3. 周末水位拦截 → **已修**：quoteDate 只取净值日期（不再取 trans_date），runSync 增加内容哈希放行；死锁修复（被拦来源也记录哈希 + 账本同内容即放行）在 P2 core-B 落地。
4. 注册表↔history-provider 循环 → **已断**：futuHistory/longbridgeHistory 移入各自适配器；ths-client→connectors→registry 循环由 snapshot-schema.mjs 抽取解决（进行中）。

## P2：快照 v2（2026-11-09 用户已确认执行）

关键事实（2026-11-09 复核）：账本内部已有价格来源区分——`holding.manualPrice` 只有用户手填会写（store.mjs price.set），行情写 `quotePrice/quoteAt/quoteSource`（quotes.mjs），券商快照价经 mergeSnapshot 落 `sourcePrice`。估值链 `manualPrice ?? quotePrice ?? avgCost`（store.mjs:680）不含 sourcePrice，因此「券商价压住新行情」在账本层并不存在。P2 的价格项因此缩小。

### v2.1 成本可空（核心，先做）

- `normalizeSnapshot`：`avgCost` 允许 `null`（v1 数字仍然接受）。缺成本的持仓行**入库**，不再跳过、不再伪造。
- 各适配器停止伪造/跳过：futu-mcp、lb-mcp 去掉 COST_UNAVAILABLE 跳行；tiger/fosun/qieman 删除 *_COST_ASSUMED 伪造与 COST_UNAVAILABLE 跳行（行照常入库，avgCost null）；brokers-sdk（富途/长桥原生）缺成本不再抛错；ib 同理；ths 股票账本缺成本行也入库为 null（qty 缺失仍跳过）。缺成本**不再影响覆盖**（行在快照里就是覆盖完整）。
- 账本：`holding.upsert` 允许 `avgCost: null`（未知），与 `0`（真实零成本）区分。`holding-trade` 重算成本时若 totalQty<=0 维持现状。
- 汇总（store.mjs summarize）：`avgCost == null` 的持仓计入 valueBase，不计入 costBase/pnlBase；新增计数 `holdingsWithoutCost` 与对应 warning（info 级）。totalPnlBase 不再被未知成本虚增。
- UI（client.js）：成本列/盈亏列对 null 显示「—」；组合盈亏排除这些行并注明条数。
- 收益口径：券商口径 holdingProfit（sourceTotals）不受影响。

### v2.2 分段覆盖

- 快照可带 `coverage: { [segment]: 'full'|'partial'|'failed' }`，segment 用资产类别键（stock/fund/cash/bond/crypto/other）。给出 coverage 时 `complete` 由它派生（全部 full 才 true）；只给 complete 的 v1 快照行为不变。
- 每条持仓按其 assetClass 归段；mergeSnapshot 只删除「其资产类别段为 full」的消失持仓。THS 的逐行对账 mismatch 仍由适配器自行降段或降 complete。
- 适配器声明：tiger/futu/lb 按调用分段（get_assets 失败→cash 段 failed；get_positions STK 失败→stock failed…）；ths 按账本整段。

### v2.3 警告分级

- `normalizeSnapshot` 接受字符串（v1）或 `{ code, severity: 'info'|'degraded', message? }`；规范化为对象存入来源记录。字符串默认 degraded，`{code}` 缺 message 时 message=原字符串。
- runSync 状态：仅当存在 degraded 警告或 !complete 才标 partial；纯 info（如 QUOTE_DATE_UNAVAILABLE）保持 ok。原 SAFE_PARTIAL 白名单内容转成 info 由适配器标注。
- client.js warningText 已兼容对象形状，仅需对 info/degraded 做视觉区分（次要）。

### v2.4 核心对账（信息性）

- mergeSnapshot 后按币种对账：sourceTotals.cash vs 现金持仓行、totalAsset/netAssets vs 快照内 qty×(manualPrice??avgCost) 合计（仅单币种时可对）。差异超容差（绝对 0.011，或总额 0.5% 中较大者）产出 `TOTAL_MISMATCH:<key>` **info** 警告；多币种不可对则跳过不警告。级别定为 info 是实测结论（2026-11-09）：富途券商汇总用实时估值、持仓接口价格滞后 6.2%，跨价源推导差异不可能收敛到任何容差，降级判断交给适配器（同源数据）。THS 适配器内部已有更严的对账，保持不动（会出现两条警告，可接受）。

### 兼容与迁移

- normalizeSnapshot 同时接受 v1/v2；无需账本数据迁移（旧 avgCost 全是数字，向后兼容）；sources.json 新字段（对象警告、coverage 派生的 complete、snapshotHash）JSON 容错。产出前 `ledger.json.bak` 机制已存在。
- 实施顺序：核心（connectors.mjs + mergeSnapshot + summarize + 测试）→ 适配器并行迁移 → client.js。

## P3：调度与更新机制（P2 之后）

- **认证失败停止轮询**：runSync 失败且错误匹配 AUTH_ERROR 时，来源记录写 `needsReauth: true`；tick 跳过该来源（手动同步仍允许，成功或重新授权后清除标志）。client.js 来源列表显示「需重新授权」徽标。
- **失败指数退避**：来源记录 `failCount`（成功清零）。tick 的到期判断从固定 interval 改为 `min(interval, 5 * 2^(failCount-1))` 分钟，上限 interval。
- **tick 并发**：按来源并行（复用 inFlight 去重），同一连接器内串行（简单队列），跨连接器并行——一个 MCP 卡 240 秒不再阻塞其他来源。
- **休市日跳过**：tick 在周六/周日不触发自动同步（手动同步不受限）；来源可设 `syncWeekends: true` 退出（为加密资产账户预留）。
- **补位层（后置，可独立成任务）**：价格链 quotePrice 缺失时用 sourcePrice（券商价）参与估值：估值链改为 `manualPrice ?? quotePrice ?? sourcePrice ?? avgCost`，UI 对仅 sourcePrice 估值的持仓标「券商价」；cash 推算（总资产−持仓合计）等更深补位暂不做。
