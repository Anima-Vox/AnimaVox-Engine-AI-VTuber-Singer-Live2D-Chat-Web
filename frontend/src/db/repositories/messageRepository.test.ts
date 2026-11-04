import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatDatabase } from '../index';
import { createConversation, deleteConversation } from './conversationRepository';
import { addMessage, addMessages, listMessages } from './messageRepository';

let database: ChatDatabase;

beforeEach(async () => {
  database = new ChatDatabase(`test-messages-${Date.now()}-${Math.random()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

describe('messageRepository', () => {
  it('会话存在时正常写入', async () => {
    const conversation = await createConversation(
      { characterId: 'lijiaying', activeModelId: 'mock' },
      database,
    );

    await addMessage({ conversationId: conversation.id, role: 'user', content: '你好' }, database);

    expect(await listMessages(conversation.id, database)).toHaveLength(1);
  });

  it('会话已被删除时不写入消息', async () => {
    const conversation = await createConversation(
      { characterId: 'lijiaying', activeModelId: 'mock' },
      database,
    );
    await deleteConversation(conversation.id, database);

    await expect(
      addMessage(
        { conversationId: conversation.id, role: 'assistant', content: '迟到的回复' },
        database,
      ),
    ).rejects.toThrow();
    expect(await database.messages.count()).toBe(0);
  });

  it('批量写入时只要有一个会话不存在，整批都不写入', async () => {
    const conversation = await createConversation(
      { characterId: 'lijiaying', activeModelId: 'mock' },
      database,
    );

    await expect(
      addMessages(
        [
          { conversationId: conversation.id, role: 'user', content: '第一句' },
          { conversationId: 'missing', role: 'user', content: '第二句' },
        ],
        database,
      ),
    ).rejects.toThrow();
    expect(await database.messages.count()).toBe(0);
  });
});
