import { test, expect } from '@playwright/test';

test('floor guidance, automatic door opening, arrival, manual override and voice controls', async ({ page }) => {
  await page.addInitScript(() => {
    const events: string[] = []; Object.assign(window, { voiceEvents: events });
    window.speechSynthesis.speak = utterance => { events.push(utterance.text); };
    window.speechSynthesis.cancel = () => { events.push('cancel'); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  const stage = page.getByTestId('game-stage');
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.mouse.move(650, 460);
  await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-yaw')))).toBeGreaterThan(.01);
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toContainText('Bạn muốn đến đâu');
  await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).selectOption('reception-counter');
  await page.getByRole('button', { name: 'Hiện đường đi', exact: true }).click();
  await expect(page.locator('.navigation-hud')).toContainText('Vạch vàng');
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  await stage.focus(); await page.keyboard.press('p');
  await expect(stage).toHaveAttribute('data-autowalk', 'true');
  await expect(page.locator('.guide-caption')).toContainText('Đã đến Quầy lễ tân', { timeout: 20000 });
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dayzero.session.v1')!));
  expect(saved.openDoors).toContain('entry-door');
  await page.keyboard.press('n');
  await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).selectOption('meeting-table');
  await page.getByRole('button', { name: 'Tự đi đến đây', exact: true }).click();
  await expect(stage).toHaveAttribute('data-autowalk', 'true');
  await stage.focus(); await page.keyboard.press('s');
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  await expect(page.locator('.guide-caption')).toContainText('Đã dừng tự đi');
  await page.keyboard.press('h');
  await expect(page.getByRole('button', { name: 'H · Bật giọng', exact: true })).toBeVisible();
  const spoken = await page.evaluate(() => (window as unknown as { voiceEvents: string[] }).voiceEvents);
  expect(spoken.some(text => text.includes('Quầy lễ tân'))).toBe(true);
  expect(spoken.at(-1)).toBe('cancel');
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByTestId('floor-route')).toBeVisible();
  await expect(page.getByText('PHÒNG HỌP LOTUS', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/office-navigation.png' });
});

test('walking colleagues move on the map and pause during dialogs', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const colleague = page.locator('[data-object-id="colleague-thao"]');
  const x = Number(await colleague.getAttribute('data-x'));
  await expect.poll(async () => Number(await colleague.getAttribute('data-x'))).toBeGreaterThan(x + .1);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.waitForTimeout(150);
  const pausedX = await colleague.getAttribute('data-x');
  await page.waitForTimeout(450);
  await expect(colleague).toHaveAttribute('data-x', pausedX!);
});
