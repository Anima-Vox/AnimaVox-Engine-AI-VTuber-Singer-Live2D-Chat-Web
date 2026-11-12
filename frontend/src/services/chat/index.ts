import { createMockTransport } from './mockTransport';
import type { ChatTransport } from './types';

export { ChatTransportError, isAbortError, SERVER_ERROR_CODES, type ChatErrorCode } from './errors';
export type { ChatTransport, SendOptions } from './types';

/** 演示模式用的浏览器内回复（接后端时不会用到，见 services/backend） */
export const chatTransport: ChatTransport = createMockTransport();
