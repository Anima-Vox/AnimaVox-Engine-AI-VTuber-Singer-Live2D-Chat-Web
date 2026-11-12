import {
  ConversationListResponseSchema,
  ConversationSchema,
  MessageListResponseSchema,
  SendMessageResponseSchema,
} from '@shared';
import type { ApiClient } from '../api/client';
import type { ChatBackend } from './types';

/** 接后端（接口约定 v1）：对话记录由后端保管，前端只送新的一句 */
export function createRemoteBackend(api: ApiClient): ChatBackend {
  return {
    mode: 'http',

    async listConversations(characterId) {
      const { conversations } = await api.request(
        'get',
        'api/conversations',
        ConversationListResponseSchema,
        {
          searchParams: { characterId },
        },
      );
      return conversations;
    },

    createConversation: (characterId) =>
      api.request('post', 'api/conversations', ConversationSchema, { json: { characterId } }),

    async listMessages(conversationId) {
      const { messages } = await api.request(
        'get',
        `api/conversations/${encodeURIComponent(conversationId)}/messages`,
        MessageListResponseSchema,
      );
      return messages;
    },

    deleteConversation: (conversationId) =>
      api.send('delete', `api/conversations/${encodeURIComponent(conversationId)}`),

    sendMessage: (input, options = {}) =>
      api.request('post', 'api/chat', SendMessageResponseSchema, {
        json: input,
        signal: options.signal,
      }),
  };
}
