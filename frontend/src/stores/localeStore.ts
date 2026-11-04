import { create } from 'zustand';
import { db, type ChatDatabase } from '../db';
import { getSetting, setSetting, SETTING_KEYS } from '../db/repositories/settingsRepository';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';

export interface LocaleState {
  locale: Locale;
  restore: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}

/** 界面语言：记在本地，下次打开仍是同一种语言 */
export function createLocaleStore(database: ChatDatabase) {
  return create<LocaleState>()((set) => ({
    locale: DEFAULT_LOCALE,

    restore: async () => {
      try {
        const saved = await getSetting(SETTING_KEYS.locale, database);
        if (isLocale(saved)) {
          set({ locale: saved });
        }
      } catch {
        // 读不到就用默认语言
      }
    },

    setLocale: async (locale) => {
      set({ locale });
      await setSetting(SETTING_KEYS.locale, locale, database);
    },
  }));
}

export const useLocaleStore = createLocaleStore(db);
