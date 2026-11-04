/** 对话请求失败的分类，界面据此显示对应语言的提示 */
export type ChatErrorCode =
  'aborted' | 'network' | 'timeout' | 'http' | 'invalid_response' | 'unknown';

/**
 * 统一的对话错误。
 * 不带界面文字：提示文案在 src/i18n 里按语言显示；detail 是后端返回的原话（有的话）。
 */
export class ChatTransportError extends Error {
  readonly code: ChatErrorCode;
  readonly status: number | undefined;
  readonly detail: string | undefined;

  constructor(code: ChatErrorCode, options: { status?: number; detail?: string } = {}) {
    super(options.detail ?? code);
    this.name = 'ChatTransportError';
    this.code = code;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ChatTransportError) {
    return error.code === 'aborted';
  }
  return error instanceof DOMException && error.name === 'AbortError';
}
