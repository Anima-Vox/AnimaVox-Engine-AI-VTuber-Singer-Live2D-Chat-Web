import { APP_CONFIG } from '../../config/app';
import type { ChatDatabase } from '../../db';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversationsByCharacter,
  renameConversationByFirstMessage,
  touchConversation,
} from '../../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../../db/repositories/messageRepository';
import { buildContext } from '../../utils/context';
import type { ChatTransport } from '../chat';
import { LocalSaveError, type ChatBackend } from './types';

/** 演示模式：记录存在浏览器 IndexedDB，回复来自浏览器内假后端 */
export function createLocalBackend({
  transport,
  database,
}: {
  transport: ChatTransport;
  database: ChatDatabase;
}): ChatBackend {
  return {
    mode: 'mock',

    listConversations: (characterId) => listConversationsByCharacter(characterId, database),

    async createConversation(characterId) {
      try {
        return await createConversation(
          { characterId, activeModelId: APP_CONFIG.modelConfigId },
          database,
        );
      } catch (error) {
        throw new LocalSaveError(error);
      }
    },

    listMessages: (conversationId) => listMessages(conversationId, database),

    deleteConversation: (conversationId) => deleteConversation(conversationId, database),

    async sendMessage({ conversationId, characterId, clientMessageId, content }, options = {}) {
      // 第一次送出才写入用户消息；重试时已经存在就沿用
      let userMessage = await database.messages.get(clientMessageId);
      if (!userMessage) {
        const isFirst = !(await database.messages
          .where('conversationId')
          .equals(conversationId)
          .filter((message) => message.role === 'user')
          .count());
        try {
          userMessage = await addMessage(
            { id: clientMessageId, conversationId, role: 'user', content },
            database,
          );
          if (isFirst) {
            await renameConversationByFirstMessage(conversationId, content, database);
          }
        } catch (error) {
          throw new LocalSaveError(error);
        }
      }

      const history = await listMessages(conversationId, database);
      const result = await transport.send(
        {
          conversationId,
          characterId,
          modelConfigId: APP_CONFIG.modelConfigId,
          messages: buildContext(history, APP_CONFIG.contextWindow),
        },
        options,
      );

      const { response } = result;
      const reply = await addMessage(
        {
          id: result.messageId,
          createdAt: result.createdAt,
          conversationId,
          role: 'assistant',
          content: response.text,
          emotion: response.emotion,
          action: response.action,
          expression: response.expression,
          toolCalls: response.tool_calls,
        },
        database,
      );
      await touchConversation(conversationId, database);
      const conversation = await getConversation(conversationId, database);
      if (!conversation) {
        throw new Error('会话已不存在');
      }
      return { conversation, userMessage, reply };
    },
  };
}
