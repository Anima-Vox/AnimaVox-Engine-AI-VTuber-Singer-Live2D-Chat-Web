import { isLocked, type CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';
import { OverlayPanel } from '../overlay/OverlayPage';
import { ComingSoon, LockedNotice } from './LockedNotice';

/** 模型与 API：官方角色固定用官方模型；自定义角色之后可以接入自己的 API */
export function ApiPanel({ character }: { character: CharacterProfile }) {
  const t = useT().api;
  return (
    <OverlayPanel title={t.title}>
      <div className="flex flex-col gap-4 px-2">
        {isLocked(character) ? (
          <LockedNotice>{t.locked(character)}</LockedNotice>
        ) : (
          <ComingSoon>{t.customSoon}</ComingSoon>
        )}
        {isLocked(character) && <ComingSoon>{t.customNote}</ComingSoon>}
      </div>
    </OverlayPanel>
  );
}
