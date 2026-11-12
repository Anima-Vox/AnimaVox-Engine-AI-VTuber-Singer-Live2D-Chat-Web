import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, type KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OverlayPage, OverlayPanel } from './OverlayPage';

/** 模拟 App：工具栏 + 主页 + 二级页面 */
function Harness({ pageKey = 'settings', onClose }: { pageKey?: string; onClose: () => void }) {
  const navRef = useRef<HTMLElement>(null);
  return (
    <>
      <nav ref={navRef}>
        <button type="button">工具一</button>
        <button type="button">工具二</button>
      </nav>
      <main>
        <button type="button">主页按钮</button>
      </main>
      <OverlayPage pageKey={pageKey} onClose={onClose} companionRef={navRef}>
        <OverlayPanel title="设置">
          <button
            type="button"
            // 像下拉选单那样自己处理 Esc
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Escape') {
                event.preventDefault();
              }
            }}
          >
            页面按钮
          </button>
        </OverlayPanel>
      </OverlayPage>
    </>
  );
}

describe('OverlayPage 二级页面', () => {
  it('是以页面标题命名的模态对话框，打开时焦点在关闭按钮', () => {
    render(<Harness onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '设置' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭' }));
  });

  it('点 ✕ 或按 Esc 关闭', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('button', { name: '关闭' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    // 工具栏里按 Esc 也能关
    fireEvent.keyDown(screen.getByRole('button', { name: '工具一' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('页面里的元件已经处理掉的 Esc 不会关闭页面', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('button', { name: '页面按钮' }), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('点模糊背景不关闭，也不会抢走焦点', () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);
    const backdrop = container.querySelector('[data-overlay-backdrop]');
    if (!backdrop) {
      throw new Error('找不到模糊层');
    }

    // fireEvent 返回 false 表示默认行为（移动焦点）被取消
    expect(fireEvent.mouseDown(backdrop)).toBe(false);
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('换页时焦点重新移到关闭按钮', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness onClose={onClose} />);

    screen.getByRole('button', { name: '页面按钮' }).focus();
    rerender(<Harness pageKey="api" onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭' }));
  });

  it('Tab 只在二级页面与工具栏之间循环', () => {
    render(<Harness onClose={vi.fn()} />);
    const firstTool = screen.getByRole('button', { name: '工具一' });
    const lastInPage = screen.getByRole('button', { name: '页面按钮' });

    // 页面最后一个 → 工具栏第一个
    lastInPage.focus();
    expect(fireEvent.keyDown(lastInPage, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(firstTool);

    // 工具栏第一个按 Shift + Tab → 页面最后一个
    expect(fireEvent.keyDown(firstTool, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(lastInPage);

    // 中间的移动交给浏览器（主页会被设成 inert）
    const secondTool = screen.getByRole('button', { name: '工具二' });
    secondTool.focus();
    expect(fireEvent.keyDown(secondTool, { key: 'Tab' })).toBe(true);
  });
});
