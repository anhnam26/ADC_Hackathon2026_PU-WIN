import { test, expect } from './fixtures';
import { seedSession } from '../../src/lib/persistence';
import {objects} from '../../src/data/space';

test('legacy Vietnamese sessions display English; user messages retain their original language', async ({page}) => {
  const session=seedSession(); session.started=true; session.playerPose={x:2.55,z:5.5,yaw:0};session.openDoors=['entry-door'];
  session.language='vi';
  await page.addInitScript(data=>{
    if (!localStorage.getItem('dayzero.session.v1')) localStorage.setItem('dayzero.session.v1',JSON.stringify(data));
    Object.assign(window,{spoken:[]});
    speechSynthesis.speak=utterance=>(window as unknown as {spoken:string[]}).spoken.push(utterance.lang);
  },session);
  await page.goto('/');
  await expect(page.getByLabel('Demo language: English')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('spinbutton',{name:'Wheelchair width',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Enter office',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await page.evaluate(()=>document.exitPointerLock());
  await expect(page.locator('.subtitle-bar')).toContainText('entrance');
  expect(await page.evaluate(()=>(window as unknown as {spoken:string[]}).spoken)).toEqual([]);
  const subtitle=(await page.locator('.subtitle-bar').boundingBox())!;
  expect(subtitle.y).toBeGreaterThan(page.viewportSize()!.height*.65);
  expect(subtitle.y+subtitle.height).toBeLessThan(page.viewportSize()!.height);
  await page.getByRole('button',{name:/Journal/}).click();
  await page.getByRole('button',{name:/^Objects/}).click();
  await expect(page.locator('.object-catalog button')).toHaveCount(objects.filter(o=>!o.colleague).length);
  await expect(page.locator('.object-catalog')).not.toContainText('Nguyễn Mai Linh');
  await page.getByRole('button',{name:/^Colleagues/}).click();
  await expect(page.locator('.object-catalog button')).toHaveCount(7);
  await expect(page.locator('.object-catalog')).not.toContainText('Entrance door');
  await page.getByRole('dialog').getByRole('button',{name:/Nguyễn Mai Linh/}).click();
  await expect(page.getByRole('dialog')).toContainText('HR specialist');
  await page.getByRole('button',{name:'Leave a message',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save message',exact:true})).toBeDisabled();
  await page.getByRole('textbox',{name:'Message',exact:true}).fill('Xin chào Linh!\nNhờ bạn hỗ trợ nhận thẻ. <b>Cảm ơn</b>');
  await page.getByRole('button',{name:'Save message',exact:true}).click();
  await expect(page.locator('.letter-history')).toContainText('<b>Cảm ơn</b>');
  await expect(page.locator('.letter-history b')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText('not emailed');
  await page.screenshot({path:'test-results/english-colleague-message.png'});
  await page.reload();
  await page.getByRole('button',{name:'Enter office',exact:true}).click();
  await page.getByTestId('game-stage').focus();await page.keyboard.press('f');
  await page.getByRole('button',{name:'Leave a message',exact:true}).click();
  await expect(page.locator('.letter-history li')).toHaveCount(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dayzero.session.v1')!));
  expect(saved.language).toBe('en');expect(saved.letters[0].recipientId).toBe('colleague-linh');
  await page.getByRole('button',{name:'Continue exploring',exact:true}).click();
  await page.evaluate(()=>document.exitPointerLock());
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('.subtitle-bar')).toContainText('entrance');
});

test('automatic diagonal travel faces its movement in both camera modes despite mouse look', async ({page}) => {
  const session=seedSession();session.started=true;session.playerPose={x:0,z:1.5,yaw:Math.PI};session.openDoors=['entry-door'];
  await page.addInitScript(data=>localStorage.setItem('dayzero.session.v1',JSON.stringify(data)),session);
  await page.goto('/');await page.getByRole('button',{name:"Enter office",exact:true}).click();
  const stage=page.getByTestId('game-stage');
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('n');
  await page.getByRole('combobox',{name:"Destination",exact:true}).selectOption('colleague-linh');
  await stage.evaluate(el=>{
    const samples:{x:number;z:number;yaw:number}[]=[];
    Object.assign(window,{driveSamples:samples});
    new MutationObserver(()=>samples.push({x:Number(el.getAttribute('data-x')),z:Number(el.getAttribute('data-z')),yaw:Number(el.getAttribute('data-yaw'))})).observe(el,{attributes:true,attributeFilter:['data-x','data-z','data-yaw']});
  });
  await page.getByRole('button',{name:"Auto-walk here",exact:true}).click();
  for(let i=0;i<12;i++){
    if(i===2){await stage.focus();await page.keyboard.press('v');}
    await page.mouse.move(500+i*9,400+i*2);
    await page.waitForTimeout(130);
  }
  await expect(stage).toHaveAttribute('data-autowalk','false',{timeout:20000});
  const samples=await page.evaluate(()=>(window as unknown as {driveSamples:{x:number;z:number;yaw:number}[]}).driveSamples);
  const moving=samples.slice(1).map((b,i)=>({a:samples[i],b})).filter(({a,b})=>Math.hypot(b.x-a.x,b.z-a.z)>.025);
  expect(moving.length).toBeGreaterThan(3);
  expect(moving.some(({a,b})=>Math.abs(b.x-a.x)>.02&&Math.abs(b.z-a.z)>.02)).toBe(true);
  for(const {a,b} of moving){const heading=Math.atan2(a.x-b.x,a.z-b.z);expect(Math.abs(Math.atan2(Math.sin(heading-b.yaw),Math.cos(heading-b.yaw)))).toBeLessThan(.08);}
  await expect(stage).toHaveAttribute('data-camera','third-person');
});
