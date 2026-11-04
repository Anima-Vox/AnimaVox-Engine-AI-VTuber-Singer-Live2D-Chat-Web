import {
  ChatResponseSchema,
  HealthResponseSchema,
  type ChatRequest,
  type ChatResponse,
  type HealthResponse,
} from '@shared';
import { httpClient } from './httpClient';

export interface SendChatParams extends ChatRequest {
  /** 前端用户消息 ID，供后续后端关联；当前不代表服务端已实现幂等。 */
  clientMessageId?: string;
}

/** 后端健康检查 */
export async function fetchHealth(): Promise<HealthResponse> {
  const payload: unknown = await httpClient.get('api/health').json();
  return HealthResponseSchema.parse(payload);
}

/** 发送对话请求，返回结构化 LLM 响应（Zod 校验，脏数据直接抛错） */
export async function sendChatMessage(
  params: SendChatParams,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const payload: unknown = await httpClient.post('api/chat', { json: params, signal }).json();
  return ChatResponseSchema.parse(payload);
}
