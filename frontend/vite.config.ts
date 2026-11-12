import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** 前端的开发服务器（npm run dev）、打包（npm run build）与单元测试（npm test）设定 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
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
