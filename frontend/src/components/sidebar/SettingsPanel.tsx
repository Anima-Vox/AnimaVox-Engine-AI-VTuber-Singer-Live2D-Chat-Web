import clsx from 'clsx';
import { useT } from '../../i18n';
import { LOCALE_OPTIONS } from '../../i18n/locales';
import { useLocaleStore } from '../../stores/localeStore';
import { SidePanel } from './SidePanel';

/** 设置：界面语言 + 说明 */
export function SettingsPanel() {
  const t = useT().settings;
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <SidePanel title={t.title}>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3 px-4 pt-1 text-[0.9rem]">
        <dt className="text-haze">{t.language}</dt>
        <dd className="flex flex-wrap gap-1.5">
          {LOCALE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              lang={option.id}
              aria-pressed={option.id === locale}
              onClick={() => void setLocale(option.id)}
              className={clsx(
                'rounded-full px-3 py-1 text-[0.85rem] transition-colors',
                option.id === locale
                  ? 'bg-signal text-white'
                  : 'bg-mist text-ink hover:bg-signal-soft',
              )}
            >
              {option.label}
            </button>
          ))}
        </dd>
        <dt className="text-haze">{t.history}</dt>
        <dd className="text-ink">{t.historyValue}</dd>
        <dt className="text-haze">{t.engine}</dt>
        <dd className="text-ink">{t.engineValue}</dd>
        <dt className="text-haze">{t.version}</dt>
        <dd className="text-ink">{t.versionValue}</dd>
      </dl>
    </SidePanel>
  );
}
