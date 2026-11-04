import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

/** V3 UI tests use route fixtures and start only the frontend Vite server. */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts/test-results',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-1280x720',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-1920x1080',
      use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174',
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: { VITE_API_URL: 'http://127.0.0.1:3001' },
    timeout: 30_000,
  },
});
