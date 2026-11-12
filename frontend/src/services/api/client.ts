import { ApiErrorBodySchema } from '@shared';
import ky, { HTTPError, TimeoutError } from 'ky';
import type { ZodType, ZodTypeDef } from 'zod';
import { RequestError, SERVER_ERROR_CODES } from './errors';

/**
 * 前端呼叫后端的唯一出口（接口约定 v1）。
 * 对外只有两个函数：request（有回传内容）与 send（没有回传内容）；失败一律丢出 RequestError。
 */

/* ============================================================
 * 登录状态：由 stores/authStore 设定，这里负责每个请求自动带上 token
 * ============================================================ */

let token: string | null = null;
let onUnauthorized = () => {};

export function setAuthToken(value: string | null): void {
  token = value;
}

/** 后端回 UNAUTHORIZED（没登录或登录过期）时要做什么；authStore 设成「登出，回到登录页」 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/* ============================================================
 * 连线设定
 * ============================================================ */

const client = ky.create({
  // 接口约定第 7 条：前后端同一个网域，接口都在 /api 底下
  //（开发时由 Vite 把 /api 转给后端，见 vite.config.ts）
  prefixUrl: `${window.location.origin}/api`,
  // 最多等 70 秒：比后端等模型的上限（60 秒）略长，让后端先回超时
  timeout: 70_000,
  // 失败不自动重发，由用户按「重试」
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});

/* ============================================================
 * 把各种失败统一转成 RequestError
 * ============================================================ */

async function toRequestError(error: unknown): Promise<RequestError> {
  // 用户按了「停止」，或切换对话时取消了请求
  if ((error as Error | undefined)?.name === 'AbortError') {
    return new RequestError('aborted');
  }
  if (error instanceof TimeoutError) {
    return new RequestError('timeout');
  }
  // 后端有回应，但状态码是 4xx / 5xx：照接口约定读出错误码
  if (error instanceof HTTPError) {
    const body = ApiErrorBodySchema.safeParse(await error.response.json().catch(() => null));
    if (body.success) {
      const { code, reason, field } = body.data;
      if (code === 'UNAUTHORIZED') {
        onUnauthorized();
      }
      return new RequestError(SERVER_ERROR_CODES[code], reason, field);
    }
  }
  // 其余情况：请求根本没到后端（没开、断网），或回的不是约定的错误格式
  return new RequestError('network');
}

/* ============================================================
 * 对外的两个函数
 * ============================================================ */

type Method = 'get' | 'post' | 'patch' | 'delete';

interface RequestOptions {
  /** 要送给后端的内容（JSON） */
  json?: unknown;
  /** 网址后面的查询参数，例如 { characterId: 'lijiaying' } */
  searchParams?: Record<string, string>;
  /** 用来中途取消请求 */
  signal?: AbortSignal;
}

/** 发请求但不读回传内容（例如登出、删除，后端回 204）。path 不含 /api/，例如 'auth/logout' */
export async function send(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  try {
    return await client(path, { method, ...options });
  } catch (error) {
    throw await toRequestError(error);
  }
}

/** 发请求，并用 schema 检查回传的内容是否符合接口约定 */
export async function request<T>(
  method: Method,
  path: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(method, path, options);
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new RequestError('invalid_response');
  }
  return parsed.data;
}
