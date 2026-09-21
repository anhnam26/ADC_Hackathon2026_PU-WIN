import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("keyboard dialog, reduced motion, blocked writes and accessible 2D experience", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Bắt đầu trải nghiệm", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".storage-notice")).toContainText(
    "không cho phép lưu",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const violations = report.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }));
  expect(violations).toEqual([]);
  const trigger = page.getByRole("button", {
    name: "Ghi nhận một vấn đề",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Lưu vào tổng kết" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("lost WebGL context preserves the current journey and switches to 2D", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Bắt đầu trải nghiệm", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: /09:30/ }).click();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".map2d")).toBeVisible();
  await expect(page.locator(".activity-title")).toContainText(
    "Buổi họp chào mừng",
  );
  await expect(page.locator(".fallback-note")).toBeVisible();
});
