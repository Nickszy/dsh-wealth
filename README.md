# dsh-portfolio（资产账本）

the agent harness 桌面端插件：多账户、多资产、多币种的持仓与交易流水管理。

## 功能
- 左侧导航「资产」入口，点开是完整资产页
- 账户管理：券商/银行/基金/手写账本，每个账户可设币种
- 持仓：手动录入或 CSV 导入，支持手填现价与成本
- 流水：买入/卖出记账，自动更新持仓数量与成本
- 多币种：CNY/HKD/USD…，汇率可手改，统一折算到本位币
- 对话维护：`资产管家` Bot 通过 `cli.mjs` 读写同一份账本

## 数据位置
`%USERPROFILE%\.dsh\data\dsh-portfolio\ledger.json`（本机文件，自动 `.bak` 备份）

## 给 AI 用（cli.mjs）
```
node cli.mjs state
node cli.mjs summary
node cli.mjs '{"op":"trade.add","accountId":"ACC_XXXX","symbol":"600519","side":"buy","qty":100,"price":1600}'
node cli.mjs help
```
操作列表见 `node cli.mjs help`。

## 开发/加载
本地 link 到 profile：`@local` 同款 `link:` 依赖 + `dsh.profile.bundles` 注册，重启客户端后侧边栏出现「资产」。
