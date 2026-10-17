/** ابزارهای مشترک تست‌های سرتاسری */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * بررسی دسترس‌پذیری با axe؛ فقط خطاهای جدی و بحرانی باعث شکست می‌شوند.
 * صفحه باید با reducedMotion باز شده باشد تا کنتراست رنگ در میانهٔ انیمیشن‌های محوشدن اندازه‌گیری نشود.
 */
export async function expectNoSeriousA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // بوم WebGL تزئینی است و aria-hidden دارد
    .exclude("canvas")
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} مورد، نمونه: ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `خطاهای دسترس‌پذیری در ${label}`).toEqual([]);
}

/** ورود کارمند از فرم پنل؛ مقادیر از متغیرهای محیطی خوانده می‌شوند و در گزارش چاپ نمی‌شوند */
export async function staffLogin(page: Page, email: string | undefined, password: string | undefined) {
  if (!email || !password) throw new Error("اطلاعات ورود کارمند آزمایشی در .env تنظیم نشده است");
  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "ایمیل", exact: true }).fill(email);
  await page.getByLabel(/^رمز عبور/).fill(password);
  await page.getByRole("button", { name: /ورود/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 30_000 });
}
