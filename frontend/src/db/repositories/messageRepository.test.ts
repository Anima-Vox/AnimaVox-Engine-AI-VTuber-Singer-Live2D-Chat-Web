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

describe('messageRepository conversation integrity', () => {
  it('rejects writes to a missing conversation', async () => {
    await expect(
      addMessage({ conversationId: 'missing', role: 'assistant', content: 'late reply' }, database),
    ).rejects.toThrow();
    expect(await database.messages.count()).toBe(0);
  });

  it('rolls back a batch containing a missing conversation', async () => {
    const conversation = await createConversation(
      { characterId: 'character', activeModelId: 'model' },
      database,
    );
    await expect(
      addMessages(
        [
          { conversationId: conversation.id, role: 'user', content: 'valid' },
          { conversationId: 'missing', role: 'assistant', content: 'invalid' },
        ],
        database,
      ),
    ).rejects.toThrow();
    expect(await database.messages.count()).toBe(0);
  });

  it('cannot leave orphan messages when deletion races an insert', async () => {
    const conversation = await createConversation(
      { characterId: 'character', activeModelId: 'model' },
      database,
    );
    await Promise.allSettled([
      deleteConversation(conversation.id, database),
      addMessage(
        { conversationId: conversation.id, role: 'assistant', content: 'late reply' },
        database,
      ),
    ]);
    expect(await database.conversations.get(conversation.id)).toBeUndefined();
    expect(await listMessages(conversation.id, database)).toEqual([]);
  });
});
