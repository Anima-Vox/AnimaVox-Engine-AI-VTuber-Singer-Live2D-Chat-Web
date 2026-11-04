import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatDatabase } from '../db';
import { createCharacterStore } from './characterStore';

let database: ChatDatabase;

beforeEach(async () => {
  database = new ChatDatabase(`test-character-store-${Date.now()}-${Math.random()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

describe('characterStore', () => {
  it('第一次打开默认是李佳尹', async () => {
    const store = createCharacterStore(database);
    await store.getState().restore();

    expect(store.getState().activeCharacterId).toBe('lijiaying');
    expect(store.getState().isRestored).toBe(true);
  });

  it('切换后的角色会被记住', async () => {
    const first = createCharacterStore(database);
    await first.getState().restore();
    await first.getState().switchTo('yuchengnuo');

    const second = createCharacterStore(database);
    await second.getState().restore();

    expect(second.getState().activeCharacterId).toBe('yuchengnuo');
  });

  it('不存在的角色不会被选中', async () => {
    const store = createCharacterStore(database);
    await store.getState().restore();
    await store.getState().switchTo('no-such-character');

    expect(store.getState().activeCharacterId).toBe('lijiaying');
  });
});
