import { test, expect, type Page } from '@playwright/test';
import { seedSession } from '../../src/lib/persistence';

async function start(page: Page, use2d = true) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  if (use2d) await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByTestId('game-stage').focus();
  await expect(page.locator('.interact-button')).toBeVisible();
}
async function z(page: Page) { return Number(await page.getByTestId('game-stage').getAttribute('data-z')); }
async function holdUntil(page: Page, key: string, condition: () => Promise<boolean>) {
  await page.getByTestId('game-stage').focus(); await page.keyboard.down(key);
  try { await expect.poll(condition, { timeout: 7000, intervals: [100] }).toBe(true); }
  finally { await page.keyboard.up(key); }
}
test('WASD drives the wheelchair, F opens nearby objects, a closed door blocks entry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await page.keyboard.down('w'); await expect(page.locator('.collision-hint')).toBeVisible(); await page.keyboard.up('w');
  expect(await z(page)).toBeGreaterThan(7.5);
  await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('Cửa vào & tay nắm');
  await expect(page.getByRole('img', { name: /Minh họa Cửa vào/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('126 cm');
  const before = await z(page);
  await page.keyboard.down('w'); await page.waitForTimeout(300); await page.keyboard.up('w');
  expect(await z(page)).toBeCloseTo(before, 2);
  await page.getByRole('button', { name: 'Mở cửa', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục di chuyển' }).click();
  await holdUntil(page, 'w', async () => (await z(page)) < 6.25);
  await page.waitForTimeout(150); // HUD publishes at 90 ms; wait for the stopped position.
  const after = await z(page); expect(after).toBeLessThan(before - 1);
  await page.getByRole('button', { name: /09:30/ }).click();
  expect(await z(page)).toBeCloseTo(after, 1); // selecting a mission must never teleport
  await expect(page.locator('.current-mission')).toContainText('Thử vào phòng họp Lotus');
  expect(errors).toEqual([]);
});

test('entered dimensions persist; a wide chair cannot pass the same doorway as a smaller chair', async ({ page }) => {
  const session = seedSession(); session.started = true; session.playerPose = { x: 5.65, z: 2.15, yaw: 0 }; session.mobility.widthCm = 85;
  await page.addInitScript(data => localStorage.setItem('dayzero.session.v1', JSON.stringify(data)), session);
  await page.goto('/'); await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByTestId('game-stage').focus(); await expect(page.locator('.interact-button')).toContainText('Cửa nhà vệ sinh'); await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('Xe không lọt ô cửa');
  await expect(page.getByRole('dialog')).toContainText('− xe 85 cm = -9 cm');
  await page.getByRole('button', { name: 'Mở cửa', exact: true }).click(); await page.getByRole('button', { name: 'Tiếp tục di chuyển' }).click();
  await page.getByTestId('game-stage').focus(); await page.keyboard.down('s'); await expect(page.locator('.collision-hint')).toBeVisible(); await page.keyboard.up('s');
  expect(await z(page)).toBeLessThan(3.1);
  await page.getByRole('button', { name: /Xe của bạn/ }).click();
  await page.getByRole('spinbutton', { name: 'Chiều rộng xe', exact: true }).fill('70');
  await page.getByRole('button', { name: 'Lưu nhân vật' }).click();
  await holdUntil(page, 's', async () => (await z(page)) > 4.2);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dayzero.session.v1')!));
  expect(saved.mobility.widthCm).toBe(70);
});

test('object-specific report keeps its measurements through the HR workflow and reload', async ({ page }) => {
  await start(page);
  await page.keyboard.press('f'); await page.getByRole('button', { name: 'Ghi nhận về đồ vật này' }).click();
  await page.getByLabel('Điều bạn muốn ghi nhận').fill('Cần hỗ trợ mở cửa khi đến làm việc.');
  await page.getByRole('button', { name: 'Lưu vào tổng kết' }).click();
  await page.getByRole('button', { name: /Tổng kết trải nghiệm/ }).click();
  await expect(page.locator('.issue-row')).toContainText('Xe: 70 × 110 cm');
  await page.getByRole('button', { name: 'Tạo 1 nhiệm vụ chuẩn bị' }).click();
  await expect(page.getByRole('button', { name: 'Tạo 0 nhiệm vụ chuẩn bị' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Vai trải nghiệm' }).selectOption('hr');
  await page.getByRole('button', { name: 'Cần hỗ trợ mở cửa khi đến làm việc.', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('126 cm');
  await page.getByRole('button', { name: 'Bắt đầu chuẩn bị' }).click();
  await page.getByLabel('Phương án chuẩn bị', { exact: true }).fill('Lễ tân sẽ mở cửa và đón bạn lúc 08:30.');
  await page.getByRole('button', { name: 'Gửi phương án xác nhận' }).click();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('combobox', { name: 'Vai trải nghiệm' }).selectOption('employee');
  await page.getByRole('button', { name: 'Cần hỗ trợ mở cửa khi đến làm việc.', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận phương án', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Đã hoàn tất');
  await page.reload(); await page.getByRole('button', { name: /Nhiệm vụ chuẩn bị/ }).click();
  await expect(page.locator('tbody')).toContainText('Đã hoàn tất');
});

test('3D scene loads; two camera modes, wheelchair and object illustration render', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, false);
  await expect(page.locator('canvas')).toBeVisible(); await expect(page.locator('.player-tag')).toBeVisible();
  await page.screenshot({ path: 'test-results/simulator-overview.png', fullPage: true });
  await page.getByRole('button', { name: 'Theo nhân vật', exact: true }).click();
  await page.screenshot({ path: 'test-results/simulator-closeup.png', fullPage: true });
  await page.getByTestId('game-stage').focus(); await page.keyboard.press('f');
  await expect(page.locator('.object-illustration')).toBeVisible();
  await page.screenshot({ path: 'test-results/simulator-object.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile touch controls move the player in 2D without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) { if (type === 'webgl2') return null; return original.call(this, type as '2d', ...args); } as typeof original; });
  await start(page);
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeDisabled();
  const before = await z(page);
  const button = page.getByRole('button', { name: 'Tiến lên màn hình', exact: true });
  await button.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect.poll(() => z(page)).toBeLessThan(before - .1);
  await button.dispatchEvent('pointerup', { pointerId: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/simulator-mobile.png', fullPage: true });
});
