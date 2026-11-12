import { create } from 'zustand';
import { DEFAULT_CHARACTER_ID, findCharacter } from '../config/characters';

/** 记在这个浏览器（localStorage）的名字 */
const STORAGE_KEY = 'animavox.character';

interface CharacterState {
  activeCharacterId: string;
  switchTo: (characterId: string) => void;
}

/** 目前和哪个角色对话：记在浏览器里，下次打开仍是同一个角色 */
export function createCharacterStore() {
  return create<CharacterState>()((set) => ({
    // 没存过、或存的角色已经不存在时，用默认角色
    activeCharacterId: findCharacter(localStorage.getItem(STORAGE_KEY))?.id ?? DEFAULT_CHARACTER_ID,

    switchTo: (characterId) => {
      localStorage.setItem(STORAGE_KEY, characterId);
      set({ activeCharacterId: characterId });
    },
  }));
}

export const useCharacterStore = createCharacterStore();
