import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { CharacterIcon, ChatIcon, GearIcon, KeyIcon, PersonaIcon } from '../common/icons';

/** 侧边列表可以显示的面板 */
export type PanelId = 'conversations' | 'characters' | 'persona' | 'api' | 'settings';

interface NavItem {
  id: PanelId;
  label: string;
  /** 鼠标悬停时的完整说明 */
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const MAIN_ITEMS: readonly NavItem[] = [
  { id: 'conversations', label: '对话', title: '对话记录', Icon: ChatIcon },
  { id: 'characters', label: '角色', title: '切换角色', Icon: CharacterIcon },
  { id: 'persona', label: '人设', title: '人设 Prompt', Icon: PersonaIcon },
  { id: 'api', label: 'API', title: '模型与 API', Icon: KeyIcon },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', label: '设置', title: '设置', Icon: GearIcon };

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
  return (
    <button
      type="button"
      title={item.title}
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
      <span className="text-[0.7rem] leading-none">{item.label}</span>
    </button>
  );
}

/** 最左侧的菜单栏：AnimaVox 引擎的所有功能入口 */
export function NavRail({ active, onSelect }: NavRailProps) {
  return (
    <nav
      aria-label="主菜单"
      className="flex w-[4.6rem] shrink-0 flex-col items-center gap-2 bg-night py-5"
    >
      <div title="AnimaVox 心音" className="mb-4 flex h-9 items-center gap-[3px]">
        {[0.45, 0.85, 1, 0.6].map((height, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="w-[5px] rounded-full bg-gradient-to-b from-glow via-signal to-dusk"
            style={{ height: `${height * 100}%` }}
          />
        ))}
        <span className="sr-only">AnimaVox 心音</span>
      </div>

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
