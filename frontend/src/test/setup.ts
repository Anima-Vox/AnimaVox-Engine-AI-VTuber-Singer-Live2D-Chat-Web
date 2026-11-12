import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** 单元测试的共用准备（每个测试文件开始前都会先执行这个文件） */

// 每个用例结束后：卸载画面上的组件，清掉记在浏览器的资料（token、语言、角色）
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// 测试环境（jsdom）没有 PointerEvent：补一个最小版本，让测试可以指定 pointerType（mouse / touch）
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? '';
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
