import { APP_CONFIG } from '../../config/app';
import { useT } from '../../i18n';
import { LOCALE_OPTIONS } from '../../i18n/locales';
import { useLocaleStore } from '../../stores/localeStore';
import { Select } from '../common/Select';
import { OverlayPanel } from '../overlay/OverlayPage';
import { AccountSection } from './AccountSection';

/** 设置：界面语言 + 说明；接后端时多一个帐号区块 */
export function SettingsPanel() {
  const t = useT().settings;
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <OverlayPanel title={t.title}>
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
        <dd className="text-ink">
          {APP_CONFIG.transportMode === 'http' ? t.historyServer : t.historyValue}
        </dd>
        <dt className="text-haze">{t.engine}</dt>
        <dd className="text-ink">{t.engineValue}</dd>
        <dt className="text-haze">{t.version}</dt>
        <dd className="text-ink">{t.versionValue}</dd>
      </dl>
      {APP_CONFIG.transportMode === 'http' && <AccountSection />}
    </OverlayPanel>
  );
}
