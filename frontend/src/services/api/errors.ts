import type { ApiErrorCode, ApiErrorReason } from '@shared';

/**
 * 请求失败的分类；界面照它显示对应语言的提示（文字在 src/i18n 的 notice.reasons）。
 * - 后端按接口约定回的五种错误码（改成小写）
 * - 前端自己判断的四种：
 *   aborted = 用户按了「停止」；timeout = 等太久；
 *   network = 连不上后端；invalid_response = 后端回的内容不符合约定
 */
export type RequestErrorCode =
  | 'api_error'
  | 'model_unavailable'
  | 'service_unstable'
  | 'quota_exceeded'
  | 'unauthorized'
  | 'aborted'
  | 'timeout'
  | 'network'
  | 'invalid_response';

/** 后端的错误码 → 前端的分类 */
export const SERVER_ERROR_CODES: Record<ApiErrorCode, RequestErrorCode> = {
  API_ERROR: 'api_error',
  MODEL_UNAVAILABLE: 'model_unavailable',
  SERVICE_UNSTABLE: 'service_unstable',
  QUOTA_EXCEEDED: 'quota_exceeded',
  UNAUTHORIZED: 'unauthorized',
};

/** 所有请求失败都是这一种错误（由 client.ts 统一转换），界面只需要认它 */
export class RequestError extends Error {
  readonly code: RequestErrorCode;
  /** API_ERROR 的细分原因与出错的栏位，登录、注册等表单用来显示对应的提示 */
  readonly reason: ApiErrorReason | undefined;
  readonly field: string | undefined;

  constructor(code: RequestErrorCode, reason?: ApiErrorReason, field?: string) {
    super(code);
    this.code = code;
    this.reason = reason;
    this.field = field;
  }
}
