import {
  AuthResponseSchema,
  EmailCodeResponseSchema,
  NOTICE_VERSION,
  UserSchema,
  type EmailCodeResponse,
  type User,
} from '@shared';
import { create } from 'zustand';
import { request, send, setAuthToken, setUnauthorizedHandler } from '../services/api/client';

/** 登录 token 记在这个浏览器（localStorage）的名字 */
const TOKEN_KEY = 'animavox.token';

/** checking = 正在确认登录状态；signed-out = 显示登录页；signed-in = 已登录 */
export type AuthStatus = 'checking' | 'signed-out' | 'signed-in';

interface RegisterInput {
  email: string;
  code: string;
  password: string;
  username: string;
  trainingConsent: boolean;
}

interface AuthState {
  status: AuthStatus;
  /** 目前登录的用户；没登录时为 null */
  user: User | null;
  /** 打开页面时：读出上次保存的 token，问后端它还有没有效 */
  restore: () => Promise<void>;
  requestEmailCode: (email: string) => Promise<EmailCodeResponse>;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  rename: (username: string) => Promise<void>;
  /** 撤回训练同意（只能撤回，不能再开启） */
  withdrawConsent: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

/** 帐号：登录状态与目前的用户（接口约定 v1 第三节） */
export function createAuthStore() {
  return create<AuthState>()((set) => {
    /** 登录成功：之后每个请求都带上 token，并把它保存到浏览器 */
    function signIn(token: string, user: User) {
      setAuthToken(token);
      localStorage.setItem(TOKEN_KEY, token);
      set({ status: 'signed-in', user });
    }

    /** 登出：丢掉 token，回到登录页 */
    function signOut() {
      setAuthToken(null);
      localStorage.removeItem(TOKEN_KEY);
      set({ status: 'signed-out', user: null });
    }

    // 任何请求回 UNAUTHORIZED（登录过期）时自动登出
    setUnauthorizedHandler(signOut);

    return {
      status: 'checking',
      user: null,

      restore: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          set({ status: 'signed-out' });
          return;
        }
        setAuthToken(token);
        try {
          set({ status: 'signed-in', user: await request('get', 'me', UserSchema) });
        } catch {
          // token 已失效时，上面的 signOut 已经把它清掉；
          // 其他失败（例如后端还没启动）保留 token，下次打开页面再确认
          set({ status: 'signed-out' });
        }
      },

      requestEmailCode: (email) =>
        request('post', 'auth/email-code', EmailCodeResponseSchema, { json: { email } }),

      register: async (input) => {
        const { token, user } = await request('post', 'auth/register', AuthResponseSchema, {
          json: { ...input, noticeVersion: NOTICE_VERSION },
        });
        signIn(token, user);
      },

      login: async (email, password) => {
        const { token, user } = await request('post', 'auth/login', AuthResponseSchema, {
          json: { email, password },
        });
        signIn(token, user);
      },

      logout: async () => {
        // 请后端让这个 token 失效；就算请求没成功，这个浏览器也照样登出
        await send('post', 'auth/logout').catch(() => undefined);
        signOut();
      },

      rename: async (username) => {
        set({ user: await request('patch', 'me', UserSchema, { json: { username } }) });
      },

      withdrawConsent: async () => {
        set({ user: await request('post', 'me/consent/withdraw', UserSchema) });
      },

      deleteAccount: async (password) => {
        await send('delete', 'me', { json: { password } });
        signOut();
      },
    };
  });
}

export const useAuthStore = createAuthStore();
