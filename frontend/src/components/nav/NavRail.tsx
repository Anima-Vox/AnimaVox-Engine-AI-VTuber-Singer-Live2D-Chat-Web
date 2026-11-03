import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import logoUrl from '../../assets/brand/animavox-vertical-on-dark.svg';
import { useT } from '../../i18n';
import { CharacterIcon, ChatIcon, GearIcon, KeyIcon, PersonaIcon } from '../common/icons';

/** 侧边列表可以显示的面板 */
export type PanelId = 'conversations' | 'characters' | 'persona' | 'api' | 'settings';

/** 菜单项的文字（label，以及鼠标悬停时的完整说明 title）在 i18n 的 nav 里 */
interface NavItem {
  id: PanelId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const MAIN_ITEMS: readonly NavItem[] = [
  { id: 'conversations', Icon: ChatIcon },
  { id: 'characters', Icon: CharacterIcon },
  { id: 'persona', Icon: PersonaIcon },
  { id: 'api', Icon: KeyIcon },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', Icon: GearIcon };

interface NavRailProps {
  active: PanelId;
  onSelect: (panel: PanelId) => void;
}

function NavButton({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (panel: PanelId) => void;
}) {
  const { Icon } = item;
  const text = useT().nav[item.id];
  return (
    <button
      type="button"
      title={text.title}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(item.id)}
      className={clsx(
        'relative flex w-[3.5rem] flex-col items-center gap-1 rounded-xl py-2.5 transition-colors',
        isActive
          ? 'bg-night-raised text-white'
          : 'text-night-muted hover:bg-night-raised/60 hover:text-night-text',
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute -left-[0.6rem] top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-glow"
        />
      )}
      <Icon className="text-[1.3rem]" />
      <span className="text-[0.7rem] leading-none">{text.label}</span>
    </button>
  );
}

/** 最左侧的菜单栏：AnimaVox 引擎的所有功能入口 */
export function NavRail({ active, onSelect }: NavRailProps) {
  const t = useT();
  return (
    <nav
      aria-label={t.nav.menu}
      className="flex w-[4.6rem] shrink-0 flex-col items-center gap-2 bg-night py-5"
    >
      <img
        src={logoUrl}
        alt="AnimaVox 心音"
        title="AnimaVox 心音"
        draggable={false}
        className="mb-4 w-[3.8rem] select-none"
      />

      {MAIN_ITEMS.map((item) => (
        <NavButton key={item.id} item={item} isActive={active === item.id} onSelect={onSelect} />
      ))}

      <div className="mt-auto">
        <NavButton
          item={SETTINGS_ITEM}
          isActive={active === SETTINGS_ITEM.id}
          onSelect={onSelect}
        />
      </div>
    </nav>
  );
}
