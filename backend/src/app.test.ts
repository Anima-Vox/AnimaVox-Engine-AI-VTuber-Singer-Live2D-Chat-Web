import { NOTICE_VERSION } from '@shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import { EnvSchema } from './config/env';
import { openDatabase, type Database } from './db/database';
import { ApiError } from './errors';
import { createMockAdapter } from './services/llm/mockAdapter';
import type { LlmAdapter, ModelReply } from './services/llm/types';

/**
 * 后端接口测试：用内存数据库建立整个应用，直接对它发请求（不占端口）。
 * 每个用例都从空的数据库开始。
 */

let db: Database;
let app: FastifyInstance;
/** 「寄出」的验证码：邮箱 → 验证码 */
let sentCodes: Map<string, string>;
/** 目前使用的模型；个别用例会换成会失败的版本 */
let llm: LlmAdapter;

async function start(overrides: Record<string, string> = {}) {
  db = openDatabase(':memory:');
  sentCodes = new Map();
  app = await buildApp({
    db,
    env: EnvSchema.parse({ NODE_ENV: 'test', DAILY_MESSAGE_LIMIT: '3', ...overrides }),
    mailer: {
      async sendRegisterCode(email, code) {
        sentCodes.set(email, code);
      },
    },
    llm: { reply: (input, signal) => llm.reply(input, signal) },
  });
}

beforeEach(async () => {
  // 只固定「现在几点」，方便测试过期与隔天；计时器照常运作
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T10:00:00.000Z') });
  llm = createMockAdapter();
  await start();
});

afterEach(async () => {
  await app.close();
  db.close();
  vi.useRealTimers();
});

/** 把时间往后拨 */
function advance(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

/* ---------- 测试里重复用到的动作 ---------- */

async function register(email = 'nuo@example.com', username = '小柯', trainingConsent = true) {
  const sent = await app.inject({
    method: 'POST',
    url: '/api/auth/email-code',
    payload: { email },
  });
  expect(sent.statusCode).toBe(200);
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      code: sentCodes.get(email),
      password: 'password-123',
      username,
      trainingConsent,
      noticeVersion: NOTICE_VERSION,
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { token: string; user: { id: string; username: string } };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function newConversation(token: string, characterId = 'lijiaying') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    headers: auth(token),
    payload: { characterId },
  });
  expect(response.statusCode).toBe(201);
  return response.json() as { id: string; title: string };
}

function send(token: string, conversationId: string, clientMessageId: string, content: string) {
  return app.inject({
    method: 'POST',
    url: '/api/chat',
    headers: auth(token),
    payload: { conversationId, characterId: 'lijiaying', clientMessageId, content },
  });
}

/** 把模型换成「等到 release() 才回复」的版本，用来测试等待期间发生的事 */
function gatedModel() {
  const inner = createMockAdapter();
  const waiters: (() => void)[] = [];
  llm = {
    async reply(input, signal) {
      await new Promise<void>((resolve) => waiters.push(resolve));
      return inner.reply(input, signal);
    },
  };
  return {
    waiting: () => waiters.length,
    release: () => waiters.forEach((resolve) => resolve()),
  };
}

function count(sql: string, ...params: string[]): number {
  return Number((db.prepare(sql).get(...params) as { n: number }).n);
}

describe('健康检查与错误格式', () => {
  it('GET /api/health 回传 ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('没登录时回 401 与 UNAUTHORIZED', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: 'UNAUTHORIZED',
      message: expect.any(String),
      retryable: false,
    });
  });

  it('请求格式不对时回 API_ERROR，并指出栏位', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'not-an-email' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'API_ERROR',
      reason: 'INVALID_INPUT',
      field: 'email',
    });
  });

  it('没有的路径回 API_ERROR / NOT_FOUND', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/nothing' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'API_ERROR', reason: 'NOT_FOUND' });
  });
});

describe('注册与登录', () => {
  it('邮箱验证码注册后拿到 token，可以读到自己的资料', async () => {
    const { token, user } = await register();
    expect(user).toMatchObject({
      username: '小柯',
      trainingConsent: true,
      noticeVersion: NOTICE_VERSION,
    });
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(token) });
    expect(me.json()).toMatchObject({ email: 'nuo@example.com', username: '小柯' });
    expect(JSON.stringify(me.json())).not.toContain('scrypt');
  });

  it('验证码错误、重复注册、太频繁寄送都有对应原因', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'a@example.com' },
    });
    const tooSoon = await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'a@example.com' },
    });
    expect(tooSoon.json()).toMatchObject({
      code: 'API_ERROR',
      reason: 'CODE_TOO_FREQUENT',
      retryable: true,
    });

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'a@example.com',
        code: '000000' === sentCodes.get('a@example.com') ? '111111' : '000000',
        password: 'password-123',
        username: 'A',
        trainingConsent: false,
        noticeVersion: NOTICE_VERSION,
      },
    });
    expect(wrong.json()).toMatchObject({ reason: 'CODE_INVALID', field: 'code' });

    await register('b@example.com');
    const taken = await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'B@example.com' },
    });
    expect(taken.json()).toMatchObject({ reason: 'EMAIL_TAKEN' });
  });

  it('还没接寄信服务时把验证码随接口回传（devCode）；正式环境不回传', async () => {
    const dev = await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'dev@example.com' },
    });
    expect(dev.json()).toEqual({
      resendAfterSeconds: 60,
      devCode: sentCodes.get('dev@example.com'),
    });

    await app.close();
    db.close();
    await start({ NODE_ENV: 'production' });
    const production = await app.inject({
      method: 'POST',
      url: '/api/auth/email-code',
      payload: { email: 'dev@example.com' },
    });
    expect(production.json()).toEqual({ resendAfterSeconds: 60 });
  });

  it('密码正确才能登录；登出后 token 失效', async () => {
    await register();
    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nuo@example.com', password: 'wrong-password' },
    });
    expect(bad.json()).toMatchObject({ code: 'API_ERROR', reason: 'BAD_CREDENTIALS' });

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nuo@example.com', password: 'password-123' },
    });
    const { token } = login.json() as { token: string };
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: auth(token) });
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(token) });
    expect(me.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('登录超过有效天数后要重新登录', async () => {
    const { token } = await register();
    advance(31 * 86_400_000);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(token) });
    expect(me.statusCode).toBe(401);
  });
});

describe('对话与回复', () => {
  it('后端保管记录：新对话、送出一句、读回全部消息；标题改成第一句话', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    expect(conversation.title).toBe('新对话');

    const response = await send(token, conversation.id, 'client-msg-0001', '你好');
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      conversation: { title: string };
      userMessage: { id: string; content: string };
      reply: { role: string; content: string; emotion: string };
    };
    expect(body.userMessage).toMatchObject({ id: 'client-msg-0001', content: '你好' });
    expect(body.reply).toMatchObject({ role: 'assistant', emotion: 'happy' });
    expect(body.reply.content).toMatch(/^小柯，/);
    expect(body.conversation.title).toBe('你好');

    const messages = await app.inject({
      method: 'GET',
      url: `/api/conversations/${conversation.id}/messages`,
      headers: auth(token),
    });
    expect((messages.json() as { messages: unknown[] }).messages).toHaveLength(2);

    const list = await app.inject({
      method: 'GET',
      url: '/api/conversations?characterId=lijiaying',
      headers: auth(token),
    });
    expect((list.json() as { conversations: unknown[] }).conversations).toHaveLength(1);
  });

  it('同一个 clientMessageId 送两次：不重复写入、不重复计用量，回传同一条回复', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    const first = (await send(token, conversation.id, 'client-msg-0002', '你好')).json();
    const second = (await send(token, conversation.id, 'client-msg-0002', '你好')).json();
    expect(second.reply.id).toBe(first.reply.id);
    expect(count('SELECT COUNT(*) AS n FROM messages')).toBe(2);
    expect(count('SELECT message_count AS n FROM usage_daily')).toBe(1);
  });

  it('同一句话同时送了两次：只留一条回复、只计一次用量', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    // 两个请求都卡在「等模型」这一步，再一起放行
    const gate = gatedModel();
    const both = Promise.all([
      send(token, conversation.id, 'client-msg-0015', '你好'),
      send(token, conversation.id, 'client-msg-0015', '你好'),
    ]);
    await vi.waitFor(() => expect(gate.waiting()).toBe(2));
    gate.release();

    const [first, second] = await both;
    expect(first.statusCode).toBe(200);
    expect(second.json().reply.id).toBe(first.json().reply.id);
    expect(count('SELECT COUNT(*) AS n FROM messages')).toBe(2);
    expect(count('SELECT message_count AS n FROM usage_daily')).toBe(1);
  });

  it('等模型回复时对话被删除：回 NOT_FOUND，不留下任何消息', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    const gate = gatedModel();
    const pending = send(token, conversation.id, 'client-msg-0016', '你好');
    await vi.waitFor(() => expect(gate.waiting()).toBe(1));
    await app.inject({
      method: 'DELETE',
      url: `/api/conversations/${conversation.id}`,
      headers: auth(token),
    });
    gate.release();

    const response = await pending;
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'API_ERROR', reason: 'NOT_FOUND' });
    expect(count('SELECT COUNT(*) AS n FROM messages')).toBe(0);
  });

  it('模型失败时回 MODEL_UNAVAILABLE 并保留用户消息；用同一个 id 重试会补上回复', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    llm = {
      async reply() {
        throw new ApiError('MODEL_UNAVAILABLE', '测试');
      },
    };
    const failed = await send(token, conversation.id, 'client-msg-0003', '在吗');
    expect(failed.statusCode).toBe(502);
    expect(failed.json()).toMatchObject({ code: 'MODEL_UNAVAILABLE', retryable: true });
    expect(count("SELECT COUNT(*) AS n FROM messages WHERE role = 'user'")).toBe(1);

    llm = createMockAdapter();
    const retried = await send(token, conversation.id, 'client-msg-0003', '在吗');
    expect(retried.statusCode).toBe(200);
    expect(count('SELECT COUNT(*) AS n FROM messages')).toBe(2);
  });

  it('模型不是 ApiError 的失败也当成 MODEL_UNAVAILABLE；超时当成 SERVICE_UNSTABLE', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    llm = {
      async reply() {
        throw new Error('connection refused');
      },
    };
    expect((await send(token, conversation.id, 'client-msg-0004', '在吗')).json()).toMatchObject({
      code: 'MODEL_UNAVAILABLE',
    });

    await app.close();
    db.close();
    await start({ LLM_TIMEOUT_MS: '20' });
    const second = await register();
    const conversation2 = await newConversation(second.token);
    llm = {
      reply: (_input, signal) =>
        new Promise<ModelReply>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    };
    const timedOut = await send(second.token, conversation2.id, 'client-msg-0005', '在吗');
    expect(timedOut.statusCode).toBe(503);
    expect(timedOut.json()).toMatchObject({ code: 'SERVICE_UNSTABLE', retryable: true });
  });

  it('超过每日额度回 QUOTA_EXCEEDED，隔天恢复', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    for (const index of [1, 2, 3]) {
      expect(
        (await send(token, conversation.id, `client-msg-q00${index}`, '你好')).statusCode,
      ).toBe(200);
    }
    const over = await send(token, conversation.id, 'client-msg-q004', '你好');
    expect(over.statusCode).toBe(429);
    expect(over.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', retryable: false });

    advance(86_400_000);
    expect((await send(token, conversation.id, 'client-msg-q005', '你好')).statusCode).toBe(200);
  });

  it('characterId 必填，而且要和对话的角色一致；不能动别人的对话', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    const missing = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: auth(token),
      payload: {
        conversationId: conversation.id,
        clientMessageId: 'client-msg-0006',
        content: '你好',
      },
    });
    expect(missing.json()).toMatchObject({ code: 'API_ERROR', field: 'characterId' });

    const wrongCharacter = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: auth(token),
      payload: {
        conversationId: conversation.id,
        characterId: 'yuchengnuo',
        clientMessageId: 'client-msg-0007',
        content: '你好',
      },
    });
    expect(wrongCharacter.json()).toMatchObject({ field: 'characterId' });

    const other = await register('other@example.com', '别人');
    const stolen = await send(other.token, conversation.id, 'client-msg-0008', '你好');
    expect(stolen.json()).toMatchObject({ reason: 'NOT_FOUND' });
  });

  it('删除对话后消息一起删除', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    await send(token, conversation.id, 'client-msg-0009', '你好');
    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/conversations/${conversation.id}`,
      headers: auth(token),
    });
    expect(removed.statusCode).toBe(204);
    expect(count('SELECT COUNT(*) AS n FROM messages')).toBe(0);
  });
});

describe('帐号设定与训练同意', () => {
  it('写入的消息记下当时是否同意训练；撤回后全部改为不可用于训练，且不能再开启', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    await send(token, conversation.id, 'client-msg-0010', '你好');
    expect(count('SELECT COUNT(*) AS n FROM messages WHERE training_allowed = 1')).toBe(2);

    const withdrawn = await app.inject({
      method: 'POST',
      url: '/api/me/consent/withdraw',
      headers: auth(token),
    });
    expect(withdrawn.json()).toMatchObject({
      trainingConsent: false,
      consentWithdrawnAt: expect.any(String),
    });
    expect(count('SELECT COUNT(*) AS n FROM messages WHERE training_allowed = 1')).toBe(0);

    await send(token, conversation.id, 'client-msg-0011', '还在吗');
    expect(count('SELECT COUNT(*) AS n FROM messages WHERE training_allowed = 1')).toBe(0);
  });

  it('本来就不同意的用户不需要撤回：调用撤回不会留下撤回记录', async () => {
    const { token } = await register('no@example.com', '小柯', false);
    const response = await app.inject({
      method: 'POST',
      url: '/api/me/consent/withdraw',
      headers: auth(token),
    });
    expect(response.json()).toMatchObject({ trainingConsent: false, consentWithdrawnAt: null });
  });

  it('不同意训练的用户照样可以正常对话', async () => {
    const { token } = await register('no@example.com', '小柯', false);
    const conversation = await newConversation(token);
    expect((await send(token, conversation.id, 'client-msg-0012', '你好')).statusCode).toBe(200);
    expect(count('SELECT COUNT(*) AS n FROM messages WHERE training_allowed = 1')).toBe(0);
  });

  it('改用户名后，角色用新名字称呼', async () => {
    const { token } = await register();
    await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: auth(token),
      payload: { username: '阿汶' },
    });
    const conversation = await newConversation(token);
    const body = (await send(token, conversation.id, 'client-msg-0013', '你好')).json();
    expect(body.reply.content).toMatch(/^阿汶，/);
  });

  it('删除帐号要输入密码，删除后资料全部清空', async () => {
    const { token } = await register();
    const conversation = await newConversation(token);
    await send(token, conversation.id, 'client-msg-0014', '你好');

    const wrong = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers: auth(token),
      payload: { password: 'nope' },
    });
    expect(wrong.json()).toMatchObject({ reason: 'BAD_CREDENTIALS' });

    const removed = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers: auth(token),
      payload: { password: 'password-123' },
    });
    expect(removed.statusCode).toBe(204);
    for (const table of ['users', 'sessions', 'conversations', 'messages', 'usage_daily']) {
      expect(count(`SELECT COUNT(*) AS n FROM ${table}`)).toBe(0);
    }
  });
});
