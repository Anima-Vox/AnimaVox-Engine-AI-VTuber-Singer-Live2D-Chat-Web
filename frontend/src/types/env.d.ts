/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 对话通道：mock（默认，浏览器内假后端）或 http（自家后端） */
  readonly VITE_CHAT_TRANSPORT?: 'mock' | 'http';
  /** 后端 API 地址，默认 http://localhost:3001（仅 http 模式使用） */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
