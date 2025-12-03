# 日志与错误处理

## 目标
- 提升可读性与一致性：统一时间戳、级别、环节、步骤与消息内容
- 降低问题定位成本：错误对象标准化输出
- 兼容 Figma data: URL 环境：避免 `localStorage` 抛错

## 使用规范
- 建议为消息添加环节标签与步骤名：
  - `console.log('[Translate Task] Target: 文本数组', data)`
  - `console.error('[Oauth] Refresh: 失败', error)`
- 结构化格式示例：
  - `[2025-12-03T08:12:34.567Z] [LOG] [Stage: Translate Task] [Step: Target] Message: 文本数组` 后续参数作为附加内容输出

## 实现位置
- React UI：`src/utils/logger.ts`，在 `src/app/index.tsx` 调用 `setupLogging()`
- 静态页：`index.html` 内联版本，适用于 demo/调试页

## 级别控制
- 内存默认级别：`debug`
- 若环境允许，可通过 `localStorage.LOG_LEVEL` 控制级别；Figma UI（data: URL）禁用时自动回退，不抛错

## 全局捕获
- `window.error` 与 `unhandledrejection` 统一进入错误日志，分别带上 `[GlobalError]` 与 `[UnhandledRejection]`

