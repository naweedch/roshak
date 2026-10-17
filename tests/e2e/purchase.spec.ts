/**
 * مسیر کامل خرید مهمان: فروشگاه ← صفحهٔ محصول ← سبد ← تسویه ← درگاه آزمایشی ← تأیید سفارش،
 * و سپس دیده‌شدن همان سفارش در پنل مدیریت.
 */
import { expect, test } from "@playwright/test";
import { staffLogin } from "./helpers";

test.describe.configure({ mode: "serial" });

let orderNumber = "";

// اولین بازدید هر مسیر در حالت توسعه کامپایل می‌شود؛ این مسیرهای چندصفحه‌ای زمان بیشتری لازم دارند
test.setTimeout(240_000);

test("خرید مهمان با درگاه آزمایشی تا تأیید سفارش", async ({ page }) => {
  await page.goto("/shop");
  const productLinks = page.locator('main a[href^="/products/"]');
  await expect(productLinks.first()).toBeVisible();
  const hrefs = [...new Set(await productLinks.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? "")))].filter(Boolean).slice(0, 6);

  // نخستین ترکیب رنگ و سایز موجود را در محصولات فروشگاه پیدا کن
  let picked = false;
  for (const href of hrefs) {
    await page.goto(href);
    const colors = page.getByRole("radiogroup", { name: "انتخاب رنگ" }).getByRole("radio");
    const colorCount = Math.max(1, await colors.count());
    for (let c = 0; c < colorCount && !picked; c++) {
      if ((await colors.count()) > 0) {
        const color = colors.nth(c);
        if (((await color.getAttribute("aria-label")) ?? "").includes("ناموجود")) continue;
        await color.click();
      }
      const sizes = page.getByRole("radiogroup", { name: "انتخاب سایز" }).getByRole("radio");
      const sizeCount = await sizes.count();
      for (let i = 0; i < sizeCount; i++) {
        const size = sizes.nth(i);
        if (((await size.getAttribute("aria-label")) ?? "").includes("ناموجود") || (await size.isDisabled())) continue;
        await size.click();
        picked = true;
        break;
      }
    }
    if (picked) break;
  }
  expect(picked, "در هیچ‌یک از محصولات فروشگاه سایز موجودی یافت نشد").toBe(true);

  const addResponse = page.waitForResponse((r) => r.url().includes("/api/v1/cart/items") && r.request().method() === "POST");
  await page.getByRole("button", { name: "افزودن به سبد خرید" }).click();
  expect((await addResponse).ok()).toBe(true);

  await page.goto("/checkout");
  const email = `e2e-${Date.now()}@example.com`;
  // نام دسترس‌پذیر فیلدها بدون ستارهٔ «الزامی» است؛ پس با نقش و نام انتخاب می‌شوند
  // فقط فرم تسویه (فرم خبرنامهٔ پاورقی هم فیلد «ایمیل» دارد)
  const main = page.getByRole("main");
  const field = (name: string) => main.getByRole("textbox", { name, exact: true });
  await field("نام").fill("آزمون");
  await field("نام خانوادگی").fill("سرتاسری");
  await field("ایمیل").fill(email);
  await field("شمارهٔ موبایل").fill("09123456789");
  await field("نام تحویل‌گیرنده").fill("آزمون سرتاسری");
  await field("موبایل تحویل‌گیرنده").fill("09123456789");
  await main.getByRole("combobox", { name: "استان", exact: true }).selectOption("تهران");
  await field("شهر").fill("تهران");
  await field("نشانی کامل").fill("خیابان آزمایش، کوچهٔ تست سرتاسری، پلاک ۷");
  await field("کد پستی").fill("1345678901");
  await page.getByRole("radiogroup", { name: "روش ارسال" }).getByRole("radio").first().check();
  await page.getByRole("radiogroup", { name: "روش پرداخت" }).locator('input[value="TEST"]').check();
  await page.locator('input[name="acceptTerms"]').check();

  await page.getByRole("button", { name: "ثبت سفارش و پرداخت" }).click();
  // فقط رسیدن نشانی کافی است (رویداد load ممکن است با بارگذاری تصاویر دیر شود)
  await page.waitForURL(/\/payment\/test-gateway\//, { timeout: 60_000, waitUntil: "commit" });
  await expect(page.getByText(/آزمایشی/).first()).toBeVisible({ timeout: 60_000 });

  // کلیک پیش از hydration صفحه اثری ندارد؛ تا ارسال واقعی درخواست تصمیم تکرار می‌شود
  await expect(async () => {
    const decided = page.waitForResponse((r) => r.url().includes("/api/v1/payments/test-gateway/") && r.request().method() === "POST", { timeout: 5_000 });
    await page.getByRole("button", { name: "شبیه‌سازی پرداخت موفق" }).click();
    await decided;
  }).toPass({ timeout: 90_000 });
  await page.waitForURL(/\/checkout\/result/, { timeout: 60_000, waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("سفارش شما ثبت شد", { timeout: 60_000 });

  const match = page.url().match(/order=(RSK-[0-9A-Z-]+)/);
  expect(match).not.toBeNull();
  orderNumber = decodeURIComponent(match![1]);
});

test("سفارش ثبت‌شده در پنل مدیریت با وضعیت پرداخت‌شده دیده می‌شود", async ({ page }) => {
  test.skip(!orderNumber, "سفارش آزمون قبلی ثبت نشد");
  await staffLogin(page, process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  await page.goto(`/admin/orders?q=${encodeURIComponent(orderNumber)}`);
  const row = page.getByRole("row").filter({ hasText: orderNumber });
  await expect(row).toBeVisible();
  await expect(row).toContainText("پرداخت شده");
  await row.getByRole("link", { name: orderNumber }).click();
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/, { timeout: 60_000, waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(orderNumber, { timeout: 60_000 });
  await expect(page.getByText("تغییر وضعیت")).toBeVisible();
});
