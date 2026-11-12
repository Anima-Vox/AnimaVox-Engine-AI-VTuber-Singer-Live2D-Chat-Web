import { ApiErrorBodySchema } from '@shared';
import ky, { HTTPError, TimeoutError, type Options } from 'ky';
import type { ZodType, ZodTypeDef } from 'zod';
import { APP_CONFIG } from '../../config/app';
import { ChatTransportError, isAbortError, SERVER_ERROR_CODES } from '../chat/errors';

type Method = 'get' | 'post' | 'patch' | 'delete';

export interface RequestOptions {
  json?: unknown;
  searchParams?: Record<string, string>;
  signal?: AbortSignal | undefined;
}

/** 呼叫后端（接口约定 v1）。所有失败都转成 ChatTransportError，界面只认它。 */
export interface ApiClient {
  request<T>(
    method: Method,
    path: string,
    /** 回传内容的 Zod 契约；T 取校验后的结果（含默认值） */
    schema: ZodType<T, ZodTypeDef, unknown>,
    options?: RequestOptions,
  ): Promise<T>;
  /** 不需要回传内容的请求（例如 204） */
  send(method: Method, path: string, options?: RequestOptions): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  /** 每次请求时读取目前的登录 token */
  getToken?: () => string | null;
  /** 后端回 UNAUTHORIZED（未登录或已过期）时通知外面，例如回到登录页 */
  onUnauthorized?: () => void;
  timeoutMs?: number;
}

async function toRequestError(
  error: unknown,
  onUnauthorized?: () => void,
): Promise<ChatTransportError> {
  if (error instanceof ChatTransportError) {
    return error;
  }
  if (isAbortError(error)) {
    return new ChatTransportError('aborted');
  }
  if (error instanceof TimeoutError) {
    return new ChatTransportError('timeout');
  }
  if (error instanceof HTTPError) {
    const status = error.response.status;
    let body: unknown = null;
    try {
      body = await error.response.clone().json();
    } catch {
      // 不是 JSON：当成看不懂的服务器错误
    }
    const parsed = ApiErrorBodySchema.safeParse(body);
    if (!parsed.success) {
      return new ChatTransportError('http', { status });
    }
    const { code, message, reason, field } = parsed.data;
    if (code === 'UNAUTHORIZED') {
      onUnauthorized?.();
    }
    return new ChatTransportError(SERVER_ERROR_CODES[code], {
      status,
      detail: message,
      reason,
      field,
    });
  }
  if (error instanceof TypeError) {
    return new ChatTransportError('network');
  }
  return new ChatTransportError('unknown');
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const client = ky.create({
    prefixUrl: options.baseUrl ?? APP_CONFIG.apiBaseUrl,
    timeout: options.timeoutMs ?? APP_CONFIG.requestTimeoutMs,
    retry: 0,
    hooks: {
      beforeRequest: [
        (request) => {
          const token = options.getToken?.();
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        },
      ],
    },
  });

  async function call(method: Method, path: string, requestOptions: RequestOptions = {}) {
    const kyOptions: Options = {
      method,
      ...(requestOptions.json === undefined ? {} : { json: requestOptions.json }),
      ...(requestOptions.searchParams ? { searchParams: requestOptions.searchParams } : {}),
      ...(requestOptions.signal ? { signal: requestOptions.signal } : {}),
    };
    try {
      // ky 的 prefixUrl 要求路径不能以 / 开头
      return await client(path.replace(/^\//, ''), kyOptions);
    } catch (error) {
      throw await toRequestError(error, options.onUnauthorized);
    }
  }

  return {
    async request(method, path, schema, requestOptions) {
      const response = await call(method, path, requestOptions);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ChatTransportError('invalid_response');
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new ChatTransportError('invalid_response');
      }
      return parsed.data;
    },
    async send(method, path, requestOptions) {
      await call(method, path, requestOptions);
    },
  };
}
