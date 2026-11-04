import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatResponse, Message } from '@shared';
import { DEFAULT_CHARACTER } from '../constants/defaultCharacter';
import { db } from '../db';
import { createConversation } from '../db/repositories/conversationRepository';
import * as conversationRepository from '../db/repositories/conversationRepository';
import { addMessage, listMessages } from '../db/repositories/messageRepository';
import * as messageRepository from '../db/repositories/messageRepository';
import { sendChatMessage } from '../services/chatApi';
import { useCharacterStore } from './characterStore';
import { useChatStore } from './chatStore';
import { useLive2dStore } from './live2dStore';
import { useModelStore } from './modelStore';

vi.mock('../services/chatApi', () => ({ sendChatMessage: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: Error) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function reply(conversationId: string): ChatResponse {
  return {
    conversationId,
    messageId: 'server-message',
    createdAt: '2026-11-04T00:00:00.000Z',
    response: { text: 'server reply', emotion: 'happy', action: 'idle', expression: 'smile' },
  };
}

beforeEach(async () => {
  vi.mocked(sendChatMessage).mockReset();
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  useChatStore.setState({
    conversations: [],
    activeConversationId: null,
    messages: [],
    status: 'idle',
    error: null,
  });
  useCharacterStore.setState({
    character: { ...DEFAULT_CHARACTER, id: 'character', createdAt: '', updatedAt: '' },
  });
  useModelStore.setState({
    activeId: 'model',
    configs: [
      {
        id: 'model',
        provider: 'mock',
        apiUrl: 'mock',
        apiKey: '',
        modelName: 'mock',
        contextWindow: 20,
        isActive: true,
        createdAt: '',
      },
    ],
  });
  useLive2dStore.getState().reset();
});

afterEach(async () => {
  // Cancel any unfinished owned request before resetting the singleton database.
  await useChatStore.getState().selectConversation('cleanup');
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function startConversation() {
  const conversation = await createConversation({
    characterId: 'character',
    activeModelId: 'model',
  });
  await useChatStore.getState().load();
  await useChatStore.getState().selectConversation(conversation.id);
  return conversation;
}

describe('chatStore request ownership', () => {
  it('blocks sending while a manual conversation creation is pending and unlocks after creation', async () => {
    const creationGate = deferred<void>();
    const originalCreate = conversationRepository.createConversation;
    vi.spyOn(conversationRepository, 'createConversation').mockImplementationOnce(
      async (input, database) => {
        await creationGate.promise;
        return originalCreate(input, database);
      },
    );
    const creation = useChatStore.getState().createConversation();
    expect(useChatStore.getState().status).toBe('creating');
    await useChatStore.getState().sendMessage('cannot send yet');
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(await db.messages.count()).toBe(0);
    creationGate.resolve();
    const id = await creation;
    expect(useChatStore.getState().status).toBe('idle');
    vi.mocked(sendChatMessage).mockResolvedValueOnce(reply(id!));
    await useChatStore.getState().sendMessage('now ready');
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect((await listMessages(id!)).map((message) => message.content).sort()).toEqual([
      'now ready',
      'server reply',
    ]);
  });

  it.each(['manual', 'automatic'] as const)(
    'keeps a committed %s creation in the list after a newer creation wins selection',
    async (mode) => {
      const creationGate = deferred<void>();
      const originalCreate = conversationRepository.createConversation;
      vi.spyOn(conversationRepository, 'createConversation').mockImplementationOnce(
        async (input, database) => {
          await creationGate.promise;
          return originalCreate(input, database);
        },
      );
      const olderCreation =
        mode === 'manual'
          ? useChatStore.getState().createConversation()
          : useChatStore.getState().sendMessage('cancelled question');
      const selectedId = await useChatStore.getState().createConversation();
      creationGate.resolve();
      await olderCreation;

      const persisted = await db.conversations.toArray();
      expect(persisted).toHaveLength(2);
      expect(
        useChatStore
          .getState()
          .conversations.map((conversation) => conversation.id)
          .sort(),
      ).toEqual(persisted.map((conversation) => conversation.id).sort());
      expect(useChatStore.getState().activeConversationId).toBe(selectedId);
      expect(sendChatMessage).not.toHaveBeenCalled();
    },
  );

  it('does not let an earlier selection snapshot overwrite a completed send', async () => {
    const conversation = await startConversation();
    const history = deferred<Message[]>();
    vi.spyOn(messageRepository, 'listMessages').mockReturnValueOnce(history.promise);
    const selection = useChatStore.getState().selectConversation(conversation.id);

    vi.mocked(sendChatMessage).mockResolvedValueOnce(reply(conversation.id));
    await useChatStore.getState().sendMessage('new question');
    expect(useChatStore.getState().status).toBe('idle');
    history.resolve([]);
    await selection;
    expect(useChatStore.getState().messages.map((message) => message.content)).toEqual([
      'new question',
      'server reply',
    ]);
  });

  it('removes a committed deletion from the list after navigation while keeping newly created conversations', async () => {
    const first = await startConversation();
    const secondId = await useChatStore.getState().createConversation();
    const deletionGate = deferred<void>();
    const originalDelete = conversationRepository.deleteConversation;
    vi.spyOn(conversationRepository, 'deleteConversation').mockImplementationOnce(
      async (id, database) => {
        await deletionGate.promise;
        await originalDelete(id, database);
      },
    );
    const deletion = useChatStore.getState().removeConversation(first.id);
    const createdDuringDeletion = await useChatStore.getState().createConversation();
    await useChatStore.getState().selectConversation(secondId!);
    deletionGate.resolve();
    await deletion;

    expect(useChatStore.getState().activeConversationId).toBe(secondId);
    expect(useChatStore.getState().conversations.map((conversation) => conversation.id)).toEqual(
      expect.arrayContaining([secondId, createdDuringDeletion]),
    );
    expect(
      useChatStore.getState().conversations.some((conversation) => conversation.id === first.id),
    ).toBe(false);
  });

  it('does not apply a late reply or emotion after switching conversations, even if abort is ignored', async () => {
    const first = await startConversation();
    const second = await createConversation({ characterId: 'character', activeModelId: 'model' });
    await addMessage({ conversationId: second.id, role: 'user', content: 'second history' });
    const pending = deferred<ChatResponse>();
    vi.mocked(sendChatMessage).mockReturnValueOnce(pending.promise);
    const send = useChatStore.getState().sendMessage('first question');
    await vi.waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(sendChatMessage).mock.calls[0]?.[1];

    await useChatStore.getState().selectConversation(second.id);
    expect(signal?.aborted).toBe(true);
    pending.resolve(reply(first.id));
    await send;

    expect(useChatStore.getState().activeConversationId).toBe(second.id);
    expect(useChatStore.getState().messages.map((message) => message.content)).toEqual([
      'second history',
    ]);
    expect(useChatStore.getState().status).toBe('idle');
    expect(useLive2dStore.getState().emotion).toBe('neutral');
    expect((await listMessages(first.id)).map((message) => message.role)).toEqual(['user']);
  });

  it('does not recreate messages after the sending conversation is deleted', async () => {
    const conversation = await startConversation();
    const pending = deferred<ChatResponse>();
    vi.mocked(sendChatMessage).mockReturnValueOnce(pending.promise);
    const send = useChatStore.getState().sendMessage('question');
    await vi.waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(1));
    await useChatStore.getState().removeConversation(conversation.id);
    pending.resolve(reply(conversation.id));
    await send;

    expect(await db.conversations.get(conversation.id)).toBeUndefined();
    expect(await listMessages(conversation.id)).toEqual([]);
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().status).toBe('idle');
  });

  it('does not let a stale failure clear or overwrite a newer conversation request', async () => {
    const first = await startConversation();
    const oldReply = deferred<ChatResponse>();
    const newReply = deferred<ChatResponse>();
    vi.mocked(sendChatMessage)
      .mockReturnValueOnce(oldReply.promise)
      .mockReturnValueOnce(newReply.promise);
    const oldSend = useChatStore.getState().sendMessage('old question');
    await vi.waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(1));

    const nextId = await useChatStore.getState().createConversation();
    expect(nextId).not.toBe(first.id);
    const newSend = useChatStore.getState().sendMessage('new question');
    await vi.waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(2));
    oldReply.reject(new Error('stale network failure'));
    await oldSend;
    expect(useChatStore.getState()).toMatchObject({
      activeConversationId: nextId,
      status: 'sending',
      error: null,
    });
    newReply.resolve(reply(nextId!));
    await newSend;
    expect(useChatStore.getState().messages.map((message) => message.content)).toEqual([
      'new question',
      'server reply',
    ]);
    expect(useChatStore.getState()).toMatchObject({ status: 'idle', error: null });
  });

  it('locks before creating a conversation or persisting the first user message', async () => {
    const pending = deferred<ChatResponse>();
    vi.mocked(sendChatMessage).mockReturnValue(pending.promise);
    const first = useChatStore.getState().sendMessage('first');
    const second = useChatStore.getState().sendMessage('duplicate');
    await vi.waitFor(() => expect(sendChatMessage).toHaveBeenCalled());
    const id = useChatStore.getState().activeConversationId;
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(await db.conversations.count()).toBe(1);
    expect((await listMessages(id!)).map((message) => message.content)).toEqual(['first']);
    pending.resolve(reply(id!));
    await Promise.all([first, second]);
  });

  it('uses persisted user identity for the request and preserves server reply identity/time', async () => {
    const conversation = await startConversation();
    vi.mocked(sendChatMessage).mockResolvedValueOnce(reply(conversation.id));
    await useChatStore.getState().sendMessage('question');
    const messages = await listMessages(conversation.id);
    const user = messages.find((message) => message.role === 'user');
    const assistant = messages.find((message) => message.role === 'assistant');
    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ clientMessageId: user?.id }),
      expect.any(AbortSignal),
    );
    expect(assistant).toMatchObject({
      id: 'server-message',
      createdAt: '2026-11-04T00:00:00.000Z',
    });
  });

  it('rejects a response for another conversation without persisting or applying it', async () => {
    const conversation = await startConversation();
    vi.mocked(sendChatMessage).mockResolvedValueOnce(reply('different-conversation'));
    await useChatStore.getState().sendMessage('question');
    expect((await listMessages(conversation.id)).map((message) => message.role)).toEqual(['user']);
    expect(useChatStore.getState().status).toBe('error');
    expect(useLive2dStore.getState().emotion).toBe('neutral');
  });

  it('reports initial user persistence failure and releases the send lock', async () => {
    const conversation = await startConversation();
    vi.spyOn(db.messages, 'add').mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(useChatStore.getState().sendMessage('question')).resolves.toBeUndefined();
    expect(useChatStore.getState()).toMatchObject({
      status: 'error',
      error: 'storage unavailable',
    });
    expect(sendChatMessage).not.toHaveBeenCalled();

    vi.mocked(sendChatMessage).mockResolvedValueOnce(reply(conversation.id));
    await useChatStore.getState().sendMessage('try again');
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState().status).toBe('idle');
  });

  it('reports automatic conversation creation failure instead of rejecting outside error handling', async () => {
    vi.spyOn(db.conversations, 'add').mockRejectedValueOnce(
      new Error('cannot create conversation'),
    );
    await expect(useChatStore.getState().sendMessage('question')).resolves.toBeUndefined();
    expect(useChatStore.getState()).toMatchObject({
      status: 'error',
      error: 'cannot create conversation',
    });
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});
