import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, unlink, rmdir } from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { chromium, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5174';
const testDirectory=await mkdtemp(join(tmpdir(),'dayzero-production-'));
const testDataFile=join(testDirectory,'data.json');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { windowsHide: true, stdio: 'pipe',env:{...process.env,DAYZERO_DATA_FILE:testDataFile} });
let browser;
let serverError = '';
server.stderr.on('data', data => { serverError += String(data); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(serverError || 'Preview server stopped.');
    try { ready = (await fetch(url)).ok; } catch { /* Server is starting. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Preview server did not start.');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const login=await page.request.post(`${url}/api/auth/login`,{data:{email:'employee@dayzero.local',password:process.env.DAYZERO_EMPLOYEE_PASSWORD||'DayZero2026!'}});
  expect(login.ok()).toBe(true);
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`); });
  await page.goto(url);
  await page.getByRole('button', { name: "Start exploring", exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('game-stage')).toHaveAttribute('data-camera', 'first-person');
  await expect(page.locator('.player-tag')).toHaveCount(0);
  await page.getByTestId('game-stage').focus();
  await page.keyboard.down('w');
  await expect.poll(async()=>Number(await page.getByTestId('game-stage').getAttribute('data-z')), {timeout:15000,intervals:[100]}).toBeLessThan(8.3);
  await page.keyboard.up('w');
  await expect(page.locator('.interact-button')).toBeVisible();
  await page.keyboard.press('f');
  await expect(page.locator('.object-illustration')).toBeVisible();
  await page.getByRole('button', { name: "Open door", exact: true }).click();
  await page.getByRole('button', { name: "Continue exploring" }).click();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/dayzero-production.png', fullPage: true });
  expect(failures).toEqual([]);
  console.log('Production smoke passed: first-person 3D, F interaction, measured object illustration and door action; no runtime or HTTP errors.');
} finally {
  await browser?.close();
  const stopped=new Promise(resolve=>server.once('exit',resolve));
  server.kill();
  if(server.exitCode===null)await stopped;
  await unlink(testDataFile).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await rmdir(testDirectory);
}
