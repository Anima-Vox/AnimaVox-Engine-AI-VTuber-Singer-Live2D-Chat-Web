import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const sharedDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../packages/shared/src',
);

/** 后端测试（npm test）的设定 */
export default defineConfig({
  plugins: [
    {
      // Vitest 2 还不认得 Node 内建的 node:sqlite（会当成叫 sqlite 的套件去找），在这里指回内建模块
      name: 'node-sqlite',
      resolveId: (id) => (id === 'sqlite' ? '\0node-sqlite' : null),
      load: (id) =>
        id === '\0node-sqlite'
          ? "export const { DatabaseSync } = process.getBuiltinModule('node:sqlite');"
          : null,
    },
  ],
  resolve: {
    // @shared = 前后端共用的接口约定（packages/shared），直接读 TypeScript 源码
    alias: [{ find: /^@shared$/, replacement: path.resolve(sharedDir, 'index.ts') }],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
