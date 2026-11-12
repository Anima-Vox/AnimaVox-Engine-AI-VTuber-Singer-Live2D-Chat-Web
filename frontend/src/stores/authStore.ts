import {
  AuthResponseSchema,
  EmailCodeResponseSchema,
  NOTICE_VERSION,
  UserSchema,
  type EmailCodeResponse,
  type User,
} from '@shared';
import { create } from 'zustand';
import { APP_CONFIG } from '../config/app';
import { api, setAuthToken, setUnauthorizedHandler, type ApiClient } from '../services/api';

/** 登录 token 存在这个浏览器（localStorage）；读写失败时只在这次打开期间有效 */
const TOKEN_KEY = 'animavox.token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // 无痕模式等情况存不了：关掉页面后要重新登录
  }
}

/**
 * checking = 正在确认登录状态；signed-out = 要登录；signed-in = 已登录。
 * 演示模式（mock）不需要帐号，一开始就是 signed-in、user 为 null。
 */
export type AuthStatus = 'checking' | 'signed-out' | 'signed-in';

export interface RegisterInput {
  email: string;
  code: string;
  password: string;
  username: string;
  trainingConsent: boolean;
}

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** 打开页面时读出保存的 token 并确认还有效 */
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

export function createAuthStore({ client, required }: { client: ApiClient; required: boolean }) {
  return create<AuthState>()((set) => {
    function signIn(token: string, user: User) {
      setAuthToken(token);
      writeToken(token);
      set({ status: 'signed-in', user });
    }

    function signOut() {
      setAuthToken(null);
      writeToken(null);
      set({ status: 'signed-out', user: null });
    }

    if (required) {
      // 任何请求回 UNAUTHORIZED（登录过期）都回到登录页
      setUnauthorizedHandler(signOut);
    }

    return {
      status: required ? 'checking' : 'signed-in',
      user: null,

      restore: async () => {
        if (!required) {
          return;
        }
        const token = readToken();
        if (!token) {
          set({ status: 'signed-out' });
          return;
        }
        setAuthToken(token);
        try {
          const user = await client.request('get', 'api/me', UserSchema);
          set({ status: 'signed-in', user });
        } catch {
          signOut();
        }
      },

      requestEmailCode: (email) =>
        client.request('post', 'api/auth/email-code', EmailCodeResponseSchema, { json: { email } }),

      register: async (input) => {
        const { token, user } = await client.request(
          'post',
          'api/auth/register',
          AuthResponseSchema,
          {
            json: { ...input, noticeVersion: NOTICE_VERSION },
          },
        );
        signIn(token, user);
      },

      login: async (email, password) => {
        const { token, user } = await client.request('post', 'api/auth/login', AuthResponseSchema, {
          json: { email, password },
        });
        signIn(token, user);
      },

      logout: async () => {
        try {
          await client.send('post', 'api/auth/logout');
        } finally {
          signOut();
        }
      },

      rename: async (username) => {
        const user = await client.request('patch', 'api/me', UserSchema, { json: { username } });
        set({ user });
      },

      withdrawConsent: async () => {
        const user = await client.request('post', 'api/me/consent/withdraw', UserSchema);
        set({ user });
      },

      deleteAccount: async (password) => {
        await client.send('delete', 'api/me', { json: { password } });
        signOut();
      },
    };
  });
}

/** 接后端（http）时需要登录；演示模式不需要 */
export const useAuthStore = createAuthStore({
  client: api,
  required: APP_CONFIG.transportMode === 'http',
});
