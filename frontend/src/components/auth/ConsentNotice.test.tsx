import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentNotice } from './ConsentNotice';

// jsdom 没有版面：让说明框假装有 1000px 高的内容、只显示 200px
const originals = {
  scrollHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight'),
  clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.consentScroll !== undefined ? 1000 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.consentScroll !== undefined ? 200 : 0;
    },
  });
});

afterEach(() => {
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
  }
});

describe('注册说明', () => {
  it('没滑到底之前不能选择；滑到底后两个选项都能选', () => {
    const onChoose = vi.fn();
    const { container } = render(
      <ConsentNotice busy={false} onBack={() => {}} onChoose={onChoose} />,
    );
    const agree = screen.getByRole<HTMLButtonElement>('button', { name: '同意用于训练' });
    const disagree = screen.getByRole<HTMLButtonElement>('button', { name: '不同意' });

    expect(agree.disabled).toBe(true);
    expect(disagree.disabled).toBe(true);
    expect(screen.queryByText('请滑到最下面看完说明')).not.toBeNull();

    const box = container.querySelector<HTMLElement>('[data-consent-scroll]');
    if (!box) {
      throw new Error('找不到说明框');
    }
    box.scrollTop = 400;
    fireEvent.scroll(box);
    expect(agree.disabled).toBe(true);

    box.scrollTop = 800;
    fireEvent.scroll(box);
    expect(agree.disabled).toBe(false);
    fireEvent.click(disagree);
    expect(onChoose).toHaveBeenCalledWith(false);
  });

  it('说明里写清楚：不同意也能用、可以撤回、已训练的部分无法退回', () => {
    render(<ConsentNotice busy={false} onBack={() => {}} onChoose={() => {}} />);
    expect(screen.queryByText(/不同意也可以正常使用全部功能/)).not.toBeNull();
    expect(screen.queryByText(/已经训练进模型的部分无法退回/)).not.toBeNull();
  });
});
