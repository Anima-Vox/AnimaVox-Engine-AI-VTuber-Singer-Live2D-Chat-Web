import type { ChatRequest, ChatResponse } from '@shared';
import type { ChatTransportMode } from '../../config/app';

export interface SendOptions {
  /** 用户点「停止」时中断请求 */
  signal?: AbortSignal;
}

/**
 * 对话通道：前端与「后端」之间唯一的接口。
 *
 * 请求与响应都使用 packages/shared 里的 Zod 契约（ChatRequest / ChatResponse），
 * 所以把 mock 换成真实后端时，界面与状态层一行都不用改。
 *
 * 之后接 SSE 流式回复（立项文件 M1.4）时，在这里新增一个可选的 stream 方法即可。
 */
export interface ChatTransport {
  readonly mode: ChatTransportMode;
  send(request: ChatRequest, options?: SendOptions): Promise<ChatResponse>;
}
