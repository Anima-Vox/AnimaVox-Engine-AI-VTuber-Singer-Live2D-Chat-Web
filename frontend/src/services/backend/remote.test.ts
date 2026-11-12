import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../api/client';
import { ChatTransportError } from '../chat';
import { createRemoteBackend } from './remote';

const conversation = {
  id: 'c1',
  title: '你好',
  characterId: 'lijiaying',
  activeModelId: 'official',
  createdAt: '2026-11-13T00:00:00.000Z',
  updatedAt: '2026-11-13T00:00:00.000Z',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup(responder: (request: Request) => Response) {
  const requests: Request[] = [];
  const bodies: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      requests.push(input);
      bodies.push(await input.clone().text());
      return responder(input);
    }),
  );
  const onUnauthorized = vi.fn();
  const api = createApiClient({
    baseUrl: 'http://backend.test',
    getToken: () => 'token-123',
    onUnauthorized,
  });
  return { backend: createRemoteBackend(api), requests, bodies, onUnauthorized };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('接后端的 ChatBackend', () => {
  it('送出时只带新的一句、characterId 与 clientMessageId，并附上登录 token', async () => {
    const { backend, requests, bodies } = setup(() =>
      jsonResponse(200, {
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
          createdAt: conversation.createdAt,
        },
      }),
    );

    const result = await backend.sendMessage({
      conversationId: 'c1',
      characterId: 'lijiaying',
      clientMessageId: 'client-1',
      content: '你好',
    });

    const request = requests[0];
    expect(request?.url).toBe('http://backend.test/api/chat');
    expect(request?.headers.get('Authorization')).toBe('Bearer token-123');
    expect(JSON.parse(bodies[0] ?? '')).toEqual({
      conversationId: 'c1',
      characterId: 'lijiaying',
      clientMessageId: 'client-1',
      content: '你好',
    });
    expect(result.reply.content).toBe('嗨');
  });

  it('按 characterId 读对话列表', async () => {
    const { backend, requests } = setup(() => jsonResponse(200, { conversations: [conversation] }));
    expect(await backend.listConversations('yuchengnuo')).toHaveLength(1);
    expect(requests[0]?.url).toBe('http://backend.test/api/conversations?characterId=yuchengnuo');
  });

  it('后端的错误码转成前端分类，并保留原因与栏位', async () => {
    const { backend } = setup(() =>
      jsonResponse(502, { code: 'MODEL_UNAVAILABLE', message: '模型连接失败', retryable: true }),
    );
    const error = await backend.listMessages('c1').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ChatTransportError);
    expect(error).toMatchObject({ code: 'model_unavailable', status: 502, detail: '模型连接失败' });
  });

  it('UNAUTHORIZED 时通知外面（回到登录页）', async () => {
    const { backend, onUnauthorized } = setup(() =>
      jsonResponse(401, { code: 'UNAUTHORIZED', message: '未登录', retryable: false }),
    );
    await expect(backend.listConversations('lijiaying')).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('后端回了不符合约定的内容时当成 invalid_response', async () => {
    const { backend } = setup(() => jsonResponse(200, { conversations: 'oops' }));
    await expect(backend.listConversations('lijiaying')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});
