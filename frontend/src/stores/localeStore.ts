import { create } from 'zustand';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';

/** 记在这个浏览器（localStorage）的名字 */
const STORAGE_KEY = 'animavox.locale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function savedLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
}

/** 界面语言：记在浏览器里，下次打开仍是同一种语言 */
export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: savedLocale(),

  setLocale: (locale) => {
    localStorage.setItem(STORAGE_KEY, locale);
    set({ locale });
  },
}));
