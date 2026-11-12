import { SendMessageRequestSchema, type Message, type SendMessageResponse } from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { loadPersona, type OfficialCharacterId } from '../characters';
import { dayKey, nowOf, parseBody, requireUser, type AppDeps } from '../context';
import { ApiError, invalidInput, notFound } from '../errors';
import { buildSystemPrompt } from '../services/llm/prompt';
import {
  addUsage,
  countUserMessages,
  findConversation,
  findMessage,
  findReplyTo,
  insertReply,
  insertUserMessage,
  recentMessages,
  titleFromFirstMessage,
  touchConversation,
  usageToday,
} from '../store';
import { assertCharacter } from './conversations';

/** 等模型回复；超时回 SERVICE_UNSTABLE，其他失败一律当成 MODEL_UNAVAILABLE */
async function askModel(deps: AppDeps, input: Parameters<AppDeps['llm']['reply']>[0]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.env.LLM_TIMEOUT_MS);
  try {
    return await deps.llm.reply(input, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('SERVICE_UNSTABLE', '等待模型回复超时');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('MODEL_UNAVAILABLE', '模型连接失败');
  } finally {
    clearTimeout(timer);
  }
}

export function chatRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    /**
     * 送出一句话，拿到角色的回复。
     * clientMessageId 就是这条用户消息的 id：重复送出不会重复写入；
     * 已经有回复就直接回传，没有回复（上次失败）就重新产生——这就是重试。
     */
    app.post('/api/chat', async (request): Promise<SendMessageResponse> => {
      const user = requireUser(request, deps);
      const input = parseBody(SendMessageRequestSchema, request.body);
      assertCharacter(input.characterId);

      const conversation = findConversation(deps.db, user.id, input.conversationId);
      if (!conversation) {
        throw notFound('找不到这个对话');
      }
      if (conversation.characterId !== input.characterId) {
        throw invalidInput('这个对话不属于这个角色', 'characterId');
      }

      let userMessage: Message | null = findMessage(deps.db, user.id, input.clientMessageId);
      if (userMessage) {
        if (userMessage.conversationId !== conversation.id || userMessage.role !== 'user') {
          throw invalidInput('clientMessageId 已经用在别的地方', 'clientMessageId');
        }
        const existingReply = findReplyTo(deps.db, user.id, userMessage.id);
        if (existingReply) {
          return { conversation, userMessage, reply: existingReply };
        }
      }

      const now = nowOf(deps);
      const day = dayKey(now);
      if (usageToday(deps.db, user.id, day) >= deps.env.DAILY_MESSAGE_LIMIT) {
        throw new ApiError('QUOTA_EXCEEDED', '今天的对话额度已经用完');
      }

      if (!userMessage) {
        const isFirst = countUserMessages(deps.db, user.id, conversation.id) === 0;
        insertUserMessage(deps.db, {
          id: input.clientMessageId,
          userId: user.id,
          conversationId: conversation.id,
          content: input.content,
          trainingAllowed: user.trainingConsent,
          now: now.toISOString(),
        });
        touchConversation(deps.db, {
          userId: user.id,
          id: conversation.id,
          now: now.toISOString(),
          ...(isFirst ? { title: titleFromFirstMessage(input.content) } : {}),
        });
        userMessage = findMessage(deps.db, user.id, input.clientMessageId) as Message;
      }

      const history = recentMessages(
        deps.db,
        user.id,
        conversation.id,
        deps.env.CONTEXT_WINDOW,
      ).map((message) => ({ role: message.role, content: message.content }));
      const persona = loadPersona(input.characterId as OfficialCharacterId, deps.env.PERSONA_DIR);
      const response = await askModel(deps, {
        characterId: input.characterId,
        username: user.username,
        systemPrompt: buildSystemPrompt(persona, user.username),
        history,
      });

      const repliedAt = nowOf(deps);
      const inserted = insertReply(deps.db, {
        userId: user.id,
        conversationId: conversation.id,
        replyTo: userMessage.id,
        response,
        trainingAllowed: user.trainingConsent,
        now: repliedAt.toISOString(),
      });
      if (inserted) {
        addUsage(deps.db, user.id, day);
        touchConversation(deps.db, {
          userId: user.id,
          id: conversation.id,
          now: repliedAt.toISOString(),
        });
      }

      return {
        conversation: findConversation(deps.db, user.id, conversation.id) ?? conversation,
        userMessage,
        reply: findReplyTo(deps.db, user.id, userMessage.id) as Message,
      };
    });
  };
}
