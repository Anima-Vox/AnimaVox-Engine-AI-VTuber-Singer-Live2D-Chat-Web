import { APP_CONFIG } from '../../config/app';
import { isLocked, type CharacterProfile } from '../../config/characters';
import { ComingSoon, LockedNotice } from './LockedNotice';
import { SidePanel } from './SidePanel';

const CHANNEL_LABEL = {
  mock: '演示（浏览器内假后端）',
  http: '自家后端',
} as const;

/** 模型与 API：官方角色固定用官方模型；自定义角色之后可以接入自己的 API */
export function ApiPanel({ character }: { character: CharacterProfile }) {
  return (
    <SidePanel title="模型与 API">
      <div className="flex flex-col gap-4 px-2">
        {isLocked(character) ? (
          <LockedNotice>
            {character.name}固定使用官方模型与 API，不需要也不能填写自己的 Key。
          </LockedNotice>
        ) : (
          <ComingSoon>自定义 API 设置即将开放。</ComingSoon>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-2 text-[0.9rem]">
          <dt className="text-haze">对话通道</dt>
          <dd className="text-ink">{CHANNEL_LABEL[APP_CONFIG.transportMode]}</dd>
          {APP_CONFIG.transportMode === 'http' && (
            <>
              <dt className="text-haze">后端地址</dt>
              <dd className="break-all text-ink">{APP_CONFIG.apiBaseUrl}</dd>
            </>
          )}
        </dl>
        {isLocked(character) && (
          <ComingSoon>
            使用者自己创建的角色可以接入自己的模型与 API（开源引擎功能，即将开放）。
          </ComingSoon>
        )}
      </div>
    </SidePanel>
  );
}
