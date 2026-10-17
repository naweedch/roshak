# استقرار در محیط عملیاتی

> پیش از راه‌اندازی عمومی فهرست [status.md](status.md) را بخوانید؛ به‌ویژه درگاه زرین‌پال هنوز با تراکنش واقعی آزموده نشده است.

## چک‌لیست پیش از راه‌اندازی

- [ ] `NODE_ENV=production` و `APP_URL` با **https**
- [ ] `TOKEN_HASH_SECRET` تصادفی و یکتا برای همین محیط (حداقل ۳۲ کاراکتر)
- [ ] `PAYMENT_TEST_MODE=false` (یا خالی) و `ALLOW_TEST_PAYMENTS_IN_PRODUCTION` خالی
- [ ] درگاه واقعی پیکربندی و یک تراکنش sandbox و یک تراکنش واقعی کم‌مبلغ بررسی شده — [integrations.md](integrations.md)
- [ ] `EMAIL_PROVIDER=smtp` با SMTP واقعی؛ ایمیل آزمایشی تأیید حساب دریافت شده
- [ ] `TRUSTED_PROXY_HOPS` مطابق تعداد پروکسی‌های جلوی برنامه
- [ ] `CRON_SECRET` و زمان‌بندی کارهای دوره‌ای (پایین)
- [ ] پشتیبان‌گیری روزانهٔ پایگاه داده و تصاویر — [database.md](database.md)
- [ ] اولین مدیر با `npm run admin:create` ساخته شده (هیچ رمز پیش‌فرضی وجود ندارد) — [first-admin.md](first-admin.md)
- [ ] seed نمونه روی محیط عملیاتی اجرا **نشده** و محصولات واقعی از پنل وارد شده‌اند
- [ ] تنظیمات فروشگاه (نام، تماس، شبکه‌های اجتماعی، حد ارسال رایگان، مالیات، مهلت مرجوعی، سئو) در پنل تکمیل شده

## روش ۱: Node.js مستقیم (خروجی standalone)

```bash
npm ci
npm run build                 # به پایگاه داده نیاز ندارد
npm run db:deploy             # با DATABASE_URL محیط عملیاتی
```

خروجی در `.next/standalone` است. فایل‌های ایستا را کنارش کپی کنید و اجرا کنید:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd .next/standalone
PORT=3000 HOSTNAME=127.0.0.1 node server.js
```

برنامه را با یک مدیر فرایند (systemd یا pm2) اجرا کنید تا پس از خطا یا راه‌اندازی دوبارهٔ سرور بالا بیاید.

> **مهم:** Next.js فایل `.env` موجود در پوشهٔ پروژه را هنگام build در `.next/standalone` کپی می‌کند تا `server.js` آن را بخواند.
> روی رایانهٔ توسعه (با رازهای توسعه) build نگیرید و خروجی را منتقل نکنید؛ build را روی سرور یا در CI با متغیرهای همان محیط انجام دهید،
> یا پیش از انتقال `.next/standalone/.env` را حذف و متغیرها را از مدیر فرایند/سرویس بدهید. ایمیج Docker این مشکل را ندارد (`.env` در `.dockerignore` است).
در حالت `STORAGE_DRIVER=local`، مسیر `LOCAL_STORAGE_DIR` را به پوشه‌ای ماندگار و بیرون از پوشهٔ build بدهید.

## روش ۲: Docker

```bash
cp .env.example .env.docker   # و مقادیر محیط عملیاتی را تنظیم کنید
docker compose --env-file .env.docker up -d --build
```

`APP_URL` هم هنگام ساخت ایمیج (به‌عنوان build arg، برای نشانی canonical و نقشهٔ سایتِ صفحات ایستا) و هم هنگام اجرا خوانده می‌شود؛ پس از تغییر آن ایمیج را دوباره بسازید (`--build`). در ساخت دستی: `docker build --build-arg APP_URL=https://example.com --target runner .`

حداقل متغیرهای لازم در `.env.docker`:

```dotenv
APP_URL=https://example.com
POSTGRES_PASSWORD=رمز-قوی
TOKEN_HASH_SECRET=رشتهٔ-تصادفی-حداقل-۳۲-کاراکتر
CRON_SECRET=رشتهٔ-تصادفی
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=روشاک <no-reply@example.com>
```

`docker-compose.yml` شامل این سرویس‌هاست: PostgreSQL 18، Redis، Mailpit (فقط برای آزمایش؛ در محیط عملیاتی SMTP واقعی بدهید)،
`migrate` (اعمال مهاجرت‌ها پیش از شروع)، `app` (وب‌سرور، کاربر غیر root، healthcheck روی `/api/health`)
و `jobs` (کارهای دوره‌ای). ساخت مدیر در Docker:

```bash
docker compose --env-file .env.docker run --rm -it migrate npm run admin:create -- --email owner@example.com
```

> Docker روی ماشین توسعهٔ این پروژه نصب نبود؛ `Dockerfile` و `docker-compose.yml` نوشته شده‌اند اما هنوز ساخته و اجرا نشده‌اند.
> پیش از استفاده یک‌بار `docker compose build` را اجرا و بررسی کنید.

## روش ۳: Vercel (با Neon و Vercel Blob)

فایل‌سیستم Vercel فقط‌خواندنی است؛ پس پایگاه داده روی Neon و تصاویر روی Vercel Blob نگه داشته می‌شوند.

1. در Vercel پروژه را از مخزن گیت‌هاب بسازید (Framework: Next.js؛ تنظیمات build پیش‌فرض).
2. در بخش **Storage** پروژه یک پایگاه دادهٔ **Neon** و یک انبار **Blob** بسازید و به پروژه وصل کنید؛ `DATABASE_URL` و `BLOB_READ_WRITE_TOKEN` خودکار اضافه می‌شوند.
3. متغیرهای زیر را در **Settings → Environment Variables** اضافه کنید:

```dotenv
APP_URL=https://نام-پروژه.vercel.app
STORAGE_DRIVER=blob
TOKEN_HASH_SECRET=رشتهٔ-تصادفی-حداقل-۳۲-کاراکتر
CRON_SECRET=رشتهٔ-تصادفی
DATABASE_POOL_MAX=3
EMAIL_PROVIDER=log          # یا smtp با تنظیمات SMTP واقعی
# فقط برای نسخهٔ نمایشی با درگاه آزمایشی:
PAYMENT_TEST_MODE=true
ALLOW_TEST_PAYMENTS_IN_PRODUCTION=true
```

4. مهاجرت و دادهٔ نمونه را یک‌بار از سیستم خودتان اجرا کنید (با نشانی مستقیم Neon، نه pooler):

```bash
vercel env pull .env.vercel.local
# DATABASE_URL را برابر DATABASE_URL_UNPOOLED همان فایل قرار دهید، سپس:
npx prisma migrate deploy
STORAGE_DRIVER=blob npm run db:seed        # اختیاری: کاتالوگ نمونه؛ تصاویر در Blob بارگذاری می‌شوند
npm run admin:create -- --email owner@example.com
```

5. `vercel.json` کارهای دوره‌ای را روزی یک‌بار (محدودیت پلن رایگان) با GET و هدر `Authorization: Bearer $CRON_SECRET` روی `/api/v1/internal/jobs` اجرا می‌کند.

> با `EMAIL_PROVIDER=log` ایمیلی ارسال نمی‌شود و فقط در پوشهٔ موقت سرور ثبت می‌شود؛ برای ارسال واقعی SMTP تنظیم کنید.

## پروکسی معکوس (nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name example.com;
  # ssl_certificate ... ;
  client_max_body_size 10m;            # بارگذاری تصویر تا ۸ مگابایت

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

با یک لایهٔ nginx مقدار `TRUSTED_PROXY_HOPS=1` است (با CDN جلوی nginx: `2`).
سربرگ‌های امنیتی (CSP، HSTS در production، X-Frame-Options و ...) را خود برنامه می‌فرستد.

## کارهای دوره‌ای

هر ۵ دقیقه یکی از این دو:

```bash
# فراخوانی HTTP (cron سیستم یا سرویس زمان‌بندی)
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://example.com/api/v1/internal/jobs

# یا فرایند جداگانه
npm run jobs:run -- --loop
```

این کارها: لغو سفارش‌های پرداخت‌نشده‌ای که مهلت رزروشان تمام شده و بازگرداندن موجودی (پیش از لغو، وضعیت پرداخت از درگاه استعلام می‌شود)،
ارسال صف ایمیل، پاک‌سازی نشست‌های منقضی و سبدهای مهمان رهاشده. **بدون آن، موجودی رزروشدهٔ سفارش‌های پرداخت‌نشده آزاد نمی‌شود.**

## چند نمونه از برنامه

- `REDIS_URL` را تنظیم کنید تا محدودیت نرخ بین نمونه‌ها مشترک باشد.
- `STORAGE_DRIVER=s3` (پوشهٔ محلی بین نمونه‌ها مشترک نیست).
- کارهای دوره‌ای را فقط یک‌جا زمان‌بندی کنید (صف ایمیل با `FOR UPDATE SKIP LOCKED` در برابر اجرای هم‌زمان امن است).

## پایش

- سلامت: `GET /api/health` (وضعیت پایگاه داده، بدون جزئیات داخلی)
- لاگ‌ها JSON روی stdout، با `requestId` در پاسخ خطاها؛ رمز، توکن و کوکی در لاگ پوشانده می‌شوند.
- `ERROR_WEBHOOK_URL` برای ارسال خطاها به سرویس اعلان.
