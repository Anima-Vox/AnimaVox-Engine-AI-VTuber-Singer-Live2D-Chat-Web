/** 界面语言。只影响界面文字，角色的对话内容不会被转换或翻译。 */
export type Locale = 'zh-CN' | 'zh-TW' | 'en';

export const DEFAULT_LOCALE: Locale = 'zh-CN';

/** 设置面板里的选项，各自用自己的语言显示 */
export const LOCALE_OPTIONS: readonly { id: Locale; label: string }[] = [
  { id: 'zh-CN', label: '简体中文' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'en', label: 'English' },
];

export function isLocale(value: unknown): value is Locale {
  return LOCALE_OPTIONS.some((option) => option.id === value);
}
