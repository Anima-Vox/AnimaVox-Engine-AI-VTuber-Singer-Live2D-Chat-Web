import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const sharedSrcDir = path.resolve(rootDir, '../packages/shared/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // 共享契约包为「源码直出」，用别名指向 TS 源码，避免额外的构建步骤
      { find: /^@shared$/, replacement: path.resolve(sharedSrcDir, 'index.ts') },
      { find: /^@shared\/(.*)$/, replacement: `${sharedSrcDir}/$1` },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Playwright 产物会频繁写入，不排除的话 Windows 文件锁（EBUSY）会让 dev server 崩溃
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
