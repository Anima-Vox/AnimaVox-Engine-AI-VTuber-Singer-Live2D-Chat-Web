import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatDatabase } from '../db';
import { listMessages } from '../db/repositories/messageRepository';
import { pickDemoReply } from '../services/demoReplies';
import type { ReplyInput } from '../services/reply';
import { createChatStore } from './chatStore';

/** 每个用例用一个全新的浏览器数据库 */
let database: ChatDatabase;

beforeEach(async () => {
  database = new ChatDatabase(`test-chat-store-${Date.now()}-${Math.random()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

/**
 * 假的「回复来源」：几乎马上照演示台词回复，并记下每次收到的资料。
 * 另外有几个开关，让测试可以安排「失败一次」或「卡住不回」。
 */
function fakeReplies() {
  const calls: ReplyInput[] = [];
  let failNext = false;
  let holding = false;
  let release = () => {};

  async function getReply(input: ReplyInput, signal: AbortSignal) {
    calls.push(input);
    if (holding) {
      await new Promise<void>((resolve, reject) => {
        release = resolve;
        signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    }
    // 消息按时间排序：真实的回复一定比用户那句话晚，这里也隔开几毫秒
    await new Promise((resolve) => setTimeout(resolve, 3));
    if (failNext) {
      failNext = false;
      throw new Error('没拿到回复');
    }
    return pickDemoReply(input.characterId, input.messages.at(-1)?.content ?? '');
  }

  return {
    getReply,
    calls,
    failOnce: () => {
      failNext = true;
    },
    /** 之后的回复都卡住，直到 release() 或被中断 */
    hold: () => {
      holding = true;
    },
    release: () => release(),
  };
}

/** 建立一个接上假回复的 store，并打开角色 */
async function openStore(replies = fakeReplies(), characterId = 'lijiaying') {
  const store = createChatStore({ getReply: replies.getReply, database });
  await store.getState().openCharacter(characterId);
  return { store, replies };
}

/** 让已经开始的发送先跑到「等回复」那一步 */
const untilWaiting = (replies: ReturnType<typeof fakeReplies>, count = 1) =>
  vi.waitFor(() => expect(replies.calls).toHaveLength(count));

describe('chatStore：发送与回复', () => {
  it('发送后把用户这句话与角色的回复（含情绪、动作、表情）存进浏览器，并出现在历史对话里', async () => {
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
    expect(await listMessages(state.conversationId ?? '', database)).toHaveLength(2);
  });

  it('要回复时带上目前的角色与这段对话的全部消息', async () => {
    const { store, replies } = await openStore(fakeReplies(), 'yuchengnuo');

    await store.getState().send('在吗');
    await store.getState().send('吃了吗');

    expect(replies.calls[1]?.characterId).toBe('yuchengnuo');
    expect(replies.calls[1]?.messages.map((message) => message.content)).toEqual([
      '在吗',
      store.getState().messages[1]?.content,
      '吃了吗',
    ]);
  });

  it('连按两次发送只会发出一次', async () => {
    const { store, replies } = await openStore();

    await Promise.all([store.getState().send('你好'), store.getState().send('你好')]);

    expect(replies.calls).toHaveLength(1);
    expect(store.getState().conversations).toHaveLength(1);
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('停止等待后显示「已停止」；再按重试会拿到回复', async () => {
    const { store, replies } = await openStore();
    replies.hold();

    const pending = store.getState().send('你好');
    await untilWaiting(replies);
    store.getState().stop();
    await pending;
    expect(store.getState().notice).toEqual({ kind: 'stopped', reason: 'aborted' });
    expect(store.getState().status).toBe('ready');

    const retrying = store.getState().retry();
    await untilWaiting(replies, 2);
    replies.release();
    await retrying;
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });
});

describe('chatStore：出错与重试', () => {
  it('没拿到回复时显示提示；重试不会重复存用户那句话', async () => {
    const { store, replies } = await openStore();
    replies.failOnce();

    await store.getState().send('在吗');
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'failed' });
    expect(store.getState().messages).toHaveLength(1);

    await store.getState().retry();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(await database.messages.count()).toBe(2);
  });

  it('打开最后一句还没回复的对话时，提示可以重试', async () => {
    const first = await openStore();
    first.replies.failOnce();
    await first.store.getState().send('在吗');

    const { store } = await openStore();

    expect(store.getState().notice).toEqual({ kind: 'stopped', reason: 'unanswered' });
    await store.getState().retry();
    expect(store.getState().messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('存进浏览器失败时提示，而且不去要回复', async () => {
    const { store, replies } = await openStore();
    vi.spyOn(database.conversations, 'add').mockRejectedValueOnce(new Error('存储空间已满'));

    await store.getState().send('你好');

    expect(replies.calls).toHaveLength(0);
    expect(store.getState().status).toBe('ready');
    expect(store.getState().notice).toEqual({ kind: 'error', reason: 'save' });
  });
});

describe('chatStore：历史对话', () => {
  it('重新打开角色时恢复最近的对话', async () => {
    const first = await openStore();
    await first.store.getState().send('你好');

    const { store } = await openStore();

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

  it('删除目前的对话后回到新对话，消息一起删除', async () => {
    const { store } = await openStore();
    await store.getState().send('你好');
    const conversationId = store.getState().conversationId ?? '';

    await store.getState().deleteConversation(conversationId);

    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().conversations).toHaveLength(0);
    expect(await listMessages(conversationId, database)).toHaveLength(0);
  });

  it('等待回复时删除对话，迟到的回复不会写回浏览器，也不会显示出来', async () => {
    const { store, replies } = await openStore();
    replies.hold();

    const pending = store.getState().send('你好');
    await untilWaiting(replies);
    await store.getState().deleteConversation(store.getState().conversationId ?? '');
    replies.release();
    await pending;

    expect(await database.messages.count()).toBe(0);
    expect(store.getState().conversationId).toBeNull();
    expect(store.getState().notice).toBeNull();
  });
});
