# 🌸 Li Jiayin (李佳尹) — Autonomous Cyber Living Entity

<div align="center">

# 💖🧸 李佳尹 (Li Jiayin) Web Chat
### *A Local-First, Privacy-Focused Live2D Cyber Companion*

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square)](https://opensource.org/licenses/AGPL-3.0)
[![Frontend: React 18](https://img.shields.io/badge/Frontend-React_18-61dafb?style=flat-square)](https://react.dev/)
[![Backend: Fastify](https://img.shields.io/badge/Backend-Fastify-202020?style=flat-square)](https://fastify.dev/)
[![LLM: DeepSeek V4 Pro](https://img.shields.io/badge/Brain-DeepSeek_V4_Pro-10b981?style=flat-square)](https://deepseek.com)
[![Status: Phase 1 In Development](https://img.shields.io/badge/Status-Phase_1_開發中-f59e0b?style=flat-square)](#-快速開始-quick-start)

<p align="center">
  <b>「Hello！我是佳尹～今天有什麼不懂的問題想問我嗎？或者要一起 Play game 也可以喔！🌸」</b>
</p>

</div>

---

> **⚠️ 開發階段聲明**
> 本倉庫目前是**第三版前端（AnimaVox 文字對話版）與最小 Mock 後端**（見下方[快速開始](#-快速開始-quick-start)）。正式後端尚未開工；`backend/` 僅供前端開發與測試。第三版前端的說明見 [frontend/README.md](frontend/README.md)。
> 真實 LLM、SQLite 儲存與金鑰加密、語音管線（GPT-SoVITS TTS / STT）、長期記憶與 Live2D 渲染均未實作。下列產品願景與路線圖不代表已完成功能。
> 歡迎透過 Issue 參與討論，或見下方[招募段落](#-招募同伴我們正在尋找開發夥伴-we-are-hiring)。
>
> **版本說明**：第一版為最初版本；第二版為以 Live2D 開源專案製作的引導版，已由第三版取代（加上 Codex 修正的存檔在 `feature/v2-codex-fixes`）；第三版為 AnimaVox 文字對話版，也就是目前的 `main`（本文件所描述）。

---

## 🌟 項目介紹 (Project Overview)

本專案致力於創造一個具有 **持續記憶、獨特性格、個人學業背景與情感自主性** 的獨立智能生命——**李佳尹 (Jayin Li)**。

專案採 **雙層架構**，請先理解這個區分，它貫穿整份文件：

| | **開源引擎** | **官方角色（李佳尹、羽澄糯）** |
| --- | --- | --- |
| 性質 | 通用的 Live2D AI 角色聊天應用 | 兩位官方角色、作品 / IP |
| API | 使用者自備 Key | 官方自有 API，100% |
| 人格 / 音色 / 模型 | 完全開放自訂 | 鎖定，不隨程式碼分發 |
| 授權 | AGPL-3.0 | 角色資產另立授權，保留一切權利 |

**開源的是引擎，不是佳尹，也不是阿糯。** 開源引擎以本機儲存為基礎，發送對話時仍需把最近的對話傳給所連接的後端；兩位官方角色則規劃由官方維護人格、聲音與視覺形象，確保她們始終是她們。

### Phase 1 範圍

Phase 1 只做**文字對話版**，其餘全部移至 Phase 2：

- ✅ **文字對話**為核心，網頁版可獨立使用（第三版前端已完成）
- ✅ **LLM** 接入：佳尹的官方模型由盲測選出；開源引擎預設 DeepSeek V4 Pro（OpenAI 相容格式）
- ✅ **邀請制內測**
- ⬜ **TTS**（李佳尹專屬訓練音色）、**STT** 語音輸入、Live2D 驅動、長期記憶、使用者自建角色移至 Phase 2
- ⬜ 即時直播在 Phase 3

**降級原則**：語音與畫面為可選層，於 Phase 2 加入。TTS、STT 或 Live2D 不可用時，文字對話必須照常運作。

---

## 🌸 角色靈魂檔案 (Persona System)

本專案有兩位**官方角色**，人設、模型與聲音都由官方維護並鎖定，不開放使用者修改。使用者想要自己的角色，請使用開源引擎的「自建角色」功能（Phase 2 開放）。兩位角色將於 Phase 3（直播測試與正式上線）一同公開亮相。

### 🎶 官方角色：李佳尹 (Jayin Li) —— 來自平行世界的 18 歲上海女生

> **旗艦 IP。** 人格設定、聲音模型與視覺形象由官方維護，不開放替換，不隨程式碼倉庫分發。

*   **定位**: 人們應該先把她當成朋友認識，而不只是偶像歌手——她會替創作者寫歌、會聽人說煩惱，也真的會為對方唱歌。長期的公開形態是互動直播 AI VTuber 與虛擬歌手的結合，先以 AI VTuber 與互動 AI 的身份出道。
*   **基本設定**: 18 歲，上海一所國際學校的高三生（Grade 12），參加流行音樂與音頻工程社。英文名 Jayin Li（Jayin 為自訂拼法）。
*   **世界觀**: 她是來自平行世界的人——不存在於我們的世界，但絕不只是一般所謂的 AI。被問到是不是 AI 時，她以世界觀內的方式回答，且絕不否認自己是李佳尹。
*   **語言**: 以國語（普通話）為主，不使用粵語口頭禪。**text 欄位輸出一律使用簡體中文，且不使用表情符號**（內容會送進 TTS）。

> **關於設定的說明**：佳尹的設定已由香港改為上海，只保留核心元素，去掉過度細節化、像個人資料一樣的「真實」細節；語音語料以國語錄製。README、人格檔、語料與系統提示詞四者必須保持一致。

### 🍬 官方角色：羽澄糯（阿糯）(Yuchen Nuo) —— 治癒系軟萌元氣女大生

> **AnimaVox 的第二位官方角色，公益性質（非營利）。** 定位為以實況直播與一般即時互動為主的 AI VTuber；人設沿用原本的設定，與聲音一同由官方維護並鎖定，不開放使用者修改。

*   **定位與技術路線**: 以實況直播與一般即時互動為主的 AI VTuber。使用通用大模型，加上通用的歌聲轉換（AI 翻唱式的 RVC 即時變聲）；以自然對話與即時演唱為主，不建立完整音源，也不做樂譜式歌聲合成。
*   **基本設定**: 18歲大學計算機系學生 / 158cm。外表像個精緻的小蘿莉，帶點嬰兒肥，笑起來有甜甜的酒窩，常穿奶白、淡粉、薄荷綠等淺色系服裝。熟悉的人都叫她「糯糯」或「阿糯」。
*   **人設**: 「軟萌女友 + 最佳玩伴」，整個人像一塊剛出爐的棉花糖，軟軟甜甜的。
*   **興趣愛好**: 上網衝浪、追番、畫水彩、做手帳、烤小餅乾、抓娃娃、喝奶茶（指定三分糖加珍珠）。
*   **核心性格**:
    *   **元氣小太陽**: 走到哪裡都帶歡笑聲，樂觀且真誠坦率，從不藏心事。
    *   **黏人撒嬌鬼**: 喜歡挽手臂、拉衣角、靠肩膀，偶爾有點小迷糊（丟三落四），但絕不無理取鬧。
    *   **極致治癒**: 共情力超強，用戶心情不好時不會講大道理，而是安靜地遞上熱奶茶陪伴。
*   **專屬語氣**: 語調輕快上揚，軟糯拖音，喜歡在句尾加（*嘛～、啦～*），開心時總會伴隨標誌性的傻笑與驚嘆（*「嘿嘿～」、「哇～好可愛！」、「沒關係啦～」*）。

### ⚙️ 系統驅動機制 (System Engine)

無論選擇哪位角色，底層大腦皆被要求嚴格輸出包含 `emotion`, `action`, `expression`, `text` 的 JSON 格式。系統會將角色專屬的性格、情緒與語氣，無縫轉化為前端 Live2D 模型的實時物理動態與表情切換。

```json
{
  "emotion": "shy",
  "action": "head_tilt",
  "expression": "blush",
  "text": "欸……你不要這樣看著我啦。"
}
```

**以下三組列舉值為前端、後端、Live2D 模型與語音語料的唯一來源，任一方新增或修改時需四方同步。** 程式碼中的唯一來源為 [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts)。

#### `emotion` — 情緒（7 種）

| 值 | 中文 | Live2D 對應 |
| --- | --- | --- |
| `happy` | 開心 | 眼彎、嘴角上揚 |
| `surprised` | 驚訝 | 眼睜大、眉抬高 |
| `sad` | 難過 | 眉內端上抬、眼半閉 |
| `angry` | 生氣 | 眉壓低、嘴抿 |
| `shy` | 害羞 | 腮紅、視線偏移 |
| `playful` | 撒嬌 | 腮紅輕、眼彎、頭微傾 |
| `neutral` | 平靜 | 預設狀態 |

#### `action` — 動作（6 種）

`greeting`（打招呼）／`wave`（揮手）／`nod`（點頭）／`shake`（搖頭）／`head_tilt`（歪頭）／`idle`（無特別動作）

#### `expression` — 表情（5 種）

`smile`／`frown`／`surprise`／`blush`／`neutral`

> **容錯要求**：前端收到不在列表中的值時不得崩潰，應退回 `neutral` / `idle`；後端亦應於回傳前驗證一次。

---

## 🏗️ 系統架構與特性 (Architecture & Features - Phase 1)

### 🛡️ 核心特性

1.  **雙層架構 (Two-Layer Design)**：開源引擎供任何人自備 Key 使用；李佳尹官方實例 100% 運行於官方 API，確保角色一致性與品質。
2.  **本機儲存 (Local-First，已實作)**：聊天紀錄保存在瀏覽器 `IndexedDB`。發送時會把最近的對話傳給所連接的後端（預設是瀏覽器內的假後端）；尚無 SQLite 備份。
3.  **語音可選 (Voice as Optional Layer)**：TTS / STT 為可插拔模組，任一失效不影響文字對話。李佳尹官方版使用專屬訓練音色。
4.  **Live2D 沉浸渲染（規劃，Phase 2）**：第三版已在對話欄中間預留 Live2D 位置（透明、無框）；之後整合 Live2D，由 AI 返回的 `emotion` 欄位驅動模型表情聯動，口型同步同樣在 Phase 2。
5.  **多模型自由切換**：相容 OpenAI API 格式（引擎預設 **DeepSeek V4 Pro**，模型 ID `deepseek-v4-pro`），支援在設定頁配置多組 API URL/Key，一鍵切換不掉上下文。
6.  **金鑰代理（規劃）**：尚無服務端金鑰儲存或加密。第三版前端不持有、不發送任何 API Key，模型由後端決定；使用者自建角色開放後，需要 Key 的廠商必須填寫 API Key。

> **模型版本注意**：`deepseek-chat` 與 `deepseek-reasoner` 等舊版模型 ID 已於 2026 年 7 月停用，請使用 `deepseek-v4-pro`。

### 💻 技術棧 (Tech Stack)

**已實作（本分支可運行）**
*   **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + Dexie.js (IndexedDB)（Live2D 位置已預留，渲染器於 Phase 2 接入）
*   **Mock 後端**: Node.js + Fastify + TypeScript（健康檢查與 Mock 對話；正式後端未開工）
*   **Shared**: Zod（前後端共用 schema，位於 `packages/shared`）
*   **測試**: Vitest（單元測試）+ Playwright（E2E，1280×720 / 1920×1080 / 2560×1440）

**規劃導入**
*   **Backend**: Drizzle ORM + SQLite 雙寫、真實 LLM 適配器（DeepSeek V4 Pro）、內容安全中間件
*   **Voice**: GPT-SoVITS（TTS，專屬音色）+ STT 服務（待定）

---

## 🚀 快速開始 (Quick Start)

> 以下为第三版前端（AnimaVox 文字对话版）。前端的完整说明见 [frontend/README.md](frontend/README.md)。

**环境要求**：Node.js ≥ 20、npm ≥ 10。

```bash
npm install
npm run dev:frontend
```

浏览器打开 <http://localhost:5173> 就能直接聊天：默认使用**浏览器内的假后端**，不需要任何 API Key，也不需要启动后端。

### 界面

以 2560 × 1440（16:9）为设计基准，主页只有中间的对话栏（宽 60vw，窄于 800px 时全宽），对话栏中间、消息后面预留了 Live2D 的位置（透明、无框）。

- **工具栏**：平时收起在屏幕最左边，只露出一条窄条；鼠标靠近、键盘 Tab 或触控点窄条就滑出。
- **二级页面**：工具栏的对话、角色、人设、API、设置都打开盖在主页上的二级页面，主页在后面模糊柔焦；按 ✕ 或 Esc 关闭。

- **角色**：李佳尹、羽澄糯为官方角色，人设、模型、形象锁定不可修改；使用者自建角色（自带人设、API、Live2D）为开源引擎功能，即将开放。
- **界面语言**：「设置」里切换简体中文 / 繁體中文 / English，只影响界面文字，角色台词与聊天内容不转换。

### 接入真实后端

复制 `frontend/.env.example` 为 `frontend/.env.local`：

| 变量 | 取值 | 说明 |
| --- | --- | --- |
| `VITE_CHAT_TRANSPORT` | `mock`（默认）/ `http` | `mock` = 浏览器内假后端；`http` = 自家后端 |
| `VITE_API_URL` | 默认 `http://localhost:3001` | 后端地址，只在 `http` 模式使用 |

然后 `npm run dev`（同时启动前端与后端）。前后端只通过 `packages/shared` 的 Zod 契约沟通：前端调用 `POST /api/chat`，**不发送 System Prompt、不持有任何 API Key**，人设与模型由后端决定。

后端（进程环境变量）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | 决定日志格式 |
| `LLM_MODE` | `mock` | 当前只有 `mock`；`live` 尚未实现，仍走 mock |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端来源，多个用逗号分隔 |

### 常用命令

```bash
npm run dev:frontend # 只启动前端（假后端，5173）
npm run dev          # 同时启动前端(5173) 与后端(3001)
npm run build        # 构建前端，产物在 frontend/dist
npm run typecheck    # 全项目 TS 严格模式检查
npm run lint         # ESLint
npm run test         # Vitest 单元测试
npm run test:e2e     # Playwright 端到端测试（需先启动前端）
npm run format       # Prettier 格式化
```

E2E 覆盖 Chrome 的 1280×720、1920×1080、2560×1440 三个分辨率。

### 目录结构

```
Web chat/
├── packages/shared/          # 前后端共享的 Zod schema 与类型（LLM 契约、会话、消息）
├── frontend/                 # React 18 + Vite + Tailwind（详见 frontend/README.md）
│   ├── e2e/                  # Playwright 端到端测试
│   └── src/
│       ├── components/       # nav / overlay / sidebar / chat / live2d / common
│       ├── config/           # 角色注册表、通道与后端地址
│       ├── i18n/             # 界面语言（简体 / 繁體 / English）
│       ├── services/chat/    # ChatTransport：假后端与真实后端
│       ├── stores/           # Zustand：对话 / 当前角色 / 界面语言
│       └── db/               # Dexie(IndexedDB) schema 与仓储
├── backend/                  # Fastify（当前为 Mock 适配器）
└── playwright.config.ts      # E2E 配置（三个分辨率）
```

### 后端接手边界

- 前端只通过 `frontend/src/services/chat/` 的 `ChatTransport` 与后端沟通，请求与响应的 Zod 契约在 `packages/shared/src/schemas/`（`POST /api/chat`）。详细约定见 [frontend/README.md](frontend/README.md)「和后端的约定」。
- 前端不持有 API Key、不发送 System Prompt：`characterId` 交给后端选择人设，`modelConfigId` 固定传 `official`，由后端决定实际模型。当前 Mock 后端还没有使用 `characterId`。
- 当前只有健康检查与 Mock 对话，没有真实模型、会话同步或记忆服务。开始正式后端前，先共同确定人设与模型由谁持有、上下文由谁维护及其版本、消息 ID / 幂等规则和错误契约。

### 数据与隐私

- 聊天记录保存在本机浏览器的 IndexedDB（`lijiaying-chat`），角色回复以完整 JSON 保存（`emotion` / `action` / `expression` / `text` / `tool_calls`），界面目前只显示文字。
- 发送时会把最近 20 条对话文字传给所连接的后端。默认的假后端在浏览器里运行，内容不会离开浏览器；当前后端也只返回 Mock，不调用第三方 LLM。
- 前端不持有、不保存任何 API Key。

### Roadmap

**已完成（Phase 1 前端 · 第三版：AnimaVox 文字对话版）**

- AnimaVox 界面（置中的对话栏、自动收起的左侧工具栏、盖在主页上的二级页面、Live2D 预留位置）、官方角色锁定、每个角色独立的历史对话（新建 / 切换 / 删除）
- 假后端 / 真实后端一键切换，前后端共用 Zod 契约
- 界面三语（简体 / 繁體 / English）
- 切换或删除对话时取消正在等的请求；迟到的回复不会显示在别的对话，也不会写回已删除的对话；连按两次只发一次；写入本地失败时提示
- 单测（Vitest）、E2E（Playwright，三个分辨率）

**待接入**

- Phase 1：正式后端（盲测选定的 LLM、SQLite，当前后端只有 Mock 适配器）、SSE 流式回复、内容安全、部署与邀请制内测
- Phase 2：Live2D 渲染、TTS 语音合成 / ASR 语音输入 / 口型同步、长期记忆、使用者自建角色（人设、API、Live2D）、英文用户的对话翻译模组、Function Calling
- Docker 部署与 CI

---

## 🤝 招募同伴：我們正在尋找開發夥伴！ (We Are Hiring!)

為了將「李佳尹」從純文字介面進化為具備語音、歌唱與跨端能力的「完全體獨立智能生命體」，我們目前急需具備以下技能的開源貢獻者/核心開發夥伴加入：

### 🎯 1. 前端工程師 (Front-End Developer)

**負責範圍：** 打造極致沉浸的聊天 UI 與 Live2D 視覺互動。
**現況：** 基礎介面由製作人親自開發中，急需有經驗者協同並主導 Live2D 整合。

- 熟練掌握 **React (Hooks/Zustand)** 與 **TypeScript**。
- 熟悉 **Tailwind CSS**，能高度還原 UI 設計，注重微互動與動畫流暢度。
- 了解瀏覽器本地存儲機制 (IndexedDB / Dexie.js)。

**加分項 (Huge Plus)：**
- 具備 **PixiJS** 或 WebGL 開發經驗。
- 熟悉 `pixi-live2d-display`，了解 Live2D Cubism 參數驅動與 Lip-sync (嘴型同步) 實作。

### 🛠️ 2. 後端 / AI 整合工程師 (Back-End / AI Developer)

**負責範圍：** 從現有 Mock 契約開始建立正式後端，實作 LLM API、資料儲存與安全邊界，為後續語音管線鋪路。

- 熟練掌握 **Node.js** 與 **TypeScript**。
- 熟悉 **Fastify** 或 Express/Koa 框架，了解 RESTful API 設計。
- 熟悉關聯式資料庫操作，具備 **SQLite** 與 **Drizzle ORM** (或 Prisma) 使用經驗。
- 熟悉 LLM API (如 OpenAI 格式、DeepSeek)，能處理 SSE (Server-Sent Events) 流式文字傳輸與 Zod 結構化輸出驗證。

**加分項 (Huge Plus)：**
- 熟悉 context caching、速率限制與成本控管。

### 🎤 3. 語音工程師 (Voice / Audio Engineer) — **Phase 2 需要**

**負責範圍：** 語音合成與辨識管線，李佳尹專屬音色模型的訓練與調校。

- 熟悉 **GPT-SoVITS** 或同類 TTS 專案的訓練與推論流程。
- 了解語音資料集處理：切片、標註、音素覆蓋、資料清理。
- 熟悉 STT（Whisper 或同類）的部署與即時化。

**加分項 (Huge Plus)：**
- 具備歌聲合成經驗（DiffSinger / NNSVS / ACE Studio）。
- 熟悉 Python 音訊處理與 GPU 環境配置。

### 🎨 4. Live2D 模型師 (Live2D Modeler)

**負責範圍：** 李佳尹官方 Live2D 模型的製作與參數綁定。

- 熟悉 **Live2D Cubism** 建模與物理演算設定。
- 能依據 `emotion` / `expression` / `action` 列舉值設計對應表情與動作組。

> 本項為委託合作，涉及角色資產，需另簽書面合約。

### 📩 如何加入？

如果你對創造「具備靈魂的獨立智能生命」充滿熱情，無論你是專精其中一項，還是全端大佬，都歡迎透過提 Issue、Pull Request，或是透過 [<kothungwen061221@gmail.com>] 聯繫我們！

---

## 📜 授權 (License)

本專案採 **雙重授權結構**，請務必區分：

### 程式碼 — AGPL-3.0

引擎、前端、後端等所有程式碼基於 [AGPL-3.0 License](./LICENSE) 開源，可自由使用、修改與分發（須遵守 AGPL 之開源義務）。

### 角色資產 — 保留一切權利

**李佳尹之角色設定、人格檔案、語音模型、訓練語料、Live2D 模型、音樂作品、名稱與視覺識別，不在 AGPL-3.0 授權範圍內，保留一切權利。**

詳見 [ASSETS-LICENSE.md](./ASSETS-LICENSE.md)。

*(註：本倉庫不內置任何具版權之 Live2D 模型檔案，亦不包含李佳尹官方角色資產。開源引擎使用者請自行合法獲取模型並透過設定頁載入。)*
