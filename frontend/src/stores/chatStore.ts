import type { Conversation, Message } from '@shared';
import { create } from 'zustand';
import { chatApi, type ChatApi } from '../services/api/chatApi';
import type { RequestError, RequestErrorCode } from '../services/api/errors';
import { createId } from '../utils/id';

/** loading = 正在读取对话记录；ready = 可以发送；waiting = 等角色回复 */
type ChatStatus = 'loading' | 'ready' | 'waiting';

/** 提示的原因：请求失败的分类，或 unanswered（最后一句话还没有回复）。文字在 src/i18n */
export type NoticeReason = RequestErrorCode | 'unanswered';

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
  /** 开一个新对话（发出第一句话时才真的建立） */
  startNewConversation: () => void;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  send: (text: string) => Promise<void>;
  /** 出错提示上的「重试」：最后一句还没有回复就重新请角色回复，否则重新读取记录 */
  retry: () => Promise<void>;
  /** 停止等待目前的回复 */
  stop: () => void;
  dismissNotice: () => void;
  /** 登出时清空，下一位登录的人不会看到上一位的对话 */
  clear: () => void;
}

const EMPTY = {
  characterId: null,
  conversations: [],
  conversationId: null,
  messages: [],
  status: 'loading',
  notice: null,
} satisfies Partial<ChatState>;

/** 请求失败 → 提示。用户自己按停止的不算出错 */
function toNotice(error: unknown): ChatNotice {
  const reason = (error as RequestError).code;
  return { kind: reason === 'aborted' ? 'stopped' : 'error', reason };
}

/** 对话的状态与操作。api 可以换成假的（测试用） */
export function createChatStore(api: ChatApi) {
  /** 正在等回复的那个请求；按「停止」时用它中断 */
  let controller: AbortController | null = null;

  /** 用户离开目前的对话（切换、开新对话、登出）：中断请求，迟到的回复也不再显示 */
  function abortPending() {
    controller?.abort();
    controller = null;
  }

  return create<ChatState>()((set, get) => {
    /** 重新读对话列表（标题与排序在送出消息后会变） */
    async function refreshConversations(characterId: string): Promise<void> {
      const conversations = await api.listConversations(characterId);
      if (get().characterId === characterId) {
        set({ conversations });
      }
    }

    /** 读出一个对话的全部消息并显示；最后一句还没有回复时提示可以重试 */
    async function showConversation(conversationId: string): Promise<void> {
      try {
        const messages = await api.listMessages(conversationId);
        // 读取期间用户可能已经切到别的对话
        if (get().conversationId === conversationId) {
          const isUnanswered = messages.at(-1)?.role === 'user';
          set({
            messages,
            status: 'ready',
            notice: isUnanswered ? { kind: 'stopped', reason: 'unanswered' } : null,
          });
        }
      } catch (error) {
        if (get().conversationId === conversationId) {
          set({ status: 'ready', notice: toNotice(error) });
        }
      }
    }

    /**
     * 把用户的一句话送给后端并等回复。
     * message.id 就是 clientMessageId：重试时用同一个 id 再送一次，后端不会重复写入。
     */
    async function requestReply(characterId: string, message: Message): Promise<void> {
      abortPending();
      const current = new AbortController();
      controller = current;
      set({ status: 'waiting', notice: null });

      try {
        // 新对话的第一句：先请后端建立对话
        let conversationId = get().conversationId;
        if (!conversationId) {
          conversationId = (await api.createConversation(characterId)).id;
          if (controller !== current) {
            return;
          }
          set({ conversationId });
        }

        const result = await api.sendMessage(
          { conversationId, characterId, clientMessageId: message.id, content: message.content },
          current.signal,
        );
        if (controller !== current) {
          return;
        }
        // 把先显示的那句换成后端存下的版本，再接上角色的回复
        const messages = get().messages.map((item) =>
          item.id === message.id ? result.userMessage : item,
        );
        set({ messages: [...messages, result.reply], status: 'ready' });
        // 对话的标题与排序变了：更新列表（失败也不影响这次对话）
        await refreshConversations(characterId).catch(() => undefined);
      } catch (error) {
        if (controller === current) {
          set({ status: 'ready', notice: toNotice(error) });
        }
      } finally {
        if (controller === current) {
          controller = null;
        }
      }
    }

    return {
      ...EMPTY,

      openCharacter: async (characterId) => {
        abortPending();
        set({ ...EMPTY, characterId });

        try {
          const conversations = await api.listConversations(characterId);
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
        } catch (error) {
          if (get().characterId === characterId) {
            set({ status: 'ready', notice: toNotice(error) });
          }
        }
      },

      startNewConversation: () => {
        abortPending();
        set({ conversationId: null, messages: [], status: 'ready', notice: null });
      },

      selectConversation: async (conversationId) => {
        // 正在读取或等回复时点目前的对话：不用做事；其他时候点它 = 重新读取
        if (conversationId === get().conversationId && get().status !== 'ready') {
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
        try {
          await api.deleteConversation(conversationId);
        } catch (error) {
          set({ notice: toNotice(error) });
        }
        if (characterId) {
          await refreshConversations(characterId).catch(() => undefined);
        }
      },

      send: async (text) => {
        const content = text.trim();
        const { characterId, conversationId, status } = get();
        // 正在读取或等回复时不能发送（所以连按两次也只会发出一句）
        if (!content || !characterId || status !== 'ready') {
          return;
        }
        // 先把用户这句话显示出来，再送给后端
        const message: Message = {
          id: createId(),
          conversationId: conversationId ?? '',
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        };
        set({ messages: [...get().messages, message] });
        await requestReply(characterId, message);
      },

      retry: async () => {
        const { characterId, messages, status } = get();
        if (!characterId || status !== 'ready') {
          return;
        }
        const last = messages.at(-1);
        if (last?.role === 'user') {
          // 最后一句还没有回复：用同一个 id 再送一次
          await requestReply(characterId, last);
        } else {
          // 是读取记录失败：重新读取
          await get().openCharacter(characterId);
        }
      },

      stop: () => {
        controller?.abort();
      },

      dismissNotice: () => set({ notice: null }),

      clear: () => {
        abortPending();
        set(EMPTY);
      },
    };
  });
}

export const useChatStore = createChatStore(chatApi);
