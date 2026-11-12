import type { ReactNode } from 'react';

export interface Live2DSlotProps {
  /**
   * 之后的 Live2D 渲染器放这里（例如 <Live2DCanvas url={modelUrl} />）。
   * 渲染器请填满这个位置（absolute inset-0）并保持背景透明。
   * 这一版不传，位置是完全透明的。
   */
  children?: ReactNode;
}

/**
 * Live2D 预留位置：这一版只占位，不渲染任何模型，也没有边框、背景、阴影、圆角或占位文字。
 *
 * - 位置：对话栏中间、水平置中，底部贴齐输入框上缘。
 *   放在消息列表后面一层（z-index 低于消息），pointer-events: none，不挡住点击与滚动。
 * - 尺寸：宽高比 1080 : 1170（手机 2340 × 1080 竖屏在高度上切一半，只放半身）；
 *   高度约为消息区的 70%，宽度按比例计算，且不超过对话栏宽度。
 *   计算方式见 styles/index.css 的 .live2d-layer / .live2d-slot。
 *
 * 之后接 Live2D：参考 feature/v2-codex-fixes 分支第二版的实作——
 *   frontend/src/components/live2d/Live2DCanvas.tsx、Live2DStage.tsx、
 *   frontend/src/services/live2d/*、frontend/src/utils/live2dExpression.ts，
 * 把渲染器当成 children 放进来：
 *   <Live2DSlot><Live2DCanvas url={modelUrl} /></Live2DSlot>
 * 表情由角色回复里的 emotion / expression 驱动（每条 assistant 消息都已存了这两个字段）。
 * 模型地址之后可以加在 config/characters.ts 的角色定义里，按角色传入。
 */
export function Live2DSlot({ children }: Live2DSlotProps) {
  return (
    <div
      aria-hidden="true"
      className="live2d-layer pointer-events-none absolute inset-0 z-0 flex items-end justify-center"
    >
      <div data-live2d-slot="" className="live2d-slot relative">
        {children}
      </div>
    </div>
  );
}
