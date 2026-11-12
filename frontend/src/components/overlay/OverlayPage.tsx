import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { useT } from '../../i18n';
import { CloseIcon } from '../common/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** b 在文档里是否排在 a 后面 */
function isAfter(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/**
 * Tab 只在二级页面与工具栏之间循环：走到最后一个（或最前一个）时绕回另一头。
 * 中间的移动交给浏览器（主页已设为 inert，不会走进去）。
 */
function loopTab(event: KeyboardEvent, roots: readonly (HTMLElement | null | undefined)[]) {
  const areas = roots.filter((root): root is HTMLElement => Boolean(root));
  const items = areas
    .flatMap((area) => Array.from(area.querySelectorAll<HTMLElement>(FOCUSABLE)))
    .sort((a, b) => (isAfter(a, b) ? -1 : 1));
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    return;
  }

  const active = document.activeElement;
  const isInside = active !== null && areas.some((area) => area.contains(active));
  if (event.shiftKey) {
    if (!isInside || !items.some((item) => isAfter(item, active))) {
      event.preventDefault();
      last.focus();
    }
  } else if (!isInside || !items.some((item) => isAfter(active, item))) {
    event.preventDefault();
    first.focus();
  }
}

/** 让页面内容的标题成为对话框的名字（aria-labelledby） */
const OverlayTitleContext = createContext<string | null>(null);

interface OverlayPageProps {
  /** 当前显示的是哪一页；打开或换页时，焦点移到关闭按钮 */
  pageKey: string;
  onClose: () => void;
  /** 与二级页面一起参与 Tab 循环的区域（工具栏） */
  companionRef?: RefObject<HTMLElement>;
  children: ReactNode;
}

/**
 * 二级页面：浮在主页之上、水平垂直置中（宽 60vw、高 75vh，窄屏接近全宽），
 * 后面的主页做模糊柔焦并稍微淡化，点不到。
 *
 * - 右上角 ✕ 或按 Esc 关闭；点模糊背景不关闭。
 * - role="dialog"、aria-modal，名字取自页面标题（OverlayPanel 的 title）。
 * - 打开时焦点移到关闭按钮；Tab 只在二级页面与工具栏之间循环。
 *   关闭后焦点回到哪里由调用方决定（App 会放回打开它的工具栏按钮）。
 * 尺寸与位置见 styles/index.css 的 .overlay-page。
 */
export function OverlayPage({ pageKey, onClose, companionRef, children }: OverlayPageProps) {
  const t = useT().overlay;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    closeRef.current?.focus();
  }, [pageKey]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // 页面里的元件（例如下拉选单）已经处理过的按键不再处理；输入法选字时的 Esc 也不算
      if (event.defaultPrevented || event.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        loopTab(event, [companionRef?.current, dialogRef.current]);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [companionRef]);

  return (
    <OverlayTitleContext.Provider value={titleId}>
      {/* 模糊层：挡住主页的点击；按下时不抢走焦点 */}
      <div
        aria-hidden="true"
        data-overlay-backdrop=""
        onMouseDown={(event) => event.preventDefault()}
        className="overlay-fade fixed inset-0 z-30 bg-mist/40 backdrop-blur-[8px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="overlay-page overlay-fade fixed z-40 flex flex-col overflow-hidden rounded-[1.25rem] border border-night bg-white text-ink"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t.close}
          title={t.close}
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full text-[1.15rem] text-ink transition-colors hover:bg-mist"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </OverlayTitleContext.Provider>
  );
}

interface OverlayPanelProps {
  title: string;
  /** 标题右侧的操作按钮 */
  action?: ReactNode;
  children: ReactNode;
}

/** 二级页面里的内容版式：标题（+ 操作按钮）+ 可在页面内部滚动的内容 */
export function OverlayPanel({ title, action, children }: OverlayPanelProps) {
  const fallbackId = useId();
  const titleId = useContext(OverlayTitleContext) ?? fallbackId;
  return (
    <section aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col">
      {/* 右侧留出关闭按钮的位置 */}
      <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-3 pl-7 pr-[4.5rem]">
        <h2 id={titleId} className="truncate text-[1.05rem] font-medium text-ink">
          {title}
        </h2>
        {action}
      </header>
      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
    </section>
  );
}
