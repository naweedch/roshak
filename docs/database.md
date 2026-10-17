# پایگاه داده، مهاجرت و پشتیبان‌گیری

PostgreSQL (آزموده با نسخهٔ 18) و Prisma 7 با آداپتور `@prisma/adapter-pg`. طرح در `prisma/schema.prisma`.

## اصول طرح

- شناسه‌ها UUIDv7، زمان‌ها `timestamptz`، مبالغ `Decimal(16,2)` (هیچ محاسبهٔ پولی با float نیست).
- قیدهای CHECK (موجودی نامنفی، مبالغ نامنفی، تک‌سطری بودن تنظیمات و ...) و ایندکس‌های یکتای جزئی
  (یک نشانی پیش‌فرض برای هر کاربر، حداکثر یک پرداخت موفق برای هر سفارش) به‌صورت دستی در SQL مهاجرت اضافه شده‌اند.
- سفارش‌ها نسخهٔ ثابت (snapshot) نام، قیمت، SKU و نشانی را نگه می‌دارند؛ ویرایش محصول سفارش‌های قبلی را تغییر نمی‌دهد.
- هر تغییر موجودی یک ردیف `InventoryMovement` و هر اقدام کارمند یک ردیف `AdminAuditLog` دارد.

## دستورها

| دستور | کاربرد |
|---|---|
| `npm run db:migrate` | توسعه: ساخت مهاجرت جدید از تغییر طرح و اعمال آن |
| `npm run db:deploy` | اعمال مهاجرت‌های موجود (CI و محیط عملیاتی) — هرگز `migrate dev` را روی محیط عملیاتی اجرا نکنید |
| `npm run db:seed` | دادهٔ نمونه (در production اجرا نمی‌شود) |
| `npm run db:reset` | فقط توسعه: حذف کامل داده‌ها و اعمال دوبارهٔ مهاجرت‌ها و seed |
| `npm run db:studio` | مرور داده‌ها با Prisma Studio |

### افزودن مهاجرت

1. `prisma/schema.prisma` را تغییر دهید.
2. `npm run db:migrate -- --name توضیح_کوتاه` (نام لاتین).
3. اگر قید CHECK یا ایندکس جزئی لازم است، به انتهای `migration.sql` همان مهاجرت اضافه کنید.
4. پیش از استقرار، مهاجرت را روی کپی دادهٔ واقعی آزمایش کنید. تغییرهای مخرب (حذف ستون، تغییر نوع) را در دو مرحله انجام دهید:
   ابتدا کد سازگار با هر دو حالت، سپس حذف.

## پشتیبان‌گیری

دو چیز را پشتیبان بگیرید: **پایگاه داده** و **پوشهٔ تصاویر** (`LOCAL_STORAGE_DIR` یا سطل S3).

```bash
# پشتیبان کامل (قالب فشرده‌شدهٔ custom)
pg_dump --format=custom --no-owner --file=roshak-$(date +%F).dump "$DATABASE_URL"

# بازگردانی در پایگاه دادهٔ خالی
pg_restore --no-owner --clean --if-exists --dbname="$DATABASE_URL" roshak-2026-10-17.dump

# تصاویر (حالت local)
tar -czf media-$(date +%F).tar.gz storage/
```

در Docker:

```bash
docker compose exec -T postgres pg_dump -U roshak --format=custom roshak > roshak.dump
docker compose exec -T postgres pg_restore -U roshak -d roshak --clean --if-exists < roshak.dump
```

پیشنهاد: پشتیبان روزانه با نگهداری حداقل ۱۴ روز، نگهداری خارج از همان سرور، و آزمایش دوره‌ای بازگردانی.

## دادهٔ شخصی

جدول‌های `User`، `Address`، `Order` و `ContactMessage` دادهٔ شخصی دارند. رمزها با Argon2id هش می‌شوند و توکن‌ها فقط به‌صورت HMAC ذخیره می‌شوند.
اطلاعات کارت بانکی هرگز ذخیره نمی‌شود (فقط شمارهٔ کارت ماسک‌شده‌ای که درگاه برمی‌گرداند).
