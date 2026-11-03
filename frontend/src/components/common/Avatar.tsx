import clsx from 'clsx';
import type { CharacterProfile } from '../../config/characters';

interface AvatarProps {
  character: CharacterProfile;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-9 w-9 text-[1rem]',
  md: 'h-[2.6rem] w-[2.6rem] text-[1.15rem]',
  lg: 'h-[4.5rem] w-[4.5rem] text-[2rem]',
} as const;

/** 角色头像：立绘完成前先用单字占位 */
export function Avatar({ character, size = 'md' }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-full bg-night font-voice text-night-text',
        SIZES[size],
      )}
    >
      {character.monogram}
    </div>
  );
}
