# 来源连接器改造方案

基线：`main@709ca16`，`npm test` 381/381 通过。

## 进度（2026-11-09）

- **P0 完成**，**P1 完成**：`npm test` 433/433 通过；P1 期间 426 条原有测试未改动。
- 生产实测（只读，`%TEMP%\conn-probe\probe.mjs` / `e2e.mjs`）：真实同步服务跑在账本与 `sources.json` 的临时副本上，凭据只读并去掉 `refreshToken`，因此不会触发续期，生产文件不会被写入。8 个来源中 7 个同步成功，无持仓被误删；老虎由旧代码的失败变为 partial 成功（融资负债另有告警）。剩下的同花顺爱基金账本被水位拦截，见待办第 3 条。授权账户列表：6 条授权中 5 条可读，复星握手失败（服务端 `Handshake signature verification failed`，需在 H5 页面做「OpenAPI 参数重置」，与代码无关）。
- 审查时补的修复：数量为 0 视为已清仓，不降级覆盖（富途、长桥 MCP）；长桥 MCP 的认证错误照常抛出，不降级为 partial；老虎负现金不写入 `sourceTotals.cash`。

### 待办（P0/P1 遗留）

1. 富途原生 SDK、长桥原生 SDK、IB 缺成本时仍整份快照失败（这样做不会误删，但与其他连接器跳过该行的做法不一致），P2 中成本允许为空后统一处理。
2. 同花顺爱基金 `onwayfund`/`clearfund` 两类行目前跳过，但 `complete` 仍为 `true`；需确认这两类能否进入账本。
3. 水位按日期比较，在周末和节假日不稳定：爱基金账本存下的水位是 11-08（周日），最新净值日期是 11-06，导致同步一直被拦。放到 P3 改成按内容哈希判断，或允许回退一个交易日。
4. 注册表与 `history-provider.mjs` 互相引用（ESM 下安全）；P2 时考虑把历史适配器函数移入各自的模块。

## 背景

每个来源适配器都已经实现同一组接口：`listXAccounts / fetchXSnapshot / fetchXHistory`，输入是来源配置、凭据和取消信号，输出原始数据；不直接读写账本，测试通过 `deps` 注入依赖。主要问题有两个：

1. **分发层是硬编码的。** `sync.mjs` 里有约 12 类 `connector === 'x'` 特判，分布在 `authConfig`、`secretsFor` 暂存槽、`createAuthorization` 校验与清理、`refreshSecrets`、`fingerprint`、`listAccounts`、`fetchSnapshot`、`readHistory`、`saveSource`、`connectSource` 默认值、按 transport 写死的超时，还有 `history-provider.mjs` 里的分发。新增一家券商要改上面每一处。
2. **快照契约只在运行时生效。** 各适配器的测试只检查适配器自己的输出，从来没把输出交给 `normalizeSnapshot`，所以下面这些 bug 测试全绿也发现不了。

### 已确认的问题（P0 修复）

| # | 问题 | 位置 | 后果 |
|---|---|---|---|
| 1 | 快照警告是 `{message}` 对象，契约要求字符串 | futu-mcp.mjs:371, lb-mcp.mjs:398 | 有任何一条警告，整次同步就失败（港美混合币种账户每次都会触发） |
| 2 | 缺成本价时写成 `avgCost: undefined` | futu-mcp.mjs:316, lb-mcp.mjs:289/315 | 一只持仓缺成本，整次同步失败 |
| 3 | `netAssets` 不在 `TOTAL_KEYS` 白名单里 | connectors.mjs | 校验后被静默丢弃（**已修复**） |
| 4 | `complete` 实际按“价格是否齐全”计算 | tiger-mcp.mjs:519、fosun-client.mjs:375、qieman、futu-mcp、lb-mcp | 持仓读取失败、被截断或有行被跳过时仍可能是 `complete:true`，`mergeSnapshot` 随后会删除仍然存在的持仓 |
| 5 | 不同币种的现金或资产被直接相加 | tiger-mcp.mjs:510, lb-mcp.mjs:390-394 | 汇总数字没有意义 |

## 契约约定（从 P0 起执行）

- **`complete` 只表示“覆盖完整”**：本次快照包含了该来源的全部持仓和全部现金行，因此可以删除已经消失的持仓。下列情况必须是 `false`：任一持仓或现金接口调用失败、结果可能被截断（分页达到上限）、有持仓行因缺少必要字段被跳过。
- **价格缺失不影响 `complete`**：价格缺失属于数据质量问题，只输出警告（`PRICE_UNAVAILABLE…`），`manualPrice` 保持 `null`。
- **快照里的 `warnings` 必须是字符串数组**，以大写错误码开头，例如 `FUTU_MCP_MISSING_COST:US.AAPL`。
- **缺成本价**：v1 契约要求 `avgCost` 必填。在 P2 之前，缺成本的行一律跳过，输出 `<PREFIX>_COST_UNAVAILABLE:<symbol>` 警告并把 `complete` 设为 `false`，这样账本里原有的持仓不会被删。已有的“按现价/净值暂估成本”（老虎、复星、且慢）在 P0 保持不变，到 P2 改为 `null`。
- **不同币种不相加**：适配器自己求和的汇总数，只有在只涉及一个币种时才输出；券商直接返回的已折算总数可以原样保留。
- **测试工具**：所有适配器测试使用 `snapshot-contract.mjs` 中的 `assertSnapshotContract(raw, { complete, warning })` 和 `assertNoCrossCurrencySum(raw, keys)`。每个适配器至少覆盖以下场景：正常、缺成本、一个接口调用失败、多币种现金。

## P0：修复 bug 并补契约测试（三个子代理并行，文件互不重叠）

| 工作包 | 负责的文件 | 内容 |
|---|---|---|
| P0-A | `futu-mcp.mjs` `lb-mcp.mjs` 及对应测试 | 修复问题 1、2、4、5（长桥）。快照警告改为字符串（账户列表的警告视调用方而定）；缺成本的行跳过并把 `complete` 设为 `false`；`complete` 改为按覆盖计算；`netAssets` 和现金合计只在单一币种时输出 |
| P0-B | `tiger-mcp.mjs` `fosun-client.mjs` `qieman-mcp.mjs` 及对应测试 | 修复问题 4、5（老虎）。`complete` 改为按覆盖计算：资产汇总失败、股票或基金持仓读取失败、达到 200 条上限、缺成本被跳过的行，都设为 `false`；老虎现金合计只在单一币种时输出 |
| P0-C | `ths-client.mjs` `brokers-sdk.mjs` `ib-client.mjs` 及对应测试 | 用契约测试工具检查其余适配器，补齐四个场景；只修复确定违反契约的地方，其余情况上报 |

已由主会话完成：`TOTAL_KEYS` 加入 `netAssets`，新增 `snapshot-contract.mjs`。

验收标准：`npm test` 全部通过；每个被改动的适配器都有经过 `assertSnapshotContract` 的测试，覆盖上述四个场景；修改了既有断言（例如 `w.message` 改为字符串）时要在报告里说明。

## P1：连接器注册表（在 P0 合入之后进行，不改变任何行为）

新增 `connector-registry.mjs`。注册表引用各适配器的导出函数，把它们组装成每个来源的描述对象；适配器文件保持纯函数，不反向依赖注册表。

```js
{
  id, label, description,                 // 供 UI 使用，getConnectorStatus 从这里生成
  defaultTransport: 'native' | 'mcp',
  accountIdField: 'brokerAccountId' | 'portfolioId',
  defaults: { accountId?, currency? },
  fingerprintParts(source, secrets) → string[],   // 必须与现有哈希逐字节一致
  transports: {
    native?: Transport, mcp?: Transport,
  },
}
Transport = {
  auth: {
    pendingSlot?: string,                         // 'pending-tiger-mcp'
    validate(secrets) → string | null,            // 返回中文错误提示，没有问题返回 null
    refresh?({ refreshToken, clientId, signal }) → token,
    tokenFields?(token) → secrets 字段,           // 把续期得到的 token 映射回 vault 字段
    credentialsConfigured?(…)
  },
  timeoutMs: { list, sync, history },
  listAccounts, fetchSnapshot, fetchHistory?,
  sourceFields?(input, previous) → 写入 source 的连接字段,   // 替代 saveSource 里的分支
}
```

- `sync.mjs` 和 `history-provider.mjs` 中所有按来源的特判都改为查注册表。`custom` 来源（http 和宿主 MCP 桥接）保留原有代码路径。
- **指纹不能变**：先写测试，把每个来源当前的指纹哈希固定下来，改造完成后必须相同；否则已有来源会被识别成新来源，导致重复导入。
- 新增 `connector-registry.test.mjs`：检查每个描述对象字段齐全，每种 transport 都有 `listAccounts` 和 `fetchSnapshot`；`getConnectorStatus` 的输出与改造前一致。
- 新文件加入 `package.json` 的 `files` 和 `test` 脚本。
- 验收标准：现有测试一条不改就全部通过（允许新增测试）；`sync.mjs` 中不再出现 `connector === '<具体来源>'`（`custom` 除外）。

## P2：快照 v2（需要用户确认后再开始，会影响账本中已存储的数据）

- 持仓的 `avgCost` 允许为 `null`；价格改为 `price: { value, source: 'broker'|'market'|'cost-estimate'|'user', asOf }`，不再把券商价格写进 `manualPrice`，消除它和用户手填价格的混淆（目前 quotes.mjs:83 规定 `manualPrice` 永远优先）。
- 增加 `coverage: { [segment]: 'full'|'partial'|'failed' }`，只在 `full` 的分段内删除消失的持仓，替代单一的 `complete`。
- 警告结构化为 `{ code, severity: 'info'|'degraded'|'blocking', scope }`，只有 `degraded` 才使来源状态变为 partial（替代目前没有被使用的 `SAFE_PARTIAL`）。
- 汇总数改为按币种列出：`totals: [{ currency, totalAsset, cash, liability }]`。对账（来源汇总 vs 持仓合计）统一放到核心层做。
- `normalizeSnapshot` 同时接受 v1 和 v2，适配器逐个升级；账本做一次性迁移，迁移前先备份。

## P3：补位层与调度

- 在 `normalizeSnapshot` 和 `mergeSnapshot` 之间加一层补位：价格依次取行情服务 → 上次价格（标「陈旧」）→ 成本暂估；名称取代码表；成本用历史成交重算；现金用「总资产 − 持仓合计」推算（标「推算」）。每个补出来的值都标明来源。
- 调度：持仓、价格、流水分开更新；认证失败时停止轮询并把来源标为「需重新授权」，其他错误指数退避；`tick` 按连接器限制并发；按交易日历调度；没有时间戳的来源用内容哈希防止旧数据覆盖新数据。
