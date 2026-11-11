# TODOS

按组件分组；每条带 **Priority:** P0（现在就修）→ P4（有空再说）；做完的挪到底部 `## Completed` 并标注版本与日期。

## 复星 onboard（扫码开通）

- [ ] 并发开通会话槽：`fosunOnboard` 是模块级单变量，两个标签页同时点「扫码开通」时后者静默顶掉前者（先发起会话的二维码/macId 失效）。动手前需先定语义：拒绝第二次 start，还是 per-session 状态。 **Priority:** P2
- [ ] onboard 轮询完成路径（`pollFosunOnboard` 的绑定 → APIKeyCheck → 握手 → 入库）没有路由级测试——需要一把能伪造完整 ECDH 握手的假网关（fosun-client.test.mjs 里的 gatewayDeps 可改造复用）。 **Priority:** P2

## 宿主路由健壮性

- [ ] qieman/tiger 的 login/start 路由（index.js:582/594/606 附近）仍是 `JSON.parse(await readBody(req).catch(() => '{}'))`：坏 JSON 体解析时抛未捕获异常（desktop 宿主 unhandledRejection 会杀进程）。本次只修了 fosun/onboard/start。 **Priority:** P3

## Completed
