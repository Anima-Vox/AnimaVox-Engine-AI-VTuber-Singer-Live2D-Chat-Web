import { defineConfig, devices } from '@playwright/test';

/**
 * 端到端测试（npm run test:e2e）的设定：用真的浏览器操作真的前端与后端。
 * 前后端已经在运行（npm run dev）就直接使用，没有就自动启动。
 */
export default defineConfig({
  testDir: './frontend/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // 一次只跑一个用例，照顺序跑
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './frontend/e2e/.artifacts',
  use: {
    // 浏览器只连前端；/api 由前端的开发服务器转给后端（同网域）
    baseURL: 'http://localhost:5173',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  // 界面以 2560 × 1440 为设计基准，另外检查两种常见的分辨率
  projects: [
    {
      name: 'chrome-2560x1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } },
    },
    {
      name: 'chrome-1280x720',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chrome-1920x1080',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:backend',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
