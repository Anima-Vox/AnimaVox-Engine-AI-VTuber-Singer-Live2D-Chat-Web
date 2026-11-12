import { describe, expect, it } from 'vitest';
import { createCharacterStore } from './characterStore';

describe('characterStore', () => {
  it('第一次打开默认是李佳尹', () => {
    expect(createCharacterStore().getState().activeCharacterId).toBe('lijiaying');
  });

  it('切换后的角色会被记住（下次打开仍是同一个）', () => {
    createCharacterStore().getState().switchTo('yuchengnuo');
    expect(createCharacterStore().getState().activeCharacterId).toBe('yuchengnuo');
  });

  it('记下的角色已经不存在时，回到默认角色', () => {
    localStorage.setItem('animavox.character', 'no-such-character');
    expect(createCharacterStore().getState().activeCharacterId).toBe('lijiaying');
  });
});
