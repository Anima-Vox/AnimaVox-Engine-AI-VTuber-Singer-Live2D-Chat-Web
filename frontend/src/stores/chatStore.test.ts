import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChatRequest, ChatResponse } from '@shared';
import { ChatDatabase } from '../db';
import { listMessages } from '../db/repositories/messageRepository';
import { ChatTransportError, type ChatTransport } from '../services/chat';
import { createMockTransport } from '../services/chat/mockTransport';
import { buildContext, createChatStore } from './chatStore';

let database: ChatDatabase;

beforeEach(async () => {
  database = new ChatDatabase(`test-chat-store-${Date.now()}-${Math.random()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

/** 第一次失败、之后成功的通道，用来测重试 */
function flakyTransport(): ChatTransport {
  const inner = createMockTransport({ delayMs: () => 0 });
  let calls = 0;
  return {
    mode: 'mock',
    async send(request: ChatRequest): Promise<ChatResponse> {
      calls += 1;
      if (calls === 1) {
        throw new ChatTransportError('network', '连不上服务器，请检查网络或确认后端已经启动。');
      }
      return inner.send(request);
    },
  };
}

describe('chatStore', () => {
  it('发送后写入用户消息与完整的回复 JSON，并更新当前情绪', async () => {
    const store = createChatStore({
      transport: createMockTransport({ delayMs: () => 0 }),
      database,
    });
    await store.getState().load();

    await store.getState().send('你好');

    const state = store.getState();
    expect(state.status).toBe('ready');
    expect(state.messages.map((message) => message.role)).toEqual(['user', 'assistant']);

    const reply = state.messages[1];
    expect(reply?.emotion).toBe('happy');
    expect(reply?.action).toBe('greeting');
    expect(reply?.expression).toBe('smile');
    expect(state.currentEmotion).toBe('happy');

    const stored = await listMessages(state.conversationId ?? '', database);
    expect(stored).toHaveLength(2);
  });

  it('重新载入后恢复上一次的会话', async () => {
    const first = createChatStore({
      transport: createMockTransport({ delayMs: () => 0 }),
      database,
    });
    await first.getState().load();
    await first.getState().send('你好');

    const second = createChatStore({
      transport: createMockTransport({ delayMs: () => 0 }),
      database,
    });
    await second.getState().load();

    expect(second.getState().messages).toHaveLength(2);
    expect(second.getState().currentEmotion).toBe('happy');
  });

  it('请求失败时显示提示，重试不会重复写入用户消息', async () => {
    const store = createChatStore({ transport: flakyTransport(), database });
    await store.getState().load();

    await store.getState().send('在吗');
    expect(store.getState().notice?.kind).toBe('error');
    expect(store.getState().messages).toHaveLength(1);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('停止等待后显示「已停止」，可以再重试', async () => {
    const store = createChatStore({
      transport: createMockTransport({ delayMs: () => 10_000 }),
      database,
    });
    await store.getState().load();

    const pending = store.getState().send('你好');
    await new Promise((resolve) => setTimeout(resolve, 20));
    store.getState().stop();
    await pending;

    expect(store.getState().notice?.kind).toBe('stopped');
    expect(store.getState().status).toBe('ready');
  });

  it('清空对话会删除本地记录', async () => {
    const store = createChatStore({
      transport: createMockTransport({ delayMs: () => 0 }),
      database,
    });
    await store.getState().load();
    await store.getState().send('你好');
    const conversationId = store.getState().conversationId ?? '';

    await store.getState().clear();

    expect(store.getState().messages).toHaveLength(0);
    expect(store.getState().conversationId).toBeNull();
    expect(await listMessages(conversationId, database)).toHaveLength(0);
  });
});

describe('buildContext', () => {
  it('只保留最近 N 条，且只带 role 与 content', () => {
    const messages = Array.from({ length: 5 }, (_, index) => ({
      id: `m${index}`,
      conversationId: 'c',
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `第 ${index} 条`,
      emotion: 'happy',
      createdAt: new Date(2026, 0, 1, 0, index).toISOString(),
    }));

    expect(buildContext(messages, 2)).toEqual([
      { role: 'assistant', content: '第 3 条' },
      { role: 'user', content: '第 4 条' },
    ]);
  });
});
