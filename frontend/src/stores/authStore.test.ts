import type { User } from '@shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBackend, json } from '../test/fakeFetch';
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

const unauthorized = () => json(401, { code: 'UNAUTHORIZED', message: '未登录', retryable: false });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authStore', () => {
  it('没有保存的 token 时显示登录页；登录后记住 token，之后的请求都带上它', async () => {
    const seen = fakeBackend({
      'POST /api/auth/login': () => json(200, { token: 't1', user }),
      'PATCH /api/me': () => json(200, { ...user, username: '阿汶' }),
    });
    const store = createAuthStore();
    await store.getState().restore();
    expect(store.getState().status).toBe('signed-out');

    await store.getState().login('nuo@example.com', 'password-123');
    expect(store.getState()).toMatchObject({ status: 'signed-in', user: { username: '小柯' } });
    expect(localStorage.getItem('animavox.token')).toBe('t1');

    await store.getState().rename('阿汶');
    expect(seen[1]).toMatchObject({ authorization: 'Bearer t1', body: { username: '阿汶' } });
    expect(store.getState().user?.username).toBe('阿汶');
  });

  it('打开页面时用保存的 token 恢复登录', async () => {
    localStorage.setItem('animavox.token', 'saved');
    const seen = fakeBackend({ 'GET /api/me': () => json(200, user) });
    const store = createAuthStore();
    await store.getState().restore();
    expect(seen[0]?.authorization).toBe('Bearer saved');
    expect(store.getState()).toMatchObject({ status: 'signed-in', user: { id: 'u1' } });
  });

  it('保存的 token 已失效：回到登录页并清掉 token', async () => {
    localStorage.setItem('animavox.token', 'old');
    fakeBackend({ 'GET /api/me': unauthorized });
    const store = createAuthStore();
    await store.getState().restore();
    expect(store.getState().status).toBe('signed-out');
    expect(localStorage.getItem('animavox.token')).toBeNull();
  });

  it('后端连不上：显示登录页，但保留 token，下次打开还能恢复登录', async () => {
    localStorage.setItem('animavox.token', 'saved');
    fakeBackend({});
    const store = createAuthStore();
    await store.getState().restore();
    expect(store.getState().status).toBe('signed-out');
    expect(localStorage.getItem('animavox.token')).toBe('saved');
  });

  it('注册时带上训练选择与说明版本', async () => {
    const seen = fakeBackend({
      'POST /api/auth/register': () =>
        json(200, { token: 't2', user: { ...user, trainingConsent: false } }),
    });
    const store = createAuthStore();
    await store.getState().register({
      email: 'nuo@example.com',
      code: '123456',
      password: 'password-123',
      username: '小柯',
      trainingConsent: false,
    });
    expect(seen[0]?.body).toMatchObject({ trainingConsent: false, noticeVersion: 1 });
    expect(store.getState().user?.trainingConsent).toBe(false);
  });

  it('撤回同意后更新用户资料', async () => {
    fakeBackend({
      'POST /api/auth/login': () => json(200, { token: 't1', user }),
      'POST /api/me/consent/withdraw': () =>
        json(200, {
          ...user,
          trainingConsent: false,
          consentWithdrawnAt: '2026-11-13T01:00:00.000Z',
        }),
    });
    const store = createAuthStore();
    await store.getState().login('nuo@example.com', 'password-123');
    await store.getState().withdrawConsent();
    expect(store.getState().user).toMatchObject({ trainingConsent: false });
  });

  it('登出：就算请求没送到后端，这个浏览器也照样登出', async () => {
    fakeBackend({ 'POST /api/auth/login': () => json(200, { token: 't1', user }) });
    const store = createAuthStore();
    await store.getState().login('nuo@example.com', 'password-123');
    await store.getState().logout();
    expect(store.getState()).toMatchObject({ status: 'signed-out', user: null });
    expect(localStorage.getItem('animavox.token')).toBeNull();
  });

  it('删除帐号要带密码；密码不对时保持登录', async () => {
    const seen = fakeBackend({
      'POST /api/auth/login': () => json(200, { token: 't1', user }),
      'DELETE /api/me': (request) =>
        (request.body as { password: string }).password === 'password-123'
          ? new Response(null, { status: 204 })
          : json(400, {
              code: 'API_ERROR',
              message: '密码不正确',
              retryable: false,
              reason: 'BAD_CREDENTIALS',
              field: 'password',
            }),
    });
    const store = createAuthStore();
    await store.getState().login('nuo@example.com', 'password-123');

    await expect(store.getState().deleteAccount('nope')).rejects.toMatchObject({
      reason: 'BAD_CREDENTIALS',
    });
    expect(store.getState().status).toBe('signed-in');

    await store.getState().deleteAccount('password-123');
    expect(seen.at(-1)?.body).toEqual({ password: 'password-123' });
    expect(store.getState().status).toBe('signed-out');
  });
});
