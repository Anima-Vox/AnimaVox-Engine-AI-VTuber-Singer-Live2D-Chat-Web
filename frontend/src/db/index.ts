import Dexie, { type Table } from 'dexie';
import type { Conversation, Message } from '@shared';

/** settings 表：简单的键值对，存界面偏好（例如上次使用的角色） */
export interface SettingRecord {
  key: string;
  value: string;
}

/**
 * 前端本地存储（IndexedDB），数据只留在使用者自己的浏览器里。
 * assistant 消息完整保存 emotion / action / expression / toolCalls，供后续 Live2D 与语音使用。
 */
export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  settings!: Table<SettingRecord, string>;

  constructor(name = 'lijiaying-chat') {
    super(name);
    this.version(1).stores({
      conversations: 'id, updatedAt, characterId',
      messages: 'id, conversationId, createdAt',
    });
    // v2：新增 settings 表（旧数据原样保留）
    this.version(2).stores({
      settings: 'key',
    });
  }
}

export const db = new ChatDatabase();
