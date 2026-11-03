/**
 * 前端运行配置（全部来自 VITE_ 环境变量，均为非敏感信息）。
 * 前端不持有任何 API Key：真实模型只能由后端调用。
 */

/** 对话请求走哪条通道：mock = 浏览器内假后端；http = 自家后端 /api/chat */
export type ChatTransportMode = 'mock' | 'http';

function readTransportMode(raw: string | undefined): ChatTransportMode {
  return raw === 'http' ? 'http' : 'mock';
}

export const APP_CONFIG = {
  /** 默认 mock：不启动后端也能体验完整对话流程 */
  transportMode: readTransportMode(import.meta.env.VITE_CHAT_TRANSPORT),
  /** 后端地址，仅 http 模式使用 */
  apiBaseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  /** 单次请求最长等待时间（毫秒） */
  requestTimeoutMs: 60_000,
  /**
   * 官方实例锁定自有模型，前端只传一个固定标识；
   * 具体用哪个模型由后端决定（对应 ChatRequest.modelConfigId）。
   */
  modelConfigId: 'official',
  /** 每次请求带上最近多少条消息作为上下文 */
  contextWindow: 20,
} as const;
