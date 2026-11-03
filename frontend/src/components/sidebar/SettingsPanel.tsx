import { SidePanel } from './SidePanel';

/** 设置：目前只有说明，偏好选项之后加在这里 */
export function SettingsPanel() {
  return (
    <SidePanel title="设置">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 px-4 pt-1 text-[0.9rem]">
        <dt className="text-haze">聊天记录</dt>
        <dd className="text-ink">只保存在这个浏览器里</dd>
        <dt className="text-haze">引擎</dt>
        <dd className="text-ink">AnimaVox 心音</dd>
        <dt className="text-haze">版本</dt>
        <dd className="text-ink">文字对话版 0.2</dd>
      </dl>
    </SidePanel>
  );
}
