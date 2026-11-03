import type { CSSProperties } from 'react';

const BAR_COUNT = 44;

/**
 * 每根柱子的基础高度：中间高、两边低，再叠两层正弦让轮廓不那么规整。
 * 用固定公式而不是随机数，每次打开页面形状都一样。
 */
const BARS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const x = index / (BAR_COUNT - 1);
  const envelope = Math.sin(Math.PI * x);
  const texture = 0.55 + 0.25 * Math.sin(index * 1.7) + 0.2 * Math.sin(index * 0.63 + 1);
  return {
    height: Math.max(0.08, envelope * texture),
    delay: -((index * 0.137) % 1) * 3.6,
  };
});

interface SignalMeterProps {
  state: 'idle' | 'thinking';
}

/**
 * 舞台中央的电平表（佳尹在音频工程社，这是她「在场」的样子）。
 * 平时缓慢起伏；等待回复时跳动加快。之后接语音时可以直接用音量驱动。
 */
export function SignalMeter({ state }: SignalMeterProps) {
  return (
    <div
      className="meter flex h-full w-full items-center justify-between gap-[0.35rem]"
      data-state={state}
      aria-hidden="true"
    >
      {BARS.map((bar, index) => (
        <span
          key={index}
          className="meter-bar w-full max-w-[0.55rem] rounded-full bg-gradient-to-b from-glow via-signal to-dusk"
          style={{ '--h': bar.height, '--d': `${bar.delay}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
