import {test,expect,type Page} from './fixtures';
import {seedSession} from '../../src/lib/persistence';

async function enter(page:Page){
 const session=seedSession();session.started=true;session.playerPose={x:-7.45,z:-11.9,yaw:Math.PI/2,floor:1};
 await page.addInitScript(s=>{if(!localStorage.getItem('dayzero.session.v1'))localStorage.setItem('dayzero.session.v1',JSON.stringify(s));},session);
 await page.goto('/');await page.getByRole('button',{name:'Enter office',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
 await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();
}

test('cross-floor auto-walk operates the lift in both directions without input',async({page})=>{
 test.setTimeout(120000);await enter(page);const stage=page.getByTestId('game-stage');
 for(const [id,floor,name] of [['f2-water','2','Floor 2 water dispenser'],['hr-desk','1','HR reception desk']]){
   await stage.focus();await page.keyboard.press('n');await page.getByRole('combobox',{name:'Destination',exact:true}).selectOption(id);await page.getByRole('button',{name:'Auto-walk here',exact:true}).click();
   await expect(stage).toHaveAttribute('data-floor',floor,{timeout:40000});
   await expect(stage).toHaveAttribute('data-autowalk','false',{timeout:40000});
   await expect(page.locator('.subtitle-bar')).toContainText('Arrived at');
   expect(Number(await stage.getAttribute('data-x'))).toBeGreaterThan(-8.5);
 }
});

test('manager assigns a mission; employee drives manually and receives automatic review',async({page,browser})=>{
 test.setTimeout(180000);
 const admin=await browser.newContext({baseURL:'http://127.0.0.1:5175'}),manager=await admin.newPage();
 page.setDefaultTimeout(15000);manager.setDefaultTimeout(15000);
 const title=`Lift exploration ${Date.now()}`;
 try{
   const previous=await (await page.request.get('/api/missions')).json();
   for(const a of previous.attempts.filter((a:{phase:string})=>['manual','review'].includes(a.phase)))await page.request.patch(`/api/mission-attempts/${a.id}`,{data:{action:'cancel',version:a.version}});
   await admin.request.post('/api/auth/login',{data:{email:'manager@dayzero.local',password:'DayZero2026!'}});
   await manager.goto('/');const editor=manager.getByRole('region',{name:'Exploration missions'});
   await editor.getByLabel('Mission name',{exact:true}).fill(title);
   await editor.getByRole('combobox',{name:'Starting point',exact:true}).selectOption('ground-lobby');
   await editor.getByRole('button',{name:'Remove checkpoint 2',exact:true}).click();
   await editor.getByRole('combobox',{name:'Final destination',exact:true}).selectOption('f2-water');
   await editor.getByRole('button',{name:'Assign mission',exact:true}).click();await expect(editor).toContainText('Mission assigned.');
   await manager.screenshot({path:'test-results/mission-manager.png',fullPage:true});
   await enter(page);const stage=page.getByTestId('game-stage'),tracker=page.getByRole('region',{name:'Mission tracker'});
   await page.getByRole('button',{name:'Open missions',exact:true}).click();const card=page.getByRole('dialog').locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
   await card.getByRole('button',{name:'Start mission',exact:true}).click();
   await expect(tracker).toHaveAttribute('data-mission-phase','manual');await expect(stage).toHaveAttribute('data-autowalk','false');
   await stage.focus();await page.keyboard.press('p');await expect(stage).toHaveAttribute('data-autowalk','false');
   await expect(page.locator('.subtitle-bar')).toContainText('Press F to call');
   await page.keyboard.press('f');await page.getByRole('button',{name:'Call lift / Open doors',exact:true}).click();await expect(stage).toHaveAttribute('data-lift-phase','open');
   await stage.focus();await page.keyboard.down('w');try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[50]}).toBeLessThan(-9.7);}finally{await page.keyboard.up('w');}
   await page.keyboard.press('f');await page.getByRole('button',{name:'Go to Floor 2',exact:true}).click();await expect(stage).toHaveAttribute('data-floor','2',{timeout:20000});await expect(stage).toHaveAttribute('data-lift-phase','open');
   await stage.focus();await page.keyboard.down('s');try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[50]}).toBeGreaterThan(-7.4);}finally{await page.keyboard.up('s');}
   // Drive along a computed path with ordinary W/A/D key events; no pose injection or auto-walk.
   const path=await page.evaluate(async()=>{
     const load=(p:string)=>import(/* @vite-ignore */ p);
     const [{planRoute},{objects},{defaultMobility}]=await Promise.all([load('/src/lib/navigation.ts'),load('/src/data/space.ts'),load('/src/types/simulator.ts')]);
     const el=document.querySelector('[data-testid="game-stage"]') as HTMLElement;
     return planRoute({x:Number(el.dataset.x),z:Number(el.dataset.z),yaw:Number(el.dataset.yaw),floor:2},objects.find((o:{id:string})=>o.id==='f2-water'),defaultMobility) as {x:number;z:number;yaw:number}[];
   });expect(path).not.toBeNull();
   for(const point of path.slice(1)){
     if(await tracker.getAttribute('data-mission-next')==='1')break;
     for(let step=0;step<120;step++){
       if(await tracker.getAttribute('data-mission-next')==='1')break;
       const p=await stage.evaluate(el=>({x:Number(el.dataset.x),z:Number(el.dataset.z),yaw:Number(el.dataset.yaw)}));
       const distance=Math.hypot(point.x-p.x,point.z-p.z);if(distance<.09)break;
       const heading=Math.atan2(p.x-point.x,p.z-point.z),diff=Math.atan2(Math.sin(heading-p.yaw),Math.cos(heading-p.yaw));
       const turning=Math.abs(diff)>.07,key=turning?(diff>0?'a':'d'):'w';
       await stage.focus();await page.keyboard.down(key);await page.waitForTimeout(Math.min(180,turning?Math.abs(diff)/1.8*1000:distance/2.8*1000));await page.keyboard.up(key);await page.waitForTimeout(120);
     }
   }
   await expect(tracker).toContainText('Congratulations!',{timeout:15000});
   await expect(tracker).toHaveAttribute('data-mission-phase','review',{timeout:15000});
   await expect(stage).toHaveAttribute('data-floor','1');
   await expect(tracker).toHaveAttribute('data-mission-phase','completed',{timeout:60000});
   await expect(stage).toHaveAttribute('data-floor','2');await expect(tracker).toContainText('Mission review complete!');
   const feed=await (await admin.request.get('/api/missions')).json();const mission=feed.missions.find((m:{name:string})=>m.name===title);expect(feed.attempts.find((a:{missionId:string})=>a.missionId===mission.id).phase).toBe('completed');
   await page.screenshot({path:'test-results/mission-review.png'});
 }finally{await admin.close().catch(()=>{});}
});
