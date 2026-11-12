import { create } from 'zustand';
import { DEFAULT_CHARACTER_ID, findCharacter } from '../config/characters';
import { db, type ChatDatabase } from '../db';
import { getSetting, setSetting, SETTING_KEYS } from '../db/repositories/settingsRepository';

interface CharacterState {
  activeCharacterId: string;
  /** 已经从浏览器读出上次使用的角色（读出之前先不显示对话） */
  isRestored: boolean;
  /** 打开页面时：读出上次使用的角色 */
  restore: () => Promise<void>;
  switchTo: (characterId: string) => Promise<void>;
}

/** 目前和哪个角色对话：记在浏览器里，下次打开仍是同一个角色。测试时可以换成独立的数据库 */
export function createCharacterStore(database: ChatDatabase) {
  return create<CharacterState>()((set, get) => ({
    activeCharacterId: DEFAULT_CHARACTER_ID,
    isRestored: false,

    restore: async () => {
      try {
        const saved = await getSetting(SETTING_KEYS.activeCharacterId, database);
        const valid = findCharacter(saved);
        set({ activeCharacterId: valid?.id ?? DEFAULT_CHARACTER_ID, isRestored: true });
      } catch {
        // 读不到就用默认角色
        set({ isRestored: true });
      }
    },

    switchTo: async (characterId) => {
      if (!findCharacter(characterId) || characterId === get().activeCharacterId) {
        return;
      }
      set({ activeCharacterId: characterId });
      await setSetting(SETTING_KEYS.activeCharacterId, characterId, database);
    },
  }));
}

export const useCharacterStore = createCharacterStore(db);
