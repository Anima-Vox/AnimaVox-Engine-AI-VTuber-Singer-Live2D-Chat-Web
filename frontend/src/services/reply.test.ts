import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../types';
import { getReply } from './reply';

/** 一段只有一句用户消息的对话 */
function conversation(content: string): Message[] {
  return [{ id: 'm1', conversationId: 'c1', role: 'user', content, createdAt: '' }];
}

// 演示回复会先等一小段时间；测试里用假的计时器直接快转
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 要一句回复，并把等待的时间快转过去 */
async function ask(characterId: string, content: string) {
  const pending = getReply(
    { characterId, messages: conversation(content) },
    new AbortController().signal,
  );
  await vi.runAllTimersAsync();
  return pending;
}

describe('演示回复', () => {
  it('不同角色用各自的台词，回复带着情绪、动作、表情', async () => {
    const jiayin = await ask('lijiaying', '你好');
    const nuo = await ask('yuchengnuo', '你好');

    expect(jiayin).toMatchObject({ emotion: 'happy', action: 'greeting', expression: 'smile' });
    expect(nuo.text).toContain('阿糯');
    expect(nuo.text).not.toBe(jiayin.text);
  });

  it('简体与繁体的关键词都认得；没有命中关键词时用兜底回复', async () => {
    expect((await ask('lijiaying', '我有點難過')).emotion).toBe('sad');
    expect((await ask('lijiaying', '嗯')).text).not.toBe('');
  });

  it('说「模拟错误」时故意失败', async () => {
    const pending = getReply(
      { characterId: 'lijiaying', messages: conversation('模拟错误') },
      new AbortController().signal,
    );
    const failed = expect(pending).rejects.toThrow();
    await vi.runAllTimersAsync();
    await failed;
  });

  it('等待期间被中断时丢出 AbortError', async () => {
    const controller = new AbortController();
    const pending = getReply(
      { characterId: 'lijiaying', messages: conversation('你好') },
      controller.signal,
    );
    const aborted = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await aborted;
  });
});
