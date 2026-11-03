import { db, type ChatDatabase } from '../index';

export const SETTING_KEYS = {
  /** 上次使用的角色 */
  activeCharacterId: 'activeCharacterId',
  /** 界面语言 */
  locale: 'locale',
} as const;

export async function getSetting(key: string, database: ChatDatabase = db): Promise<string | null> {
  const record = await database.settings.get(key);
  return record?.value ?? null;
}

export async function setSetting(
  key: string,
  value: string,
  database: ChatDatabase = db,
): Promise<void> {
  await database.settings.put({ key, value });
}
