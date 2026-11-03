import { create } from 'zustand';
import type { ChatContextMessage, KnownEmotion, Message } from '@shared';
import { APP_CONFIG } from '../config/app';
import { CHARACTER } from '../config/character';
import { db, type ChatDatabase } from '../db';
import {
  createConversation,
  deleteConversation,
  getLatestConversation,
  renameConversationByFirstMessage,
  touchConversation,
} from '../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../db/repositories/messageRepository';
import { chatTransport, isAbortError, toUserMessage, type ChatTransport } from '../services/chat';
import { normalizeEmotion } from '../utils/emotion';

/** loading = 正在读取本地记录；ready = 可以发送；waiting = 等佳尹回复 */
export type ChatStatus = 'loading' | 'ready' | 'waiting';

/** 显示在消息列表底部的提示：请求失败或用户主动停止 */
export interface ChatNotice {
  kind: 'error' | 'stopped';
  message: string;
}

export interface ChatState {
  conversationId: string | null;
  messages: Message[];
  status: ChatStatus;
  notice: ChatNotice | null;
  /** 佳尹当前的情绪（取最后一条回复），舞台区用它显示 emoji */
  currentEmotion: KnownEmotion;

  /** 启动时读取最近一次会话 */
  load: () => Promise<void>;
  /** 发送一条用户消息，并等待回复 */
  send: (text: string) => Promise<void>;
  /** 上一次没有收到回复时，重新请求（不会重复写入用户消息） */
  retry: () => Promise<void>;
  /** 停止等待当前回复 */
  stop: () => void;
  /** 删除当前会话的本地记录，开始新的对话 */
  clear: () => Promise<void>;
  dismissNotice: () => void;
}

export interface ChatStoreDeps {
  transport: ChatTransport;
  database: ChatDatabase;
}

/** 只把 user / assistant 的文字发给后端；人格 Prompt 由后端负责拼接 */
export function buildContext(messages: Message[], windowSize: number): ChatContextMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-windowSize)
    .map((message) => ({ role: message.role, content: message.content }));
}

function lastEmotion(messages: Message[]): KnownEmotion {
  const lastReply = [...messages].reverse().find((message) => message.role === 'assistant');
  return normalizeEmotion(lastReply?.emotion);
}

/** 工厂函数：测试时可以注入假的 transport 与独立的数据库 */
export function createChatStore({ transport, database }: ChatStoreDeps) {
  let controller: AbortController | null = null;

  return create<ChatState>()((set, get) => {
    /** 向后端要一条回复，成功后写入本地并更新界面 */
    async function requestReply(conversationId: string): Promise<void> {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      set({ status: 'waiting', notice: null });

      try {
        const result = await transport.send(
          {
            conversationId,
            modelConfigId: APP_CONFIG.modelConfigId,
            messages: buildContext(get().messages, APP_CONFIG.contextWindow),
          },
          { signal: current.signal },
        );

        // 等待期间会话已被清空或切换：丢弃这条迟到的回复
        if (get().conversationId !== conversationId) {
          return;
        }

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

        set({
          messages: [...get().messages, reply],
          status: 'ready',
          currentEmotion: normalizeEmotion(response.emotion),
        });
      } catch (error) {
        if (get().conversationId !== conversationId) {
          return;
        }
        set({
          status: 'ready',
          notice: {
            kind: isAbortError(error) ? 'stopped' : 'error',
            message: toUserMessage(error),
          },
        });
      } finally {
        if (controller === current) {
          controller = null;
        }
      }
    }

    return {
      conversationId: null,
      messages: [],
      status: 'loading',
      notice: null,
      currentEmotion: 'neutral',

      load: async () => {
        try {
          const latest = await getLatestConversation(database);
          const messages = latest ? await listMessages(latest.id, database) : [];
          set({
            conversationId: latest?.id ?? null,
            messages,
            status: 'ready',
            currentEmotion: lastEmotion(messages),
          });
        } catch {
          set({
            status: 'ready',
            notice: { kind: 'error', message: '读取本地聊天记录失败，新的消息仍可以正常发送。' },
          });
        }
      },

      send: async (text) => {
        const content = text.trim();
        if (!content || get().status !== 'ready') {
          return;
        }

        let conversationId = get().conversationId;
        if (!conversationId) {
          const conversation = await createConversation(
            { characterId: CHARACTER.id, activeModelId: APP_CONFIG.modelConfigId },
            database,
          );
          conversationId = conversation.id;
          set({ conversationId });
        }

        const isFirstUserMessage = !get().messages.some((message) => message.role === 'user');
        const userMessage = await addMessage({ conversationId, role: 'user', content }, database);
        set({ messages: [...get().messages, userMessage] });

        if (isFirstUserMessage) {
          await renameConversationByFirstMessage(conversationId, content, database);
        }

        await requestReply(conversationId);
      },

      retry: async () => {
        const { conversationId, messages, status } = get();
        if (!conversationId || status !== 'ready' || messages.at(-1)?.role !== 'user') {
          return;
        }
        await requestReply(conversationId);
      },

      stop: () => {
        controller?.abort();
      },

      clear: async () => {
        controller?.abort();
        controller = null;
        const { conversationId } = get();
        set({
          conversationId: null,
          messages: [],
          status: 'ready',
          notice: null,
          currentEmotion: 'neutral',
        });
        if (conversationId) {
          await deleteConversation(conversationId, database);
        }
      },

      dismissNotice: () => set({ notice: null }),
    };
  });
}

export const useChatStore = createChatStore({ transport: chatTransport, database: db });
