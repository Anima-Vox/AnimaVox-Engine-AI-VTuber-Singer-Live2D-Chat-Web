import type { ChatRequest, ChatResponse } from '@shared';
import type { ChatTransportMode } from '../../config/app';

export interface SendOptions {
  /** 用户点「停止」时中断请求 */
  signal?: AbortSignal;
}

/**
 * 演示模式的回复来源：浏览器内假后端（services/backend/local.ts 用它产生回复）。
 *
 * 请求与响应都使用 packages/shared 里的 Zod 契约（ChatRequest / ChatResponse），
 * 接真实后端时走 services/backend/remote.ts（接口约定 v1），不经过这里。
 */
export interface ChatTransport {
  readonly mode: ChatTransportMode;
  send(request: ChatRequest, options?: SendOptions): Promise<ChatResponse>;
}
