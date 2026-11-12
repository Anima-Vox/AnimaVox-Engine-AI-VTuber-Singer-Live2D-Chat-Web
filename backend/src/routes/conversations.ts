import {
  CreateConversationRequestSchema,
  type Conversation,
  type ConversationListResponse,
  type MessageListResponse,
} from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { isOfficialCharacter } from '../characters';
import { nowOf, parseBody, requireUser, type AppDeps } from '../context';
import { invalidInput, notFound } from '../errors';
import {
  createConversation,
  deleteConversation,
  findConversation,
  listConversations,
  listMessages,
} from '../store';

const ListQuerySchema = z.object({ characterId: z.string().min(1) });

export function assertCharacter(characterId: string): void {
  if (!isOfficialCharacter(characterId)) {
    throw invalidInput('没有这个角色', 'characterId');
  }
}

export function conversationRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    /** 某个角色的全部对话，最近的排最前 */
    app.get('/api/conversations', async (request): Promise<ConversationListResponse> => {
      const user = requireUser(request, deps);
      const { characterId } = parseBody(ListQuerySchema, request.query);
      assertCharacter(characterId);
      return { conversations: listConversations(deps.db, user.id, characterId) };
    });

    /** 开一个新对话（第一句话送出后，标题改成那句话） */
    app.post('/api/conversations', async (request, reply) => {
      const user = requireUser(request, deps);
      const { characterId } = parseBody(CreateConversationRequestSchema, request.body);
      assertCharacter(characterId);
      const conversation: Conversation = createConversation(deps.db, {
        userId: user.id,
        characterId,
        title: '新对话',
        now: nowOf(deps).toISOString(),
      });
      return reply.code(201).send(conversation);
    });

    app.get('/api/conversations/:id/messages', async (request): Promise<MessageListResponse> => {
      const user = requireUser(request, deps);
      const { id } = request.params as { id: string };
      if (!findConversation(deps.db, user.id, id)) {
        throw notFound('找不到这个对话');
      }
      return { messages: listMessages(deps.db, user.id, id) };
    });

    app.delete('/api/conversations/:id', async (request, reply) => {
      const user = requireUser(request, deps);
      const { id } = request.params as { id: string };
      if (!deleteConversation(deps.db, user.id, id)) {
        throw notFound('找不到这个对话');
      }
      return reply.code(204).send();
    });
  };
}
