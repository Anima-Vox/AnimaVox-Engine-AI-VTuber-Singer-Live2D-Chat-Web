# 前端：文字对话版

这一版只保留文字对话，Live2D、引导向导、设置页、诊断页、多会话侧栏都暂时移除（它们还完整保留在 `main` 分支里）。
后端还没接上之前，默认用**浏览器内的假后端**回复，打开就能聊。

## 启动

在仓库根目录执行（第一次或依赖有变化时先 `npm install`）：

```bash
npm install
npm run dev:frontend
```

打开 <http://localhost:5173>。界面以 **2560 × 1440（16:9）** 为设计基准，窄于 1100px 时会隐藏左侧舞台，只显示对话。

## 假后端 / 真实后端切换

复制 `frontend/.env.example` 为 `frontend/.env.local`，修改：

| 变量                  | 取值                      | 作用                                         |
| --------------------- | ------------------------- | -------------------------------------------- |
| `VITE_CHAT_TRANSPORT` | `mock`（默认）/ `http`    | `mock` = 浏览器内假后端；`http` = 自家后端   |
| `VITE_API_URL`        | 默认 `http://localhost:3001` | 后端地址，只在 `http` 模式使用             |

切到 `http` 后用 `npm run dev`（同时启动前后端）。修改 `.env.local` 后要重启 dev server。

假后端的小技巧：发送「模拟错误」会故意返回一次服务器错误，可以查看出错提示与重试按钮。

## 和后端的约定

前后端只通过 `packages/shared` 里的 Zod 契约沟通，前端不持有任何 API Key。

- **请求** `POST /api/chat`（`ChatRequestSchema`）：`conversationId`、`modelConfigId`（固定传 `official`，由后端决定实际模型）、`messages`（最近 20 条 user / assistant 文字）。
  **前端不发送 System Prompt**：佳尹的人格由后端持有并锁定。
- **响应**（`ChatResponseSchema`）：`response` 为完整结构化 JSON `{ emotion, action, expression, text, tool_calls }`。
  前端把整份 JSON 存进 IndexedDB（库名 `lijiaying-chat`）；界面只显示 `text`，`emotion` 只用 emoji 表示，`action` / `expression` 暂不显示，留给 Phase 2 的 Live2D。
- **错误**：后端返回 `{ error, message }` 时，`message` 会直接显示在界面上。
- 之后要做 SSE 流式回复，只需在 `src/services/chat/types.ts` 的 `ChatTransport` 里加一个方法，界面层不用动。

## 目录

```
src/
├── App.tsx                     主界面布局（左舞台 + 右对话）
├── config/
│   ├── app.ts                  通道、后端地址、超时、上下文条数
│   └── character.ts            名字、开场白、建议话题（只影响显示）
├── services/chat/
│   ├── types.ts                ChatTransport 接口（前后端唯一的接缝）
│   ├── httpTransport.ts        真实后端
│   ├── mockTransport.ts        假后端
│   ├── mockReplies.ts          假后端台词表
│   └── errors.ts               错误分类与中文提示
├── stores/chatStore.ts         对话状态：发送 / 重试 / 停止 / 清空
├── db/                         IndexedDB（会话、消息）
├── utils/emotion.ts            情绪 → emoji
└── components/
    ├── stage/                  左侧舞台：电平表、名字、当前心情
    ├── chat/                   消息列表、气泡、输入框、出错提示、空状态
    └── common/                 头像、图标
```

## 可以放心修改的地方

| 想改什么                     | 文件                                  | 改哪里                                     |
| ---------------------------- | ------------------------------------- | ------------------------------------------ |
| 开场白、建议话题             | `src/config/character.ts`             | `greeting`、`suggestions`                  |
| 头像上的字                   | `src/config/character.ts`             | `monogram`                                 |
| 假后端的回复内容             | `src/services/chat/mockReplies.ts`    | 每条的 `text`；`pattern` 是触发关键词      |
| 情绪对应的 emoji             | `src/utils/emotion.ts`                | `DISPLAY` 表里的 `emoji`                   |
| 主题颜色                     | `tailwind.config.js`                  | `colors` 里的色值                          |
| 整体字号                     | `src/styles/index.css`                | `html { font-size: clamp(...) }`           |
| 每次带多少条上下文           | `src/config/app.ts`                   | `contextWindow`                            |
| 等待回复的最长时间           | `src/config/app.ts`                   | `requestTimeoutMs`                         |

改 `emotion` 的枚举值（7 种）需要前后端、Live2D、语料四方同步，见 `项目规格说明书.md` 3.3。

## 测试

```bash
npm run test -w frontend   # 单元测试（Vitest）
npm run test:e2e           # 端到端测试（Playwright，含 2560×1440）
```
