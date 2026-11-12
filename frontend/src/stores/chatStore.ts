import { create } from 'zustand';
import { db, type ChatDatabase } from '../db';
import {
  createConversation,
  deleteConversation,
  listConversationsByCharacter,
  touchConversation,
} from '../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../db/repositories/messageRepository';
import { getReply } from '../services/reply';
import type { Conversation, Message } from '../types';

/** loading = 正在读取本地记录；ready = 可以发送；waiting = 等角色回复 */
type ChatStatus = 'loading' | 'ready' | 'waiting';

/**
 * 提示的原因（对应的文字在 src/i18n 的 notice.reasons）：
 * failed = 没拿到回复；aborted = 用户按了停止；unanswered = 最后一句话还没有回复；
 * history = 读取本地记录失败；save = 这句话没能存进浏览器
 */
export type NoticeReason = 'failed' | 'aborted' | 'unanswered' | 'history' | 'save';

/** 显示在消息列表底部的提示。error = 红色的出错提示；stopped = 灰色的一般提示 */
export interface ChatNotice {
  kind: 'error' | 'stopped';
  reason: NoticeReason;
}

interface ChatState {
  /** 目前对话的角色 */
  characterId: string | null;
  /** 这个角色的全部历史对话（最近的排最前） */
  conversations: Conversation[];
  /** 目前打开的对话；null = 还没发出第一句话的新对话 */
  conversationId: string | null;
  messages: Message[];
  status: ChatStatus;
  notice: ChatNotice | null;

  /** 切换到某个角色：读出和 TA 的历史对话，并打开最近的一个 */
  openCharacter: (characterId: string) => Promise<void>;
  /** 开一个新对话（发出第一句话时才写入本地） */
  startNewConversation: () => void;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  send: (text: string) => Promise<void>;
  /** 最后一句是用户说的、还没有回复时，重新请角色回复（不会重复存用户那句话） */
  retry: () => Promise<void>;
  /** 停止等待目前的回复 */
  stop: () => void;
  dismissNotice: () => void;
}

interface ChatStoreDeps {
  /** 角色的回复从哪里来（见 services/reply.ts） */
  getReply: typeof getReply;
  database: ChatDatabase;
}

/** 对话的状态与操作。测试时可以换成假的 getReply 与独立的数据库 */
export function createChatStore({ getReply, database }: ChatStoreDeps) {
  /** 正在进行的那一次发送或重试；按「停止」时用它中断 */
  let controller: AbortController | null = null;

  /** 用户离开目前的对话（切换、开新对话、删除）：中断等待，迟到的回复也不再显示 */
  function abortPending() {
    controller?.abort();
    controller = null;
  }

  return create<ChatState>()((set, get) => {
    /** 重新读对话列表（有新对话、新消息或删除后，列表会变） */
    async function refreshConversations(characterId: string): Promise<void> {
      const conversations = await listConversationsByCharacter(characterId, database);
      if (get().characterId === characterId) {
        set({ conversations });
      }
    }

    /** 读出一段对话的全部消息并显示；最后一句还没有回复时提示可以重试 */
    async function showConversation(conversationId: string): Promise<void> {
      try {
        const messages = await listMessages(conversationId, database);
        // 读取期间用户可能已经切到别的对话
        if (get().conversationId === conversationId) {
          const isUnanswered = messages.at(-1)?.role === 'user';
          set({
            messages,
            status: 'ready',
            notice: isUnanswered ? { kind: 'stopped', reason: 'unanswered' } : null,
          });
        }
      } catch {
        set({ status: 'ready', notice: { kind: 'error', reason: 'history' } });
      }
    }

    /** 开始一次发送或重试：界面进入「等回复」；回传的 controller 用来判断之后是否被中断 */
    function beginWaiting(): AbortController {
      abortPending();
      controller = new AbortController();
      set({ status: 'waiting', notice: null });
      return controller;
    }

    /** 请角色回复，并把回复存进浏览器、显示出来 */
    async function requestReply(
      characterId: string,
      conversationId: string,
      current: AbortController,
    ): Promise<void> {
      try {
        const reply = await getReply({ characterId, messages: get().messages }, current.signal);
        const message = await addMessage(
          {
            conversationId,
            role: 'assistant',
            content: reply.text,
            emotion: reply.emotion,
            action: reply.action,
            expression: reply.expression,
          },
          database,
        );
        await touchConversation(conversationId, database);
        // 等待期间用户已经离开这个对话：迟到的回复不显示
        if (controller !== current) {
          return;
        }
        set({ messages: [...get().messages, message], status: 'ready' });
        await refreshConversations(characterId);
      } catch (error) {
        if (controller === current) {
          // 用户自己按停止的不算出错
          const isAborted = (error as Error | undefined)?.name === 'AbortError';
          set({
            status: 'ready',
            notice: isAborted
              ? { kind: 'stopped', reason: 'aborted' }
              : { kind: 'error', reason: 'failed' },
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
          // 读取期间用户可能已经切到别的角色
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
          set({ status: 'ready', notice: { kind: 'error', reason: 'history' } });
        }
      },

      startNewConversation: () => {
        abortPending();
        set({ conversationId: null, messages: [], status: 'ready', notice: null });
      },

      selectConversation: async (conversationId) => {
        if (conversationId === get().conversationId) {
          return;
        }
        abortPending();
        set({ conversationId, messages: [], status: 'loading', notice: null });
        await showConversation(conversationId);
      },

      deleteConversation: async (conversationId) => {
        const { characterId } = get();
        // 删的是目前打开的对话：先回到新对话
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
        // 正在读取或等回复时不能发送（所以连按两次也只会发出一句）
        if (!content || !characterId || status !== 'ready') {
          return;
        }
        const current = beginWaiting();

        // 第一步：把用户这句话存进浏览器（新对话的第一句：先建立对话，用这句话当标题）
        let conversationId = get().conversationId;
        try {
          conversationId ??= (await createConversation(characterId, content, database)).id;
          const message = await addMessage({ conversationId, role: 'user', content }, database);
          if (controller !== current) {
            return;
          }
          set({ conversationId, messages: [...get().messages, message] });
          await refreshConversations(characterId);
        } catch {
          // 没存成功（例如浏览器的存储空间满了）：这句话没有发出去
          if (controller === current) {
            controller = null;
            set({ status: 'ready', notice: { kind: 'error', reason: 'save' } });
          }
          return;
        }

        // 第二步：请角色回复
        await requestReply(characterId, conversationId, current);
      },

      retry: async () => {
        const { characterId, conversationId, messages, status } = get();
        if (!characterId || !conversationId || status !== 'ready') {
          return;
        }
        if (messages.at(-1)?.role === 'user') {
          await requestReply(characterId, conversationId, beginWaiting());
        }
      },

      stop: () => {
        controller?.abort();
      },

      dismissNotice: () => set({ notice: null }),
    };
  });
}

export const useChatStore = createChatStore({ getReply, database: db });
