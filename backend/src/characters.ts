import { readFileSync } from 'node:fs';
import path from 'node:path';

/** 官方角色（锁定，使用者不能修改）。人设全文不放进公开仓库。 */
export const OFFICIAL_CHARACTER_IDS = ['lijiaying', 'yuchengnuo'] as const;
export type OfficialCharacterId = (typeof OFFICIAL_CHARACTER_IDS)[number];

const DISPLAY_NAMES: Record<OfficialCharacterId, string> = {
  lijiaying: '李佳尹',
  yuchengnuo: '羽澄糯',
};

export function isOfficialCharacter(id: string): id is OfficialCharacterId {
  return (OFFICIAL_CHARACTER_IDS as readonly string[]).includes(id);
}

/**
 * 读角色的人设提示词：PERSONA_DIR/<角色 id>.md。
 * 没设定 PERSONA_DIR 或文件不存在时，使用只写了名字的占位人设（Mock 模式用不到人设）。
 */
export function loadPersona(id: OfficialCharacterId, personaDir: string | undefined): string {
  if (personaDir) {
    try {
      return readFileSync(path.join(personaDir, `${id}.md`), 'utf8');
    } catch {
      // 找不到就用占位人设
    }
  }
  return `你是${DISPLAY_NAMES[id]}。（占位人设：正式人设文件请放在 PERSONA_DIR/${id}.md）`;
}
