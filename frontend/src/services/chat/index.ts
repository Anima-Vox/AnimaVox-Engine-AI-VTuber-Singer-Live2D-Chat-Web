import { APP_CONFIG, type ChatTransportMode } from '../../config/app';
import { createHttpTransport } from './httpTransport';
import { createMockTransport } from './mockTransport';
import type { ChatTransport } from './types';

export { ChatTransportError, isAbortError, toUserMessage } from './errors';
export type { ChatTransport, SendOptions } from './types';

export function createChatTransport(mode: ChatTransportMode): ChatTransport {
  return mode === 'http' ? createHttpTransport() : createMockTransport();
}

/** 全应用共用的对话通道，由 VITE_CHAT_TRANSPORT 决定是假后端还是真实后端 */
export const chatTransport: ChatTransport = createChatTransport(APP_CONFIG.transportMode);
