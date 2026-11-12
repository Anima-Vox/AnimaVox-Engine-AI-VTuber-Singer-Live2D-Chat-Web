import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
// 为 Node 环境提供 IndexedDB 实现，让 Dexie 仓储层可以在测试里跑
import 'fake-indexeddb/auto';

// 没开 Vitest globals 时 Testing Library 不会自动清理，每个用例结束后手动卸载组件
afterEach(() => {
  cleanup();
});
