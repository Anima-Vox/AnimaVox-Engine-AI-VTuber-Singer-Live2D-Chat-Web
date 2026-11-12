/**
 * 前端运行配置（纯净版：没有后端，也没有 HTTP 接口）。
 * 前端不持有任何 API Key。
 */

/**
 * 对话通道的种类：mock = 浏览器内的演示回复。
 * 'http' 留给你接上自己的接口后使用（界面会因此隐藏「演示模式」标记）。
 */
export type ChatTransportMode = 'mock' | 'http';

export const APP_CONFIG = {
  /** 纯净版只有浏览器内的演示回复；接上自己的接口后，改用你的通道的 mode */
  transportMode: 'mock' as ChatTransportMode,
  /**
   * 官方实例锁定自有模型，前端只传一个固定标识；
   * 具体用哪个模型由后端决定（对应 ChatRequest.modelConfigId）。
   */
  modelConfigId: 'official',
  /** 每次请求带上最近多少条消息作为上下文 */
  contextWindow: 20,
} as const;
