# dsh-wealth-preview

预览版插件：把资产账本的界面挂到 DSH 左侧插件栏，方便在不动真实账本的前提下看效果。

- 页面内容 = 当前 `client.js` + 一份虚构演示账本 + 浏览器内的只读 mock API。
- 演示账本额外挂了两条「待确认标的」（`000001` 基金身份冲突、`02549` 查询超时），
  用来展示证券目录核验、采用候选、重新查询的完整流程。
- 完全隔离：不 import 账本模块，不 import `store.mjs`，不读也不写 `~/.dsh/data/dsh-portfolio`。
  页面右下角常驻「预览模式 · 演示数据 · 不读写真实账本」角标。

## 构建

在插件仓库根目录：

```bash
node scripts/preview-build.mjs
```

输出 `preview/public/index.html`（构建产物，已 gitignore）。改了 `client.js` 或 `brand/demo-db.json`
之后要重新构建，否则预览页还是旧界面。

`brand/demo-db.json` 由 `scripts/demo-fixture.mjs` 生成；首次构建时若不存在会自动生成。

## 装进 DSH 桌面

在 `~/.dsh/profiles/desktop/package.json` 里：

1. `dependencies` 加一行
   `"dsh-wealth-preview": "link:<本仓库>/preview"`
2. `dsh.profile.bundles` 加一项 `"dsh-wealth-preview"`
3. 在 profile 目录执行 `pnpm install --ignore-scripts`

重启 DSH 后，左侧插件栏会出现「资产预览」图标，点开在主区渲染预览页。

> 用 `link:` 指向 worktree 时，worktree 被清理后插件会加载失败。合并回主仓库后，
> 把链接改成 `link:<主仓库>/preview`。

## 卸载

删掉上面两处配置，profile 目录执行 `pnpm install --ignore-scripts`，重启 DSH。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | host 半：把构建好的页面挂到 `GET /portfolio-preview`（只读静态文件） |
| `client.js` | client 半：`sidebar.panellist` 图标 + `main` 入口 + iframe 容器 |
| `cordis.patch.yml` | bundle 补丁，插入本插件 |
| `../scripts/preview-build.mjs` | 页面构建脚本（演示数据 + mock API + 内嵌 client.js） |
