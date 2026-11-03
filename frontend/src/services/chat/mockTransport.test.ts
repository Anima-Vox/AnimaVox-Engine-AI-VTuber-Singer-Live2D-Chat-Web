import { describe, expect, it } from 'vitest';
import { ACTIONS, EMOTIONS, EXPRESSIONS, type ChatRequest } from '@shared';
import { ChatTransportError } from './errors';
import { createMockTransport } from './mockTransport';

function requestFor(text: string, characterId?: string): ChatRequest {
  return {
    conversationId: 'conv-1',
    characterId,
    modelConfigId: 'official',
    messages: [{ role: 'user', content: text }],
  };
}

describe('mockTransport', () => {
  const transport = createMockTransport({ delayMs: () => 0 });

  it('返回完整的结构化 JSON，且字段都在枚举表内', async () => {
    const result = await transport.send(requestFor('你好'));

    expect(result.conversationId).toBe('conv-1');
    expect(result.response.text.length).toBeGreaterThan(0);
    expect(EMOTIONS).toContain(result.response.emotion);
    expect(ACTIONS).toContain(result.response.action);
    expect(EXPRESSIONS).toContain(result.response.expression);
    expect(result.response.tool_calls).toEqual([]);
  });

  it('关键词同时接受简体与繁体', async () => {
    const simplified = await transport.send(requestFor('今天好难过'));
    const traditional = await transport.send(requestFor('今天好難過'));

    expect(simplified.response.emotion).toBe('sad');
    expect(traditional.response.emotion).toBe('sad');
  });

  it('按角色使用各自的台词，没有专属台词时用李佳尹的', async () => {
    const jiayin = await transport.send(requestFor('你好', 'lijiaying'));
    const nuo = await transport.send(requestFor('你好', 'yuchengnuo'));
    const unknown = await transport.send(requestFor('你好', 'someone-else'));

    expect(nuo.response.text).not.toBe(jiayin.response.text);
    expect(unknown.response.text).toBe(jiayin.response.text);
  });

  it('同一句话永远拿到同一条兜底回复', async () => {
    const first = await transport.send(requestFor('随便说点'));
    const second = await transport.send(requestFor('随便说点'));

    expect(first.response.text).toBe(second.response.text);
  });

  it('输入「模拟错误」时返回一次服务器错误', async () => {
    await expect(transport.send(requestFor('模拟错误'))).rejects.toBeInstanceOf(ChatTransportError);
  });

  it('可以被 AbortSignal 中断', async () => {
    const slow = createMockTransport({ delayMs: () => 10_000 });
    const controller = new AbortController();
    const pending = slow.send(requestFor('你好'), { signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
  });
});
