import type { Message } from '../../types';
import { createId } from '../../utils/id';
import { db, type ChatDatabase } from '../index';

/** 消息表的读写。每个函数最后一个参数都是数据库，平常不用传；测试时换成独立的数据库 */

/** 一段对话的全部消息，旧的在前 */
export async function listMessages(
  conversationId: string,
  database: ChatDatabase = db,
): Promise<Message[]> {
  return database.messages.where('conversationId').equals(conversationId).sortBy('createdAt');
}

/** 存下一条消息（id 与时间由这里补上），回传存好的消息 */
export async function addMessage(
  input: Omit<Message, 'id' | 'createdAt'>,
  database: ChatDatabase = db,
): Promise<Message> {
  const message: Message = { ...input, id: createId(), createdAt: new Date().toISOString() };

  // 和「删除对话」用同一个事务：对话已经被删除时不写入，避免留下没有对话的消息
  await database.transaction('rw', database.conversations, database.messages, async () => {
    if (!(await database.conversations.get(message.conversationId))) {
      throw new Error('对话已经不存在，无法保存消息');
    }
    await database.messages.add(message);
  });
  return message;
}
