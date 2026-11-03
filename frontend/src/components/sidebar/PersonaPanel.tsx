import { isLocked, type CharacterProfile } from '../../config/characters';
import { ComingSoon, LockedNotice } from './LockedNotice';
import { SidePanel } from './SidePanel';

/** 人设 Prompt：官方角色只读；自定义角色之后在这里编写 */
export function PersonaPanel({ character }: { character: CharacterProfile }) {
  return (
    <SidePanel title="人设 Prompt">
      <div className="flex flex-col gap-4 px-2">
        {isLocked(character) ? (
          <LockedNotice>
            {character.name}是官方角色，人设由官方维护，不能修改，也不会显示在前端。
          </LockedNotice>
        ) : (
          <ComingSoon>人设编辑器即将开放。</ComingSoon>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-2 text-[0.9rem]">
          <dt className="text-haze">名字</dt>
          <dd className="text-ink">{character.name}</dd>
          <dt className="text-haze">英文名</dt>
          <dd className="text-ink">{character.englishName}</dd>
          <dt className="text-haze">简介</dt>
          <dd className="text-ink">{character.tagline}</dd>
        </dl>
        {isLocked(character) && (
          <ComingSoon>
            使用者自己创建的角色可以在这里编写人设（开源引擎功能，即将开放）。
          </ComingSoon>
        )}
      </div>
    </SidePanel>
  );
}
