import { create } from 'zustand';
import { getSetting, setSetting, SETTING_KEYS } from '../db/repositories/settingsRepository';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';

interface LocaleState {
  locale: Locale;
  /** 打开页面时：读出上次选的语言 */
  restore: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}

/** 界面语言：记在浏览器里，下次打开仍是同一种语言 */
export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: DEFAULT_LOCALE,

  restore: async () => {
    try {
      const saved = await getSetting(SETTING_KEYS.locale);
      if (isLocale(saved)) {
        set({ locale: saved });
      }
    } catch {
      // 读不到就用默认语言
    }
  },

  setLocale: async (locale) => {
    set({ locale });
    await setSetting(SETTING_KEYS.locale, locale);
  },
}));
