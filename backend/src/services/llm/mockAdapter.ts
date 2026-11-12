import { MOCK_ERROR_TRIGGER, pickMockReply } from '@shared';
import { ApiError } from '../../errors';
import type { LlmAdapter } from './types';

/**
 * Mock 模型：不调用任何真实模型，用前后端共用的演示台词表回复（按角色区分）。
 * 打招呼时会叫出用户名，用来确认用户名有传到模型这一层。
 * 用户输入「模拟错误」时故意丢出 MODEL_UNAVAILABLE，用来测试出错流程。
 */
export function createMockAdapter(): LlmAdapter {
  return {
    mode: 'mock',
    async reply({ characterId, username, history }) {
      const lastUser = [...history].reverse().find((message) => message.role === 'user');
      const text = lastUser?.content ?? '';
      if (MOCK_ERROR_TRIGGER.test(text)) {
        throw new ApiError('MODEL_UNAVAILABLE', '（模拟）模型连接失败');
      }
      const response = pickMockReply(characterId, text);
      if (response.action === 'greeting') {
        response.text = `${username}，${response.text}`;
      }
      return response;
    },
  };
}
