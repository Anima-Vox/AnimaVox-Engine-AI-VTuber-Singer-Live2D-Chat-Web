import clsx from 'clsx';
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type PointerEvent,
  type SVGProps,
} from 'react';
import logoUrl from '../../assets/brand/animavox-vertical-on-dark.svg';
import { useT } from '../../i18n';
import { CharacterIcon, ChatIcon, GearIcon, KeyIcon, PersonaIcon } from '../common/icons';

/** 工具栏可以打开的二级页面 */
export type PanelId = 'conversations' | 'characters' | 'persona' | 'api' | 'settings';

/** 鼠标离开工具栏后等这么久才收起；期间鼠标回来就取消收起 */
export const NAV_COLLAPSE_DELAY_MS = 300;

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
  /** 当前打开的二级页面；没有打开时为 null。打开期间工具栏一直保持展开 */
  active: PanelId | null;
  onSelect: (panel: PanelId) => void;
}

/**
 * 焦点是不是「看得见的」（键盘 Tab、或键盘操作后程序移过来的焦点）。
 * 用鼠标点按钮得到的焦点不算，这样鼠标移开后工具栏照样会收起。
 */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    // 不支持 :focus-visible 的旧浏览器：一律当作键盘焦点，宁可多展开
    return true;
  }
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
      data-panel={item.id}
      aria-haspopup="dialog"
      aria-expanded={isActive}
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

/**
 * 最左侧的工具栏：AnimaVox 引擎的所有功能入口，浮在主页之上（fixed），不占版面宽度。
 *
 * - 平时收起，只在屏幕最左边露出一条窄条（--nav-peek）；感应范围再往右延伸到 --nav-hotzone，这部分透明。
 * - 鼠标进入窄条或感应范围就滑出；离开后延迟 NAV_COLLAPSE_DELAY_MS 再收起，期间回来就取消。
 * - 键盘 Tab 到工具栏里的按钮时展开；触控点窄条展开，点工具栏以外的地方收起。
 * - 二级页面开着（active 不为 null）时一直展开；关掉后若鼠标不在上面，才按同样的延迟收起。
 * - 动画只动 transform 与 opacity，样式见 styles/index.css 的 .nav-rail。
 */
export const NavRail = forwardRef<HTMLElement, NavRailProps>(function NavRail(
  { active, onSelect },
  ref,
) {
  const t = useT();
  const dockRef = useRef<HTMLDivElement>(null);
  const [isHovered, setHovered] = useState(false);
  const [hasKeyboardFocus, setKeyboardFocus] = useState(false);
  const [isTapped, setTapped] = useState(false);
  // 想收起时先「停留」一下：isLingering 在延迟结束前保持为 true
  const [isLingering, setLingering] = useState(false);

  const wantsOpen = active !== null || isHovered || hasKeyboardFocus || isTapped;
  const isExpanded = wantsOpen || isLingering;

  useEffect(() => {
    if (wantsOpen) {
      setLingering(true);
      return;
    }
    const timer = window.setTimeout(() => setLingering(false), NAV_COLLAPSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [wantsOpen]);

  // 触控展开后，点工具栏以外的地方就收起
  useEffect(() => {
    if (!isTapped) {
      return;
    }
    function handleOutsidePointerDown(event: globalThis.PointerEvent) {
      if (!dockRef.current?.contains(event.target as Node | null)) {
        setTapped(false);
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  }, [isTapped]);

  // 触控的 enter / leave 只在手指按下、抬起时出现，不当作悬停
  function handlePointerEnter(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      setHovered(true);
    }
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      setHovered(false);
    }
  }

  // 触控（或不能悬停的笔）点窄条、感应范围或工具栏本身：展开并保持，直到点了别处
  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse') {
      setTapped(true);
    }
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (isFocusVisible(event.target)) {
      setKeyboardFocus(true);
    }
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setKeyboardFocus(false);
    }
  }

  return (
    <div
      ref={dockRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      {/* 感应范围：从屏幕左缘往右延伸，透明，只负责接住鼠标与触控（露出的窄条是工具栏本身的右缘） */}
      <div
        aria-hidden="true"
        data-nav-hotzone=""
        className="fixed inset-y-0 left-0 z-50 w-[var(--nav-hotzone)]"
      />
      <nav
        ref={ref}
        aria-label={t.nav.menu}
        data-expanded={isExpanded}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="nav-rail fixed inset-y-0 left-0 z-50 w-[var(--nav-width)] bg-night"
      >
        <div className="nav-rail-content flex h-full flex-col items-center gap-2 py-5">
          <img
            src={logoUrl}
            alt="AnimaVox 心音"
            title="AnimaVox 心音"
            draggable={false}
            className="mb-4 w-[3.8rem] select-none"
          />

          {MAIN_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={active === item.id}
              onSelect={onSelect}
            />
          ))}

          <div className="mt-auto">
            <NavButton
              item={SETTINGS_ITEM}
              isActive={active === SETTINGS_ITEM.id}
              onSelect={onSelect}
            />
          </div>
        </div>
      </nav>
    </div>
  );
});
