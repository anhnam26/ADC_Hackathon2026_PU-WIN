import {test,expect,type Page} from './fixtures';
import {seedSession} from '../../src/lib/persistence';
import type {CollisionHistory} from '../../src/types/collisions';

test.beforeEach(async({page})=>{
 const session=seedSession();session.started=true;session.playerPose={x:0,z:8,yaw:0,floor:1,y:0};
 await page.addInitScript(s=>{
  if(!localStorage.getItem('dayzero.session.v1'))localStorage.setItem('dayzero.session.v1',JSON.stringify(s));
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type==='webgl2')return null;return original.call(this,type as '2d',...args);} as typeof original;
 },session);
});
async function enter(page:Page){
 await page.goto('/');
 const request=page.waitForRequest(r=>r.url().endsWith('/api/collision-runs')&&r.method()==='POST'&&!r.postDataJSON().finish);
 await page.getByRole('button',{name:'Enter office',exact:true}).click();
 return (await request).postDataJSON().id as string;
}
async function hit(page:Page){
 await page.bringToFront();await page.getByTestId('game-stage').focus();await page.keyboard.down('w');
 try{await expect(page.locator('.collision-hint')).toBeVisible();await page.waitForTimeout(650);}finally{await page.keyboard.up('w');}
}

test('actual collisions appear live beside notes and remain separated by simulator session',async({page,browser})=>{
 const manager=await browser.newContext({baseURL:test.info().project.use.baseURL});
 try{
  await manager.request.post('/api/auth/login',{data:{email:'manager@dayzero.local',password:'DayZero2026!'}});
  const history=async()=>await (await manager.request.get('/api/collision-history')).json() as CollisionHistory;
  const firstRun=await enter(page);await hit(page);
  await expect.poll(async()=>(await history()).collisions.filter(e=>e.runId===firstRun).length).toBe(1);
  const first=(await history()).collisions.find(e=>e.runId===firstRun)!;
  expect(first.objectId).toBe('entry-door');expect(first.movement).toBe('manual');
  expect(first.position.z).toBeLessThan(first.playerPose.z);
  const noteResponse=await page.request.post('/api/notes',{data:{concern:'Collision map comparison',request:'Check door clearance',position:{floor:1,x:1,z:9,y:0}}});
  const {note}=await noteResponse.json();
  const admin=await manager.newPage();await admin.goto('/admin');
  await admin.getByRole('combobox',{name:'Collision session',exact:true}).selectOption(firstRun);
  const marker=admin.locator(`[data-collision-id="${first.id}"]`);
  await expect(marker).toBeVisible();await expect(admin.locator(`[data-note-id="${note.id}"]`)).toBeVisible();
  expect(await marker.locator('path').first().getAttribute('fill')).not.toBe(await admin.locator(`[data-note-id="${note.id}"] circle`).getAttribute('fill'));
  await marker.focus();await admin.keyboard.press('Enter');
  await expect(admin.getByRole('article',{name:'Collision details'})).toContainText('Entrance door & handle');
  await expect(admin.locator('.collision-details')).toContainText('70 × 110 cm');
  await admin.getByRole('combobox',{name:'Floor',exact:true}).selectOption('2');await expect(marker).toHaveCount(0);
  await admin.getByRole('combobox',{name:'Floor',exact:true}).selectOption('1');

  // Withdraw, then deliberately hit the same doorway a second time.
  await page.bringToFront();await page.getByTestId('game-stage').focus();await page.keyboard.down('s');await page.waitForTimeout(500);await page.keyboard.up('s');await page.waitForTimeout(500);await hit(page);
  await expect.poll(async()=>(await history()).collisions.filter(e=>e.runId===firstRun).length).toBe(2);
  await admin.bringToFront();await expect(admin.locator('[data-collision-row]')).toHaveCount(2);
  await admin.screenshot({path:'test-results/collision-admin.png',fullPage:true});

  await page.addInitScript(()=>{const raw=localStorage.getItem('dayzero.session.v1');if(raw){const s=JSON.parse(raw);s.playerPose={x:2,z:8,yaw:0,floor:1,y:0};localStorage.setItem('dayzero.session.v1',JSON.stringify(s));}});
  const secondRun=await enter(page);expect(secondRun).not.toBe(firstRun);await hit(page);
  await expect.poll(async()=>(await history()).collisions.filter(e=>e.runId===secondRun).length).toBe(1);
  expect((await history()).collisions.find(e=>e.runId===secondRun)?.kind).toBe('wall');
  await admin.bringToFront();await expect(admin.getByLabel('Collision session').locator(`option[value="${secondRun}"]`)).toHaveCount(1);
  await admin.getByLabel('Collision session').selectOption(secondRun);await expect(admin.locator('[data-collision-row]')).toHaveCount(1);
  await admin.locator('[data-collision-row]').click();await expect(admin.locator('.collision-details')).toContainText('Wall / room frame');
  await admin.reload();await admin.getByLabel('Collision session').selectOption(firstRun);await expect(admin.locator('[data-collision-row]')).toHaveCount(2);
 }finally{await manager.close();}
});

test('failed uploads retry without duplicates and upstairs collisions retain their floor',async({page,browser})=>{
 const manager=await browser.newContext({baseURL:test.info().project.use.baseURL});
 try{
  await manager.request.post('/api/auth/login',{data:{email:'manager@dayzero.local',password:'DayZero2026!'}});
  await page.goto('/');await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dayzero.session.v1')!);s.playerPose={x:0,z:-18.5,yaw:0,floor:2,y:3.2};localStorage.setItem('dayzero.session.v1',JSON.stringify(s));});
  await page.route('**/api/collision-runs',route=>route.request().postDataJSON().events.length?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Connection interrupted.'})}):route.continue());
  const run=await enter(page);await hit(page);
  await expect(page.locator('.collision-sync-status')).toContainText('Saved on this device');
  await page.unroute('**/api/collision-runs');await expect(page.locator('.collision-sync-status')).toHaveText('Collision history synced');
  const {collisions}=await (await manager.request.get('/api/collision-history')).json() as CollisionHistory;
  const events=collisions.filter(e=>e.runId===run);expect(events).toHaveLength(1);expect(events[0].position.floor).toBe(2);expect(events[0].position.y).toBe(3.2);
  const admin=await manager.newPage();await admin.goto('/admin');await admin.getByLabel('Collision session').selectOption(run);
  await expect(admin.locator('[data-collision-id]')).toHaveCount(0);
  await admin.locator('[data-collision-row]').click();await expect(admin.getByRole('combobox',{name:'Floor',exact:true})).toHaveValue('2');await expect(admin.locator('[data-collision-id]')).toHaveCount(1);
 }finally{await manager.close();}
});

test('pending collisions survive reload and are uploaded under their original session',async({page,browser})=>{
 const manager=await browser.newContext({baseURL:test.info().project.use.baseURL});
 try{
  await manager.request.post('/api/auth/login',{data:{email:'manager@dayzero.local',password:'DayZero2026!'}});
  await page.route('**/api/collision-runs',route=>route.request().postDataJSON().events.length?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Offline test.'})}):route.continue());
  const originalRun=await enter(page);await hit(page);await expect(page.locator('.collision-sync-status')).toContainText('Saved on this device');
  await page.goto('/'); // Gameplay is unmounted; the failed batch stays on this device.
  await page.unroute('**/api/collision-runs');
  const nextRun=await enter(page);expect(nextRun).not.toBe(originalRun);
  const getHistory=async()=>await (await manager.request.get('/api/collision-history')).json() as CollisionHistory;
  await expect.poll(async()=>(await getHistory()).collisions.filter(e=>e.runId===originalRun).length).toBe(1);
  const history=await getHistory();expect(history.collisions.filter(e=>e.runId===nextRun)).toHaveLength(0);
  expect(history.runs.find(r=>r.id===originalRun)?.endedAt).toBeTruthy();
 }finally{await manager.close();}
});
