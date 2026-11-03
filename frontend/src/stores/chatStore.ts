import { create } from 'zustand';
import type { ChatContextMessage, Conversation, Message } from '@shared';
import { APP_CONFIG } from '../config/app';
import { db, type ChatDatabase } from '../db';
import {
  createConversation,
  deleteConversation,
  listConversationsByCharacter,
  renameConversationByFirstMessage,
  touchConversation,
} from '../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../db/repositories/messageRepository';
import { chatTransport, isAbortError, toUserMessage, type ChatTransport } from '../services/chat';

/** loading = 正在读取本地记录；ready = 可以发送；waiting = 等角色回复 */
export type ChatStatus = 'loading' | 'ready' | 'waiting';

/** 显示在消息列表底部的提示：请求失败，或最后一条消息还没有回复 */
export interface ChatNotice {
  kind: 'error' | 'stopped';
  message: string;
}

export interface ChatState {
  /** 当前对话的角色 */
  characterId: string | null;
  /** 这个角色的全部历史对话（最近的排最前） */
  conversations: Conversation[];
  /** null = 还没发出第一句话的新对话 */
  conversationId: string | null;
  messages: Message[];
  status: ChatStatus;
  notice: ChatNotice | null;

  /** 切换到某个角色：读出 TA 的历史对话，并打开最近的一个 */
  openCharacter: (characterId: string) => Promise<void>;
  /** 开一个新对话（发出第一句话时才写入本地） */
  startNewConversation: () => void;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  send: (text: string) => Promise<void>;
  /** 最后一条是用户消息时重新请求回复（不会重复写入用户消息） */
  retry: () => Promise<void>;
  /** 停止等待当前回复 */
  stop: () => void;
  dismissNotice: () => void;
}

export interface ChatStoreDeps {
  transport: ChatTransport;
  database: ChatDatabase;
}

const UNANSWERED: ChatNotice = { kind: 'stopped', message: '这条消息还没有收到回复。' };

/** 只把 user / assistant 的文字发给后端；人格 Prompt 由后端负责拼接 */
export function buildContext(messages: Message[], windowSize: number): ChatContextMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-windowSize)
    .map((message) => ({ role: message.role, content: message.content }));
}

/** 工厂函数：测试时可以注入假的 transport 与独立的数据库 */
export function createChatStore({ transport, database }: ChatStoreDeps) {
  let controller: AbortController | null = null;

  function abortPending() {
    controller?.abort();
    controller = null;
  }

  return create<ChatState>()((set, get) => {
    async function refreshConversations(characterId: string): Promise<void> {
      const conversations = await listConversationsByCharacter(characterId, database);
      if (get().characterId === characterId) {
        set({ conversations });
      }
    }

    async function showConversation(conversationId: string): Promise<void> {
      const messages = await listMessages(conversationId, database);
      if (get().conversationId !== conversationId) {
        return;
      }
      set({
        messages,
        status: 'ready',
        notice: messages.at(-1)?.role === 'user' ? UNANSWERED : null,
      });
    }

    /** 向后端要一条回复，成功后写入本地并更新界面 */
    async function requestReply(characterId: string, conversationId: string): Promise<void> {
      abortPending();
      const current = new AbortController();
      controller = current;
      set({ status: 'waiting', notice: null });

      try {
        const result = await transport.send(
          {
            conversationId,
            characterId,
            modelConfigId: APP_CONFIG.modelConfigId,
            messages: buildContext(get().messages, APP_CONFIG.contextWindow),
          },
          { signal: current.signal },
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
        await refreshConversations(characterId);

        // 切换对话或角色时请求会被中断；这里再确认一次，避免迟到的回复显示在别的对话里
        if (get().conversationId === conversationId) {
          set({ messages: [...get().messages, reply], status: 'ready' });
        }
      } catch (error) {
        if (get().conversationId === conversationId) {
          set({
            status: 'ready',
            notice: {
              kind: isAbortError(error) ? 'stopped' : 'error',
              message: toUserMessage(error),
            },
          });
        }
      } finally {
        if (controller === current) {
          controller = null;
        }
      }
    }

    return {
      characterId: null,
      conversations: [],
      conversationId: null,
      messages: [],
      status: 'loading',
      notice: null,

      openCharacter: async (characterId) => {
        abortPending();
        set({
          characterId,
          conversations: [],
          conversationId: null,
          messages: [],
          status: 'loading',
          notice: null,
        });

        try {
          const conversations = await listConversationsByCharacter(characterId, database);
          if (get().characterId !== characterId) {
            return;
          }
          const latest = conversations[0];
          set({ conversations, conversationId: latest?.id ?? null });
          if (latest) {
            await showConversation(latest.id);
          } else {
            set({ status: 'ready' });
          }
        } catch {
          set({
            status: 'ready',
            notice: { kind: 'error', message: '读取本地聊天记录失败，新的消息仍可以正常发送。' },
          });
        }
      },

      startNewConversation: () => {
        abortPending();
        set({ conversationId: null, messages: [], status: 'ready', notice: null });
      },

      selectConversation: async (conversationId) => {
        if (conversationId === get().conversationId && get().status !== 'loading') {
          return;
        }
        abortPending();
        set({ conversationId, messages: [], status: 'loading', notice: null });
        await showConversation(conversationId);
      },

      deleteConversation: async (conversationId) => {
        const { characterId } = get();
        if (conversationId === get().conversationId) {
          get().startNewConversation();
        }
        await deleteConversation(conversationId, database);
        if (characterId) {
          await refreshConversations(characterId);
        }
      },

      send: async (text) => {
        const content = text.trim();
        const { characterId, status } = get();
        if (!content || !characterId || status !== 'ready') {
          return;
        }

        let conversationId = get().conversationId;
        if (!conversationId) {
          const conversation = await createConversation(
            { characterId, activeModelId: APP_CONFIG.modelConfigId },
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
        await refreshConversations(characterId);

        await requestReply(characterId, conversationId);
      },

      retry: async () => {
        const { characterId, conversationId, messages, status } = get();
        if (!characterId || !conversationId || status !== 'ready') {
          return;
        }
        if (messages.at(-1)?.role !== 'user') {
          return;
        }
        await requestReply(characterId, conversationId);
      },

      stop: () => {
        controller?.abort();
      },

      dismissNotice: () => set({ notice: null }),
    };
  });
}

export const useChatStore = createChatStore({ transport: chatTransport, database: db });
