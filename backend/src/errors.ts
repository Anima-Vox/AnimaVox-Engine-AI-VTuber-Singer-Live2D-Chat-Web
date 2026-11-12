import type { ApiErrorBody, ApiErrorCode, ApiErrorReason } from '@shared';

/** 每种错误码对应的 HTTP 状态与能否直接重试（接口约定 v1） */
const DEFAULTS: Record<ApiErrorCode, { status: number; retryable: boolean }> = {
  API_ERROR: { status: 400, retryable: false },
  MODEL_UNAVAILABLE: { status: 502, retryable: true },
  SERVICE_UNSTABLE: { status: 503, retryable: true },
  QUOTA_EXCEEDED: { status: 429, retryable: false },
  UNAUTHORIZED: { status: 401, retryable: false },
};

interface ApiErrorOptions {
  status?: number;
  retryable?: boolean;
  reason?: ApiErrorReason;
  field?: string;
}

/** 路由里丢出这个，错误处理器就会按约定格式回给前端 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly reason: ApiErrorReason | undefined;
  readonly field: string | undefined;

  constructor(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? DEFAULTS[code].status;
    this.retryable = options.retryable ?? DEFAULTS[code].retryable;
    this.reason = options.reason;
    this.field = options.field;
  }

  toBody(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.reason ? { reason: this.reason } : {}),
      ...(this.field ? { field: this.field } : {}),
    };
  }
}

export const invalidInput = (message: string, field?: string) =>
  new ApiError('API_ERROR', message, { reason: 'INVALID_INPUT', ...(field ? { field } : {}) });

export const notFound = (message: string) =>
  new ApiError('API_ERROR', message, { status: 404, reason: 'NOT_FOUND' });

export const unauthorized = () => new ApiError('UNAUTHORIZED', '未登录或登录已过期');

/** 把任何丢出来的东西转成约定的错误 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof Error) {
    const statusCode = 'statusCode' in error ? Number(error.statusCode) : NaN;
    // Fastify 自己的请求错误（例如 JSON 格式不对、内容太大）
    if (statusCode >= 400 && statusCode < 500) {
      return new ApiError('API_ERROR', error.message, {
        status: statusCode,
        reason: 'INVALID_INPUT',
      });
    }
    // SQLite 正在忙（例如同时写入）：当成服务不稳，可以重试
    if (/database is locked|SQLITE_BUSY/i.test(error.message)) {
      return new ApiError('SERVICE_UNSTABLE', '数据库忙碌，请稍后再试');
    }
  }
  return new ApiError('API_ERROR', '后端内部错误', { status: 500 });
}
