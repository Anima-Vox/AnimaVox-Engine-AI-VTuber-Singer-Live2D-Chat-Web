import { create } from 'zustand';
import { DEFAULT_CHARACTER_ID, findCharacter } from '../config/characters';
import { db, type ChatDatabase } from '../db';
import { getSetting, setSetting, SETTING_KEYS } from '../db/repositories/settingsRepository';

export interface CharacterState {
  activeCharacterId: string;
  /** 已从本地读出上次使用的角色 */
  isRestored: boolean;
  restore: () => Promise<void>;
  switchTo: (characterId: string) => Promise<void>;
}

/** 当前角色：记在本地，下次打开仍是同一个角色 */
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
