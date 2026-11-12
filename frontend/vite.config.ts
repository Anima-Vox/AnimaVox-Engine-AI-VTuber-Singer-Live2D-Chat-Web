import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const sharedDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../packages/shared/src',
);

/** 前端的开发服务器（npm run dev）、打包（npm run build）与单元测试（npm test）设定 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @shared = 前后端共用的接口约定（packages/shared），直接读 TypeScript 源码
    alias: [{ find: /^@shared$/, replacement: path.resolve(sharedDir, 'index.ts') }],
  },
  server: {
    port: 5173,
    strictPort: true,
    // 接口约定第 7 条：前后端同一个网域。浏览器只连 5173，/api 开头的请求由这里转给后端（3001）
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
    watch: {
      // 端到端测试的产物会频繁写入，不排除的话 Windows 上会因为文件被占用而让开发服务器崩溃
      ignored: ['**/e2e/.artifacts/**', '**/test-results/**', '**/playwright-report/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
