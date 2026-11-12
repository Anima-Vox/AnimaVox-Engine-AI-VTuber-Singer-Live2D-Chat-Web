import type { CharacterProfile } from '../../config/characters';

/** 角色头像：立绘完成前先用单字占位 */
export function Avatar({ character }: { character: CharacterProfile }) {
  return (
    <div
      aria-hidden="true"
      className="grid h-[2.6rem] w-[2.6rem] shrink-0 place-items-center rounded-full bg-night font-voice text-[1.15rem] text-night-text"
    >
      {character.monogram}
    </div>
  );
}
