import {test,expect,type Page} from './fixtures';
import {seedSession} from '../../src/lib/persistence';

async function hold(page:Page,key:string,check:()=>Promise<boolean>){await page.getByTestId('game-stage').focus();await page.keyboard.down(key);try{await expect.poll(check,{timeout:15000,intervals:[80]}).toBe(true);}finally{await page.keyboard.up(key);}}
test('cabins carry the player through real height without changing the canvas, then permit manual exit',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:1000,height:760});
 const session=seedSession();session.started=true;session.playerPose={floor:1,x:-7.45,z:-11.9,yaw:Math.PI/2};
 await page.addInitScript(s=>{if(!localStorage.getItem('dayzero.session.v1'))localStorage.setItem('dayzero.session.v1',JSON.stringify(s));},session);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:"Enter office",exact:true}).click();
 const stage=page.getByTestId('game-stage');await expect(page.locator('canvas')).toBeVisible();
 await page.evaluate(()=>Object.assign(window,{originalCanvas:document.querySelector('canvas')}));
 await stage.focus();await expect(page.locator('.interact-button')).toContainText("Lift");await page.keyboard.press('f');
 await expect(page.getByRole('button',{name:"Go to Floor 2",exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:"Call lift / Open doors",exact:true}).click();await expect(stage).toHaveAttribute('data-lift-phase','open');
 await hold(page,'w',async()=>Number(await stage.getAttribute('data-x'))<-9.85);
 await page.waitForTimeout(150);await page.keyboard.press('f');await page.getByRole('button',{name:"Go to Floor 2",exact:true}).click();
 await expect(stage).toHaveAttribute('data-lift-phase','moving');
 const x=await stage.getAttribute('data-x'),z=await stage.getAttribute('data-z');
 await expect.poll(async()=>Number(await stage.getAttribute('data-height')),{timeout:15000,intervals:[80]}).toBeGreaterThan(.4);
 const halfway=Number(await stage.getAttribute('data-height'));expect(halfway).toBeLessThan(3.2);await expect(stage).toHaveAttribute('data-lift-door','0.000');
 await stage.focus();await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');await expect(stage).toHaveAttribute('data-x',x!);await expect(stage).toHaveAttribute('data-z',z!);
 await page.screenshot({path:'test-results/elevator-in-motion.png'});
 await expect(stage).toHaveAttribute('data-floor','2',{timeout:20000});await expect(stage).toHaveAttribute('data-height','3.200');await expect(stage).toHaveAttribute('data-lift-phase','open');
 expect(await page.evaluate(()=>document.querySelector('canvas')===(window as unknown as {originalCanvas:HTMLCanvasElement}).originalCanvas)).toBe(true);
 await hold(page,'s',async()=>Number(await stage.getAttribute('data-x'))>-7.6);await page.waitForTimeout(180);
 await page.screenshot({path:'test-results/elevator-upper-lobby.png'});
 // Re-enter the same cabin, descend, and keep x/z fixed throughout the return trip.
 await hold(page,'w',async()=>Number(await stage.getAttribute('data-x'))<-9.85);await page.waitForTimeout(150);await page.keyboard.press('f');
 await page.getByRole('button',{name:"Go to Floor 1",exact:true}).click();await expect(stage).toHaveAttribute('data-floor','1',{timeout:20000});await expect(stage).toHaveAttribute('data-lift-phase','open');
 await expect(stage).toHaveAttribute('data-height','0.000');expect(errors).toEqual([]);
});
