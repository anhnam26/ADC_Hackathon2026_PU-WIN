import { test, expect } from './fixtures';
import { seedSession } from '../../src/lib/persistence';

test('floor guidance, automatic door opening, arrival and manual override remain silent', async ({ page }) => {
  await page.addInitScript(() => {
    const events: string[] = []; Object.assign(window, { voiceEvents: events });
    window.speechSynthesis.speak = utterance => { events.push(utterance.text); };
    window.speechSynthesis.cancel = () => { events.push('cancel'); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: "Start exploring", exact: true }).click();
  const stage = page.getByTestId('game-stage');
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.mouse.move(650, 460);
  await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-look-yaw')))).toBeGreaterThan(.01);
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toContainText('Where would you like to go');
  await page.getByRole('combobox', { name: "Destination", exact: true }).selectOption('reception-counter');
  await page.getByRole('button', { name: "Show route", exact: true }).click();
  await expect(page.locator('.navigation-hud')).toContainText("Yellow floor route");
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  await stage.focus(); await page.keyboard.press('p');
  await expect(stage).toHaveAttribute('data-autowalk', 'true');
  await expect(page.locator('.guide-caption')).toContainText("Arrived at Reception counter", { timeout: 20000 });
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dayzero.session.v1')!));
  expect(saved.openDoors).toContain('entry-door');
  await expect(page.locator('.interact-button')).toContainText("Reception counter");
  await page.keyboard.press('n');
  await page.getByRole('combobox', { name: "Destination", exact: true }).selectOption('meeting-table');
  await page.getByRole('button', { name: "Auto-walk here", exact: true }).click();
  await expect(stage).toHaveAttribute('data-autowalk', 'true');
  await stage.focus(); await page.keyboard.press('s');
  await expect(stage).toHaveAttribute('data-autowalk', 'false');
  await expect(page.locator('.guide-caption')).toContainText("Auto-walk stopped");
  await page.keyboard.press('h');
  await expect(page.getByRole('button', { name: /voice|Replay/ })).toHaveCount(0);
  const spoken = await page.evaluate(() => (window as unknown as { voiceEvents: string[] }).voiceEvents);
  expect(spoken).toEqual([]);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByTestId('floor-route')).toBeVisible();
  await expect(page.getByText("LOTUS MEETING ROOM", { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/office-navigation.png' });
});

test('walking colleagues move on the map and pause during dialogs', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: "Start exploring", exact: true }).click();
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

test('autowalk opens a room door and reaches a destination inside without tunnelling', async ({ page }) => {
  const session = seedSession(); session.started = true; session.playerPose = {x:5.65,z:2.15,yaw:0};
  await page.addInitScript(data => localStorage.setItem('dayzero.session.v1', JSON.stringify(data)), session);
  await page.goto('/'); await page.getByRole('button', { name: "Enter office", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByTestId('game-stage').focus(); await page.keyboard.press('n');
  await page.getByRole('combobox', {name:"Destination",exact:true}).selectOption('sink');
  await page.getByRole('button',{name:"Auto-walk here",exact:true}).click();
  await expect(page.locator('.guide-caption')).toContainText('Arrived at Washbasin', {timeout:20000});
  expect(Number(await page.getByTestId('game-stage').getAttribute('data-z'))).toBeGreaterThan(4.5);
  await page.getByTestId('game-stage').focus(); await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText("Washbasin");
});
