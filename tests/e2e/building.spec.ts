import {test,expect,type Page} from './fixtures';
import {seedSession} from '../../src/lib/persistence';

async function enter(page:Page,connection:'lift'|'stairs',walking=false){
  const session=seedSession();session.started=true;session.playerPose={x:connection==='lift'?-7.45:7.2,z:-11.9,yaw:connection==='lift'?Math.PI/2:-Math.PI/2,floor:1};if(walking)session.mobility.mode='walking';
  await page.addInitScript(data=>{if(!localStorage.getItem('dayzero.session.v1'))localStorage.setItem('dayzero.session.v1',JSON.stringify(data));},session);
  await page.goto('/');await page.getByRole('button',{name:'Vào văn phòng',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await page.getByTestId('game-stage').focus();
}
test('fresh session starts outside the two-storey facade and shows new ground-floor rooms',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Bắt đầu trải nghiệm',exact:true}).click();
  await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','1');
  await expect(page.getByTestId('floor-label')).toContainText('Ngoài tòa nhà');
  expect(Number(await page.getByTestId('game-stage').getAttribute('data-z'))).toBeGreaterThan(9);
  await expect(page.locator('.interact-button')).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();await expect(page.getByText('Đang mở văn phòng của bạn…')).toHaveCount(0);await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/building-outside.png'});
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'Xem toàn văn phòng',exact:true}).click();
  await expect(page.locator('.room-label').filter({hasText:'PHÒNG NHÂN SỰ'})).toBeVisible();
  await expect(page.locator('.room-label').filter({hasText:'PHÒNG ĐÀO TẠO'})).toBeVisible();
  await page.screenshot({path:'test-results/building-floor1.png'});
});
test('cross-floor autowalk routes via lift, resumes upstairs, persists and returns downstairs',async({page})=>{
  test.setTimeout(120000);
  await enter(page,'lift');const stage=page.getByTestId('game-stage');
  const board=async()=>{
    await page.getByRole('button',{name:'Gọi thang / Mở cửa',exact:true}).click();
    await expect(stage).toHaveAttribute('data-lift-phase','open',{timeout:20000});
    await stage.focus();await page.keyboard.down('a');
    try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[60]}).toBeLessThan(-9.85);}finally{await page.keyboard.up('a');}
    await page.waitForTimeout(150);await page.keyboard.press('f');
  };
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();await stage.focus();
  await page.keyboard.press('n');await page.getByRole('combobox',{name:'Điểm đến',exact:true}).selectOption('desk-b21');await page.getByRole('button',{name:'Tự đi đến đây',exact:true}).click();
  await expect(page.locator('.subtitle-bar')).toContainText('Đã đến Thang máy', {timeout:10000});
  await stage.focus();await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('190 × sâu 220');
  await board();
  await page.getByRole('button',{name:'Đi đến Tầng 2',exact:true}).click();
  await expect(stage).toHaveAttribute('data-floor','2',{timeout:20000});
  await expect(stage).toHaveAttribute('data-lift-phase','open');
  await stage.focus();await page.keyboard.down('d');
  try{await expect.poll(async()=>Number(await stage.getAttribute('data-x')),{intervals:[60]}).toBeGreaterThan(-7.6);}finally{await page.keyboard.up('d');}
  await expect(page.locator('.subtitle-bar')).toContainText('Đã đến Bàn làm việc B21',{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'3D',exact:true}).click();await page.getByRole('button',{name:'Xem toàn văn phòng',exact:true}).click();
  await expect(page.locator('.room-label').filter({hasText:'PHÒNG HỌP SKY'})).toBeVisible();
  await page.screenshot({path:'test-results/building-floor2.png'});
  await page.waitForTimeout(1000);await page.reload();await page.getByRole('button',{name:'Vào văn phòng',exact:true}).click();await expect(stage).toHaveAttribute('data-floor','2');
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);await page.evaluate(()=>document.exitPointerLock());await page.getByRole('button',{name:'2D',exact:true}).click();
  await stage.focus();await page.keyboard.press('n');await page.getByRole('combobox',{name:'Điểm đến',exact:true}).selectOption('lift-2');await page.getByRole('button',{name:'Tự đi đến đây',exact:true}).click();
  await expect(page.locator('.subtitle-bar')).toContainText('Đã đến Thang máy',{timeout:30000});await stage.focus();await page.keyboard.press('f');
  await board();
  await page.getByRole('button',{name:'Đi đến Tầng 1',exact:true}).click();await expect(stage).toHaveAttribute('data-floor','1',{timeout:20000});
});
test('wheelchair uses lift alternative at stairs',async({page})=>{
  await enter(page,'stairs');await expect(page.locator('.interact-button')).toContainText('Thang bộ');await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toContainText('Xe lăn không đi qua');
  await expect(page.getByRole('button',{name:'Đi đến Tầng 2',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Dẫn đường đến thang máy',exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-autowalk','true');
});
test('walking mode can use stairs in both directions',async({page})=>{
  await enter(page,'stairs',true);await expect(page.locator('.interact-button')).toContainText('Thang bộ');await page.keyboard.press('f');
  await page.getByRole('button',{name:'Đi đến Tầng 2',exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','2');
  await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
  await expect(page.locator('.interact-button')).toContainText('Thang bộ · Tầng 2');await page.getByTestId('game-stage').focus();await page.keyboard.press('f');await page.getByRole('button',{name:'Đi đến Tầng 1',exact:true}).click();await expect(page.getByTestId('game-stage')).toHaveAttribute('data-floor','1');
});
