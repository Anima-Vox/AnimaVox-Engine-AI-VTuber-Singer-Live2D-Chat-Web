import type { ChatContextMessage, LLMResponse } from '@shared';

export interface LlmInput {
  characterId: string;
  /** 用户名：角色用它称呼用户 */
  username: string;
  /** 已组好的系统提示词（人设 + 用户名 + 输出格式） */
  systemPrompt: string;
  /** 最近的对话（最后一条是这次的用户消息） */
  history: ChatContextMessage[];
}

/**
 * 模型适配器：routes/chat.ts 只认这个接口。
 * 接真实模型时新增一个实作（例如 openaiCompatible.ts），失败时丢出 ApiError('MODEL_UNAVAILABLE')。
 */
export interface LlmAdapter {
  readonly mode: 'mock' | 'live';
  reply(input: LlmInput, signal: AbortSignal): Promise<LLMResponse>;
}
