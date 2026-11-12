import type { ApiErrorCode, ApiErrorReason } from '@shared';

/**
 * 请求失败的分类，界面据此显示对应语言的提示。
 * - 前端自己判断的：aborted / network / timeout / invalid_response / unknown，以及 http（后端回了看不懂的错误）
 * - 后端按接口约定回的错误码（小写）：api_error / model_unavailable / service_unstable / quota_exceeded / unauthorized
 */
export type ChatErrorCode =
  | 'aborted'
  | 'network'
  | 'timeout'
  | 'http'
  | 'invalid_response'
  | 'unknown'
  | 'api_error'
  | 'model_unavailable'
  | 'service_unstable'
  | 'quota_exceeded'
  | 'unauthorized';

/** 后端错误码 → 前端分类 */
export const SERVER_ERROR_CODES: Record<ApiErrorCode, ChatErrorCode> = {
  API_ERROR: 'api_error',
  MODEL_UNAVAILABLE: 'model_unavailable',
  SERVICE_UNSTABLE: 'service_unstable',
  QUOTA_EXCEEDED: 'quota_exceeded',
  UNAUTHORIZED: 'unauthorized',
};

interface ChatErrorOptions {
  status?: number | undefined;
  detail?: string | undefined;
  /** API_ERROR 的细分原因（表单提示用） */
  reason?: ApiErrorReason | undefined;
  /** 出错的栏位（表单提示用） */
  field?: string | undefined;
}

/**
 * 统一的请求错误。
 * 不带界面文字：提示文案在 src/i18n 里按语言显示；detail 是后端返回的原话（有的话）。
 */
export class ChatTransportError extends Error {
  readonly code: ChatErrorCode;
  readonly status: number | undefined;
  readonly detail: string | undefined;
  readonly reason: ApiErrorReason | undefined;
  readonly field: string | undefined;

  constructor(code: ChatErrorCode, options: ChatErrorOptions = {}) {
    super(options.detail ?? code);
    this.name = 'ChatTransportError';
    this.code = code;
    this.status = options.status;
    this.detail = options.detail;
    this.reason = options.reason;
    this.field = options.field;
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ChatTransportError) {
    return error.code === 'aborted';
  }
  return error instanceof DOMException && error.name === 'AbortError';
}
