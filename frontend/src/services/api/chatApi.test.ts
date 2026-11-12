import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBackend, json } from '../../test/fakeFetch';
import { chatApi } from './chatApi';
import { setAuthToken, setUnauthorizedHandler } from './client';

const conversation = {
  id: 'c1',
  title: '你好',
  characterId: 'lijiaying',
  createdAt: '2026-11-13T00:00:00.000Z',
  updatedAt: '2026-11-13T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
  setUnauthorizedHandler(() => {});
});

describe('呼叫后端（接口约定 v1）', () => {
  it('送出时只带新的一句、characterId 与 clientMessageId，走同网域的 /api，并附上登录 token', async () => {
    const seen = fakeBackend({
      'POST /api/chat': () =>
        json(200, {
          conversation,
          userMessage: {
            id: 'client-1',
            conversationId: 'c1',
            role: 'user',
            content: '你好',
            createdAt: conversation.createdAt,
          },
          reply: {
            id: 'r1',
            conversationId: 'c1',
            role: 'assistant',
            content: '嗨',
            emotion: 'happy',
            action: 'greeting',
            expression: 'smile',
            createdAt: conversation.createdAt,
          },
        }),
    });
    setAuthToken('token-123');

    const input = {
      conversationId: 'c1',
      characterId: 'lijiaying',
      clientMessageId: 'client-1',
      content: '你好',
    };
    const result = await chatApi.sendMessage(input, new AbortController().signal);

    expect(seen[0]).toMatchObject({
      url: `${window.location.origin}/api/chat`,
      authorization: 'Bearer token-123',
      body: input,
    });
    expect(result.reply).toMatchObject({ content: '嗨', emotion: 'happy' });
  });

  it('按 characterId 读对话列表', async () => {
    const seen = fakeBackend({
      'GET /api/conversations': () => json(200, { conversations: [conversation] }),
    });
    expect(await chatApi.listConversations('yuchengnuo')).toHaveLength(1);
    expect(seen[0]?.url).toBe(`${window.location.origin}/api/conversations?characterId=yuchengnuo`);
  });

  it('后端的错误码转成前端的分类，并保留原因与栏位', async () => {
    fakeBackend({
      'GET /api/conversations/c1/messages': () =>
        json(502, { code: 'MODEL_UNAVAILABLE', message: '模型连接失败', retryable: true }),
      'POST /api/conversations': () =>
        json(400, {
          code: 'API_ERROR',
          message: '没有这个角色',
          retryable: false,
          reason: 'INVALID_INPUT',
          field: 'characterId',
        }),
    });
    await expect(chatApi.listMessages('c1')).rejects.toMatchObject({ code: 'model_unavailable' });
    await expect(chatApi.createConversation('nobody')).rejects.toMatchObject({
      code: 'api_error',
      reason: 'INVALID_INPUT',
      field: 'characterId',
    });
  });

  it('后端回 UNAUTHORIZED 时通知外面（authStore 会登出）', async () => {
    fakeBackend({
      'GET /api/conversations': () =>
        json(401, { code: 'UNAUTHORIZED', message: '未登录', retryable: false }),
    });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(chatApi.listConversations('lijiaying')).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('连不上后端、或回的不是约定的错误格式（例如后端没开时的 502）都当成 network', async () => {
    fakeBackend({
      'DELETE /api/conversations/c1': () => new Response('Bad Gateway', { status: 502 }),
    });
    await expect(chatApi.listConversations('lijiaying')).rejects.toMatchObject({
      code: 'network',
    });
    await expect(chatApi.deleteConversation('c1')).rejects.toMatchObject({ code: 'network' });
  });

  it('后端回了 200 但内容不符合约定时当成 invalid_response', async () => {
    fakeBackend({ 'GET /api/conversations': () => json(200, { conversations: 'oops' }) });
    await expect(chatApi.listConversations('lijiaying')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('中途取消的请求当成 aborted', async () => {
    // 这个假后端永远不回应，只有请求被取消时才结束
    let started = () => {};
    const fetchStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.stubGlobal(
      'fetch',
      (request: Request) =>
        new Promise((_resolve, reject) => {
          started();
          request.signal.addEventListener('abort', () => reject(request.signal.reason));
        }),
    );
    const controller = new AbortController();
    const pending = chatApi.sendMessage(
      {
        conversationId: 'c1',
        characterId: 'lijiaying',
        clientMessageId: 'client-2',
        content: '在吗',
      },
      controller.signal,
    );
    await fetchStarted;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
  });
});
