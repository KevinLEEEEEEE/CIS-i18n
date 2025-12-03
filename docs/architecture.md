# 架构说明

## 总览
- UI（React）与插件主线程分离，分别打包为 `ui.html` 与 `code.js`
- UI 负责交互与设置；主线程负责访问 Figma 文档、执行翻译/润色/格式化等动作
- 通过 `@create-figma-plugin/utilities` 的事件总线实现双向通信

## 入口
- UI 入口：`src/app/index.tsx` → 打包到 `dist/ui.html`
- 主线程入口：`src/feature/controller.ts` → 打包到 `dist/code.js`
- 清单：`manifest.json` 指定 `main` 与 `ui`、网络域名白名单与权限

## 模块
- `translator.ts`：集成 Google/Baidu 翻译，包含速率控制与异常处理
- `polisher.ts`：对文本进行润色与可读性优化
- `formatter.ts`：根据语言/平台映射生成样式 key 与格式化结果
- `oauthManager.ts`：Google OAuth 授权码交换与刷新逻辑
- `usageRecord.ts`：使用次数统计（Backendless counters）
- `types/`：事件名、枚举与数据结构类型
- `utils/logger.ts`：统一日志与全局错误处理

## 通信
- UI → 主线程：使用 `emit` 发送请求（如 `REQUEST_LOCAL_STORAGE`、`SET_LOCAL_STORAGE`）
- 主线程 → UI：使用 `on` 监听并回传（如 `RECEIVE_LOCAL_STORAGE`、`SHOW_TOAST`）

## 构建与打包
- Webpack 多入口：`ui` 与 `code`
- `HtmlWebpackPlugin` + `InlineChunkHtmlPlugin` 生成并内联 `ui.html`
- 生产模式下启用 `TerserPlugin`，可选择移除控制台输出

## 测试
- 使用 Jest + ts-jest，测试集中在 `__tests__/`，对 `@create-figma-plugin/utilities` 进行 mock

