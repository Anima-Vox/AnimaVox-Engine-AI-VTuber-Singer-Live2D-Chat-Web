import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

/**
 * 端到端测试（npm run test:e2e）的设定：用真的浏览器操作前端。
 * 纯净版没有后端；前端已经在运行（npm run dev）就直接使用，没有就自动启动。
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
    baseURL: BASE_URL,
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
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
