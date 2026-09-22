import { test, expect, type Page } from './fixtures';
import { seedSession } from '../../src/lib/persistence';

async function start(page: Page, use2d = true) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start exploring", exact: true }).click();
  if (await page.getByTestId('game-stage').getAttribute('data-camera') !== 'map') await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => document.exitPointerLock());
  if (use2d) await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByTestId('game-stage').focus();
  await page.keyboard.down('w');
  await expect.poll(async()=>Number(await page.getByTestId('game-stage').getAttribute('data-z')), {intervals:[50]}).toBeLessThan(8.3);
  await page.keyboard.up('w');
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
  await expect(page.getByRole('dialog')).toContainText("Entrance door & handle");
  await expect(page.getByRole('img', { name: /Illustration of Entrance/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('146 cm');
  const before = await z(page);
  await page.keyboard.down('w'); await page.waitForTimeout(300); await page.keyboard.up('w');
  expect(await z(page)).toBeCloseTo(before, 2);
  await page.getByRole('button', { name: "Open door", exact: true }).click();
  await page.getByRole('button', { name: "Continue exploring" }).click();
  await holdUntil(page, 'w', async () => (await z(page)) < 6.25);
  await page.waitForTimeout(150); // HUD publishes at 90 ms; wait for the stopped position.
  const after = await z(page); expect(after).toBeLessThan(before - 1);
  await page.getByRole('button', { name: /Journal/ }).click();
  await page.getByRole('button', { name: /09:30/ }).click();
  expect(await z(page)).toBeCloseTo(after, 1); // selecting a mission must never teleport
  await expect(page.locator('.current-mission')).toContainText("Visit the Lotus meeting room");
  expect(errors).toEqual([]);
});

test('entered dimensions persist; a wide chair cannot pass the same doorway as a smaller chair', async ({ page }) => {
  const session = seedSession(); session.started = true; session.playerPose = { x: 5.65, z: 2.15, yaw: 0 }; session.mobility.widthCm = 105;
  await page.addInitScript(data => localStorage.setItem('dayzero.session.v1', JSON.stringify(data)), session);
  await page.goto('/'); await page.getByRole('button', { name: "Enter office", exact: true }).click(); await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true); await page.evaluate(() => document.exitPointerLock()); await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByTestId('game-stage').focus(); await expect(page.locator('.interact-button')).toContainText("Restroom door"); await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('Wheelchair exceeds the clear opening');
  await expect(page.getByRole('dialog')).toContainText("− wheelchair 105 cm = -9 cm");
  await page.getByRole('button', { name: "Open door", exact: true }).click(); await page.getByRole('button', { name: "Continue exploring" }).click();
  await page.getByTestId('game-stage').focus(); await page.keyboard.down('s'); await expect(page.locator('.collision-hint')).toBeVisible(); await page.keyboard.up('s');
  expect(await z(page)).toBeLessThan(3.1);
  await page.getByRole('button', { name: /Your wheelchair/ }).click();
  await page.getByRole('spinbutton', { name: "Wheelchair width", exact: true }).fill('70');
  await page.getByRole('button', { name: "Save character" }).click();
  await holdUntil(page, 's', async () => (await z(page)) > 4.2);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dayzero.session.v1')!));
  expect(saved.mobility.widthCm).toBe(70);
});

test('object-specific report keeps its measurements through the HR workflow and reload', async ({ page }) => {
  await start(page);
  await page.keyboard.press('f'); await page.getByRole('button', { name: "Report this object" }).click();
  await page.getByLabel("What would you like to report").fill('Cần hỗ trợ mở cửa khi đến làm việc.');
  await page.getByRole('button', { name: "Save to summary" }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /Experience summary/ }).click();
  await expect(page.locator('.issue-row')).toContainText("Wheelchair: 70 × 110 cm");
  await page.getByRole('button', { name: "Create 1 preparation tasks" }).click();
  await expect(page.getByRole('button', { name: "Create 0 preparation tasks" })).toBeDisabled();
  await page.getByRole('combobox', { name: "Experience role" }).selectOption('hr');
  await page.getByRole('button', { name: 'Cần hỗ trợ mở cửa khi đến làm việc.', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('146 cm');
  await page.getByRole('button', { name: "Start preparation" }).click();
  await page.getByLabel("Preparation plan", { exact: true }).fill('Lễ tân sẽ mở cửa và đón bạn lúc 08:30.');
  await page.getByRole('button', { name: "Submit for review" }).click();
  await page.getByRole('button', { name: "Close", exact: true }).click();
  await page.getByRole('combobox', { name: "Experience role" }).selectOption('employee');
  await page.getByRole('button', { name: 'Cần hỗ trợ mở cửa khi đến làm việc.', exact: true }).click();
  await page.getByRole('button', { name: "Confirm solution", exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText("Completed");
  await page.reload(); await page.getByRole('button', { name: "Enter office", exact: true }).click(); await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true); await page.evaluate(() => document.exitPointerLock()); await page.getByRole('button', { name: 'Menu', exact: true }).click(); await page.getByRole('button', { name: /Preparation tasks/ }).click();
  await expect(page.locator('tbody')).toContainText("Completed");
});

test('first-person movement, drag look, overview and F interaction work without moving the player on camera switches', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, false);
  const stage = page.getByTestId('game-stage');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(stage).toHaveAttribute('data-camera', 'first-person');
  await expect(page.locator('.player-tag')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/simulator-first-person.png', fullPage: true });
  const before = await z(page);
  await holdUntil(page, 's', async () => await z(page) > before + .15);
  await expect(stage).toHaveAttribute('data-yaw', '0.000');
  await holdUntil(page, 'w', async () => await z(page) < before - .08);
  await expect(page.locator('.interact-button')).toBeVisible();
  await stage.focus(); await page.keyboard.press('f');
  await expect(page.locator('.object-illustration')).toBeVisible();
  await page.getByRole('button', { name: "Open door", exact: true }).click();
  await page.getByRole('button', { name: "Continue exploring" }).click();
  await holdUntil(page, 'w', async () => await z(page) < 6.15);
  await page.evaluate(() => document.exitPointerLock());
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 30, { steps: 15 });
  await expect.poll(async () => Number(await stage.getAttribute('data-yaw'))).toBeLessThan(-.1);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Keyboard steering remains available without a mouse.
  const yaw = Number(await stage.getAttribute('data-yaw'));
  await holdUntil(page, 'q', async () => Number(await stage.getAttribute('data-yaw')) > yaw + .15);
  await page.waitForTimeout(150);
  const stopped = await z(page);
  await page.getByRole('button', { name: "Office overview", exact: true }).click();
  await expect(page.locator('.player-tag')).toBeVisible();
  expect(await z(page)).toBeCloseTo(stopped, 2);
  await page.screenshot({ path: 'test-results/simulator-overview.png', fullPage: true });
  await page.getByRole('button', { name: "First-person view", exact: true }).click();
  await expect(stage).toHaveAttribute('data-camera', 'first-person');
  await expect(page.locator('.player-tag')).toHaveCount(0);
  expect(await z(page)).toBeCloseTo(stopped, 2);
  await page.screenshot({ path: 'test-results/simulator-first-person-inside.png', fullPage: true });
  await page.getByRole('button', { name: "Return to entrance", exact: true }).click();
  await holdUntil(page, 'w', async () => await z(page) < 7.9);
  await expect(page.locator('.interact-button')).toBeVisible();
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
  const button = page.getByRole('button', { name: "Move up on screen", exact: true });
  await button.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect.poll(() => z(page)).toBeLessThan(before - .1);
  await button.dispatchEvent('pointerup', { pointerId: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/simulator-mobile.png', fullPage: true });
});
