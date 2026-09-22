import { test, expect } from './fixtures';
import { seedSession } from '../../src/lib/persistence';

test('setup precedes map; V toggles first and third person without teleporting or responding inside forms', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('game-stage')).toHaveCount(0);
  await page.getByRole('spinbutton', { name: 'Chiều rộng xe', exact: true }).fill('75');
  await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  const stage = page.getByTestId('game-stage');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /Xe của bạn/ })).toContainText('75 × 110');
  const position = await stage.getAttribute('data-z');
  await stage.focus(); await page.keyboard.press('v');
  await expect(stage).toHaveAttribute('data-camera', 'third-person');
  await expect(page.locator('.player-tag')).toBeVisible();
  await expect(stage).toHaveAttribute('data-z', position!);
  await page.screenshot({ path: 'test-results/game-third-person.png' });
  await page.keyboard.press('v');
  await expect(stage).toHaveAttribute('data-camera', 'first-person');
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: /Xe của bạn/ }).click();
  await page.getByRole('spinbutton', { name: 'Chiều rộng xe', exact: true }).focus();
  await page.keyboard.press('v');
  await expect(stage).toHaveAttribute('data-camera', 'first-person');
  await page.getByRole('button', { name: 'Lưu nhân vật' }).click();
  const bounds = await stage.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).toEqual({ x: 0, y: 0, ...viewport });
  await page.reload();
  await expect(stage).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Chiều rộng xe', exact: true })).toHaveValue('75');
  await page.getByRole('button', { name: 'Vào văn phòng', exact: true }).click();
  await expect(stage).toBeVisible();
  expect(errors).toEqual([]);
});

test('native fullscreen fills viewport, locks pointer, releases it for interaction and exits cleanly', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  const stage = page.getByTestId('game-stage');
  await stage.focus();await page.keyboard.down('w');await expect.poll(async()=>Number(await stage.getAttribute('data-z')),{intervals:[50]}).toBeLessThan(8.3);await page.keyboard.up('w');
  // The faster chair may reach the closed door on software-rendered frames.
  // Leave turning space before testing mouse look; rotation correctly respects collision.
  if(Number(await stage.getAttribute('data-z'))<8.1){await page.keyboard.down('Shift');await page.keyboard.down('s');await expect.poll(async()=>Number(await stage.getAttribute('data-z')),{intervals:[50]}).toBeGreaterThan(8.1);await page.keyboard.up('s');await page.keyboard.up('Shift');}
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: 'Toàn màn hình', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  const full = await page.evaluate(() => {
    const rect = document.querySelector('[data-testid="game-stage"]')!.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, screenWidth: innerWidth, screenHeight: innerHeight };
  });
  expect(full.x).toBe(0); expect(full.y).toBe(0);
  expect(full.width).toBe(full.screenWidth); expect(full.height).toBe(full.screenHeight);
  await expect(stage).toHaveAttribute('data-pointer-locked', 'true');
  await page.mouse.move(650, 450);
  await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-yaw')))).toBeGreaterThan(.02);
  await page.keyboard.press('v'); await expect(stage).toHaveAttribute('data-camera', 'third-person');
  await page.keyboard.press('f'); await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await page.getByRole('button', { name: 'Tiếp tục di chuyển' }).click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.screenshot({ path: 'test-results/game-fullscreen.png' });
  await page.keyboard.press('Escape');
  // Chromium automation may not dispatch the browser's default Escape action.
  await page.evaluate(() => document.exitPointerLock());
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.getByRole('button', { name: 'Thoát toàn màn hình', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(stage).toHaveAttribute('data-pointer-locked', 'false');
});

test('nearby colleague shows portrait, role and support information via F; far colleagues cannot open remotely', async ({ page }) => {
  const session = seedSession(); session.started = true; session.playerPose = { x: 2.55, z: 5.5, yaw: 0 }; session.openDoors = ['entry-door'];
  await page.addInitScript(data => localStorage.setItem('dayzero.session.v1', JSON.stringify(data)), session);
  await page.goto('/');
  await page.getByRole('button', { name: 'Vào văn phòng', exact: true }).click();
  await expect(page.locator('.interact-button')).toContainText('Nguyễn Mai Linh');
  await page.getByTestId('game-stage').focus(); await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('Chuyên viên nhân sự');
  await expect(page.getByRole('img', { name: 'Chân dung minh họa Nguyễn Mai Linh' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Nhận thẻ ra vào');
  await page.screenshot({ path: 'test-results/game-colleague.png' });
  await page.getByRole('button', { name: 'Tiếp tục di chuyển' }).click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true); await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: /Nhật ký/ }).click();
  await page.getByRole('button', { name: /^Đồng nghiệp/ }).click();
  await page.getByRole('button', { name: /Trần Đức Minh/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Nhật ký ngày đầu');
  await expect(page.getByRole('img', { name: /Chân dung minh họa/ })).toHaveCount(0);
});
