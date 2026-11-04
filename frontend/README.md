# AnimaVox 第二版前端（Codex 修正版）

Codex 修正版的范围只有 `frontend/`。仓库外层的 `backend/`、`packages/`、根目录文件与配置属于旧版，保留原样；不能将其中的接口或说明视为Codex 修正版后端已经实现。**Codex 修正版正式后端尚未开工。**

## 运行与外部依赖

前端保留原有 React / TypeScript / Vite、Zustand、Dexie 与 Live2D 结构，没有新增框架或依赖。它目前仍需放在原仓库结构中：

- `vite.config.ts` 将 `@shared` 指向 `../packages/shared/src`，`package.json` 也保留旧的 `@ai-live2d/shared` workspace 依赖。这是旧版外部类型引用，不是Codex 修正版共享层或后端实现。
- `tsconfig.json` 与 `tsconfig.node.json` 继承 `../tsconfig.base.json`。单独复制此目录还不能独立构建。

在仓库根目录安装现有依赖后，只启动前端：

```bash
npm ci
npm run dev -w frontend
```

浏览器打开 <http://localhost:5173>。未接入对话服务时仍可查看前端流程；非 Mock 配置在本机检查格式（需要 Key 的厂商须填写 Key）后进入界面，但实际发送聊天仍需兼容服务。

```bash
npm run typecheck -w frontend
npm run lint -w frontend
npm test -w frontend
npm run build -w frontend
```

`e2e/` 使用测试专用的 API 模拟，只启动前端，不需要第二版或正式后端。在仓库根目录运行：

```bash
npx playwright install chromium
npx playwright test -c frontend/playwright.config.ts
```

此配置测试 1280×720 与 1920×1080 两种桌面尺寸。外层旧版测试配置及其启动方式不属于Codex 修正版验收。

已知情况：部分无头浏览器环境会把含中文的下载文件名改成 `download`，导致「导出 Markdown」测试失败；应用交给浏览器的文件名本身是正确的。

## 结构与后端接手位置

| 位置 | 当前责任 |
| --- | --- |
| `src/components/` | 首次引导、聊天、设置与 Live2D 界面 |
| `src/stores/` | 界面状态、当前角色、全局模型选择与会话操作 |
| `src/db/` | 浏览器 IndexedDB 与本机仓储 |
| `src/services/httpClient.ts` | 统一 HTTP 客户端，读取 `VITE_API_URL`，默认 `http://localhost:3001` |
| `src/services/chatApi.ts` | 健康检查、对话请求与响应校验，支持传入取消信号 |
| `src/services/modelApi.ts` | 本机配置格式与必填 Key 校验，以及可选的兼容 Mock 测试 |
| `src/utils/systemPrompt.ts` | 当前在前端拼装人格提示词及最近 N 条消息 |

`chatApi.ts` 目前使用旧版兼容 DTO 与请求路径；这是待后端共同确认的前端接缝，不是Codex 修正版后端规范。可选 `clientMessageId` 仅用于关联客户端消息，不保证服务端幂等。前端保留响应的消息 ID 与时间；切换、新建或删除会话时取消相关请求，并忽略过期结果。当前仍是一次性 JSON 响应，没有 SSE。

模型配置保存在本机，选择为全局选择，切换会话不会恢复各自的旧模型。配置 ID 尚无Codex 修正版服务端注册或解析机制。正式接入前先共同确定：配置与密钥归属、上下文维护方及版本、消息 ID / 幂等规则和错误格式，再修改现有服务层接入真实文字对话。

## 测试含义与数据流

- 非 Mock 配置返回 `mode: format-only`：只在本机检查 API 地址、模型名，以及需要 Key 的厂商是否已填写 API Key（必填）；不联网、不发送 Key，也不证明 Key 有效或后端、真实厂商可用。
- Mock 配置可尝试已有兼容测试接口；仅在所配置服务可用时成功，不代表Codex 修正版正式后端存在。
- 当前未添加真实文字后端、记忆、语音或工具执行。Live2D 是前端渲染功能，口型与音频管线仍未接入；模型使用 Cubism 3/4 的 `.model3.json`，不支持旧版 `.model.json`。

聊天、角色和模型配置持久化于本机 IndexedDB。实际发送聊天时，角色提示词与最近消息会传给 `VITE_API_URL` 指定的服务；该服务是否进一步转发或保留数据，需由其实现说明。需要 Key 的厂商必须填写 API Key；它以浏览器明文保存，本机格式校验只检查是否已填写，不会发送它，未来真实连接的凭据策略尚未确定。前端不提供服务端备份或密钥保密保证。
