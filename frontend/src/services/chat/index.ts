import { createMockTransport } from './mockTransport';
import type { ChatTransport } from './types';

export { ChatTransportError, isAbortError, type ChatErrorCode } from './errors';
export type { ChatTransport, SendOptions } from './types';

/**
 * 全应用共用的对话通道。
 *
 * 纯净版：这里只有浏览器内的演示回复（mockTransport），没有任何 HTTP 接口。
 * 要接上自己的接口，只需写一个实作 ChatTransport（见 ./types.ts）的对象，
 * 把下面这行换成它即可；界面与状态层都不用改。
 */
export const chatTransport: ChatTransport = createMockTransport();
