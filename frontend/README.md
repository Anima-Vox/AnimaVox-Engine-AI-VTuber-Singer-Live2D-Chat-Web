# 前端：AnimaVox 第三版（文字对话版）

AnimaVox（心音）引擎的 Web 前端。这一版只做文字对话：语音、Live2D 渲染、自定义角色都还没接入，但位置与接口都已预留。
这是**全接口版**：前端只和后端沟通（接口约定 v1），要先注册登录，对话记录由后端保管。

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

「设置」里可以切换 **简体中文 / 繁體中文 / English**，选择会记在这个浏览器里。

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
npm run dev
```

`npm run dev` 同时启动前端（5173）与后端（3001，需要 Node.js ≥ 22.13）。打开 <http://localhost:5173>，先看到登录 / 注册页：

- 还没接寄信服务：按「寄验证码」后，验证码会直接显示在页面上。
- 注册说明必须滑到底，才能选择是否同意对话用于训练。
- 「设置」里可以改用户名、撤回训练同意、登出、删除帐号。
- 还没接真实模型：角色照演示台词回复。发送「模拟错误」会让模型失败，可以查看出错提示与重试按钮。

不需要任何设定文件：浏览器只连 5173，`/api` 开头的请求由 Vite 转给后端（`vite.config.ts` 的 `server.proxy`）。

## 和后端的约定

完整约定见仓库根目录的 [`接口约定-v1.md`](../接口约定-v1.md)，资料格式在 `packages/shared/src/schemas/api.ts`。前端呼叫后端的代码只有三个文件，都在 `src/services/api/`：

| 文件         | 用途                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `client.ts`  | 唯一的出口：发请求、自动带上登录 token、把各种失败统一转成 `RequestError` |
| `errors.ts`  | 错误分类：后端的五种错误码 + 前端自己判断的四种（停止、超时、连不上、格式不对） |
| `chatApi.ts` | 对话相关的五个接口：列表、新对话、读消息、删除、送出一句话             |

重点：

- 对话记录由后端保管，`POST /api/chat` 只送新的一句：`{ conversationId, characterId, clientMessageId, content }`。
- `clientMessageId` 就是画面上那句话的 id；按「重试」时用同一个 id 再送一次，后端不会重复写入。
- **前端不发送 System Prompt、不持有任何 API Key**，人设与模型由后端决定。
- 角色的回复带有 `emotion` / `action` / `expression`；界面目前只显示文字，其余留给 Live2D 与语音。
- 后端回 `UNAUTHORIZED`（登录过期）时自动登出，回到登录页。

## 对话的一致性

- 同一时间只等一个回复；正在等的时候再按发送或重试，都不会发出第二句。
- 切换对话或角色时，会取消正在等的请求；迟到的回复不会显示在别的对话里。
- 请求失败时，那句话会留在画面上，按「重试」就用同一个 id 再送一次。
- 登出时会清空画面上的对话，下一位登录的人不会看到上一位的内容。

## 预留给 Phase 2 的位置

- **Live2D**：`src/components/live2d/Live2DSlot.tsx` 是对话栏中间的预留位置，现在不渲染任何东西。
  之后把渲染器当成 `children` 放进去，参考 `feature/v2-codex-fixes` 分支第二版的实作
  （`Live2DCanvas.tsx`、`Live2DStage.tsx`、`services/live2d/*`、`utils/live2dExpression.ts`），
  由回复里的 `emotion` / `expression` 驱动表情。
- **自定义角色**：`CharacterProfile.origin = 'custom'` 的角色不受锁定；人设、API 面板已按是否锁定分开显示。

## 目录

```
src/
├── main.tsx                     入口：把 App 放到页面上
├── App.tsx                      最外层：没登录显示登录页；登录后是主页布局与二级页面切换
├── config/
│   └── characters.ts            角色注册表（官方 / 自定义、开场白、建议话题）
├── services/api/                呼叫后端（见上面「和后端的约定」）
├── i18n/                        界面语言：locales.ts + messages/（zh-CN、zh-TW、en）
├── stores/                      状态（Zustand）
│   ├── authStore.ts             帐号：登录 / 注册 / 登出 / 改名 / 撤回同意 / 删除帐号
│   ├── chatStore.ts             对话：历史列表 / 新对话 / 切换 / 删除 / 发送 / 重试 / 停止
│   ├── characterStore.ts        目前的角色（记在浏览器）
│   └── localeStore.ts           界面语言（记在浏览器）
├── utils/                       小工具：产生 id、时间的显示格式
├── styles/index.css             全局样式与工具栏、二级页面、Live2D 位置的尺寸
├── assets/brand/                AnimaVox LOGO（文字已转曲线）
├── test/                        单元测试的共用准备（假的后端）
└── components/
    ├── auth/                    登录 / 注册页、必须滑到底的注册说明
    ├── nav/                     最左侧工具栏（平时收起，鼠标靠近才滑出）
    ├── overlay/                 二级页面外框（模糊背景、✕ / Esc 关闭、焦点管理）
    ├── sidebar/                 二级页面的内容：对话记录、角色、人设、API、设置（含帐号）
    ├── chat/                    消息列表、气泡、输入框、出错提示、空状态
    ├── live2d/                  Live2D 预留位置（透明、无框）
    └── common/                  头像、图标、下拉选单
```

浏览器里只保存三样东西（localStorage）：登录 token（`animavox.token`）、界面语言（`animavox.locale`）、上次选的角色（`animavox.character`）。

## 可以放心修改的地方

| 想改什么                   | 文件                               | 改哪里                                      |
| -------------------------- | ---------------------------------- | ------------------------------------------- |
| 开场白、建议话题、简介     | `src/config/characters.ts`         | 对应角色的 `greeting`、`suggestions`、`tagline` |
| 头像上的字                 | `src/config/characters.ts`         | `monogram`                                  |
| 演示台词（Mock 模型的回复） | `backend/src/services/llm/mockReplies.ts` | 每条的文字；`pattern` 是触发关键词   |
| 工具栏的宽度、窄条、感应范围、动画 | `src/styles/index.css`     | `:root` 里的 `--nav-*` 变量                 |
| 收起前的延迟               | `src/components/nav/NavRail.tsx`   | `NAV_COLLAPSE_DELAY_MS`                     |
| 二级页面的尺寸             | `src/styles/index.css`             | `.overlay-page`                             |
| Live2D 预留位置的比例、高度 | `src/styles/index.css`            | `.live2d-slot`                              |
| 界面上的按钮、标题、提示文字 | `src/i18n/messages/*.ts`           | 三个语言文件的同一个位置都要改             |
| 主题颜色                   | `tailwind.config.js`               | `colors` 里的色值                           |
| 整体字号                   | `src/styles/index.css`             | `html { font-size: clamp(...) }`            |
| 每次带多少条上下文、每日额度 | 后端环境变量                     | `CONTEXT_WINDOW`、`DAILY_MESSAGE_LIMIT`（见接口约定第八节） |

改 `emotion` 的枚举值（7 种）需要前后端、Live2D、语料四方同步，见 `项目规格说明书.md` 3.3。

## 测试

```bash
npm run test -w frontend   # 单元测试（Vitest）
npm run test:e2e           # 端到端测试（Playwright：真的浏览器 + 真的前后端，含 2560×1440）
```
