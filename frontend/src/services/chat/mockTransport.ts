import { ChatResponseSchema, type ChatResponse, type LLMResponse } from '@shared';
import { createId } from '../../utils/id';
import { nowIso } from '../../utils/time';
import { ChatTransportError } from './errors';
import { getMockScript, MOCK_ERROR_TRIGGER } from './mockReplies';
import type { ChatTransport } from './types';

export interface MockTransportOptions {
  /** 模拟「思考」耗时；测试里传 () => 0 跳过等待 */
  delayMs?: (userText: string) => number;
}

/** 稳定哈希：同一句话永远拿到同一条兜底回复，方便复现 */
function stableHash(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1_000_000_007;
  }
  return hash;
}

function pickReply(characterId: string | undefined, userText: string): LLMResponse {
  const { rules, fallbacks } = getMockScript(characterId);
  const rule = rules.find((item) => item.pattern.test(userText));
  if (rule) {
    return structuredClone(rule.reply);
  }
  const fallback = fallbacks[stableHash(userText) % fallbacks.length] ?? fallbacks[0];
  return structuredClone(fallback);
}

/** 句子越长「想」得越久，再加一点随机，读起来更像真人 */
function defaultDelay(userText: string): number {
  return 500 + Math.min(userText.length * 15, 700) + Math.floor(Math.random() * 400);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ChatTransportError('aborted', '已停止等待回复。'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new ChatTransportError('aborted', '已停止等待回复。'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 浏览器内的假后端。
 * 收发的数据结构与真实后端完全相同（同一套 Zod 契约），只是回复来自台词表。
 */
export function createMockTransport(options: MockTransportOptions = {}): ChatTransport {
  const delayMs = options.delayMs ?? defaultDelay;

  return {
    mode: 'mock',
    async send(request, sendOptions = {}) {
      const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
      if (!lastUser) {
        throw new ChatTransportError('http', '请求里没有用户消息。', 400);
      }

      await wait(delayMs(lastUser.content), sendOptions.signal);

      if (MOCK_ERROR_TRIGGER.test(lastUser.content)) {
        throw new ChatTransportError('http', '服务器返回错误（500）：这是演示用的模拟错误。', 500);
      }

      const response: ChatResponse = {
        response: pickReply(request.characterId, lastUser.content),
        conversationId: request.conversationId,
        messageId: createId(),
        createdAt: nowIso(),
      };

      // 和真实后端走同一道校验，保证假数据也符合契约
      return ChatResponseSchema.parse(response);
    },
  };
}
