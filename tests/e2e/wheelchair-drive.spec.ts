import {test,expect} from './fixtures';
import {seedSession} from '../../src/lib/persistence';
test('mouse only looks, A/D pivot in place, and W/S follow the wheelchair in both views',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start exploring',exact:true}).click();
 const stage=page.getByTestId('game-stage');await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
 const position=async()=>({x:Number(await stage.getAttribute('data-x')),z:Number(await stage.getAttribute('data-z')),yaw:Number(await stage.getAttribute('data-yaw'))});
 const initial=await position();
 await page.mouse.move(650,460);await page.mouse.move(780,460);
 await expect.poll(async()=>Math.abs(Number(await stage.getAttribute('data-look-yaw')))).toBeGreaterThan(.1);
 expect((await position()).yaw).toBe(initial.yaw);
 await stage.focus();await page.keyboard.down('w');await expect.poll(async()=>(await position()).z).toBeLessThan(initial.z-.45);await page.keyboard.up('w');
 expect((await position()).x).toBeCloseTo(initial.x,2);
 await page.waitForTimeout(180);const beforeTurn=await position();
 await page.keyboard.down('w');await page.keyboard.down('a');
 await expect.poll(async()=>(await position()).yaw).toBeGreaterThan(.5);await page.keyboard.up('w');await page.keyboard.up('a');
 const afterTurn=await position();expect(afterTurn.x).toBeCloseTo(beforeTurn.x,1);expect(Math.abs(afterTurn.z-beforeTurn.z)).toBeLessThan(.2);
 await page.keyboard.press('v');await expect(stage).toHaveAttribute('data-camera','third-person');
 const turned=await position();await page.mouse.move(510,380);await page.waitForTimeout(200);expect((await position()).yaw).toBe(turned.yaw);
 await page.keyboard.down('s');await expect.poll(async()=>(await position()).x).toBeGreaterThan(turned.x+.15);await page.keyboard.up('s');
 await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'Reset view',exact:true}).click();await expect(stage).toHaveAttribute('data-look-yaw','0.000');
});

test('upper floor overview shows its own labels and furnished lobby',async({page})=>{
 const session=seedSession();session.started=true;session.playerPose={x:0,z:-14,y:3.2,floor:2,yaw:0};
 await page.addInitScript(s=>localStorage.setItem('dayzero.session.v1',JSON.stringify(s)),session);
 await page.goto('/');await page.getByRole('button',{name:'Enter office',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();
 await page.screenshot({path:'test-results/upper-floor-interior.png'});
 await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'Office overview',exact:true}).click();
 await expect(page.locator('.room-label').filter({hasText:'SKY MEETING ROOM'})).toBeVisible();
 await expect(page.locator('.room-label').filter({hasText:'HR ROOM'})).toHaveCount(0);
 await page.screenshot({path:'test-results/upper-floor-decor.png'});
});
