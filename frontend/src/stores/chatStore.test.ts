import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function instantTransport(): ChatTransport {
  return createMockTransport({ delayMs: () => 0 });
}

/** 记下每次请求，并且第一次失败、之后成功 */
function flakyTransport(requests: ChatRequest[] = []): ChatTransport {
  const inner = instantTransport();
  return {
    mode: 'mock',
    async send(request: ChatRequest): Promise<ChatResponse> {
      requests.push(request);
      if (requests.length === 1) {
        throw new ChatTransportError('network');
      }
      return inner.send(request);
    },
  };
}

/** 记下每次请求，正常回复 */
function recordingTransport(requests: ChatRequest[]): ChatTransport {
  const inner = instantTransport();
  return {
    mode: 'mock',
    async send(request: ChatRequest): Promise<ChatResponse> {
      requests.push(request);
      return inner.send(request);
    },
  };
}

/** 等测试调用 release() 才回复，而且不理会中断，模拟回复刚好在删除对话前后到达 */
function lateTransport() {
  let release = () => {};
  const inner = instantTransport();
  const transport: ChatTransport = {
    mode: 'mock',
    async send(request: ChatRequest): Promise<ChatResponse> {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return inner.send(request);
    },
  };
  return { transport, release: () => release() };
}

async function openStore(transport: ChatTransport = instantTransport(), characterId = 'lijiaying') {
  const store = createChatStore({ transport, database });
  await store.getState().openCharacter(characterId);
  return store;
}

describe('chatStore', () => {
  it('发送后写入用户消息与完整的回复 JSON，并出现在历史对话里', async () => {
    const store = await openStore();

    await store.getState().send('你好');

    const state = store.getState();
    expect(state.status).toBe('ready');
    expect(state.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(state.messages[1]?.emotion).toBe('happy');
    expect(state.messages[1]?.action).toBe('greeting');
    expect(state.messages[1]?.expression).toBe('smile');
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]?.title).toBe('你好');
    expect(await listMessages(state.conversationId ?? '', database)).toHaveLength(2);
  });

  it('请求里带上当前角色', async () => {
    const requests: ChatRequest[] = [];
    const store = await openStore(flakyTransport(requests), 'yuchengnuo');

    await store.getState().send('在吗');

    expect(requests[0]?.characterId).toBe('yuchengnuo');
  });

  it('重新打开角色时恢复最近的对话', async () => {
    const first = await openStore();
    await first.getState().send('你好');

    const second = await openStore();

    expect(second.getState().messages).toHaveLength(2);
    expect(second.getState().conversationId).toBe(first.getState().conversationId);
  });

  it('不同角色的对话互不混在一起', async () => {
    const store = await openStore();
    await store.getState().send('你好');

    await store.getState().openCharacter('yuchengnuo');

    expect(store.getState().conversations).toHaveLength(0);
    expect(store.getState().messages).toHaveLength(0);
  });

  it('新对话、切换回旧对话', async () => {
    const store = await openStore();
    await store.getState().send('第一段');
    const firstId = store.getState().conversationId ?? '';

    store.getState().startNewConversation();
    expect(store.getState().conversationId).toBeNull();
    await store.getState().send('第二段');

    expect(store.getState().conversations).toHaveLength(2);
    await store.getState().selectConversation(firstId);
    expect(store.getState().messages[0]?.content).toBe('第一段');
  });

  it('删除当前对话后回到新对话', async () => {
    const store = await openStore();
    await store.getState().send('你好');
    const conversationId = store.getState().conversationId ?? '';

    await store.getState().deleteConversation(conversationId);

    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().conversations).toHaveLength(0);
    expect(await listMessages(conversationId, database)).toHaveLength(0);
  });

  it('请求失败时显示提示，重试不会重复写入用户消息', async () => {
    const store = await openStore(flakyTransport());

    await store.getState().send('在吗');
    expect(store.getState().notice?.kind).toBe('error');
    expect(store.getState().messages).toHaveLength(1);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('停止等待后显示「已停止」', async () => {
    const store = await openStore(createMockTransport({ delayMs: () => 10_000 }));

    const pending = store.getState().send('你好');
    await new Promise((resolve) => setTimeout(resolve, 20));
    store.getState().stop();
    await pending;

    expect(store.getState().notice?.kind).toBe('stopped');
    expect(store.getState().status).toBe('ready');
  });

  it('打开最后一句还没回复的对话时，提示可以重试', async () => {
    const first = await openStore(flakyTransport());
    await first.getState().send('在吗');

    const second = await openStore();

    expect(second.getState().notice?.kind).toBe('stopped');
  });

  it('连按两次发送只会发出一次', async () => {
    const requests: ChatRequest[] = [];
    const store = await openStore(recordingTransport(requests));

    await Promise.all([store.getState().send('你好'), store.getState().send('你好')]);

    expect(requests).toHaveLength(1);
    expect(store.getState().conversations).toHaveLength(1);
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('等待回复时删除对话，迟到的回复不会写回本地', async () => {
    const { transport, release } = lateTransport();
    const store = await openStore(transport);

    const pending = store.getState().send('你好');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await store.getState().deleteConversation(store.getState().conversationId ?? '');
    release();
    await pending;

    expect(await database.messages.count()).toBe(0);
    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().notice).toBeNull();
  });

  it('写入本地失败时提示，而且不发出请求', async () => {
    const requests: ChatRequest[] = [];
    const store = await openStore(recordingTransport(requests));
    vi.spyOn(database.conversations, 'add').mockRejectedValueOnce(new Error('存储空间已满'));

    await store.getState().send('你好');

    expect(requests).toHaveLength(0);
    expect(store.getState().status).toBe('ready');
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'save' });
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
