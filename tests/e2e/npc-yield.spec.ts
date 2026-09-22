import {test,expect} from './fixtures';
import {seedSession} from '../../src/lib/persistence';

test('a colleague blocking auto-walk steps aside and the chair continues without user input',async({page})=>{
  const uploaded:{kind:string;objectId:string}[]=[];
  page.on('request',request=>{if(request.url().endsWith('/api/collision-runs')&&request.method()==='POST')uploaded.push(...request.postDataJSON().events);});
  const session=seedSession();session.started=true;session.playerPose={x:0,z:-11.9,yaw:Math.PI/2,floor:1};
  await page.addInitScript(s=>localStorage.setItem('dayzero.session.v1',JSON.stringify(s)),session);
  await page.goto('/');
  // Place a stationary patrol on the open lobby route before the scene copies its objects.
  await page.evaluate(async()=>{
    const load=(p:string)=>import(/* @vite-ignore */ p);
    const {objects}=await load('/src/data/space.ts');
    const person=objects.find((o:{id:string})=>o.id==='colleague-huy');
    person.position=[-2,0,-11.9];person.patrol=[[-2,-11.9],[-2,-11.9]];
  });
  await page.getByRole('button',{name:'Enter office',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();
  const stage=page.getByTestId('game-stage');await stage.focus();await page.keyboard.press('n');
  await page.getByRole('combobox',{name:'Destination',exact:true}).selectOption('lift-1');
  await page.getByRole('button',{name:'Auto-walk here',exact:true}).click();
  await expect(page.locator('.subtitle-bar')).toContainText('is making room',{timeout:15000});
  await expect(stage).toHaveAttribute('data-autowalk','true');
  await expect(page.locator('.subtitle-bar')).toContainText('Arrived at Lift',{timeout:25000});
  await expect(stage).toHaveAttribute('data-autowalk','false');
  expect(Number(await stage.getAttribute('data-x'))).toBeLessThan(-7.1);
  expect(uploaded.filter(e=>e.kind==='colleague'||e.objectId.startsWith('colleague-'))).toEqual([]);
  const queued=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('dayzero.collisions.')).flatMap(k=>JSON.parse(localStorage.getItem(k)!).events));
  expect(queued.filter((e:{kind:string;objectId:string})=>e.kind==='colleague'||e.objectId.startsWith('colleague-'))).toEqual([]);
  await page.screenshot({path:'test-results/npc-yield.png'});
});
