import { expect, test, type Page } from '@playwright/test';

/**
 * 文字对话版 E2E（默认的 mock 通道，不需要后端）。
 * 运行：npm run test:e2e
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 每个用例从空白的本地数据开始
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

/** 在浏览器里读出已保存的界面语言（settings 表） */
function readSavedLocale(): Promise<string | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('lijiaying-chat');
    request.onsuccess = () => {
      const read = request.result.transaction('settings').objectStore('settings').get('locale');
      read.onsuccess = () => {
        request.result.close();
        resolve((read.result as { value?: string } | undefined)?.value ?? null);
      };
    };
    request.onerror = () => resolve(null);
  });
}

async function say(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: '消息输入框' });
  await input.fill(text);
  await input.press('Enter');
  await expect(page.getByRole('button', { name: '停止等待回复' })).toHaveCount(0, {
    timeout: 15_000,
  });
}

test('发送消息后收到回复，刷新后记录还在', async ({ page }) => {
  await say(page, '你好');
  await expect(page.locator('article[aria-label="佳尹说"]')).toHaveCount(1);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(2);
});

test('点建议话题会直接发送', async ({ page }) => {
  await page.getByRole('button', { name: '给我推荐一首歌吧' }).click();
  await expect(page.locator('article[aria-label="你说"]')).toHaveText(/给我推荐一首歌吧/);
  await expect(page.locator('article[aria-label="佳尹说"]')).toBeVisible({ timeout: 15_000 });
});

test('新对话会出现在历史列表里，可以切回旧对话', async ({ page }) => {
  await say(page, '第一段对话');
  await page.getByRole('button', { name: '新对话' }).click();
  await say(page, '第二段对话');

  const history = page.getByRole('region', { name: '和佳尹的对话' });
  await expect(history.getByRole('button', { name: /^第一段对话/ })).toBeVisible();
  await history.getByRole('button', { name: /^第一段对话/ }).click();
  await expect(page.locator('article[aria-label="你说"]')).toHaveText(/第一段对话/);
});

test('删除对话需要再确认一次', async ({ page }) => {
  await say(page, '要删掉的对话');

  await page.getByRole('button', { name: '删除对话：要删掉的对话' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();

  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByText('发出第一句话后，对话会保存在这里。')).toBeVisible();
});

test('切换到阿糯后，对话与展示框都换成阿糯的', async ({ page }) => {
  await say(page, '你好');

  await page.getByRole('button', { name: '角色' }).click();
  await page.getByRole('button', { name: /羽澄糯/ }).click();

  await expect(page.getByRole('region', { name: '和阿糯的对话' })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await say(page, '你好');
  await expect(page.locator('article[aria-label="阿糯说"]')).toHaveCount(1);

  // 刷新后仍记得上次选的角色
  await page.reload();
  await expect(page.getByRole('region', { name: '和阿糯的对话' })).toBeVisible();
});

test('官方角色的人设与 API 显示为锁定', async ({ page }) => {
  await page.getByRole('button', { name: '人设' }).click();
  await expect(page.getByText(/李佳尹是官方角色/)).toBeVisible();
  await page.getByRole('button', { name: 'API' }).click();
  await expect(page.getByText(/固定使用官方模型与 API/)).toBeVisible();
});

test('界面可以切换成繁体与英文，角色台词不变，刷新后仍记得', async ({ page }) => {
  await page.getByRole('button', { name: '设置' }).click();

  await page.getByRole('button', { name: /^界面语言/ }).click();
  await page.getByRole('option', { name: '繁體中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.getByRole('button', { name: '設置' })).toBeVisible();

  // 键盘也能选：↓ 展开，再 ↓ 移到 English，Enter 选定
  const trigger = page.getByRole('button', { name: /^界面語言/ });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Message input' })).toBeVisible();
  await expect(page.getByText('嗨，我是佳尹。今天想聊点什么？')).toBeVisible();

  // 等语言设置写进本地数据库后再刷新
  await expect.poll(() => page.evaluate(readSavedLocale)).toBe('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('region', { name: 'Chats with Jayin Li' })).toBeVisible();
});

test('服务器出错时显示提示与重试按钮', async ({ page }) => {
  await say(page, '模拟错误');
  await expect(page.getByRole('alert')).toContainText('没有收到回复');
  await expect(page.getByRole('button', { name: '重试' })).toBeEnabled();
});
