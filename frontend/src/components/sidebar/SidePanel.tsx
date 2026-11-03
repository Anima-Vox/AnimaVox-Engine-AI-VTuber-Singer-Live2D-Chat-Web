import type { ReactNode } from 'react';

interface SidePanelProps {
  title: string;
  /** 标题右侧的操作按钮 */
  action?: ReactNode;
  children: ReactNode;
}

/** 侧边列表的统一外框：标题 + 可滚动的内容 */
export function SidePanel({ title, action, children }: SidePanelProps) {
  return (
    <section aria-label={title} className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-3 px-5">
        <h2 className="truncate text-[1.05rem] font-medium text-ink">{title}</h2>
        {action}
      </header>
      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">{children}</div>
    </section>
  );
}
