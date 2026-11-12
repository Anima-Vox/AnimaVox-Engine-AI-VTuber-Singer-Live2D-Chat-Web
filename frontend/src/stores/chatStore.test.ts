import type { Conversation, Message, SendMessageRequest } from '@shared';
import { describe, expect, it } from 'vitest';
import type { ChatApi } from '../services/api/chatApi';
import { RequestError, type RequestErrorCode } from '../services/api/errors';
import { createChatStore } from './chatStore';

/**
 * 假的后端：对话与消息存在内存里，行为照接口约定
 *（同一个 clientMessageId 不重复写入、标题取第一句话）。
 * 另外提供几个开关，让测试可以安排「失败一次」或「卡住不回」。
 */
function fakeBackend() {
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  /** 收到的每一次送出 */
  const sent: SendMessageRequest[] = [];
  /** 每个接口下一次要用哪个错误失败 */
  const failNext: Partial<Record<keyof ChatApi, RequestErrorCode>> = {};
  /** 设成 true 时，送出的消息会卡在「等回复」，直到 release() 或被中断 */
  let holding = false;
  let release = () => {};
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 10, 13, 0, 0, (tick += 1))).toISOString();

  function failIfAsked(name: keyof ChatApi) {
    const code = failNext[name];
    if (code) {
      delete failNext[name];
      throw new RequestError(code);
    }
  }

  const api: ChatApi = {
    async listConversations(characterId) {
      failIfAsked('listConversations');
      return conversations
        .filter((item) => item.characterId === characterId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async createConversation(characterId) {
      failIfAsked('createConversation');
      const conversation: Conversation = {
        id: `c${conversations.length + 1}`,
        title: '新对话',
        characterId,
        createdAt: now(),
        updatedAt: now(),
      };
      conversations.push(conversation);
      return conversation;
    },

    async listMessages(conversationId) {
      failIfAsked('listMessages');
      return messages.filter((item) => item.conversationId === conversationId);
    },

    async deleteConversation(conversationId) {
      conversations.splice(
        conversations.findIndex((item) => item.id === conversationId),
        1,
      );
    },

    async sendMessage(input, signal) {
      sent.push(input);
      const conversation = conversations.find((item) => item.id === input.conversationId)!;

      // 第一次收到这个 id 才存下用户这句话
      let userMessage = messages.find((item) => item.id === input.clientMessageId);
      if (!userMessage) {
        userMessage = {
          id: input.clientMessageId,
          conversationId: input.conversationId,
          role: 'user',
          content: input.content,
          createdAt: now(),
        };
        if (!messages.some((item) => item.conversationId === input.conversationId)) {
          conversation.title = input.content;
        }
        messages.push(userMessage);
      }

      if (holding) {
        await new Promise<void>((resolve, reject) => {
          release = resolve;
          signal.addEventListener('abort', () => reject(new RequestError('aborted')));
        });
      }
      failIfAsked('sendMessage');

      const reply: Message = {
        id: `reply-to-${userMessage.id}`,
        conversationId: input.conversationId,
        role: 'assistant',
        content: `收到：${input.content}`,
        emotion: 'happy',
        action: 'greeting',
        expression: 'smile',
        createdAt: now(),
      };
      if (conversations.includes(conversation)) {
        messages.push(reply);
        conversation.updatedAt = reply.createdAt;
      }
      return { conversation, userMessage, reply };
    },
  };

  return {
    api,
    sent,
    messages,
    failNext,
    hold: () => {
      holding = true;
    },
    release: () => release(),
  };
}

/** 建立一个接上假后端的 store，并打开角色 */
async function openStore(backend = fakeBackend(), characterId = 'lijiaying') {
  const store = createChatStore(backend.api);
  await store.getState().openCharacter(characterId);
  return { store, backend };
}

/** 让已经开始的请求先跑到「等回复」那一步 */
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('chatStore：发送与回复', () => {
  it('发送后显示用户这句话与角色的回复（含情绪、动作、表情），并出现在历史对话里', async () => {
    const { store } = await openStore();

    await store.getState().send('你好');

    const state = store.getState();
    expect(state.status).toBe('ready');
    expect(state.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(state.messages[1]).toMatchObject({
      emotion: 'happy',
      action: 'greeting',
      expression: 'smile',
    });
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]?.title).toBe('你好');
  });

  it('只送新的一句，并带上角色与 clientMessageId（就是画面上那句话的 id）', async () => {
    const { store, backend } = await openStore(fakeBackend(), 'yuchengnuo');

    await store.getState().send('在吗');
    await store.getState().send('吃了吗');

    expect(backend.sent).toHaveLength(2);
    expect(backend.sent[1]).toEqual({
      conversationId: store.getState().conversationId,
      characterId: 'yuchengnuo',
      clientMessageId: store.getState().messages[2]?.id,
      content: '吃了吗',
    });
  });

  it('连按两次发送只会发出一次', async () => {
    const { store, backend } = await openStore();

    await Promise.all([store.getState().send('你好'), store.getState().send('你好')]);

    expect(backend.sent).toHaveLength(1);
    expect(store.getState().conversations).toHaveLength(1);
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('停止等待后显示「已停止」；再按重试会拿到回复', async () => {
    const { store, backend } = await openStore();
    backend.hold();

    const pending = store.getState().send('你好');
    await nextTick();
    store.getState().stop();
    await pending;
    expect(store.getState().notice).toEqual({ kind: 'stopped', reason: 'aborted' });
    expect(store.getState().status).toBe('ready');

    const retrying = store.getState().retry();
    await nextTick();
    backend.release();
    await retrying;
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });
});

describe('chatStore：出错与重试', () => {
  it('请求失败时显示提示；重试用同一个 clientMessageId，不会多出一句', async () => {
    const { store, backend } = await openStore();
    backend.failNext.sendMessage = 'model_unavailable';

    await store.getState().send('在吗');
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'model_unavailable' });
    expect(store.getState().messages).toHaveLength(1);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(backend.sent[1]?.clientMessageId).toBe(backend.sent[0]?.clientMessageId);
    expect(backend.messages.filter((message) => message.role === 'user')).toHaveLength(1);
  });

  it('新对话建立失败时，这句话留在画面上；重试会补建对话并送出', async () => {
    const { store, backend } = await openStore();
    backend.failNext.createConversation = 'network';

    await store.getState().send('你好');
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'network' });
    expect(store.getState().messages.map((message) => message.content)).toEqual(['你好']);
    expect(backend.sent).toHaveLength(0);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(store.getState().conversations).toHaveLength(1);
  });

  it('额度用完时提示原因', async () => {
    const { store, backend } = await openStore();
    backend.failNext.sendMessage = 'quota_exceeded';

    await store.getState().send('你好');

    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'quota_exceeded' });
  });

  it('打开最后一句还没回复的对话时，提示可以重试', async () => {
    const backend = fakeBackend();
    const first = await openStore(backend);
    backend.failNext.sendMessage = 'service_unstable';
    await first.store.getState().send('在吗');

    const { store } = await openStore(backend);

    expect(store.getState().notice).toEqual({ kind: 'stopped', reason: 'unanswered' });
    await store.getState().retry();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('读取记录失败时提示；重试会重新读取', async () => {
    const backend = fakeBackend();
    const first = await openStore(backend);
    await first.store.getState().send('你好');

    backend.failNext.listMessages = 'network';
    const { store } = await openStore(backend);
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'network' });
    expect(store.getState().messages).toHaveLength(0);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages).toHaveLength(2);
  });
});

describe('chatStore：历史对话', () => {
  it('重新打开角色时恢复最近的对话', async () => {
    const backend = fakeBackend();
    const first = await openStore(backend);
    await first.store.getState().send('你好');

    const { store } = await openStore(backend);

    expect(store.getState().messages).toHaveLength(2);
    expect(store.getState().conversationId).toBe(first.store.getState().conversationId);
  });

  it('不同角色的对话互不混在一起', async () => {
    const { store } = await openStore();
    await store.getState().send('你好');

    await store.getState().openCharacter('yuchengnuo');

    expect(store.getState().conversations).toHaveLength(0);
    expect(store.getState().messages).toHaveLength(0);
  });

  it('新对话、切换回旧对话', async () => {
    const { store } = await openStore();
    await store.getState().send('第一段');
    const firstId = store.getState().conversationId ?? '';

    store.getState().startNewConversation();
    expect(store.getState().conversationId).toBeNull();
    await store.getState().send('第二段');

    expect(store.getState().conversations).toHaveLength(2);
    await store.getState().selectConversation(firstId);
    expect(store.getState().messages[0]?.content).toBe('第一段');
  });

  it('删除目前的对话后回到新对话', async () => {
    const { store } = await openStore();
    await store.getState().send('你好');

    await store.getState().deleteConversation(store.getState().conversationId ?? '');

    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().messages).toHaveLength(0);
    expect(store.getState().conversations).toHaveLength(0);
  });

  it('等待回复时删除对话，迟到的回复不会显示出来', async () => {
    const { store, backend } = await openStore();
    backend.hold();

    const pending = store.getState().send('你好');
    await nextTick();
    await store.getState().deleteConversation(store.getState().conversationId ?? '');
    backend.release();
    await pending;

    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().messages).toHaveLength(0);
    expect(store.getState().notice).toBeNull();
  });

  it('登出时清空，下一位登录的人看不到上一位的对话', async () => {
    const { store } = await openStore();
    await store.getState().send('你好');

    store.getState().clear();

    expect(store.getState()).toMatchObject({
      characterId: null,
      conversations: [],
      conversationId: null,
      messages: [],
    });
  });
});
