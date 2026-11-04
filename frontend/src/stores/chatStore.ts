import { create } from 'zustand';
import type { ChatContextMessage, Conversation, Message } from '@shared';
import {
  createConversation as createConversationRecord,
  deleteConversation as deleteConversationRecord,
  listConversations,
  renameConversationByFirstMessage,
  setConversationActiveModel,
  touchConversation,
} from '../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../db/repositories/messageRepository';
import { sendChatMessage } from '../services/chatApi';
import {
  buildContextMessages,
  buildSystemPrompt,
  DEFAULT_CONTEXT_WINDOW,
} from '../utils/systemPrompt';
import { useCharacterStore } from './characterStore';
import { useLive2dStore } from './live2dStore';
import { selectActiveConfig, useModelStore } from './modelStore';

export type ChatStatus = 'idle' | 'creating' | 'sending' | 'error';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  /** 启动时加载会话列表，并恢复最近一次会话 */
  load: () => Promise<void>;
  createConversation: () => Promise<string | null>;
  selectConversation: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  /** 发送用户消息并写入模型回复（含持久化与表情联动） */
  sendMessage: (text: string) => Promise<void>;
  /** 新建会话并插入角色开场白（本地生成，不消耗 API） */
  greetInNewConversation: (greeting: string) => Promise<void>;
  /** 切换全局模型，同时记录到当前会话；切换会话不恢复旧模型 */
  switchModel: (modelConfigId: string) => Promise<void>;
  clearError: () => void;
}

function toHistory(messages: Message[]): Array<{ role: Message['role']; content: string }> {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

interface PendingChat {
  conversationId: string | null;
  controller: AbortController;
}

export const useChatStore = create<ChatState>()((set, get) => {
  // 当前界面只拥有一个请求。离开会话即取消；即使传输忽略 abort，过期结果也不能写回。
  let pendingChat: PendingChat | null = null;
  let selectionVersion = 0;
  const cancelSend = () => {
    pendingChat?.controller.abort();
    pendingChat = null;
  };
  const errorText = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

  return {
    conversations: [],
    activeConversationId: null,
    messages: [],
    status: 'idle',
    error: null,

    load: async () => {
      cancelSend();
      const version = ++selectionVersion;
      set({ status: 'idle', error: null });
      try {
        const conversations = await listConversations();
        const latest = conversations[0];
        const messages = latest ? await listMessages(latest.id) : [];
        if (version === selectionVersion) {
          set({
            conversations,
            activeConversationId: latest?.id ?? null,
            messages,
            status: 'idle',
            error: null,
          });
        }
      } catch (cause) {
        if (version === selectionVersion) set({ status: 'error', error: errorText(cause) });
      }
    },

    createConversation: async () => {
      cancelSend();
      const version = ++selectionVersion;
      const character = useCharacterStore.getState().character;
      const modelConfig = selectActiveConfig(useModelStore.getState());
      set({ status: 'idle', error: null });
      if (!character || !modelConfig) {
        set({ status: 'error', error: '请先完成角色与模型配置，再开始新会话' });
        return null;
      }

      set({ status: 'creating' });
      try {
        const conversation = await createConversationRecord({
          characterId: character.id,
          activeModelId: modelConfig.id,
        });
        // 已提交的创建始终进入列表，但过期操作不能抢回当前选择。
        set((state) => ({ conversations: [conversation, ...state.conversations] }));
        if (version !== selectionVersion) return null;
        set({
          activeConversationId: conversation.id,
          messages: [],
          status: 'idle',
          error: null,
        });
        return conversation.id;
      } catch (cause) {
        if (version === selectionVersion) set({ status: 'error', error: errorText(cause) });
        return null;
      }
    },

    selectConversation: async (id) => {
      cancelSend();
      const version = ++selectionVersion;
      set({ activeConversationId: id, messages: [], status: 'idle', error: null });
      try {
        const messages = await listMessages(id);
        // 若用户已经发送，新请求会从数据库读取完整历史，旧加载不能覆盖它。
        if (version === selectionVersion && !pendingChat) set({ messages });
      } catch (cause) {
        if (version === selectionVersion) set({ status: 'error', error: errorText(cause) });
      }
    },

    removeConversation: async (id) => {
      if (pendingChat?.conversationId === id) cancelSend();
      const wasActive = get().activeConversationId === id;
      const version = wasActive ? ++selectionVersion : selectionVersion;
      if (wasActive) set({ activeConversationId: null, messages: [], status: 'idle', error: null });
      try {
        await deleteConversationRecord(id);
        // 删除已提交，即使用户已切换会话，也必须移除列表中的旧记录。
        // 过滤当前列表，保留删除期间新建的会话。
        set((state) => ({ conversations: state.conversations.filter((item) => item.id !== id) }));
        if (version !== selectionVersion) return;
        const next = get().conversations[0];
        if (wasActive && next) await get().selectConversation(next.id);
      } catch (cause) {
        if (version === selectionVersion) set({ status: 'error', error: errorText(cause) });
      }
    },

    sendMessage: async (text) => {
      const content = text.trim();
      if (!content || pendingChat || get().status === 'creating') return;
      const character = useCharacterStore.getState().character;
      const modelConfig = selectActiveConfig(useModelStore.getState());
      if (!character || !modelConfig) {
        set({ status: 'error', error: '缺少角色设定或模型配置，请先完成引导设置' });
        return;
      }

      // 在第一个 await 之前取得所有权，避免连续点击或首次自动建会话重复发送。
      const request: PendingChat = {
        conversationId: get().activeConversationId,
        controller: new AbortController(),
      };
      pendingChat = request;
      // 永久作废此前发起的历史读取，避免它在本次发送完成后覆盖新消息。
      ++selectionVersion;
      const ownsRequest = () => pendingChat === request && !request.controller.signal.aborted;
      set({ status: 'sending', error: null });

      try {
        let conversationId = request.conversationId;
        if (!conversationId) {
          const conversation = await createConversationRecord({
            characterId: character.id,
            activeModelId: modelConfig.id,
          });
          set((state) => ({ conversations: [conversation, ...state.conversations] }));
          if (!ownsRequest()) return;
          conversationId = conversation.id;
          request.conversationId = conversationId;
          ++selectionVersion;
          set({
            activeConversationId: conversationId,
            messages: [],
          });
        }

        const userMessage = await addMessage({ conversationId, role: 'user', content });
        if (!ownsRequest()) return;
        const messages = await listMessages(conversationId);
        if (!ownsRequest()) return;
        const isFirstUserMessage = !messages.some(
          (message) => message.role === 'user' && message.id !== userMessage.id,
        );
        set({ messages });
        const contextMessages: ChatContextMessage[] = buildContextMessages({
          systemPrompt: buildSystemPrompt(character),
          history: toHistory(messages),
          contextWindow: modelConfig.contextWindow || DEFAULT_CONTEXT_WINDOW,
        });
        const result = await sendChatMessage(
          {
            conversationId,
            modelConfigId: modelConfig.id,
            clientMessageId: userMessage.id,
            messages: contextMessages,
          },
          request.controller.signal,
        );
        if (!ownsRequest()) return;
        if (result.conversationId !== conversationId) {
          throw new Error('回复的会话 ID 不匹配');
        }
        const assistantMessage = await addMessage({
          id: result.messageId,
          createdAt: result.createdAt,
          conversationId,
          role: 'assistant',
          content: result.response.text,
          emotion: result.response.emotion,
          action: result.response.action,
          expression: result.response.expression,
          toolCalls: result.response.tool_calls,
        });
        if (!ownsRequest()) return;
        await touchConversation(conversationId);
        if (isFirstUserMessage) await renameConversationByFirstMessage(conversationId, content);
        const conversations = await listConversations();
        if (!ownsRequest()) return;
        useLive2dStore.getState().setEmotion(result.response.emotion, {
          expression: result.response.expression,
          action: result.response.action,
        });
        set({
          messages: [...messages, assistantMessage],
          conversations,
          status: 'idle',
          error: null,
        });
      } catch (cause) {
        if (ownsRequest()) set({ status: 'error', error: errorText(cause) });
      } finally {
        if (pendingChat === request) {
          pendingChat = null;
          if (get().status === 'sending') set({ status: 'idle' });
        }
      }
    },

    greetInNewConversation: async (greeting) => {
      const conversationId = await get().createConversation();
      if (!conversationId) return;
      const version = selectionVersion;
      try {
        await addMessage({
          conversationId,
          role: 'assistant',
          content: greeting,
          emotion: 'happy',
          action: 'greeting',
          expression: 'smile',
        });
        const messages = await listMessages(conversationId);
        if (version !== selectionVersion) return;
        if (!pendingChat) {
          useLive2dStore
            .getState()
            .setEmotion('happy', { expression: 'smile', action: 'greeting' });
          set({ messages });
        }
      } catch (cause) {
        if (version === selectionVersion) set({ status: 'error', error: errorText(cause) });
      }
    },

    switchModel: async (modelConfigId) => {
      await useModelStore.getState().activate(modelConfigId);
      const conversationId = get().activeConversationId;
      if (conversationId) {
        await setConversationActiveModel(conversationId, modelConfigId);
        set({ conversations: await listConversations() });
      }
    },

    clearError: () => set({ error: null, status: pendingChat ? 'sending' : 'idle' }),
  };
});
