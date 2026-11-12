import type { Conversation } from '../../types';
import { createId } from '../../utils/id';
import { db, type ChatDatabase } from '../index';

/** 对话表的读写。每个函数最后一个参数都是数据库，平常不用传；测试时换成独立的数据库 */

/** 某个角色的全部对话，最近更新的排最前 */
export async function listConversationsByCharacter(
  characterId: string,
  database: ChatDatabase = db,
): Promise<Conversation[]> {
  const conversations = await database.conversations
    .where('characterId')
    .equals(characterId)
    .toArray();
  return conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** 建立一段新对话；标题取第一句话的前 24 个字 */
export async function createConversation(
  characterId: string,
  firstMessage: string,
  database: ChatDatabase = db,
): Promise<Conversation> {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: createId(),
    title: firstMessage.replace(/\s+/g, ' ').slice(0, 24),
    characterId,
    createdAt: now,
    updatedAt: now,
  };
  await database.conversations.add(conversation);
  return conversation;
}

/** 对话有新消息时更新时间（历史列表靠它排序） */
export async function touchConversation(id: string, database: ChatDatabase = db): Promise<void> {
  await database.conversations.update(id, { updatedAt: new Date().toISOString() });
}

/** 删除对话，连同它的全部消息 */
export async function deleteConversation(id: string, database: ChatDatabase = db): Promise<void> {
  await database.transaction('rw', database.conversations, database.messages, async () => {
    await database.messages.where('conversationId').equals(id).delete();
    await database.conversations.delete(id);
  });
}
