/**
 * تست‌های سرتاسری (Playwright).
 * به‌طور پیش‌فرض از سرور توسعهٔ در حال اجرا روی E2E_BASE_URL (پیش‌فرض http://localhost:3100) استفاده می‌شود؛
 * اگر سروری در دسترس نباشد، «npm run dev» روی همان پورت اجرا می‌شود.
 *
 * توجه: این تست‌ها روی پایگاه دادهٔ همان سرور (معمولاً دیتابیس توسعه) سفارش آزمایشی با ایمیل
 * e2e-*@example.com و درگاه آزمایشی ثبت می‌کنند؛ هرگز روی محیط عملیاتی اجرا نشوند.
 */
import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const port = new URL(baseURL).port || "3100";
// به‌طور محلی از Chrome نصب‌شده روی سیستم استفاده می‌شود (دانلود مرورگرهای Playwright از برخی شبکه‌ها ممکن نیست)؛
// در CI مرورگر داخلی Playwright (npx playwright install chromium) به کار می‌رود.
const channel = process.env.CI ? undefined : (process.env.E2E_BROWSER_CHANNEL ?? "chrome");

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    locale: "fa-IR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
