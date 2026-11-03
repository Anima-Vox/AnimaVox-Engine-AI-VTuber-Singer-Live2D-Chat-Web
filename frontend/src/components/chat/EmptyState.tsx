import type { CharacterProfile } from '../../config/characters';
import { Avatar } from '../common/Avatar';

interface EmptyStateProps {
  character: CharacterProfile;
  onPick: (text: string) => void;
  disabled: boolean;
}

/** 新对话还没有消息时：角色先打招呼，并给几个可以直接点的话题 */
export function EmptyState({ character, onPick, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-[8vh] pt-12 text-center">
      <Avatar character={character} size="lg" />
      <p className="mt-7 font-voice text-[2.1rem] leading-snug text-ink">{character.greeting}</p>
      <ul className="mt-9 flex flex-wrap justify-center gap-3" aria-label="可以这样开始">
        {character.suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(suggestion)}
              className="rounded-full border border-mist-deep bg-white px-5 py-2.5 text-[0.95rem] text-ink transition-colors hover:border-signal/40 hover:bg-signal-soft disabled:opacity-50"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
