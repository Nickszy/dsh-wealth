# Changelog

本项目遵循语义化版本；每个发布版本在这里记录用户可感知的变化。

## [0.9.10] - 2026-11-11

### Fixed
- 复星「扫码开通」修复：onboard/start 引用了未导入的 `fosunClientKeyFromPrivate`，开通必然失败（ReferenceError: fosunClientKeyFromPrivate is not defined）
- 保险库里的客户端私钥损坏（截断/手改/编码错）不再打死开通入口：未完成会话自动换新钥继续；已绑定授权返回明确的 400，引导删除授权后重新开通
- 客户端私钥推导现在校验必须是 EC P-384：RSA 等错误类型的钥在派生时即报清晰原因，不再拖到网关握手才报「签名校验失败」
- onboard/start 对坏 JSON 请求体兜底，异常请求不再抛未捕获异常

### Added
- 复星开通路由级回归测试：选钥三分支（全新生成 / pending 复用 / 已绑定授权）、坏钥自愈后重试复用同一把、坏请求体兜底
