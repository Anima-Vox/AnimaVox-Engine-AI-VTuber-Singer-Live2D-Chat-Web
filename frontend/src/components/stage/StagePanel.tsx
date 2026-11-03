import type { KnownEmotion } from '@shared';
import clsx from 'clsx';
import { CHARACTER } from '../../config/character';
import { getEmotionDisplay } from '../../utils/emotion';
import { SignalMeter } from './SignalMeter';

interface StagePanelProps {
  emotion: KnownEmotion;
  isThinking: boolean;
}

/**
 * 左侧舞台：Phase 2 的 Live2D 会挂在这里。
 * 文字版先放电平表、名字和当前心情。
 */
export function StagePanel({ emotion, isThinking }: StagePanelProps) {
  const display = getEmotionDisplay(emotion);

  return (
    <aside
      aria-label="角色舞台"
      className="relative m-4 mr-0 hidden min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-night px-[3.2rem] pb-[3rem] pt-[2.4rem] text-night-text min-[1100px]:flex"
    >
      <p className="flex items-center gap-2.5 text-[0.95rem] text-night-muted">
        <span
          aria-hidden="true"
          className={clsx(
            'h-2 w-2 rounded-full',
            isThinking ? 'animate-pulse bg-glow' : 'bg-[#5BD08F]',
          )}
        />
        {isThinking ? '正在输入…' : '在线'}
      </p>

      <div className="flex flex-1 items-center py-10">
        <div className="h-[34%] w-full">
          <SignalMeter state={isThinking ? 'thinking' : 'idle'} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-voice text-[4.6rem] leading-none tracking-[0.04em]">
            {CHARACTER.name}
          </p>
          <p className="mt-4 text-[1.2rem] tracking-[0.12em] text-night-muted">
            {CHARACTER.englishName}
          </p>
        </div>
        <span
          key={display.emotion}
          role="img"
          aria-label={`现在的心情：${display.label}`}
          title={display.label}
          className="grid h-[4.2rem] w-[4.2rem] animate-pop place-items-center rounded-full bg-night-raised text-[2.2rem] ring-1 ring-night-line"
        >
          {display.emoji}
        </span>
      </div>
    </aside>
  );
}
