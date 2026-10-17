# راه‌اندازی محیط توسعه

## پیش‌نیازها

- Node.js 24 (نسخهٔ آزموده: 24.15) و npm
- بدون Docker: PostgreSQL محلی با `npm run db:local` (بستهٔ embedded-postgres، باینری واقعی PostgreSQL 18)
- با Docker (اختیاری): `docker compose` — [deployment.md](deployment.md)

## گام‌ها

1. نصب وابستگی‌ها (prisma generate خودکار اجرا می‌شود):
   ```bash
   npm install
   ```
2. فایل محیط:
   ```bash
   cp .env.example .env
   ```
   سپس پر کنید:
   - `TOKEN_HASH_SECRET`: رشتهٔ تصادفی حداقل ۳۲ کاراکتر
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
   - `LOCAL_PG_PASSWORD` و همان رمز در `DATABASE_URL` و `TEST_DATABASE_URL`
   - `SEED_ADMIN_EMAIL` و `SEED_ADMIN_PASSWORD` (حداقل ۱۲ کاراکتر) برای حساب مدیر توسعه
3. PostgreSQL محلی (در ترمینال جداگانه، باز بماند):
   ```bash
   npm run db:local
   ```
   داده‌ها بیرون از پروژه در `~/.roshnak/postgres` نگه داشته می‌شوند (قابل تغییر با `LOCAL_PG_DATA_DIR`).
   پایگاه‌های `roshnak` (توسعه) و `roshnak_test` (تست) ساخته می‌شوند.
4. مهاجرت و دادهٔ نمونه:
   ```bash
   npm run db:deploy
   npm run db:seed
   ```
   seed پنج محصول با عکس‌های واقعی، دسته‌ها، مجموعه‌ها، صفحات، پرسش‌ها، مقاله‌ها، روش‌های ارسال و حساب مدیر توسعه می‌سازد.
   seed در `NODE_ENV=production` اجرا نمی‌شود.
5. اجرای سایت:
   ```bash
   npm run dev -- -p 3100
   ```
   فروشگاه: `http://localhost:3100` — پنل: `http://localhost:3100/admin/login`

## پرداخت در توسعه

با `PAYMENT_TEST_MODE=true` «درگاه آزمایشی» در تسویه نمایش داده می‌شود. در صفحهٔ درگاه آزمایشی
(`/payment/test-gateway/...`) نتیجهٔ موفق یا ناموفق را انتخاب کنید؛ تأیید پرداخت مثل درگاه واقعی سمت سرور انجام می‌شود.
هیچ پولی جابه‌جا نمی‌شود.

## ایمیل در توسعه

با `EMAIL_PROVIDER=log` ایمیل‌ها ارسال نمی‌شوند و در پوشهٔ `.data/mail` ذخیره می‌شوند (لینک تأیید ایمیل و بازیابی رمز را از همان‌جا بردارید).
صف ایمیل پس از هر درخواست و با `npm run jobs:run` پردازش می‌شود.

## تست‌ها

```bash
npm run test:unit
npm run test:integration   # نیاز به PostgreSQL و TEST_DATABASE_URL (نام پایگاه باید شامل test باشد؛ محتوایش پاک می‌شود)
npm run test:e2e           # نیاز به سرور در حال اجرا روی E2E_BASE_URL یا اجرای خودکار npm run dev
```

تست‌های سرتاسری روی پایگاه دادهٔ همان سرور (معمولاً پایگاه توسعه) سفارش آزمایشی با ایمیل `e2e-*@example.com` و
درگاه آزمایشی ثبت می‌کنند و موجودی محصولات را کم می‌کنند. برای تست مجوزها یک حساب کارمند با نقش ORDER_MANAGER لازم است:

```bash
ADMIN_PASSWORD='...' npm run admin:create -- --email qa-orders@roshak.local --role ORDER_MANAGER
```

و `E2E_STAFF_EMAIL` / `E2E_STAFF_PASSWORD` را در `.env` تنظیم کنید. به‌طور محلی Playwright از Chrome نصب‌شده روی سیستم
استفاده می‌کند (`E2E_BROWSER_CHANNEL`)؛ اگر Chrome ندارید `E2E_BROWSER_CHANNEL=msedge` یا `npx playwright install chromium`.
