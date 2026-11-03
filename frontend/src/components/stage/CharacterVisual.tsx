import type { CharacterVisual as Visual } from '../../config/characters';

/**
 * 展示框里的内容，按形象类型切换。
 * Phase 2 接 Live2D 时，只需要在 'live2d' 分支挂上渲染器组件。
 */
export function CharacterVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'image':
      return (
        <img
          src={visual.src}
          alt={visual.alt}
          className="absolute inset-0 h-full w-full object-contain object-bottom"
        />
      );
    case 'live2d':
      // Phase 2：在这里挂载 Live2D 渲染器（visual.modelUrl）
      return <StageCaption caption="Live2D 准备中" note="Phase 2" />;
    case 'placeholder':
      return <StageCaption caption={visual.caption} note={visual.note} />;
  }
}

function StageCaption({ caption, note }: { caption: string; note: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="text-center text-[0.95rem] leading-relaxed tracking-[0.2em] text-ink/70">
        {caption}
        <span className="block text-[0.8rem] tracking-[0.25em] text-ink/55">{note}</span>
      </p>
    </div>
  );
}
