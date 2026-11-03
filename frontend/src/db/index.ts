import Dexie, { type Table } from 'dexie';
import type { Conversation, Message } from '@shared';

/**
 * 前端本地存储（IndexedDB）。
 * 文字对话版只保留会话与消息两张表；assistant 消息完整保存
 * emotion / action / expression / toolCalls，供后续 Live2D 与语音使用。
 *
 * 用独立的库名，避免和旧版（含 Live2D / 设置等表）的本地数据冲突。
 */
export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;

  constructor(name = 'lijiaying-chat') {
    super(name);
    this.version(1).stores({
      conversations: 'id, updatedAt, characterId',
      messages: 'id, conversationId, createdAt',
    });
  }
}

export const db = new ChatDatabase();
