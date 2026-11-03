import { useLocaleStore } from '../stores/localeStore';
import type { Locale } from './locales';
import { en } from './messages/en';
import { zhCN, type Messages } from './messages/zh-CN';
import { zhTW } from './messages/zh-TW';

export const MESSAGES: Record<Locale, Messages> = { 'zh-CN': zhCN, 'zh-TW': zhTW, en };

/** 当前界面语言的文字：const t = useT(); t.chat.send */
export function useT(): Messages {
  return MESSAGES[useLocaleStore((state) => state.locale)];
}
