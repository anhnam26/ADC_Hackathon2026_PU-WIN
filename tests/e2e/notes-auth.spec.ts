import {test,expect} from '@playwright/test';
import {seedSession} from '../../src/lib/persistence';
test.beforeEach(async({page})=>{page.setDefaultTimeout(10000);await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type==='webgl2')return null;return original.call(this,type as '2d',...args);} as typeof original;});});

test('login, notes at any location, manager map review and employee response across sessions',async({page,browser})=>{
 test.setTimeout(90000);
 await page.goto('/');await expect(page.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill('employee@dayzero.local');await page.getByLabel('Mật khẩu',{exact:true}).fill('incorrect');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('alert')).toContainText('không đúng');
 await page.getByLabel('Mật khẩu',{exact:true}).fill('DayZero2026!');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu trải nghiệm',exact:true}).click();
 const stage=page.getByTestId('game-stage');await stage.focus();await page.keyboard.press('b');
 await expect(page.getByRole('dialog')).toContainText('Ghi chú không gian');
 const map=page.getByRole('group',{name:'Bản đồ ghi chú tầng 1'});await map.focus();await page.keyboard.press('ArrowRight');
 const concern=`Lối ngoài trời cần điều chỉnh ${Date.now()}`;
 await page.getByLabel('Bất cập bạn gặp',{exact:true}).fill(concern);await page.getByLabel('Nguyện vọng thay đổi',{exact:true}).fill('Tôi mong có mái che và chỗ dừng xe rộng hơn.');
 await page.getByRole('button',{name:'Gửi ghi chú cho quản lý',exact:true}).click();await expect(page.locator('.note-details')).toContainText(concern);await expect(page.locator('.note-details')).toContainText('X 0.25');
 const {notes}=await (await page.request.get('/api/notes')).json();const note=notes.find((n:{concern:string})=>n.concern===concern);expect(note.position).toMatchObject({floor:1,x:.25,z:10.5,y:0});
 expect((await page.request.patch(`/api/notes/${note.id}`,{data:{status:'approved',review:'forged',version:1}})).status()).toBe(403);
 const manager=await browser.newContext({baseURL:'http://127.0.0.1:5173'});const admin=await manager.newPage();admin.setDefaultTimeout(10000);
 try{
 await admin.goto('/admin');await admin.getByLabel('Email',{exact:true}).fill('manager@dayzero.local');await admin.getByLabel('Mật khẩu',{exact:true}).fill('DayZero2026!');await admin.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(admin.getByRole('heading',{name:'Lắng nghe từ từng vị trí.'})).toBeVisible();
 await admin.getByLabel('Tìm ghi chú hoặc người gửi',{exact:true}).fill(concern);
 const marker=admin.locator(`[data-note-id="${note.id}"]`);await expect(marker).toHaveAttribute('transform','translate(0.25 10.5)');await marker.click();await expect(admin.locator('.note-details')).toContainText('Tôi mong có mái che');
 await admin.getByRole('combobox',{name:'Kết quả xem xét',exact:true}).selectOption('approved');await admin.getByLabel('Đánh giá và phương án',{exact:true}).fill('Sẽ bố trí mái che và mở rộng điểm dừng trước ngày nhận việc.');await admin.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();await expect(admin.getByRole('status')).toContainText('Đã lưu đánh giá');
 await admin.screenshot({path:'test-results/notes-admin.png',fullPage:true});
 await admin.reload();await admin.getByLabel('Tìm ghi chú hoặc người gửi',{exact:true}).fill(concern);await admin.locator(`[data-note-id="${note.id}"]`).click();await expect(admin.locator('.note-details')).toContainText('Sẽ bố trí mái che');
 await page.getByRole('button',{name:'Tải lại',exact:true}).click();await expect(page.locator('.note-details')).toContainText('Chấp thuận');await expect(page.locator('.note-details')).toContainText('Sẽ bố trí mái che');await page.screenshot({path:'test-results/notes-employee.png',fullPage:true});
 await admin.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(admin.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();expect((await admin.request.get('/api/notes')).status()).toBe(401);
 }finally{await manager.close();}
});
test('upper floor notes preserve floor, position and height, and show under the correct admin floor',async({page,browser})=>{
 const session=seedSession();session.started=true;session.playerPose={x:-7.45,z:-11.9,yaw:0,floor:2,y:3.2};
 await page.addInitScript(s=>localStorage.setItem('dayzero.session.v1',JSON.stringify(s)),session);
 await page.request.post('/api/auth/login',{data:{email:'employee@dayzero.local',password:'DayZero2026!'}});
 await page.goto('/');await page.getByRole('button',{name:'Vào văn phòng',exact:true}).click();await page.getByTestId('game-stage').focus();await page.keyboard.press('b');
 const concern=`Tầng hai cần chỗ chờ ${Date.now()}`;await page.getByLabel('Bất cập bạn gặp',{exact:true}).fill(concern);await page.getByLabel('Nguyện vọng thay đổi',{exact:true}).fill('Bố trí điểm chờ cạnh thang máy.');await page.getByRole('button',{name:'Gửi ghi chú cho quản lý',exact:true}).click();await expect(page.locator('.note-details')).toContainText('Y 3.20');
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5173'});try{await context.request.post('/api/auth/login',{data:{email:'manager@dayzero.local',password:'DayZero2026!'}});const admin=await context.newPage();await admin.goto('/admin');await admin.getByLabel('Tìm ghi chú hoặc người gửi',{exact:true}).fill(concern);await expect(admin.locator('.map-note-pin')).toHaveCount(0);await admin.getByRole('combobox',{name:'Tầng',exact:true}).selectOption('2');await expect(admin.locator('.map-note-pin')).toHaveCount(1);await admin.locator('.map-note-pin').click();await expect(admin.locator('.note-details')).toContainText('Tầng 2');}finally{await context.close();}
});
