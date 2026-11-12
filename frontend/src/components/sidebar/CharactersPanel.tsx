import clsx from 'clsx';
import { isLocked, type CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';
import { Avatar } from '../common/Avatar';
import { LockIcon, PlusIcon } from '../common/icons';
import { OverlayPanel } from '../overlay/OverlayPage';

interface CharactersPanelProps {
  characters: readonly CharacterProfile[];
  activeId: string;
  onSelect: (characterId: string) => void;
}

/** 切换角色：官方角色在前，之后是使用者自己创建的角色 */
export function CharactersPanel({ characters, activeId, onSelect }: CharactersPanelProps) {
  const t = useT().characters;
  return (
    <OverlayPanel title={t.title}>
      <ul className="flex flex-col gap-2">
        {characters.map((character) => {
          const isActive = character.id === activeId;
          return (
            <li key={character.id}>
              <button
                type="button"
                onClick={() => onSelect(character.id)}
                aria-current={isActive ? 'true' : undefined}
                className={clsx(
                  'flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors',
                  isActive ? 'bg-signal-soft' : 'hover:bg-mist',
                )}
              >
                <Avatar character={character} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-voice text-[1.1rem] text-ink">{character.name}</span>
                    {isLocked(character) && (
                      <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.7rem] text-signal-deep">
                        <LockIcon className="text-[0.75rem]" />
                        {t.official}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.82rem] text-haze">
                    {character.tagline}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled
        className="mt-4 flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left text-haze disabled:cursor-not-allowed"
      >
        <span className="grid h-[2.6rem] w-[2.6rem] shrink-0 place-items-center rounded-full bg-mist text-[1.1rem]">
          <PlusIcon />
        </span>
        <span>
          <span className="block text-[0.95rem]">{t.create}</span>
          <span className="block text-[0.8rem]">{t.comingSoon}</span>
        </span>
      </button>
    </OverlayPanel>
  );
}
