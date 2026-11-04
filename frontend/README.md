# 前端：AnimaVox 第三版（文字对话版）

AnimaVox（心音）引擎的 Web 前端。这一版只做文字对话：语音、Live2D 渲染、自定义角色都还没接入，但位置与接口都已预留。
后端还没接上之前，默认用**浏览器内的假后端**回复，打开就能聊。

> **版本**：第一版为最初版本；第二版为以 Live2D 开源项目制作的引导版（目前在 `main`）；第三版就是这里（`feature/v3-text-chat`）。`feature/v2-codex-fixes` 是第二版加 Codex 修正的存档。

## 界面布局

以 **2560 × 1440（16:9）** 为设计基准，从左到右四部分：

| 区域           | 宽度         | 内容                                                         |
| -------------- | ------------ | ------------------------------------------------------------ |
| 菜单栏         | 左 1/4（合计） | 对话、角色、人设、API、设置                                |
| 侧边列表       | ↑            | 随菜单切换：默认是与当前角色的历史对话                       |
| 对话区         | 中 2/4       | 消息、输入框                                                 |
| 角色展示框     | 右 1/4       | 拱形展示框（之后放 Live2D 或立绘）、名字、在线状态           |

窄于 1200px 时隐藏展示框；窄于 800px 时只保留菜单栏与对话区。

## 界面语言

「设置」里可以切换 **简体中文 / 繁體中文 / English**，选择会记在本地。

- 只切换界面文字，文字在 `src/i18n/messages/`。
- 繁體由简体逐字转换（OpenCC s2tw），只换字形、不换用词。
- 角色的台词、开场白、建议话题、简介（`src/config/characters.ts`）以及聊天内容都不会被转换或翻译。

## 角色

| 角色   | 类型 | 说明                                                       |
| ------ | ---- | ---------------------------------------------------------- |
| 李佳尹 | 官方 | 人设、模型、形象锁定，不能修改                             |
| 羽澄糯 | 官方 | 同上                                                       |
| 自定义 | 使用者创建 | 开源引擎功能，即将开放：可以自带人设、API 与 Live2D（需要 Key 的厂商必须填写 API Key） |

角色定义在 `src/config/characters.ts`。每个角色的对话分开保存，切换角色不会混在一起；上次使用的角色会被记住。

## 启动

在仓库根目录执行（第一次或依赖有变化时先 `npm install`）：

```bash
npm install
npm run dev:frontend
```

打开 <http://localhost:5173>。

## 假后端 / 真实后端切换

复制 `frontend/.env.example` 为 `frontend/.env.local`，修改：

| 变量                  | 取值                         | 作用                                       |
| --------------------- | ---------------------------- | ------------------------------------------ |
| `VITE_CHAT_TRANSPORT` | `mock`（默认）/ `http`       | `mock` = 浏览器内假后端；`http` = 自家后端 |
| `VITE_API_URL`        | 默认 `http://localhost:3001` | 后端地址，只在 `http` 模式使用             |

切到 `http` 后用 `npm run dev`（同时启动前后端）。修改 `.env.local` 后要重启 dev server。

假后端的小技巧：发送「模拟错误」会故意返回一次服务器错误，可以查看出错提示与重试按钮。

## 和后端的约定

前后端只通过 `packages/shared` 里的 Zod 契约沟通，前端不持有任何 API Key。

- **请求** `POST /api/chat`（`ChatRequestSchema`）：
  - `conversationId`
  - `characterId`：`lijiaying` / `yuchengnuo`，后端据此选择人设（可选字段，旧版前端不传）
  - `modelConfigId`：官方角色固定传 `official`，由后端决定实际模型
  - `messages`：最近 20 条 user / assistant 文字。**前端不发送 System Prompt**，人格由后端持有并锁定。
- **响应**（`ChatResponseSchema`）：`response` 为完整结构化 JSON `{ emotion, action, expression, text, tool_calls }`。
  前端把整份 JSON 存进 IndexedDB（库名 `lijiaying-chat`）；界面目前只显示 `text`，其余字段留给 Live2D 与语音。
- **错误**：后端返回 `{ error, message }` 时，`message` 会直接显示在界面上。
- 之后要做 SSE 流式回复，只需在 `src/services/chat/types.ts` 的 `ChatTransport` 里加一个方法，界面层不用动。

## 对话与本地记录的一致性

- 同一时间只等一个回复；一次发送还在处理时，再按发送或重试都不会发出第二条。
- 切换对话或角色时，会取消正在等的请求；迟到的回复不会显示在别的对话里。
- 写入消息与删除对话用同一个事务：对话被删除后，迟到的回复不会再写回本地。
- 写入本地失败时（例如浏览器存储已满），会提示这句话没有发出去，请重新发送。

## 预留给 Phase 2 的位置

- **Live2D / 立绘**：`src/components/stage/CharacterVisual.tsx` 按角色的 `visual.kind` 切换：
  `placeholder`（现在）、`image`（静态立绘，已可用）、`live2d`（在这里挂载渲染器）。
- **自定义角色**：`CharacterProfile.origin = 'custom'` 的角色不受锁定；人设、API 面板已按是否锁定分开显示。

## 目录

```
src/
├── App.tsx                      四栏布局与面板切换
├── config/
│   ├── app.ts                   通道、后端地址、超时、上下文条数
│   └── characters.ts            角色注册表（官方 / 自定义、开场白、形象）
├── services/chat/
│   ├── types.ts                 ChatTransport 接口（前后端唯一的接缝）
│   ├── httpTransport.ts         真实后端
│   ├── mockTransport.ts         假后端
│   ├── mockReplies.ts           假后端台词表（按角色）
│   └── errors.ts                错误分类与中文提示
├── i18n/                        界面语言：locales.ts + messages/（zh-CN、zh-TW、en）
├── stores/
│   ├── chatStore.ts             对话：历史列表 / 新对话 / 切换 / 删除 / 发送 / 重试 / 停止
│   ├── characterStore.ts        当前角色（记在本地）
│   └── localeStore.ts           界面语言（记在本地）
├── db/                          IndexedDB（会话、消息、设置）
├── assets/brand/                AnimaVox LOGO（左上角，文字已转曲线）
└── components/
    ├── nav/                     最左侧菜单栏
    ├── sidebar/                 侧边列表：对话记录、角色、人设、API、设置
    ├── chat/                    消息列表、气泡、输入框、出错提示、空状态
    ├── stage/                   右侧拱形展示框与形象
    └── common/                  头像、图标、下拉选单
```

## 可以放心修改的地方

| 想改什么                   | 文件                               | 改哪里                                      |
| -------------------------- | ---------------------------------- | ------------------------------------------- |
| 开场白、建议话题、简介     | `src/config/characters.ts`         | 对应角色的 `greeting`、`suggestions`、`tagline` |
| 头像上的字                 | `src/config/characters.ts`         | `monogram`                                  |
| 展示框里的占位文字         | `src/config/characters.ts`         | `visual` 的 `caption`、`note`               |
| 换成静态立绘               | `src/config/characters.ts`         | `visual` 改成 `{ kind: 'image', src: '/立绘.png', alt: '…' }`，图片放 `frontend/public/` |
| 假后端的回复内容           | `src/services/chat/mockReplies.ts` | 每条的文字；`pattern` 是触发关键词          |
| 展示框的渐变颜色、比例     | `src/styles/index.css`             | `.stage-frame` 的 `background`、`aspect-ratio` |
| 界面上的按钮、标题、提示文字 | `src/i18n/messages/*.ts`           | 三个语言文件的同一个位置都要改             |
| 主题颜色                   | `tailwind.config.js`               | `colors` 里的色值                           |
| 整体字号                   | `src/styles/index.css`             | `html { font-size: clamp(...) }`            |
| 每次带多少条上下文         | `src/config/app.ts`                | `contextWindow`                             |

改 `emotion` 的枚举值（7 种）需要前后端、Live2D、语料四方同步，见 `项目规格说明书.md` 3.3。

## 测试

```bash
npm run test -w frontend   # 单元测试（Vitest）
npm run test:e2e           # 端到端测试（Playwright，含 2560×1440）
```
