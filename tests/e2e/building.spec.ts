import {test,expect,type Page} from './fixtures';
import {seedSession} from '../../src/lib/persistence';

async function enter(page:Page,connection:'lift'|'stairs',walking=false){
  const session=seedSession();session.started=true;session.playerPose={x:connection==='lift'?-7.45:7.2,z:-11.9,yaw:connection==='lift'?Math.PI/2:-Math.PI/2,floor:1};if(walking)session.mobility.mode='walking';
  await page.addInitScript(data=>{if(!localStorage.getItem('dayzero.session.v1'))localStorage.setItem('dayzero.session.v1',JSON.stringify(data));},session);
  await page.goto('/');await page.getByRole('button',{name:"Enter office",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await page.getByTestId('game-stage').focus();
}
test('fresh session starts outside the two-storey facade and shows new ground-floor rooms',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:"Start exploring",exact:true}).click();
  await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','1');
  await expect(page.getByTestId('floor-label')).toContainText("Outside");
  expect(Number(await page.getByTestId('game-stage').getAttribute('data-z'))).toBeGreaterThan(9);
  await expect(page.locator('.interact-button')).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();await expect(page.getByText("Loading your office…")).toHaveCount(0);await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/building-outside.png'});
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:"Office overview",exact:true}).click();
  await expect(page.locator('.room-label').filter({hasText:"HR ROOM"})).toBeVisible();
  await expect(page.locator('.room-label').filter({hasText:"TRAINING ROOM"})).toBeVisible();
  await page.screenshot({path:'test-results/building-floor1.png'});
});
test('cross-floor autowalk routes via lift, resumes upstairs, persists and returns downstairs',async({page})=>{
  test.setTimeout(120000);
  await enter(page,'lift');const stage=page.getByTestId('game-stage');
  const board=async()=>{
    await page.getByRole('button',{name:"Call lift / Open doors",exact:true}).click();
    await expect(stage).toHaveAttribute('data-lift-phase','open',{timeout:20000});
    await stage.focus();await page.keyboard.down('w');
    try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[60]}).toBeLessThan(-9.85);}finally{await page.keyboard.up('w');}
    await page.waitForTimeout(150);await page.keyboard.press('f');
  };
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();await stage.focus();
  await page.keyboard.press('n');await page.getByRole('combobox',{name:"Destination",exact:true}).selectOption('desk-b21');await page.getByRole('button',{name:"Auto-walk here",exact:true}).click();
  await expect(page.locator('.subtitle-bar')).toContainText("Arrived at Lift", {timeout:10000});
  await stage.focus();await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText("190 × 220");
  await board();
  await page.getByRole('button',{name:"Go to Floor 2",exact:true}).click();
  await expect(stage).toHaveAttribute('data-floor','2',{timeout:20000});
  await expect(stage).toHaveAttribute('data-lift-phase','open');
  await stage.focus();await page.keyboard.down('s');
  try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[60]}).toBeGreaterThan(-7.6);}finally{await page.keyboard.up('s');}
  await expect(page.locator('.subtitle-bar')).toContainText("Arrived at Desk B21",{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'3D',exact:true}).click();await page.getByRole('button',{name:"Office overview",exact:true}).click();
  await expect(page.locator('.room-label').filter({hasText:"SKY MEETING ROOM"})).toBeVisible();
  await page.screenshot({path:'test-results/building-floor2.png'});
  await page.waitForTimeout(1000);await page.reload();await page.getByRole('button',{name:"Enter office",exact:true}).click();await expect(stage).toHaveAttribute('data-floor','2');
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();
  await stage.focus();await page.keyboard.press('n');await page.getByRole('combobox',{name:"Destination",exact:true}).selectOption('lift-2');await page.getByRole('button',{name:"Auto-walk here",exact:true}).click();
  await expect(page.locator('.subtitle-bar')).toContainText("Arrived at Lift",{timeout:30000});await stage.focus();await page.keyboard.press('f');
  await board();
  await page.getByRole('button',{name:"Go to Floor 1",exact:true}).click();await expect(stage).toHaveAttribute('data-floor','1',{timeout:20000});
});
test('wheelchair uses lift alternative at stairs',async({page})=>{
  await enter(page,'stairs');await expect(page.locator('.interact-button')).toContainText("Stairs");await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText("Wheelchairs cannot use");
  await expect(page.getByRole('button',{name:"Go to Floor 2",exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:"Guide me to the lift",exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-autowalk','true');
});
test('walking mode can use stairs in both directions',async({page})=>{
  await enter(page,'stairs',true);await expect(page.locator('.interact-button')).toContainText("Stairs");await page.keyboard.press('f');
  await page.getByRole('button',{name:"Go to Floor 2",exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','2');
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await expect(page.locator('.interact-button')).toContainText("Stairs · Floor 2");await page.getByTestId('game-stage').focus();await page.keyboard.press('f');await page.getByRole('button',{name:"Go to Floor 1",exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','1');
});
