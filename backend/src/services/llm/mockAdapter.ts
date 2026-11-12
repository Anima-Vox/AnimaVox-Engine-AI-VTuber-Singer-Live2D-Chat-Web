import { ApiError } from '../../errors';
import { MOCK_ERROR_TRIGGER, pickMockReply } from './mockReplies';
import type { LlmAdapter } from './types';

/**
 * Mock 模型：不调用任何真实模型，照演示台词表回复（见 mockReplies.ts）。
 * - 打招呼时会叫出用户名，用来确认用户名有传到模型这一层。
 * - 用户说「模拟错误」时故意失败，用来测试出错与重试的流程。
 */
export function createMockAdapter(): LlmAdapter {
  return {
    async reply({ characterId, username, history }) {
      const userText = history.at(-1)?.content ?? '';
      if (MOCK_ERROR_TRIGGER.test(userText)) {
        throw new ApiError('MODEL_UNAVAILABLE', '（模拟）模型连接失败');
      }
      const reply = pickMockReply(characterId, userText);
      return reply.action === 'greeting' ? { ...reply, text: `${username}，${reply.text}` } : reply;
    },
  };
}
