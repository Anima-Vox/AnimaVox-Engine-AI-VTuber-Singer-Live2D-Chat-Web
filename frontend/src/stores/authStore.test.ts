import type { User } from '@shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../services/api';
import { ChatTransportError } from '../services/chat';
import { createAuthStore } from './authStore';

const user: User = {
  id: 'u1',
  email: 'nuo@example.com',
  username: '小柯',
  trainingConsent: true,
  noticeVersion: 1,
  consentWithdrawnAt: null,
  createdAt: '2026-11-13T00:00:00.000Z',
};

function fakeClient(
  handlers: Record<string, (body: unknown) => unknown>,
): ApiClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async request(method, path, schema, options) {
      calls.push(`${method} ${path}`);
      const handler = handlers[`${method} ${path}`];
      if (!handler) {
        throw new ChatTransportError('unknown');
      }
      return schema.parse(handler(options?.json));
    },
    async send(method, path) {
      calls.push(`${method} ${path}`);
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authStore', () => {
  it('演示模式不需要登录', () => {
    const store = createAuthStore({ client: fakeClient({}), required: false });
    expect(store.getState().status).toBe('signed-in');
  });

  it('没有保存的 token 时显示登录页；登录后记住 token', async () => {
    const client = fakeClient({ 'post api/auth/login': () => ({ token: 't1', user }) });
    const store = createAuthStore({ client, required: true });
    await store.getState().restore();
    expect(store.getState().status).toBe('signed-out');

    await store.getState().login('nuo@example.com', 'password-123');
    expect(store.getState()).toMatchObject({ status: 'signed-in', user: { username: '小柯' } });
    expect(localStorage.getItem('animavox.token')).toBe('t1');
  });

  it('注册时带上训练选择与说明版本', async () => {
    let sent: unknown;
    const client = fakeClient({
      'post api/auth/register': (body) => {
        sent = body;
        return { token: 't2', user: { ...user, trainingConsent: false } };
      },
    });
    const store = createAuthStore({ client, required: true });
    await store.getState().register({
      email: 'nuo@example.com',
      code: '123456',
      password: 'password-123',
      username: '小柯',
      trainingConsent: false,
    });
    expect(sent).toMatchObject({ trainingConsent: false, noticeVersion: 1 });
    expect(store.getState().user?.trainingConsent).toBe(false);
  });

  it('保存的 token 失效时回到登录页并清掉 token', async () => {
    localStorage.setItem('animavox.token', 'old');
    const client = fakeClient({});
    const store = createAuthStore({ client, required: true });
    await store.getState().restore();
    expect(store.getState().status).toBe('signed-out');
    expect(localStorage.getItem('animavox.token')).toBeNull();
  });

  it('撤回同意后更新用户资料', async () => {
    const client = fakeClient({
      'post api/auth/login': () => ({ token: 't1', user }),
      'post api/me/consent/withdraw': () => ({
        ...user,
        trainingConsent: false,
        consentWithdrawnAt: '2026-11-13T01:00:00.000Z',
      }),
    });
    const store = createAuthStore({ client, required: true });
    await store.getState().login('nuo@example.com', 'password-123');
    await store.getState().withdrawConsent();
    expect(store.getState().user).toMatchObject({ trainingConsent: false });
  });
});
