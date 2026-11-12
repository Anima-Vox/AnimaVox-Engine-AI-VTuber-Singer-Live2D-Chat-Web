import {
  ConversationListQuerySchema,
  CreateConversationRequestSchema,
  type ConversationListResponse,
  type MessageListResponse,
} from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { assertCharacter } from '../characters';
import { parseBody, requireUser, type AppDeps } from '../context';
import { notFound } from '../errors';
import {
  createConversation,
  deleteConversation,
  findConversation,
  listConversations,
  listMessages,
} from '../store';

/** 对话记录由后端保管：列表、新对话、读消息、删除（接口约定 v1 第四节）。全部需要登录 */
export function conversationRoutes(deps: AppDeps): FastifyPluginAsync {
  const { db } = deps;

  return async (app) => {
    /* ---------- 某个角色的全部对话，最近更新的排最前 ---------- */
    app.get('/api/conversations', async (request): Promise<ConversationListResponse> => {
      const user = requireUser(request, deps);
      const { characterId } = parseBody(ConversationListQuerySchema, request.query);
      assertCharacter(characterId);
      return { conversations: listConversations(db, user.id, characterId) };
    });

    /* ---------- 开一个新对话（送出第一句话后，标题会改成那句话） ---------- */
    app.post('/api/conversations', async (request, reply) => {
      const user = requireUser(request, deps);
      const { characterId } = parseBody(CreateConversationRequestSchema, request.body);
      assertCharacter(characterId);
      const conversation = createConversation(db, {
        userId: user.id,
        characterId,
        title: '新对话',
        now: new Date().toISOString(),
      });
      return reply.code(201).send(conversation);
    });

    /* ---------- 一个对话的全部消息，旧的在前 ---------- */
    app.get('/api/conversations/:id/messages', async (request): Promise<MessageListResponse> => {
      const user = requireUser(request, deps);
      const { id } = request.params as { id: string };
      if (!findConversation(db, user.id, id)) {
        throw notFound('找不到这个对话');
      }
      return { messages: listMessages(db, user.id, id) };
    });

    /* ---------- 删除对话（消息一起删除） ---------- */
    app.delete('/api/conversations/:id', async (request, reply) => {
      const user = requireUser(request, deps);
      const { id } = request.params as { id: string };
      if (!deleteConversation(db, user.id, id)) {
        throw notFound('找不到这个对话');
      }
      return reply.code(204).send();
    });
  };
}
