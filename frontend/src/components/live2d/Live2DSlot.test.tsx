import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Live2DSlot } from './Live2DSlot';

describe('Live2DSlot 预留位置', () => {
  it('这一版是空的透明位置：不显示任何文字，不挡点击，读屏软件也跳过', () => {
    const { container } = render(<Live2DSlot />);
    const layer = container.firstElementChild;
    const slot = container.querySelector('[data-live2d-slot]');

    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    expect(layer?.classList.contains('pointer-events-none')).toBe(true);
    expect(slot?.childNodes.length).toBe(0);
    expect(container.textContent).toBe('');
  });

  it('之后的 Live2D 渲染器以 children 放进位置里', () => {
    const { container } = render(
      <Live2DSlot>
        <canvas data-testid="live2d-canvas" />
      </Live2DSlot>,
    );
    expect(container.querySelector('[data-live2d-slot] canvas')).not.toBeNull();
  });
});
