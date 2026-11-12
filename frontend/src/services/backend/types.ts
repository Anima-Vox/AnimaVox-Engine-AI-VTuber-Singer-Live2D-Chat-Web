import type { Conversation, Message } from '@shared';

export interface SendMessageInput {
  conversationId: string;
  characterId: string;
  /** 前端产生的 id，同时就是这条用户消息的 id；重试时沿用同一个 */
  clientMessageId: string;
  content: string;
}

export interface SendMessageResult {
  conversation: Conversation;
  userMessage: Message;
  reply: Message;
}

/**
 * 对话记录与回复的来源：状态层（stores/chatStore）只认这个接口。
 * - local：演示模式，记录存在浏览器 IndexedDB，回复来自浏览器内假后端
 * - remote：接后端（接口约定 v1），记录由后端保管
 */
export interface ChatBackend {
  readonly mode: 'mock' | 'http';
  listConversations(characterId: string): Promise<Conversation[]>;
  createConversation(characterId: string): Promise<Conversation>;
  listMessages(conversationId: string): Promise<Message[]>;
  deleteConversation(conversationId: string): Promise<void>;
  /**
   * 送出一句话并拿到回复。同一个 clientMessageId 再送一次不会重复写入：
   * 已有回复就回传原本的回复，还没有就重新产生（重试）。
   */
  sendMessage(
    input: SendMessageInput,
    options?: { signal?: AbortSignal },
  ): Promise<SendMessageResult>;
}

/** 本机写入失败（例如浏览器存储已满），这句话没有发出去 */
export class LocalSaveError extends Error {
  constructor(cause?: unknown) {
    super('本机保存失败', { cause });
    this.name = 'LocalSaveError';
  }
}
