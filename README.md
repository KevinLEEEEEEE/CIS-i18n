# Smart i18n — Figma 插件

一个用于在 Figma/FigJam 中进行多语言翻译、自动润色与样式格式化的插件。插件 UI 使用 React + BaseUI，插件逻辑与宿主通信基于 `@create-figma-plugin/utilities`。

## 特性
- 翻译：支持 Google（Advanced/Basic/Free）与 Baidu
- 润色：对译文进行语气与可读性优化
- 格式化：根据目标语言/平台规则自动调整字体与字号
- OAuth：集成 Google OAuth，用于高级翻译
- 使用记录：统计调用次数（Backendless counters）
- 全局错误与日志：统一格式的 `console` 输出，含时间、环节、步骤、消息

## 目录结构
```
├─ src
│  ├─ app                # React UI 入口与组件
│  │  ├─ components      # Toolbox / Setting / Help
│  │  ├─ app.tsx         # 路由与 Toaster 容器
│  │  ├─ index.tsx       # UI 入口（setupLogging 注入）
│  │  └─ index.html      # Webpack 生成 ui.html 的模板
│  ├─ feature            # 插件核心能力
│  │  ├─ controller.ts   # 插件主线程入口（manifest.main）
│  │  ├─ translate/      # 翻译门面（barrel），适配多提供方
│  │  ├─ polish/         # 润色门面（barrel）
│  │  ├─ format/         # 格式化门面（barrel）
│  │  ├─ oauthManager.ts # OAuth 流程
│  │  └─ usageRecord.ts  # 使用记录
│  ├─ types              # 事件/枚举等类型定义
│  └─ utils              # 工具模块（logger 等）
├─ __tests__             # 单元测试与 mocks
├─ dist                  # 构建输出（ui.html / code.js）
├─ manifest.json         # Figma 插件清单
├─ webpack.config.js     # 构建配置
├─ jest.config.js        # 测试配置
└─ .github/workflows     # CI/Pages 工作流
```

## 快速开始
- 安装依赖：`yarn` 或 `npm i`
- 开发构建：`npm run build:watch`（生成 `dist/ui.html` 与 `dist/code.js`）
- 生产构建：`npm run build`
- 运行测试：`npm test`

将 `manifest.json` 中的 `main/ui` 指向的构建产物（`dist/code.js` 与 `dist/ui.html`）加载到 Figma 插件目录后即可使用。

## 配置与密钥
- 项目根需要本地 `config.js`，已在 `.gitignore` 忽略；仓库内提供 `config.example.js` 样例：
  - `googleOauthClientID`
  - `googleOauthClientSecret`
  - `googleTranslateProjectID`
  - `googleTranslateLocations`
  - `googleTranslateGlossaryID`
- 本地开发：复制 `config.example.js` 为 `config.js` 并填写真实值（不要提交到仓库）
- CI：在构建前自动复制 `config.example.js` 为占位 `config.js`，不包含真实密钥
- UI 仍支持在 Settings 面板中写入 Google/Baidu/Coze 等密钥并持久化到宿主存储
- 安全建议与做法详见 `SECURITY.md`

## 日志与错误处理
- 全局代理 `console` 输出，结构包含：时间、级别、环节、步骤、消息；错误对象标准化为 `{name,message,stack}`
- 使用方法：在消息字符串开头加入环节标签或步骤描述，示例：
  - `console.log('[Polish] Request: 开始排队', payload)`
  - `console.error('[Oauth] Refresh: 失败', err)`
- 实现位置：
  - `src/utils/logger.ts`（React UI 端，在 `index.tsx` 启用）
  - 根 `index.html`（静态页环境内联版本）
更多细节见 `docs/logging.md`。

## 架构说明
- UI 与插件主线程分离：
  - UI 入口：`src/app/index.tsx`，打包为 `ui.html`
  - 主线程入口：`src/feature/controller.ts`，打包为 `code.js`
- 事件通信：使用 `@create-figma-plugin/utilities` 的 `emit/on` 在 UI 与主线程间传递事件
- 能力模块：翻译、润色、格式化、OAuth、使用记录分别位于 `src/feature/*`
详见 `docs/architecture.md`。

## 测试
- 测试框架：Jest（`ts-jest`），测试配置见 `jest.config.js`
- 运行：`npm test`
- Mocks：`__tests__/mocks/utilities.ts` 用于替代 `@create-figma-plugin/utilities`

## 开发规范
- 代码风格：ESLint + Prettier，提交时触发 `lint-staged`
- 提交信息：遵循常规语义，推荐使用 Conventional Commits（可选）

## CI / 发布
- CI：`.github/workflows/ci.yml` 执行安装与构建
- Pages：`.github/workflows/static.yml` 用于静态内容部署（如示例页面），不影响插件发布

## 贡献
- 欢迎提交 Issues 与 Pull Requests，规范与流程见 `CONTRIBUTING.md`
- 行为准则遵循 `CODE_OF_CONDUCT.md`

## 许可证
- 本项目采用 `ISC` 许可证，详见 `LICENSE`
