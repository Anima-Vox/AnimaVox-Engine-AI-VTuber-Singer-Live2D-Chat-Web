import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatDatabase } from '../index';
import {
  createConversation,
  deleteConversation,
  listConversationsByCharacter,
  touchConversation,
} from './conversationRepository';
import { addMessage, listMessages } from './messageRepository';

/** 每个用例用一个全新的数据库 */
let database: ChatDatabase;

beforeEach(async () => {
  database = new ChatDatabase(`test-repositories-${Date.now()}-${Math.random()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('对话与消息的本地存储', () => {
  it('建立对话：标题取第一句话的前 24 个字，重新读取依然存在', async () => {
    const created = await createConversation(
      'lijiaying',
      '今天  天气怎么样？我想出门走走，顺便买杯奶茶再回来写作业',
      database,
    );

    expect(created.title).toBe('今天 天气怎么样？我想出门走走，顺便买杯奶茶再回');
    expect(await listConversationsByCharacter('lijiaying', database)).toEqual([created]);
  });

  it('只列出这个角色的对话，最近有新消息的排最前', async () => {
    const first = await createConversation('lijiaying', '第一段', database);
    await sleep(5);
    const second = await createConversation('lijiaying', '第二段', database);
    await createConversation('yuchengnuo', '阿糯的', database);
    await sleep(5);
    await touchConversation(first.id, database);

    const list = await listConversationsByCharacter('lijiaying', database);
    expect(list.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('消息按时间先后读出，角色的回复带着情绪、动作、表情', async () => {
    const conversation = await createConversation('lijiaying', '你好', database);
    await addMessage({ conversationId: conversation.id, role: 'user', content: '你好' }, database);
    await sleep(5);
    await addMessage(
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: '嗨',
        emotion: 'happy',
        action: 'greeting',
        expression: 'smile',
      },
      database,
    );

    const messages = await listMessages(conversation.id, database);
    expect(messages.map((message) => message.content)).toEqual(['你好', '嗨']);
    expect(messages[1]).toMatchObject({
      emotion: 'happy',
      action: 'greeting',
      expression: 'smile',
    });
  });

  it('删除对话时消息一起删除；对话删除后不能再往里面写消息', async () => {
    const conversation = await createConversation('lijiaying', '你好', database);
    await addMessage({ conversationId: conversation.id, role: 'user', content: '你好' }, database);

    await deleteConversation(conversation.id, database);

    expect(await listMessages(conversation.id, database)).toHaveLength(0);
    await expect(
      addMessage(
        { conversationId: conversation.id, role: 'assistant', content: '迟到的回复' },
        database,
      ),
    ).rejects.toThrow();
    expect(await database.messages.count()).toBe(0);
  });
});
