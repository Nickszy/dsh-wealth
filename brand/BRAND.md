# dsh-wealth 品牌指南（v1 · 2026-11）

dsh-wealth 是一个**本机优先**的个人资产账本：把券商、基金与生活账单放进同一份本地账本，
并让 AI 直接读写它。品牌要传达的是「账本的可信 + 本机的私密 + 多源归一」。

## 标志

**标记「账行」（Ledger Strata）**：三条圆角横杠（账本行）自上而下递增，
右上一个圆点（本位币余额）。三条杠分别对应：

- 上 · 陶土色 `#b06b4f` —— 生活账单（吃穿住行）
- 中 · 浅钴蓝 `#8fb2ff` —— 外币资产（港币 / 美元…）
- 下 · 钴蓝 `#2f6fed` —— 本位币资产（人民币主线）
- 圆点 · 墨蓝 `#17233a` —— 本位币合计 / 净资产

一句话：**多条账行，一次结余**（many rows, one balance）。

### 文件

| 文件 | 用途 |
|---|---|
| `brand/logo-mark.svg` | 彩色标记（浅色背景） |
| `brand/logo-mark-reverse.svg` | 彩色标记（深色背景） |
| `brand/logo-mark-ink.svg` | 单色标记（跟随 `currentColor` 的首杠除外） |
| `brand/app-icon.svg` | 应用图标（墨蓝渐变底 + 反白标记） |
| `brand/favicon.svg` | 32px 简化图标 |
| `brand/logo-lockup.svg` / `-reverse.svg` | 横排标志 + 字标 + 说明行 |
| `brand/wordmark.svg` | 纯字标 |
| `icon.svg`（仓库根目录） | 插件图标 = `app-icon`（npm / DSH 插件页使用） |
| `brand/og.png` | 2400×1260 社交分享图（1200×630 @2x） |
| `brand/preview.html` | 由 `scripts/demo-fixture.mjs` 生成的截图演示页面 |

### 使用规则

- 最小尺寸：标记 16px；横排标志最小高度 28px。
- 标记四边留白 ≥ 圆点直径（64 viewBox 中为 9 单位）。
- 只在墨蓝 / 纸白背景上使用；不要给标记加投影、描边或渐变。
- 不要改变三条杠的颜色顺序，也不要拉伸变形。
- 应用内 logo 已内嵌为 data-URI（`client.js` 的 `.wealth-logo`），
  改动请同步修改 `brand/app-icon.svg`。

## 颜色

| 角色 | 名称 | HEX |
|---|---|---|
| 主色 | 钴蓝 Cobalt | `#2f6fed` |
| 主色·浅 | 天蓝 Sky | `#8fb2ff` / 深色背景 `#9fb9ff` |
| 强调 | 陶土 Terracotta | `#b06b4f` / 深色背景 `#e2a089` |
| 墨色 | 墨蓝 Ink | `#17233a` |
| 纸面 | 纸白 Paper | `#f5f3ee` |
| 辅文 | 灰蓝 Slate | `#6f7a8f` |
| 成功 / 危险 | 绿 / 红 | 产品内置 `#149c5b` / `#dd4655` |

配色原则：**钴蓝=金融主线，陶土=生活气息**，纸白底 + 大量留白，
不要大面积深色（截图自带的暗色模式除外）。

## 字体

- 字标 / 标题：系统无衬线（Segoe UI / PingFang SC），字重 650，字距 −1~−3%。
- 说明行：「WEALTH LEDGER · 资产账本」，全大写、字距 3px 左右。
- 站点与长文可用衬线（Georgia / Noto Serif SC）做展示级标题，
  正文回到系统无衬线。

## 截图

所有宣传截图由 `scripts/demo-fixture.mjs` 生成的演示账本渲染
（真实 UI + 真实计算管线 + 虚构数据），重生成：

```bash
node scripts/demo-fixture.mjs
# 然后用 headless 浏览器打开 brand/preview.html 截图（1600×1000）
```
