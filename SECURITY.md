# 安全策略

## 密钥与凭据
- 不要在仓库中提交任何 API Key、OAuth Client Secret 或访问令牌
- 插件运行时通过 UI 设置面板输入并存储于宿主环境（如 `clientStorage`），必要时加密或遮盖显示
- 代码中引用的 `config` 仅用于本地开发与 CI 注入，不应提交生产机密

## 依赖与构建
- 锁定依赖版本，定期升级安全补丁
- 生产构建可移除控制台输出（`TerserPlugin.drop_console`），避免泄露敏感信息

## 网络访问
- `manifest.json` 中的 `allowedDomains` 需最小化白名单范围，仅保留必要域名

## 报告安全问题
- 请通过 Issues 或邮件联系维护者，包含复现步骤与影响范围

