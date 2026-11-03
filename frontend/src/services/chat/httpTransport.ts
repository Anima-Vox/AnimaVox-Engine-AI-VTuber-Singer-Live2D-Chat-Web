import ky, { HTTPError, TimeoutError } from 'ky';
import { ChatResponseSchema } from '@shared';
import { APP_CONFIG } from '../../config/app';
import { ChatTransportError, isAbortError } from './errors';
import type { ChatTransport } from './types';

interface ErrorBody {
  message?: unknown;
}

/** 后端错误体约定为 { error, message }（见 backend/src/server.ts） */
async function readServerMessage(error: HTTPError): Promise<string | null> {
  try {
    const body = (await error.response.clone().json()) as ErrorBody;
    return typeof body.message === 'string' && body.message.trim() ? body.message : null;
  } catch {
    return null;
  }
}

async function toChatError(error: unknown): Promise<ChatTransportError> {
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
    const detail = await readServerMessage(error);
    return new ChatTransportError('http', {
      status: error.response.status,
      detail: detail ?? undefined,
    });
  }
  if (error instanceof TypeError) {
    return new ChatTransportError('network');
  }
  return new ChatTransportError('unknown');
}

/**
 * 真实后端通道：POST {VITE_API_URL}/api/chat
 * 请求体与响应体都按 packages/shared 的契约校验，后端格式不对时直接报错，不让脏数据进界面。
 */
export function createHttpTransport(baseUrl: string = APP_CONFIG.apiBaseUrl): ChatTransport {
  const client = ky.create({
    prefixUrl: baseUrl,
    timeout: APP_CONFIG.requestTimeoutMs,
    retry: 0,
  });

  return {
    mode: 'http',
    async send(request, options = {}) {
      let payload: unknown;
      try {
        // ky 的 prefixUrl 要求路径不能以 / 开头
        payload = await client.post('api/chat', { json: request, signal: options.signal }).json();
      } catch (error) {
        throw await toChatError(error);
      }

      const parsed = ChatResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ChatTransportError('invalid_response');
      }
      return parsed.data;
    },
  };
}
