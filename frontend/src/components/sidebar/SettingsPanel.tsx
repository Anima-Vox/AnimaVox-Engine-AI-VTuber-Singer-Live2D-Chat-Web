import { useT } from '../../i18n';
import { LOCALE_OPTIONS } from '../../i18n/locales';
import { useLocaleStore } from '../../stores/localeStore';
import { Select } from '../common/Select';
import { SidePanel } from './SidePanel';

/** 设置：界面语言 + 说明 */
export function SettingsPanel() {
  const t = useT().settings;
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <SidePanel title={t.title}>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3 px-4 pt-1 text-[0.9rem]">
        <dt id="ui-language-label" className="text-haze">
          {t.language}
        </dt>
        <dd>
          <Select
            labelledBy="ui-language-label"
            value={locale}
            options={LOCALE_OPTIONS}
            onChange={(next) => void setLocale(next)}
          />
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
