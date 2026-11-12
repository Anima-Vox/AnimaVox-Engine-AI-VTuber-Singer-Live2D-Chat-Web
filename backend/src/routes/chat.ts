import { SendMessageRequestSchema, type SendMessageResponse } from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { assertCharacter } from '../characters';
import { parseBody, requireUser, type AppDeps } from '../context';
import { ApiError, invalidInput, notFound } from '../errors';
import type { LlmInput, ModelReply } from '../services/llm/types';
import {
  addUsage,
  countUserMessages,
  findConversation,
  findMessage,
  findReplyTo,
  insertReply,
  insertUserMessage,
  recentMessages,
  touchConversation,
  usageToday,
} from '../store';

/** 每日额度按北京时间（UTC+8）的日期计算，回传例如 '2026-11-13' */
function dayKey(date: Date): string {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** POST /api/chat：送出一句话，拿到角色的回复（接口约定 v1 第四、五、六节） */
export function chatRoutes(deps: AppDeps): FastifyPluginAsync {
  const { db, env, llm } = deps;

  /** 请模型回复。等太久回 SERVICE_UNSTABLE；其他失败一律回 MODEL_UNAVAILABLE */
  async function askModel(input: LlmInput): Promise<ModelReply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);
    try {
      return await llm.reply(input, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError('SERVICE_UNSTABLE', '等待模型回复超时');
      }
      throw error instanceof ApiError ? error : new ApiError('MODEL_UNAVAILABLE', '模型连接失败');
    } finally {
      clearTimeout(timer);
    }
  }

  return async (app) => {
    app.post('/api/chat', async (request): Promise<SendMessageResponse> => {
      /* ---------- 1. 要登录；内容要合格；characterId 必填而且要有这个角色 ---------- */
      const user = requireUser(request, deps);
      const input = parseBody(SendMessageRequestSchema, request.body);
      assertCharacter(input.characterId);

      /* ---------- 2. 对话要是自己的，而且属于这个角色 ---------- */
      const conversation = findConversation(db, user.id, input.conversationId);
      if (!conversation) {
        throw notFound('找不到这个对话');
      }
      if (conversation.characterId !== input.characterId) {
        throw invalidInput('这个对话不属于这个角色', 'characterId');
      }

      /* ---------- 3. 去重：这个 clientMessageId 以前送过吗？ ---------- */
      let userMessage = findMessage(db, user.id, input.clientMessageId);
      if (userMessage) {
        if (userMessage.conversationId !== conversation.id || userMessage.role !== 'user') {
          throw invalidInput('clientMessageId 已经用在别的消息上', 'clientMessageId');
        }
        // 送过、也已经有回复：把原本的回复再回一次，不重新产生
        const existingReply = findReplyTo(db, user.id, userMessage.id);
        if (existingReply) {
          return { conversation, userMessage, reply: existingReply };
        }
        // 送过、但还没有回复（上次失败）：继续往下重新请模型回复，这就是「重试」
      }

      /* ---------- 4. 今天的额度还有吗？ ---------- */
      const now = new Date();
      const day = dayKey(now);
      if (usageToday(db, user.id, day) >= env.DAILY_MESSAGE_LIMIT) {
        throw new ApiError('QUOTA_EXCEEDED', '今天的对话额度已经用完');
      }

      /* ---------- 5. 第一次送：存下用户这句话（对话的第一句同时当标题，取前 24 个字） ---------- */
      if (!userMessage) {
        const isFirst = countUserMessages(db, user.id, conversation.id) === 0;
        insertUserMessage(db, {
          id: input.clientMessageId,
          userId: user.id,
          conversationId: conversation.id,
          content: input.content,
          trainingAllowed: user.trainingConsent,
          now: now.toISOString(),
        });
        touchConversation(db, {
          userId: user.id,
          id: conversation.id,
          now: now.toISOString(),
          ...(isFirst ? { title: input.content.replace(/\s+/g, ' ').slice(0, 24) } : {}),
        });
        userMessage = findMessage(db, user.id, input.clientMessageId)!;
      }

      /* ---------- 6. 带上最近的对话，请模型回复 ---------- */
      const history = recentMessages(db, user.id, conversation.id, env.CONTEXT_WINDOW);
      const reply = await askModel({
        characterId: input.characterId,
        username: user.username,
        history: history.map(({ role, content }) => ({ role, content })),
      });

      /* ---------- 7. 存下回复；真的存进去了才计入今天的额度 ---------- */
      // 等模型的期间，用户可能已经把这个对话删掉了
      if (!findConversation(db, user.id, conversation.id)) {
        throw notFound('这个对话已经被删除');
      }
      const repliedAt = new Date().toISOString();
      const isNewReply = insertReply(db, {
        userId: user.id,
        conversationId: conversation.id,
        replyTo: userMessage.id,
        reply,
        trainingAllowed: user.trainingConsent,
        now: repliedAt,
      });
      if (isNewReply) {
        addUsage(db, user.id, day);
        touchConversation(db, { userId: user.id, id: conversation.id, now: repliedAt });
      }

      /* ---------- 8. 回传：最新的对话资料（标题、时间）、用户这句话、角色的回复 ---------- */
      return {
        conversation: findConversation(db, user.id, conversation.id)!,
        userMessage,
        reply: findReplyTo(db, user.id, userMessage.id)!,
      };
    });
  };
}
