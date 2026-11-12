# 前端：AnimaVox 第三版（文字对话版）

AnimaVox（心音）引擎的 Web 前端。这一版只做文字对话：语音、Live2D 渲染、自定义角色都还没接入，但位置与接口都已预留。
默认用**浏览器内的假后端**回复，打开就能聊、不需要帐号；切到 `http` 模式就走自家后端（要先注册登录，对话由后端保管）。

> **版本**：第一版为最初版本；第二版为以 Live2D 开源项目制作的引导版，已由第三版取代（加上 Codex 修正的存档在 `feature/v2-codex-fixes`）；第三版就是这里，也就是目前的 `main`。

## 界面布局

以 **2560 × 1440（16:9）** 为设计基准。主页只留中间的对话，其余功能都盖在主页上：

| 部分            | 位置与尺寸                                   | 内容与行为                                                                 |
| --------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 对话栏          | 水平置中，宽 60vw，上下占满；窄于 800px 时全宽 | 标题、消息、输入框；两侧留白，不加边框                                     |
| Live2D 预留位置 | 对话栏中间，底部贴齐输入框上缘               | 宽高比 1080 : 1170，高约消息区的 70%；在消息后面一层，透明、无框，不挡点击 |
| 工具栏          | 屏幕最左边，浮在主页之上（不占版面宽度）     | 平时收起只露出一条窄条；鼠标靠近、键盘 Tab 或触控点窄条就滑出              |
| 二级页面        | 置中，宽 60vw、高 75vh；窄于 800px 时接近全宽 | 对话、角色、人设、API、设置；主页在后面模糊柔焦，按 ✕ 或 Esc 关闭          |

- 工具栏：鼠标离开后延迟 300ms 才收起，期间回来就不收；二级页面开着时一直展开。动画只动 transform 与 opacity，系统开启「减少动态效果」时直接切换。
- 二级页面：页面开着时点工具栏其他项直接切换；在「对话」页点选对话或「新对话」后自动回到聊天，删除对话不关闭。
- 键盘：二级页面打开时焦点在 ✕，Tab 只在二级页面与工具栏之间循环，关闭后焦点回到打开它的工具栏按钮。

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

| 变量                  | 取值                         | 作用                                                         |
| --------------------- | ---------------------------- | ------------------------------------------------------------ |
| `VITE_CHAT_TRANSPORT` | `mock`（默认）/ `http`       | `mock` = 浏览器内假后端，不需要帐号；`http` = 自家后端，要登录 |
| `VITE_API_URL`        | 默认 `http://localhost:3001` | 后端地址，只在 `http` 模式使用；正式部署同网域时留空         |

切到 `http` 后用 `npm run dev`（同时启动前后端，需要 Node.js ≥ 22.13）。修改 `.env.local` 后要重启 dev server。

- **假后端**：对话存在浏览器的 IndexedDB（库名 `lijiaying-chat`）。
- **自家后端**：打开先看到登录 / 注册页。开发环境还没接寄信服务，按「发送验证码」后验证码会直接显示在页面上。注册说明必须滑到底才能选择是否同意训练；「设置」里可以改用户名、撤回训练同意、登出、删除帐号。

两种模式都可以发送「模拟错误」，故意让模型失败一次，查看出错提示与重试按钮。

## 和后端的约定

完整约定见仓库根目录的 [`接口约定-v1.md`](../接口约定-v1.md)，Zod schema 在 `packages/shared/src/schemas/api.ts`。重点：

- 对话记录由后端保管，`POST /api/chat` 只送新的一句：`{ conversationId, characterId, clientMessageId, content }`。
- `clientMessageId` 就是这条用户消息的 id；按「重试」时用同一个 id 重送，后端不会重复写入。
- **前端不发送 System Prompt、不持有任何 API Key**，人格与模型由后端决定。
- 回复的 `response` 为 `{ emotion, action, expression, text }`；界面目前只显示 `text`，其余字段留给 Live2D 与语音。
- 错误固定五种：`API_ERROR`、`MODEL_UNAVAILABLE`、`SERVICE_UNSTABLE`、`QUOTA_EXCEEDED`、`UNAUTHORIZED`，前端按语言显示对应提示。
- 之后做流式回复时，只需在 `src/services/backend/remote.ts` 加一个方法，界面层不用动。

## 对话与本地记录的一致性

- 同一时间只等一个回复；一次发送还在处理时，再按发送或重试都不会发出第二条。
- 切换对话或角色时，会取消正在等的请求；迟到的回复不会显示在别的对话里。
- 写入消息与删除对话用同一个事务：对话被删除后，迟到的回复不会再写回本地。
- 写入本地失败时（例如浏览器存储已满），会提示这句话没有发出去，请重新发送（只在假后端模式）。

## 预留给 Phase 2 的位置

- **Live2D**：`src/components/live2d/Live2DSlot.tsx` 是对话栏中间的预留位置，现在不渲染任何东西。
  之后把渲染器当成 `children` 放进去，参考 `feature/v2-codex-fixes` 分支第二版的实作
  （`Live2DCanvas.tsx`、`Live2DStage.tsx`、`services/live2d/*`、`utils/live2dExpression.ts`），
  由回复里的 `emotion` / `expression` 驱动表情。
- **自定义角色**：`CharacterProfile.origin = 'custom'` 的角色不受锁定；人设、API 面板已按是否锁定分开显示。

## 目录

```
src/
├── App.tsx                      主页布局（置中的对话栏）与二级页面切换
├── config/
│   ├── app.ts                   通道、后端地址、超时、上下文条数
│   └── characters.ts            角色注册表（官方 / 自定义、开场白、建议话题）
├── services/
│   ├── backend/                 ChatBackend 接口：local（假后端 + IndexedDB）/ remote（自家后端）
│   ├── api/                     接口客户端（带登录 token、错误转换）
│   └── chat/                    假后端与错误分类（台词表在 packages/shared/src/mock/mockReplies.ts）
├── i18n/                        界面语言：locales.ts + messages/（zh-CN、zh-TW、en）
├── stores/
│   ├── authStore.ts             帐号：登录 / 注册 / 登出 / 改名 / 撤回同意 / 删除帐号
│   ├── chatStore.ts             对话：历史列表 / 新对话 / 切换 / 删除 / 发送 / 重试 / 停止
│   ├── characterStore.ts        当前角色（记在本地）
│   └── localeStore.ts           界面语言（记在本地）
├── db/                          IndexedDB（会话、消息、设置）
├── assets/brand/                AnimaVox LOGO（左上角，文字已转曲线）
└── components/
    ├── auth/                    登录 / 注册页、必须滑到底的注册说明
    ├── nav/                     最左侧工具栏（平时收起，鼠标靠近才滑出）
    ├── overlay/                 二级页面外框（模糊背景、✕ / Esc 关闭、焦点管理）
    ├── sidebar/                 二级页面的内容：对话记录、角色、人设、API、设置
    ├── chat/                    消息列表、气泡、输入框、出错提示、空状态
    ├── live2d/                  Live2D 预留位置（透明、无框）
    └── common/                  头像、图标、下拉选单
```

## 可以放心修改的地方

| 想改什么                   | 文件                               | 改哪里                                      |
| -------------------------- | ---------------------------------- | ------------------------------------------- |
| 开场白、建议话题、简介     | `src/config/characters.ts`         | 对应角色的 `greeting`、`suggestions`、`tagline` |
| 头像上的字                 | `src/config/characters.ts`         | `monogram`                                  |
| 假后端的回复内容           | `packages/shared/src/mock/mockReplies.ts` | 每条的文字；`pattern` 是触发关键词          |
| 工具栏的宽度、窄条、感应范围、动画 | `src/styles/index.css`     | `:root` 里的 `--nav-*` 变量                 |
| 收起前的延迟               | `src/components/nav/NavRail.tsx`   | `NAV_COLLAPSE_DELAY_MS`                     |
| 二级页面的尺寸             | `src/styles/index.css`             | `.overlay-page`                             |
| Live2D 预留位置的比例、高度 | `src/styles/index.css`            | `.live2d-slot`                              |
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
