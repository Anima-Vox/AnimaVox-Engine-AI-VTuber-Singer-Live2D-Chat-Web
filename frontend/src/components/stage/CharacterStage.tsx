import clsx from 'clsx';
import type { CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';
import { CharacterVisual } from './CharacterVisual';

interface CharacterStageProps {
  character: CharacterProfile;
  isThinking: boolean;
}

/**
 * 右侧展示区：拱形展示框（之后放 Live2D 或立绘）+ 名字与状态。
 * 展示框的形状与渐变见 styles/index.css 的 .stage-frame。
 */
export function CharacterStage({ character, isThinking }: CharacterStageProps) {
  const t = useT().stage;
  return (
    <aside
      aria-label={t.label(character)}
      className="flex min-h-0 w-full flex-col items-center px-[2.2rem] pb-[2.4rem] pt-[2.6rem]"
    >
      <div className="stage-slot min-h-0 w-full flex-1">
        <div className="stage-frame">
          <div className="stage-frame-inner" aria-hidden="true" />
          <CharacterVisual visual={character.visual} />
        </div>
      </div>

      <div className="mt-6 flex w-full flex-col items-center gap-2">
        <p className="font-voice text-[2rem] leading-none text-ink">{character.name}</p>
        <p className="text-[0.85rem] uppercase tracking-[0.42em] text-haze">
          {character.englishName}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[0.85rem] text-haze" aria-live="polite">
          <span
            aria-hidden="true"
            className={clsx(
              'h-2 w-2 rounded-full',
              isThinking ? 'animate-pulse bg-signal' : 'bg-[#3FB27A]',
            )}
          />
          {isThinking ? t.typing : t.online}
        </p>
      </div>
    </aside>
  );
}
