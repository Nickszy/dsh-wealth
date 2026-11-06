# dsh-asset-ledger（资产账本）

DeepSeek Harness（DSH）桌面端插件：多账户、多资产、多币种的持仓与交易流水管理。

## 安装
在 DSH 桌面端插件页「添加插件」输入名称即可（npm 包名）：

```
dsh-asset-ledger
```

或命令行（profile 里）：

```
dsh plugin --profile desktop add dsh-asset-ledger
```

安装后重启客户端，左侧导航出现「资产」。

> npm: <https://www.npmjs.com/package/dsh-asset-ledger> · GitHub: <https://github.com/Nickszy/dsh-asset-ledger>

## 功能
- 左侧导航「资产」入口，点开是完整资产页
- 账户管理：券商/银行/基金/手写账本，每个账户可设币种
- 持仓：手动录入或 CSV 导入，支持手填现价与成本
- 流水：买入/卖出记账，自动更新持仓数量与成本
- 多币种：CNY/HKD/USD…，汇率可手改，统一折算到本位币
- 对话维护：`资产管家` Bot 通过 `cli.mjs` 读写同一份账本

## 数据位置
`%USERPROFILE%\.dsh\data\dsh-portfolio\ledger.json`（本机文件，自动 `.bak` 备份，不上云）

## 给 AI 用（cli.mjs）
```
node cli.mjs state
node cli.mjs summary
node cli.mjs account.upsert name=华泰证券 type=broker currency=CNY
node cli.mjs trade.add accountId=ACC_xxx symbol=600519 side=buy qty=100 price=1600
node cli.mjs help
```
操作列表见 `node cli.mjs help`。PowerShell 下建议用 `key=value` 形式（JSON 里的双引号会被吞）。

## 结构
- `index.js` — 宿主半身：`/portfolio/api/*` 路由（state / op）
- `store.mjs` — JSON 存储与操作分发（原子写、.bak 备份、多币种折算）
- `cli.mjs` — 命令行读写入口（给 AI）
- `client.js` — 前端页面（左侧「资产」入口 + 总览/账户/持仓/流水/录入）
- `cordis.patch.yml` — bundle 注册补丁

## License
MIT
