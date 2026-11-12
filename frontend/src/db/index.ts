import Dexie, { type Table } from 'dexie';
import type { Conversation, Message } from '../types';

/** settings 表的一行：简单的「名字 → 值」，存界面偏好（上次使用的角色、界面语言） */
interface SettingRecord {
  key: string;
  value: string;
}

/**
 * 浏览器里的数据库（IndexedDB，通过 Dexie 使用）：纯净版的全部资料都存在这里，
 * 只留在使用者自己的浏览器。三张表：对话、消息、界面偏好。
 */
export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  settings!: Table<SettingRecord, string>;

  constructor(name = 'lijiaying-chat') {
    super(name);
    // 每张表后面列的是「可以用来查找、排序的栏位」；第一个是主键
    this.version(1).stores({
      conversations: 'id, updatedAt, characterId',
      messages: 'id, conversationId, createdAt',
    });
    // 第 2 版新增 settings 表（旧资料原样保留）。之后要改结构请加 version(3)，不要改上面的
    this.version(2).stores({
      settings: 'key',
    });
  }
}

export const db = new ChatDatabase();
