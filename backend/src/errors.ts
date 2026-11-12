import type { ApiErrorBody, ApiErrorCode, ApiErrorReason } from '@shared';

/** 每种错误码对应的 HTTP 状态，以及用户能不能直接重试（接口约定 v1 第二节） */
const DEFAULTS: Record<ApiErrorCode, { status: number; retryable: boolean }> = {
  API_ERROR: { status: 400, retryable: false },
  MODEL_UNAVAILABLE: { status: 502, retryable: true },
  SERVICE_UNSTABLE: { status: 503, retryable: true },
  QUOTA_EXCEEDED: { status: 429, retryable: false },
  UNAUTHORIZED: { status: 401, retryable: false },
};

interface ApiErrorOptions {
  /** 不填就用上面的默认值 */
  status?: number;
  retryable?: boolean;
  reason?: ApiErrorReason;
  field?: string;
}

/** 路由里丢出这个，app.ts 的错误处理器就会按约定格式回给前端 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly reason: ApiErrorReason | undefined;
  readonly field: string | undefined;

  constructor(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.code = code;
    this.status = options.status ?? DEFAULTS[code].status;
    this.retryable = options.retryable ?? DEFAULTS[code].retryable;
    this.reason = options.reason;
    this.field = options.field;
  }

  /** 回给前端的内容 */
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

/* ---------- 常用的几种错误 ---------- */

/** 请求格式不对；field 指出是哪一个栏位 */
export const invalidInput = (message: string, field?: string) =>
  new ApiError('API_ERROR', message, { reason: 'INVALID_INPUT', ...(field ? { field } : {}) });

export const notFound = (message: string) =>
  new ApiError('API_ERROR', message, { status: 404, reason: 'NOT_FOUND' });

export const unauthorized = () => new ApiError('UNAUTHORIZED', '未登录或登录已过期');

/** 把任何丢出来的错误转成约定的五种之一 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  // Fastify 自己挡下的请求（例如 JSON 写错、内容太大）会带 4xx 的 statusCode
  const status = error instanceof Error && 'statusCode' in error ? Number(error.statusCode) : 500;
  if (status >= 400 && status < 500) {
    return new ApiError('API_ERROR', (error as Error).message, {
      status,
      reason: 'INVALID_INPUT',
    });
  }
  // 其余都是后端自己的问题
  return new ApiError('API_ERROR', '后端内部错误', { status: 500 });
}
