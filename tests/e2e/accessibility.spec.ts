/**
 * بررسی خودکار دسترس‌پذیری (axe) روی صفحات اصلی فروشگاه و ورود.
 * فقط تخلف‌های «جدی» و «بحرانی» باعث شکست می‌شوند؛ این جایگزین بازبینی دستی نیست.
 */
import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers";

const PAGES: Array<{ path: string; label: string }> = [
  { path: "/", label: "صفحهٔ اصلی" },
  { path: "/shop", label: "فروشگاه" },
  { path: "/cart", label: "سبد خرید" },
  { path: "/checkout", label: "تسویه" },
  { path: "/account/login", label: "ورود مشتری" },
  { path: "/admin/login", label: "ورود کارکنان" },
];

for (const { path, label } of PAGES) {
  test(`دسترس‌پذیری: ${label} @mobile`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSeriousA11yViolations(page, label);
  });
}

test("دسترس‌پذیری: صفحهٔ محصول @mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop");
  const href = await page.locator('main a[href^="/products/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yViolations(page, "صفحهٔ محصول");
});

test("صفحهٔ اصلی بدون حرکت (prefers-reduced-motion) کامل نمایش داده می‌شود", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // هیچ محتوایی با شفافیت صفر پنهان نمی‌ماند
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll("main h2")].filter((h) => Number(getComputedStyle(h).opacity) === 0).length,
  );
  expect(hidden).toBe(0);
});
