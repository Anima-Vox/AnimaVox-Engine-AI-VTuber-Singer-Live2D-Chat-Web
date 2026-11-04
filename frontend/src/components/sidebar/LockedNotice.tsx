import type { ReactNode } from 'react';
import { LockIcon } from '../common/icons';

/** 官方角色被锁定时的说明卡片 */
export function LockedNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-mist px-4 py-3.5 text-[0.9rem] leading-relaxed text-haze">
      <LockIcon className="mt-0.5 shrink-0 text-[1.1rem] text-signal" />
      <p>{children}</p>
    </div>
  );
}

/** 开源引擎功能尚未开放时的说明 */
export function ComingSoon({ children }: { children: ReactNode }) {
  return <p className="px-1 text-[0.85rem] leading-relaxed text-haze">{children}</p>;
}
