import { isLocked, type CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';
import { OverlayPanel } from '../overlay/OverlayPage';
import { ComingSoon, LockedNotice } from './LockedNotice';

/** 人设 Prompt：官方角色只读；自定义角色之后在这里编写 */
export function PersonaPanel({ character }: { character: CharacterProfile }) {
  const t = useT().persona;
  return (
    <OverlayPanel title={t.title}>
      <div className="flex flex-col gap-4 px-2">
        {isLocked(character) ? (
          <LockedNotice>{t.locked(character)}</LockedNotice>
        ) : (
          <ComingSoon>{t.editorSoon}</ComingSoon>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-2 text-[0.9rem]">
          <dt className="text-haze">{t.name}</dt>
          <dd className="text-ink">{character.name}</dd>
          <dt className="text-haze">{t.englishName}</dt>
          <dd className="text-ink">{character.englishName}</dd>
          <dt className="text-haze">{t.tagline}</dt>
          <dd className="text-ink">{character.tagline}</dd>
        </dl>
        {isLocked(character) && <ComingSoon>{t.customNote}</ComingSoon>}
      </div>
    </OverlayPanel>
  );
}
