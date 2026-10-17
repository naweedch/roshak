/**
 * کنترل دسترسی پنل: بدون ورود به صفحهٔ ورود هدایت می‌شود و نقش «مدیر سفارش‌ها»
 * به تنظیمات و گزارش ممیزی دسترسی ندارد (هم در صفحه و هم در API).
 */
import { expect, test } from "@playwright/test";
import { staffLogin } from "./helpers";

test("بدون ورود، پنل مدیریت در دسترس نیست", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  const api = await page.request.get("/api/v1/admin/orders");
  expect(api.status()).toBe(401);
});

test("مدیر سفارش‌ها به تنظیمات و ممیزی دسترسی ندارد", async ({ page }) => {
  await staffLogin(page, process.env.E2E_STAFF_EMAIL, process.env.E2E_STAFF_PASSWORD);

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { level: 1, name: "سفارش‌ها" })).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "دسترسی ندارید" })).toBeVisible();

  const settings = await page.request.get("/api/v1/admin/settings");
  expect(settings.status()).toBe(403);
  const audit = await page.request.get("/api/v1/admin/audit");
  expect(audit.status()).toBe(403);

  // منوی پنل گزینهٔ تنظیمات را به این نقش نشان نمی‌دهد
  await expect(page.getByRole("navigation", { name: "منوی مدیریت" }).getByRole("link", { name: "تنظیمات" })).toHaveCount(0);
});

test("درخواست تغییر داده از مبدأ دیگر رد می‌شود", async ({ page }) => {
  await staffLogin(page, process.env.E2E_STAFF_EMAIL, process.env.E2E_STAFF_PASSWORD);
  const res = await page.request.post("/api/v1/admin/discounts", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { code: "EVIL1", type: "PERCENTAGE", scope: "ALL", value: "50" },
  });
  expect(res.status()).toBe(403);
});
