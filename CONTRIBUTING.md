# 贡献指南

## 开发环境
- Node 18+，npm 或 yarn
- 安装依赖：`yarn` / `npm i`
- 开发构建：`npm run build:watch`
- 运行测试：`npm test`

## 提交流程
- Fork 仓库并创建特性分支
- 保持小步提交，提交信息简洁明了
- 提交前运行 `npm test` 与代码格式化：`npm run prettier:format`
- 发起 Pull Request，描述问题与解决方案，附带必要的截图或日志

## 代码规范
- TypeScript，遵循现有类型与枚举
- 遵循 ESLint + Prettier 配置
- 不要在代码库中提交任何密钥或机密信息

## 测试
- 使用 Jest（ts-jest），测试位于 `__tests__/`
- 若需 mock 插件通信，使用 `__tests__/mocks/utilities.ts`

## 文档
- 更新相关文档（README、docs/），保持与实现一致

