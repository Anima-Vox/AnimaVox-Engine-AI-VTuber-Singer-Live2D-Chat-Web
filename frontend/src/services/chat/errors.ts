/** 对话请求失败的分类，界面据此决定提示文案 */
export type ChatErrorCode =
  'aborted' | 'network' | 'timeout' | 'http' | 'invalid_response' | 'unknown';

/**
 * 统一的对话错误。
 * message 是给人看的中文说明，会直接显示在聊天界面上。
 */
export class ChatTransportError extends Error {
  readonly code: ChatErrorCode;
  readonly status: number | undefined;

  constructor(code: ChatErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ChatTransportError';
    this.code = code;
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ChatTransportError) {
    return error.code === 'aborted';
  }
  return error instanceof DOMException && error.name === 'AbortError';
}

/** 把任意抛出物转成可以显示给用户的一句话 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ChatTransportError) {
    return error.message;
  }
  return '出了点意外，请再试一次。';
}
