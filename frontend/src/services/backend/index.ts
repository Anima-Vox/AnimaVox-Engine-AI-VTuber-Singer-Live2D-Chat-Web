import { APP_CONFIG } from '../../config/app';
import { db } from '../../db';
import { api } from '../api';
import { chatTransport } from '../chat';
import { createLocalBackend } from './local';
import { createRemoteBackend } from './remote';
import type { ChatBackend } from './types';

export { createLocalBackend } from './local';
export { createRemoteBackend } from './remote';
export {
  LocalSaveError,
  type ChatBackend,
  type SendMessageInput,
  type SendMessageResult,
} from './types';

/** 由 VITE_CHAT_TRANSPORT 决定：mock = 浏览器内演示；http = 接后端（需要登录） */
export const chatBackend: ChatBackend =
  APP_CONFIG.transportMode === 'http'
    ? createRemoteBackend(api)
    : createLocalBackend({ transport: chatTransport, database: db });
