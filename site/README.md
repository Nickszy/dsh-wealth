# wealth.nickszy.com

dsh-wealth 官网。纯静态 HTML/CSS，无构建步骤。

## 目录

```text
site/
├── index.html          # 单页官网（中文）
├── styles.css          # 全部样式
├── 404.html            # 自定义 404
├── _headers            # CSP / 安全头 / 资源缓存
├── sitemap.xml
├── robots.txt          # 注意：nickszy.com 若开启 Cloudflare 托管 robots，会被其覆盖
├── wrangler.jsonc      # Cloudflare Workers Static Assets 配置
└── assets/
    ├── shots/*.jpg     # 由 brand/screenshots 压制的站用截图
    ├── logo-*.svg
    └── og.jpg          # 1200×630 社交分享图
```

## 部署

使用已登录的 Cloudflare 账号：

```bash
npx --yes --package wrangler wrangler deploy --config site/wrangler.jsonc
```

`wrangler.jsonc` 已把 `wealth.nickszy.com` 绑定为 custom domain，
首次部署会自动创建 DNS 记录与证书。部署后验证：

```bash
curl -sI https://wealth.nickszy.com/ | head
```

## 截图与品牌资产

截图不是手工拼的：`node scripts/demo-fixture.mjs` 会用**真实 client.js + 真实计算管线 + 虚构演示账本**
生成 `brand/preview.html`，再用 headless 浏览器按 1600×1000 截取，最后压成 1280 宽 JPEG 放进 `site/assets/shots/`。
品牌规范见 [../brand/BRAND.md](../brand/BRAND.md)。
