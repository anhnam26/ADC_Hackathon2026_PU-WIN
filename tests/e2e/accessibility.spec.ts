import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('game and object information are accessible by keyboard; storage failures do not block use', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
  await page.goto('/'); await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.storage-notice')).toContainText('không cho phép lưu');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true); await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
  await page.getByTestId('game-stage').focus(); await expect(page.locator('.interact-button')).toBeVisible(); await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).focus(); await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Tiếp tục di chuyển' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('game-stage')).toBeFocused();
});

test('WebGL context loss retains player location and switches to 2D', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  const before = await page.getByTestId('game-stage').getAttribute('data-z');
  await page.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('.simulation-map2d')).toBeVisible();
  await expect(page.getByTestId('game-stage')).toHaveAttribute('data-z', before!);
});

test('corrupt old session is preserved instead of overwritten', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dayzero.session.v1', '{corrupt'));
  await page.goto('/'); await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  await expect(page.locator('.storage-notice')).toContainText('Không thể khôi phục');
  expect(await page.evaluate(() => localStorage.getItem('dayzero.session.v1'))).toBe('{corrupt');
});
