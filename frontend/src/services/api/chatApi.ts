import {
  ConversationListResponseSchema,
  ConversationSchema,
  MessageListResponseSchema,
  SendMessageResponseSchema,
  type Conversation,
  type Message,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@shared';
import { request, send } from './client';

/**
 * 对话相关的五个接口（接口约定 v1 第四节）。
 * 对话记录由后端保管，前端只送新的一句。状态层（stores/chatStore）只通过这个对象碰后端。
 */
export const chatApi = {
  /** 某个角色的全部对话，最近更新的排最前 */
  async listConversations(characterId: string): Promise<Conversation[]> {
    const { conversations } = await request(
      'get',
      'conversations',
      ConversationListResponseSchema,
      { searchParams: { characterId } },
    );
    return conversations;
  },

  /** 开一个新对话 */
  createConversation(characterId: string): Promise<Conversation> {
    return request('post', 'conversations', ConversationSchema, { json: { characterId } });
  },

  /** 一个对话的全部消息，旧的在前 */
  async listMessages(conversationId: string): Promise<Message[]> {
    const { messages } = await request(
      'get',
      `conversations/${conversationId}/messages`,
      MessageListResponseSchema,
    );
    return messages;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await send('delete', `conversations/${conversationId}`);
  },

  /**
   * 送出一句话并拿到回复。input.clientMessageId 由前端产生：
   * 同一个 id 再送一次不会重复写入，所以「重试」就是原样再送一次。
   */
  sendMessage(input: SendMessageRequest, signal: AbortSignal): Promise<SendMessageResponse> {
    return request('post', 'chat', SendMessageResponseSchema, { json: input, signal });
  },
};

export type ChatApi = typeof chatApi;
