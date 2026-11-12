import { invalidInput } from './errors';

/** 官方角色的 id（与前端 frontend/src/config/characters.ts 一致） */
const CHARACTER_IDS = ['lijiaying', 'yuchengnuo'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** 接口约定第 3 条：characterId 必填，而且必须是上面其中一个；不是就回 API_ERROR */
export function assertCharacter(characterId: string): asserts characterId is CharacterId {
  if (!(CHARACTER_IDS as readonly string[]).includes(characterId)) {
    throw invalidInput('没有这个角色', 'characterId');
  }
}
