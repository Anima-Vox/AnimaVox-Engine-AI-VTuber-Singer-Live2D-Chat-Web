import { useT } from '../../i18n';
import { isLocale, LOCALE_OPTIONS } from '../../i18n/locales';
import { useLocaleStore } from '../../stores/localeStore';
import { ChevronDownIcon } from '../common/icons';
import { SidePanel } from './SidePanel';

/** 设置：界面语言 + 说明 */
export function SettingsPanel() {
  const t = useT().settings;
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <SidePanel title={t.title}>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3 px-4 pt-1 text-[0.9rem]">
        <dt className="text-haze">
          <label htmlFor="ui-language">{t.language}</label>
        </dt>
        <dd className="relative w-fit">
          <select
            id="ui-language"
            value={locale}
            onChange={(event) => {
              if (isLocale(event.target.value)) {
                void setLocale(event.target.value);
              }
            }}
            className="cursor-pointer appearance-none rounded-xl border border-mist-deep bg-white py-1.5 pl-3.5 pr-9 text-ink transition-colors hover:border-signal/40 focus:border-signal/50 focus:outline-none focus:ring-4 focus:ring-signal/10"
          >
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} lang={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-haze" />
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
