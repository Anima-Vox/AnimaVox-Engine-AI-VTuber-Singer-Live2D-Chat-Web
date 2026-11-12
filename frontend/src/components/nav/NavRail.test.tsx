import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_COLLAPSE_DELAY_MS, NavRail, type PanelId } from './NavRail';

function renderNav(active: PanelId | null = null) {
  const onSelect = vi.fn();
  const utils = render(<NavRail active={active} onSelect={onSelect} />);
  const nav = screen.getByRole('navigation', { name: '主菜单' });
  const hotzone = utils.container.querySelector<HTMLElement>('[data-nav-hotzone]');
  if (!hotzone) {
    throw new Error('找不到工具栏的感应范围');
  }
  return { ...utils, nav, hotzone, onSelect };
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('NavRail 工具栏', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('平时收起', () => {
    const { nav } = renderNav();
    expect(nav.dataset.expanded).toBe('false');
  });

  it('鼠标进入感应范围就展开，离开后延迟 300ms 才收起', () => {
    const { nav, hotzone } = renderNav();

    fireEvent.pointerEnter(hotzone, { pointerType: 'mouse' });
    expect(nav.dataset.expanded).toBe('true');

    fireEvent.pointerLeave(hotzone, { pointerType: 'mouse' });
    wait(NAV_COLLAPSE_DELAY_MS - 1);
    expect(nav.dataset.expanded).toBe('true');
    wait(1);
    expect(nav.dataset.expanded).toBe('false');
  });

  it('收起前鼠标回来就取消收起', () => {
    const { nav, hotzone } = renderNav();

    fireEvent.pointerEnter(hotzone, { pointerType: 'mouse' });
    fireEvent.pointerLeave(hotzone, { pointerType: 'mouse' });
    wait(NAV_COLLAPSE_DELAY_MS / 2);
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    wait(NAV_COLLAPSE_DELAY_MS * 3);
    expect(nav.dataset.expanded).toBe('true');
  });

  it('二级页面开着时一直展开；关掉后才按延迟收起', () => {
    const { nav, hotzone, rerender, onSelect } = renderNav('settings');
    expect(nav.dataset.expanded).toBe('true');

    fireEvent.pointerEnter(hotzone, { pointerType: 'mouse' });
    fireEvent.pointerLeave(hotzone, { pointerType: 'mouse' });
    wait(NAV_COLLAPSE_DELAY_MS * 3);
    expect(nav.dataset.expanded).toBe('true');

    rerender(<NavRail active={null} onSelect={onSelect} />);
    wait(NAV_COLLAPSE_DELAY_MS - 1);
    expect(nav.dataset.expanded).toBe('true');
    wait(1);
    expect(nav.dataset.expanded).toBe('false');
  });

  it('键盘焦点进入工具栏时展开，离开后收起', () => {
    const { nav } = renderNav();

    act(() => screen.getByRole('button', { name: '角色' }).focus());
    expect(nav.dataset.expanded).toBe('true');

    act(() => screen.getByRole('button', { name: '角色' }).blur());
    wait(NAV_COLLAPSE_DELAY_MS);
    expect(nav.dataset.expanded).toBe('false');
  });

  it('触控点窄条展开，点工具栏以外的地方收起；触控的 enter / leave 不算悬停', () => {
    const { nav, hotzone } = renderNav();

    fireEvent.pointerEnter(hotzone, { pointerType: 'touch' });
    expect(nav.dataset.expanded).toBe('false');

    fireEvent.pointerDown(hotzone, { pointerType: 'touch' });
    expect(nav.dataset.expanded).toBe('true');
    fireEvent.pointerLeave(hotzone, { pointerType: 'touch' });
    wait(NAV_COLLAPSE_DELAY_MS * 3);
    expect(nav.dataset.expanded).toBe('true');

    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    wait(NAV_COLLAPSE_DELAY_MS);
    expect(nav.dataset.expanded).toBe('false');
  });

  it('点菜单项会打开对应的二级页面，并标出当前打开的是哪一项', () => {
    const { onSelect } = renderNav('persona');

    fireEvent.click(screen.getByRole('button', { name: 'API' }));
    expect(onSelect).toHaveBeenCalledWith('api');

    const persona = screen.getByRole('button', { name: '人设' });
    expect(persona.getAttribute('aria-current')).toBe('page');
    expect(persona.getAttribute('aria-haspopup')).toBe('dialog');
    expect(screen.getByRole('button', { name: 'API' }).hasAttribute('aria-current')).toBe(false);
  });
});
