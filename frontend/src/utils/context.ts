import type { ChatContextMessage, Message } from '@shared';

/** 只把 user / assistant 的文字当上下文；人格 Prompt 由后端负责拼接 */
export function buildContext(messages: Message[], windowSize: number): ChatContextMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-windowSize)
    .map((message) => ({ role: message.role, content: message.content }));
}
