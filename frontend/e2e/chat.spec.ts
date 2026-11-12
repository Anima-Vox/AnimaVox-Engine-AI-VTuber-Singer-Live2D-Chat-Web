import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * 端到端测试：用真的浏览器操作前端（纯净版没有后端，回复来自浏览器里的演示台词）。
 * 运行：npm run test:e2e（前端没在运行时会自动启动）。
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 每个用例从空白的浏览器资料开始
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

/* ---------- 用例里重复用到的动作 ---------- */

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

function navRail(page: Page, menu = '主菜单'): Locator {
  return page.getByRole('navigation', { name: menu });
}

function viewport(page: Page): { width: number; height: number } {
  const size = page.viewportSize();
  if (!size) {
    throw new Error('没有设置视口大小');
  }
  return size;
}

/** 根字号（px）：界面尺寸都以 rem 为单位 */
function rootFontSize(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('元素不在画面上');
  }
  return box;
}

/** 鼠标移到屏幕最左边的窄条，等工具栏展开 */
async function revealNav(page: Page, menu = '主菜单'): Promise<void> {
  await page.mouse.move(3, viewport(page).height / 2);
  await expect(navRail(page, menu)).toHaveAttribute('data-expanded', 'true');
}

/** 展开工具栏，点其中一项，打开对应的二级页面 */
async function openPage(
  page: Page,
  item: string,
  title: string,
  menu = '主菜单',
): Promise<Locator> {
  await revealNav(page, menu);
  await navRail(page, menu).getByRole('button', { name: item, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  return dialog;
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

test('新对话会出现在历史列表里，在「对话」页点选后自动回到聊天', async ({ page }) => {
  await say(page, '第一段对话');

  // 点「新对话」后自动关闭二级页面
  let dialog = await openPage(page, '对话', '和佳尹的对话');
  await dialog.getByRole('button', { name: '新对话' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(0);
  await say(page, '第二段对话');

  // 点选旧对话后也自动关闭，聊天换成那段对话
  dialog = await openPage(page, '对话', '和佳尹的对话');
  const history = dialog.getByRole('region', { name: '和佳尹的对话' });
  await expect(history.getByRole('button', { name: /^第二段对话/ })).toBeVisible();
  await history.getByRole('button', { name: /^第一段对话/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('article[aria-label="你说"]')).toHaveText(/第一段对话/);
});

test('删除对话需要再确认一次，删除后二级页面不关闭', async ({ page }) => {
  await say(page, '要删掉的对话');

  const dialog = await openPage(page, '对话', '和佳尹的对话');
  await dialog.getByRole('button', { name: '删除对话：要删掉的对话' }).click();
  await dialog.getByRole('button', { name: '确认删除' }).click();

  await expect(page.locator('article')).toHaveCount(0);
  await expect(dialog.getByText('发出第一句话后，对话会保存在这里。')).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('切换到阿糯后，对话换成阿糯的', async ({ page }) => {
  await say(page, '你好');

  const characters = await openPage(page, '角色', '角色');
  await characters.getByRole('button', { name: /羽澄糯/ }).click();

  // 选了角色后切到该角色的「对话」页
  const dialog = page.getByRole('dialog', { name: '和阿糯的对话' });
  await expect(dialog.getByRole('region', { name: '和阿糯的对话' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('羽澄糯');
  await expect(page.locator('article')).toHaveCount(0);
  await say(page, '你好');
  await expect(page.locator('article[aria-label="阿糯说"]')).toHaveCount(1);

  // 刷新后仍记得上次选的角色
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('羽澄糯');
  await openPage(page, '对话', '和阿糯的对话');
});

test('官方角色的人设与 API 显示为锁定；页面开着时点其他项直接切换', async ({ page }) => {
  const persona = await openPage(page, '人设', '人设 Prompt');
  await expect(persona.getByText(/李佳尹是官方角色/)).toBeVisible();

  await navRail(page).getByRole('button', { name: 'API', exact: true }).click();
  const api = page.getByRole('dialog', { name: '模型与 API' });
  await expect(api.getByText(/固定使用官方模型与 API/)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('界面可以切换成繁体与英文，角色台词不变，刷新后仍记得', async ({ page }) => {
  const settings = await openPage(page, '设置', '设置');

  await settings.getByRole('button', { name: /^界面语言/ }).click();
  await page.getByRole('option', { name: '繁體中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(navRail(page, '主菜單').getByRole('button', { name: '設置' })).toBeVisible();

  // 键盘也能选：↓ 展开，再 ↓ 移到 English，Enter 选定
  const trigger = page.getByRole('button', { name: /^界面語言/ });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

  // 关掉设置页回到聊天：输入框与开场白
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('textbox', { name: 'Message input' })).toBeVisible();
  await expect(page.getByText('嗨，我是佳尹。今天想聊点什么？')).toBeVisible();

  // 等语言设置写进本地数据库后再刷新
  await expect.poll(() => page.evaluate(readSavedLocale)).toBe('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await openPage(page, 'Chats', 'Chats with Jayin Li', 'Main menu');
});

test('没拿到回复时显示提示与重试按钮；重试不会多出一句', async ({ page }) => {
  await say(page, '模拟错误');
  await expect(page.getByRole('alert')).toContainText('没有收到回复');

  // 这句话永远失败：重试后还是同一句、同一个提示
  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.getByRole('button', { name: '停止等待回复' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('没有收到回复');
  await expect(page.locator('article[aria-label="你说"]')).toHaveCount(1);

  // 刷新后这句话还在，并提示还没有回复
  await page.reload();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: '还没有收到回复' })).toBeVisible();
});

test.describe('主页布局', () => {
  test('主页只有置中的对话栏（60vw），没有右边的角色展示框', async ({ page }) => {
    const { width, height } = viewport(page);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(page.getByLabel('李佳尹的形象')).toHaveCount(0);

    // 工具栏浮在上面、不占版面：对话栏照样水平置中
    const main = await boxOf(page.getByRole('main'));
    expect(Math.abs(main.width - width * 0.6)).toBeLessThanOrEqual(2);
    expect(Math.abs(main.x + main.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(main.y).toBeLessThanOrEqual(1);
    expect(Math.abs(main.height - height)).toBeLessThanOrEqual(1);
  });

  test('Live2D 预留位置：无框、透明、在消息后面，底部贴齐输入框，比例 1080:1170', async ({
    page,
  }) => {
    const slot = page.locator('[data-live2d-slot]');
    const layer = page.locator('.live2d-layer');
    const main = await boxOf(page.getByRole('main'));
    const area = await boxOf(layer);
    const box = await boxOf(slot);
    const composer = await boxOf(page.getByRole('main').locator('form'));

    // 底部贴齐输入框上缘、水平置中、宽度不超过对话栏
    expect(Math.abs(box.y + box.height - composer.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.x + box.width / 2 - (main.x + main.width / 2))).toBeLessThanOrEqual(1);
    expect(box.width).toBeLessThanOrEqual(main.width);
    // 宽高比 1080 : 1170；高度约为消息区的 70%（宽度不够时按宽度缩小）
    expect(Math.abs(box.width / box.height - 1080 / 1170)).toBeLessThan(0.01);
    expect(
      Math.abs(box.height - Math.min(area.height * 0.7, (area.width * 1170) / 1080)),
    ).toBeLessThanOrEqual(1);

    // 完全不要框，也不挡点击
    const style = await slot.evaluate((element) => {
      const own = getComputedStyle(element);
      const layerElement = element.parentElement as HTMLElement;
      return {
        background: own.backgroundColor,
        backgroundImage: own.backgroundImage,
        border: own.borderTopWidth,
        shadow: own.boxShadow,
        radius: own.borderTopLeftRadius,
        text: element.textContent,
        pointerEvents: getComputedStyle(layerElement).pointerEvents,
        layerZ: Number(getComputedStyle(layerElement).zIndex),
        messagesZ: Number(getComputedStyle(layerElement.nextElementSibling as HTMLElement).zIndex),
      };
    });
    expect(style).toMatchObject({
      background: 'rgba(0, 0, 0, 0)',
      backgroundImage: 'none',
      border: '0px',
      shadow: 'none',
      radius: '0px',
      text: '',
      pointerEvents: 'none',
    });
    expect(style.layerZ).toBeLessThan(style.messagesZ);
  });
});

test.describe('左边工具栏', () => {
  test('平时收起只露出窄条；鼠标移到窄条或感应范围会展开，移开会收起', async ({ page }) => {
    const nav = navRail(page);
    const rem = await rootFontSize(page);
    const { width, height } = viewport(page);

    // 收起时只露出约 0.5rem 宽、颜色与工具栏相同的窄条
    await expect(nav).toHaveAttribute('data-expanded', 'false');
    await expect
      .poll(async () => (await boxOf(nav)).x + (await boxOf(nav)).width)
      .toBeCloseTo(0.5 * rem, 0);
    await expect(nav).toHaveCSS('background-color', 'rgb(22, 33, 58)');

    // 感应范围往右延伸到约 2.4rem：鼠标在窄条右边一点也会展开
    await page.mouse.move(2 * rem, height / 2);
    await expect(nav).toHaveAttribute('data-expanded', 'true');
    await expect.poll(async () => (await boxOf(nav)).x).toBeCloseTo(0, 0);

    // 移开后收起；收起前鼠标回来就不收
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.move(rem, height / 2);
    await page.waitForTimeout(800);
    await expect(nav).toHaveAttribute('data-expanded', 'true');

    await page.mouse.move(width / 2, height / 2);
    await expect(nav).toHaveAttribute('data-expanded', 'false');
  });

  test('动画只动 transform 与 opacity（280ms）；减少动态效果时直接切换', async ({ page }) => {
    const nav = navRail(page);
    const content = nav.locator('.nav-rail-content');
    await expect(nav).toHaveCSS('transition-property', 'transform');
    await expect(nav).toHaveCSS('transition-duration', '0.28s');
    await expect(nav).toHaveCSS('transition-timing-function', 'cubic-bezier(0.22, 1, 0.36, 1)');
    await expect(content).toHaveCSS('transition-property', 'opacity');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(nav).toHaveCSS('transition-property', 'none');
    await expect(content).toHaveCSS('transition-property', 'none');
  });

  test('二级页面开着时工具栏不收起；关掉后鼠标不在上面才收起', async ({ page }) => {
    const { width, height } = viewport(page);
    const dialog = await openPage(page, '对话', '和佳尹的对话');

    await page.mouse.move(width / 2, height / 2);
    await page.waitForTimeout(1000);
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'true');

    await dialog.getByRole('button', { name: '关闭' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'false');
  });

  test('键盘 Tab 到工具栏会展开', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(navRail(page).getByRole('button', { name: '对话', exact: true })).toBeFocused();
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'true');
  });
});

test.describe('触控', () => {
  test.use({ hasTouch: true });

  test('点窄条展开工具栏，点别处收起', async ({ page }) => {
    const { width, height } = viewport(page);
    await page.touchscreen.tap(3, height / 2);
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'true');
    await page.waitForTimeout(800);
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'true');

    await page.touchscreen.tap(width / 2, height / 2);
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'false');
  });
});

test.describe('二级页面', () => {
  test('盖在主页上：置中、60vw × 75vh，后面的主页模糊且点不到', async ({ page }) => {
    const { width, height } = viewport(page);
    const dialog = await openPage(page, '设置', '设置');

    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const box = await boxOf(dialog);
    expect(Math.abs(box.width - width * 0.6)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - height * 0.75)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThanOrEqual(2);
    await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(dialog).toHaveCSS('border-top-color', 'rgb(22, 33, 58)');

    await expect(page.locator('[data-overlay-backdrop]')).toHaveCSS('backdrop-filter', 'blur(8px)');
    await expect(page.getByRole('main')).toHaveAttribute('inert', '');

    // 点模糊背景不关闭，也点不到后面的输入框
    const composer = await boxOf(page.getByRole('main').locator('form'));
    await page.mouse.click(composer.x + 4, composer.y + composer.height / 2);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('textbox', { name: '消息输入框' })).not.toBeFocused();
  });

  test('点 ✕ 或按 Esc 都能关闭，焦点回到打开它的工具栏按钮', async ({ page }) => {
    const nav = navRail(page);

    let dialog = await openPage(page, '对话', '和佳尹的对话');
    const close = dialog.getByRole('button', { name: '关闭' });
    await expect(close).toBeFocused();
    await close.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(nav.getByRole('button', { name: '对话', exact: true })).toBeFocused();
    await expect(page.getByRole('main')).not.toHaveAttribute('inert', '');

    dialog = await openPage(page, 'API', '模型与 API');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'API', exact: true })).toBeFocused();
  });

  test('用键盘打开后，Tab 只在二级页面与工具栏之间循环', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: '和佳尹的对话' });
    await expect(dialog.getByRole('button', { name: '关闭' })).toBeFocused();

    const where = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        if (active?.closest('nav')) {
          return 'nav';
        }
        if (active?.closest('[role="dialog"]')) {
          return 'dialog';
        }
        return active?.tagName ?? 'none';
      });

    const visited = new Set<string>();
    for (const key of [...Array<string>(10).fill('Tab'), ...Array<string>(10).fill('Shift+Tab')]) {
      await page.keyboard.press(key);
      const area = await where();
      expect(['nav', 'dialog']).toContain(area);
      visited.add(area);
    }
    expect([...visited].sort()).toEqual(['dialog', 'nav']);

    // Esc 关闭后焦点回到「对话」按钮，工具栏因为有键盘焦点而保持展开
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(navRail(page).getByRole('button', { name: '对话', exact: true })).toBeFocused();
    await expect(navRail(page)).toHaveAttribute('data-expanded', 'true');
  });
});
