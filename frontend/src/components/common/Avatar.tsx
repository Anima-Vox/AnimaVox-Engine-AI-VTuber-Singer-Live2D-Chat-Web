import clsx from 'clsx';
import { CHARACTER } from '../../config/character';
import type { EmotionDisplay } from '../../utils/emotion';

interface AvatarProps {
  /** 传入时在右下角显示情绪 emoji */
  emotion?: EmotionDisplay;
  size?: 'md' | 'lg';
}

/** 佳尹的头像：立绘完成前先用单字占位 */
export function Avatar({ emotion, size = 'md' }: AvatarProps) {
  return (
    <div
      className={clsx(
        'relative grid shrink-0 place-items-center rounded-full bg-night font-voice text-night-text',
        size === 'md'
          ? 'h-[2.6rem] w-[2.6rem] text-[1.15rem]'
          : 'h-[4.5rem] w-[4.5rem] text-[2rem]',
      )}
    >
      <span aria-hidden="true">{CHARACTER.monogram}</span>
      {emotion && (
        <span
          role="img"
          aria-label={`心情：${emotion.label}`}
          title={emotion.label}
          className="absolute -bottom-1.5 -right-2 grid h-[1.3rem] w-[1.3rem] place-items-center rounded-full bg-white text-[0.78rem] leading-none ring-2 ring-mist"
        >
          {emotion.emoji}
        </span>
      )}
    </div>
  );
}
