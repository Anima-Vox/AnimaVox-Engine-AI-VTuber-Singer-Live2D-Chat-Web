import { expect, test } from '@playwright/test';

/**
 * 文字对话版 E2E（默认的 mock 通道，不需要后端）。
 * 运行：npm run test:e2e
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 每个用例从空对话开始
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('lijiaying-chat');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      }),
  );
  await page.reload();
});

test('发送消息后收到带情绪 emoji 的回复，刷新后记录还在', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '消息输入框' });
  await input.fill('你好');
  await input.press('Enter');

  const reply = page.locator('article[aria-label="佳尹说"]').first();
  await expect(reply).toBeVisible({ timeout: 15_000 });
  await expect(reply.getByRole('img', { name: /心情：/ })).toBeVisible();

  await page.reload();
  await expect(page.locator('article')).toHaveCount(2);
});

test('点建议话题会直接发送', async ({ page }) => {
  await page.getByRole('button', { name: '给我推荐一首歌吧' }).click();
  await expect(page.locator('article[aria-label="你说"]')).toHaveText(/给我推荐一首歌吧/);
  await expect(page.locator('article[aria-label="佳尹说"]')).toBeVisible({ timeout: 15_000 });
});

test('服务器出错时显示提示与重试按钮', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '消息输入框' });
  await input.fill('模拟错误');
  await input.press('Enter');

  await expect(page.getByRole('alert')).toContainText('没有收到回复', { timeout: 15_000 });
  // 假后端对同一句话永远报错，所以这里只确认重试按钮可用
  await expect(page.getByRole('button', { name: '重试' })).toBeEnabled();
});

test('清空对话需要连点两次', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '消息输入框' });
  await input.fill('你好');
  await input.press('Enter');
  await expect(page.locator('article[aria-label="佳尹说"]')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: '清空对话' }).click();
  await expect(page.locator('article')).toHaveCount(2);
  await page.getByRole('button', { name: '再点一次，清空全部记录' }).click();
  await expect(page.locator('article')).toHaveCount(0);
});
