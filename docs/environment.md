# متغیرهای محیطی

متغیرهای سرور هنگام اولین استفاده با Zod اعتبارسنجی می‌شوند (`src/server/env.ts`)؛ مقدار نامعتبر خطای روشن می‌دهد.
نمونهٔ کامل: [`.env.example`](../.env.example). رازها فقط در متغیرهای محیطی نگه داشته می‌شوند، نه در پایگاه داده یا کد.
پنل مدیریت ← تنظیمات فقط وضعیت پیکربندی (مثلاً «زرین‌پال پیکربندی شده») را نشان می‌دهد و هیچ کلیدی را نمایش نمی‌دهد.

## الزامی

| متغیر | توضیح |
|---|---|
| `DATABASE_URL` | نشانی PostgreSQL |
| `TOKEN_HASH_SECRET` | کلید HMAC برای هش توکن نشست‌ها، لینک‌های ایمیل و دسترسی مهمان به سفارش. حداقل ۳۲ کاراکتر تصادفی. تغییر آن همهٔ نشست‌ها و لینک‌های باز را باطل می‌کند |
| `APP_URL` | نشانی عمومی سایت (در محیط عملیاتی https). در لینک ایمیل‌ها، آدرس بازگشت درگاه، canonical و نقشهٔ سایت استفاده می‌شود و Secure بودن کوکی‌ها از آن تعیین می‌شود |

## عمومی و امنیت

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `NODE_ENV` | development | `production` در محیط عملیاتی |
| `LOG_LEVEL` | info | debug، info، warn، error — لاگ‌ها JSON و بدون رمز/توکن هستند |
| `DATABASE_POOL_MAX` | 10 | حداکثر اتصال هم‌زمان هر نمونهٔ برنامه |
| `CRON_SECRET` | — | کلید فراخوانی `POST /api/v1/internal/jobs` |
| `TRUSTED_PROXY_HOPS` | 0 | تعداد پروکسی‌های معکوس مورد اعتماد؛ IP کاربر برای محدودیت نرخ و ممیزی از X-Forwarded-For با همین تعداد خوانده می‌شود. اشتباه بودن آن امکان جعل IP را می‌دهد |
| `ALLOWED_ORIGINS` | — | مبدأهای اضافهٔ مجاز (با کاما) برای درخواست‌های تغییر داده علاوه بر `APP_URL` |
| `ERROR_WEBHOOK_URL` | — | ارسال خطاهای سرور به یک endpoint |

## ایمیل

| متغیر | توضیح |
|---|---|
| `EMAIL_PROVIDER` | `log` (ذخیره در `.data/mail`، فقط توسعه) یا `smtp` |
| `EMAIL_FROM` | فرستنده، مثلاً `روشاک <no-reply@example.com>` |
| `SMTP_HOST`، `SMTP_PORT`، `SMTP_SECURE`، `SMTP_USER`، `SMTP_PASSWORD` | تنظیمات SMTP |
| `STORE_NOTIFICATION_EMAIL` | دریافت اعلان سفارش جدید |

## ذخیره‌سازی تصاویر

| متغیر | توضیح |
|---|---|
| `STORAGE_DRIVER` | `local` یا `s3` |
| `LOCAL_STORAGE_DIR` | پوشهٔ فایل‌ها در حالت local (پیش‌فرض `./storage`) — از آن پشتیبان بگیرید |
| `S3_ENDPOINT`، `S3_REGION`، `S3_BUCKET`، `S3_ACCESS_KEY_ID`، `S3_SECRET_ACCESS_KEY`، `S3_FORCE_PATH_STYLE` | سرویس سازگار با S3 |
| `S3_PUBLIC_URL` | نشانی عمومی فایل‌ها؛ هنگام build در CSP و next/image مجاز می‌شود |

## پرداخت

| متغیر | توضیح |
|---|---|
| `PAYMENT_TEST_MODE` | فعال‌سازی درگاه آزمایشی (بدون پول واقعی) |
| `ALLOW_TEST_PAYMENTS_IN_PRODUCTION` | فقط برای staging؛ در محیط عملیاتی واقعی هرگز true نکنید |
| `PAYMENT_TEST_WEBHOOK_SECRET` | کلید امضای وب‌هوک درگاه آزمایشی |
| `ZARINPAL_MERCHANT_ID` | شناسهٔ پذیرندهٔ زرین‌پال؛ بدون آن زرین‌پال نمایش داده نمی‌شود |
| `ZARINPAL_SANDBOX` | استفاده از sandbox زرین‌پال |

درگاه واقعی فقط وقتی به مشتری نمایش داده می‌شود که هم کلیدش تنظیم شده باشد و هم در پنل ← تنظیمات ← «درگاه‌های پرداخت فعال» انتخاب شده باشد.

## سرویس‌های اختیاری

| متغیر | توضیح |
|---|---|
| `REDIS_URL` | محدودیت نرخ مشترک بین چند نمونهٔ برنامه (بدون آن، حافظهٔ هر نمونه) |
| `INSTAGRAM_ACCESS_TOKEN` | نمایش پست‌های اینستاگرام در صفحهٔ اصلی |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | مجاز کردن دامنه‌های Google Analytics در CSP هنگام build (اسکریپت آمار هنوز بارگذاری نمی‌شود — [status.md](status.md)) |
| `JOBS_INTERVAL_SECONDS` | فاصلهٔ اجرای `npm run jobs:run -- --loop` (پیش‌فرض ۳۰۰) |

## فقط توسعه و تست

| متغیر | توضیح |
|---|---|
| `LOCAL_PG_PORT`، `LOCAL_PG_USER`، `LOCAL_PG_PASSWORD`، `LOCAL_PG_DATA_DIR` | PostgreSQL محلی `npm run db:local` |
| `TEST_DATABASE_URL` | پایگاه دادهٔ تست‌های یکپارچه؛ نامش باید شامل `test` باشد و در هر اجرا خالی می‌شود |
| `SEED_ADMIN_EMAIL`، `SEED_ADMIN_PASSWORD` | حساب مدیر توسعه در `npm run db:seed` |
| `SEED_ALLOW_PRODUCTION` | اجازهٔ اجرای عمدی seed در محیط عملیاتی (توصیه نمی‌شود) |
| `E2E_BASE_URL`، `E2E_STAFF_EMAIL`، `E2E_STAFF_PASSWORD`، `E2E_BROWSER_CHANNEL` | تست‌های سرتاسری |
| `ADMIN_PASSWORD` | فقط برای اجرای غیرتعاملی `npm run admin:create` |
