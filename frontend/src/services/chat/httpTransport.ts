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
    return new ChatTransportError('aborted', '已停止等待回复。');
  }
  if (error instanceof TimeoutError) {
    return new ChatTransportError('timeout', '等了太久没有回应，请稍后再试。');
  }
  if (error instanceof HTTPError) {
    const status = error.response.status;
    const detail = await readServerMessage(error);
    return new ChatTransportError(
      'http',
      detail ? `服务器返回错误（${status}）：${detail}` : `服务器返回错误（${status}）。`,
      status,
    );
  }
  if (error instanceof TypeError) {
    return new ChatTransportError('network', '连不上服务器，请检查网络或确认后端已经启动。');
  }
  return new ChatTransportError('unknown', '出了点意外，请再试一次。');
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
        throw new ChatTransportError(
          'invalid_response',
          '服务器返回的数据格式不对，请联系后端检查。',
        );
      }
      return parsed.data;
    },
  };
}
