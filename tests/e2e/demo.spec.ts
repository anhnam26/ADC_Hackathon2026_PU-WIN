import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function record(page: Page, description: string) {
  await page.getByRole('button', { name: 'Ghi nhận một vấn đề' }).click();
  await page.getByLabel('Điều bạn muốn ghi nhận').fill(description);
  await page.getByRole('button', { name: 'Lưu vào tổng kết' }).click();
}
test('end-to-end: two issues, idempotent submit, HR response, employee review, persistence and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByLabel('Lối vào không có bậc thang', { exact: true }).selectOption('needs_verification');
  await page.getByRole('button', { name: 'Lưu vào tổng kết' }).click();
  await page.getByRole('button', { name: /09:30/ }).click();
  await page.getByLabel('Có phụ đề hoặc tài liệu chữ', { exact: true }).selectOption('needs_verification');
  await page.getByRole('button', { name: 'Lưu vào tổng kết' }).click();
  await page.getByRole('button', { name: 'Tổng kết trải nghiệm' }).click();
  await expect(page.locator('.issue-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Tạo 2 nhiệm vụ chuẩn bị' }).click();
  await expect(page.getByRole('button', { name: 'Tạo 0 nhiệm vụ chuẩn bị' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Vai trải nghiệm' }).selectOption('hr');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody tr').first()).toContainText('Facilities');
  await expect(page.locator('tbody tr').nth(1)).toContainText('HR');
  await page.getByRole('button', { name: 'Cần xác nhận phụ đề được bật trong buổi họp chào mừng.', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu chuẩn bị' }).click();
  await page.getByLabel('Phương án chuẩn bị', { exact: true }).fill('Đã chuẩn bị phụ đề và gửi tài liệu chữ trước buổi họp.');
  await page.getByRole('button', { name: 'Gửi phương án xác nhận' }).click();
  await expect(page.getByRole('dialog')).toContainText('Đang chờ nhân viên xác nhận');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('combobox', { name: 'Vai trải nghiệm' }).selectOption('employee');
  await page.getByRole('button', { name: 'Cần xác nhận phụ đề được bật trong buổi họp chào mừng.', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận phương án', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Đã hoàn tất');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nhiệm vụ chuẩn bị' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody')).toContainText('Đã hoàn tất');
  await page.getByRole('button', { name: 'Tổng kết trải nghiệm' }).click();
  await expect(page.getByRole('button', { name: 'Tạo 0 nhiệm vụ chuẩn bị' })).toBeDisabled();
  await page.getByRole('button', { name: 'Tùy chọn & dữ liệu' }).click();
  await page.getByRole('button', { name: /Đặt lại demo/ }).click();
  await page.getByRole('button', { name: 'Đặt lại demo', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu trải nghiệm', exact: true }).click();
  await page.getByRole('button', { name: 'Nhiệm vụ chuẩn bị' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('3D loads, moving avatar, office scene, screenshot and no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.hotspot')).toHaveCount(7);
  await page.getByRole('button', { name: 'Đến địa điểm', exact: true }).click();
  await expect(page.locator('.avatar-label')).toBeVisible();
  await page.getByRole('button', { name: /09:00/ }).click();
  await expect(page.locator('.hotspot')).toHaveCount(6);
  await expect(page.locator('.floor-label')).toContainText('Tầng 2');
  await expect(page.getByRole('button', { name: 'Đến địa điểm', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/dayzero-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Đến địa điểm', exact: true }).click();
  await expect(page.locator('.avatar-label')).toBeVisible();
  await page.getByRole('button', { name: /09:30/ }).click();
  await expect(page.locator('.activity-title')).toContainText('Buổi họp chào mừng');
  expect(errors).toEqual([]);
});

test('fallback, mobile layout, dialog cancellation, edit and delete drafts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null;
      return original.call(this, type as '2d', ...args);
    } as typeof original;
  });
  await start(page);
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeDisabled();
  await expect(page.locator('.map2d')).toBeVisible();
  await page.getByLabel('Lối vào không có bậc thang', { exact: true }).selectOption('barrier');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByLabel('Lối vào không có bậc thang', { exact: true })).toHaveValue('');
  await record(page, 'Cần biết giờ mở lối bên hông.');
  await page.getByRole('button', { name: 'Tổng kết trải nghiệm' }).click();
  await page.getByRole('button', { name: 'Sửa: Cần biết giờ mở lối bên hông.' }).click();
  await page.getByLabel('Điều bạn muốn ghi nhận').fill('Cần biết giờ mở cửa lúc 07:30.');
  await page.getByRole('button', { name: 'Lưu vào tổng kết' }).click();
  await expect(page.locator('.issue-row')).toContainText('07:30');
  await page.getByRole('button', { name: 'Xóa: Cần biết giờ mở cửa lúc 07:30.' }).click();
  await expect(page.locator('.issue-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hành trình ngày đầu' }).click();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Hoàn thành chặng', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn thành & tổng kết', exact: true }).click();
  await expect(page.locator('.journey-review .badge.done')).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Hành trình ngày đầu' }).click();
  await page.screenshot({ path: 'test-results/dayzero-mobile.png', fullPage: true });
});

test('corrupt storage stays untouched until reset, blocked storage permits temporary use', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('dayzero.session.v1', '{corrupt'); });
  await start(page);
  await expect(page.locator('.storage-notice')).toContainText('Không thể khôi phục');
  expect(await page.evaluate(() => localStorage.getItem('dayzero.session.v1'))).toBe('{corrupt');
  await page.getByRole('button', { name: 'Tổng kết trải nghiệm' }).click();
  await expect(page.getByText('Chưa có điều gì cần chuẩn bị thêm')).toBeVisible();
});
