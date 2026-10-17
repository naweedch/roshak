/** طرح‌های اعتبارسنجی پنل مدیریت (مشترک بین فرم‌ها و API) */
import { z } from "zod";
import { ACCENT_KEYS } from "../accent";
import { CURRENCY_CODES } from "../currency";
import { toEnglishDigits } from "../persian";
import { STAFF_ROLES } from "../rbac";
import { hrefSchema, moneyInputSchema, optionalHrefSchema, optionalText, slugSchema, text, uuidSchema } from "./common";

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v) => (v === null || v === undefined || String(v).trim() === "" ? null : toEnglishDigits(String(v)).replace(/[,٬\s]/g, "")))
  .pipe(z.string().regex(/^\d{1,14}(\.\d{1,2})?$/, { error: "مبلغ نامعتبر است" }).nullable());

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { error: "تاریخ نامعتبر است" });

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || v.startsWith("/") || /^https:\/\//.test(v), { error: "نشانی باید داخلی یا https باشد" });

export const productSchema = z
  .object({
    name: text(2, 160, "نام محصول"),
    slug: slugSchema,
    subtitle: optionalText(200, "زیرعنوان"),
    description: text(10, 8000, "توضیحات"),
    fabric: optionalText(400, "پارچه"),
    careInstructions: optionalText(1000, "دستور نگهداری"),
    modelInfo: optionalText(300, "اندازهٔ مدل"),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    categoryId: uuidSchema,
    sizeGuideId: uuidSchema.nullable().optional(),
    length: z.enum(["MINI", "KNEE", "MIDI", "MAXI", "FLOOR"]).nullable().optional(),
    price: moneyInputSchema,
    salePrice: optionalMoney,
    isFeatured: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
    publishedAt: optionalDate,
    collectionIds: z.array(uuidSchema).max(30).default([]),
    seoTitle: optionalText(70, "عنوان سئو"),
    seoDescription: optionalText(170, "توضیح سئو"),
    model3dUrl: optionalUrl,
  })
  .refine((p) => p.salePrice === null || Number(p.salePrice) < Number(p.price), { error: "قیمت ویژه باید کمتر از قیمت اصلی باشد", path: ["salePrice"] });
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const variantSchema = z.object({
  colorId: uuidSchema,
  sizeId: uuidSchema,
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,40}$/, { error: "کد کالا فقط حروف لاتین بزرگ، عدد و خط تیره" }),
  initialStock: z.coerce.number().int().min(0).max(100000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const variantUpdateSchema = z.object({
  sku: variantSchema.shape.sku.optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  delta: z.coerce.number().int().min(-100000).max(100000).refine((v) => v !== 0, { error: "مقدار تغییر نمی‌تواند صفر باشد" }),
  reason: z.enum(["ADJUSTMENT", "RESTOCK", "CORRECTION", "RETURN"]),
  note: optionalText(300, "توضیح"),
});

export const imageMetaSchema = z.object({
  alt: text(3, 200, "متن جایگزین تصویر"),
  colorId: uuidSchema.nullable().optional(),
  kind: z.enum(["GALLERY", "VIEW360"]).default("GALLERY"),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

export const imageOrderSchema = z.object({ imageIds: z.array(uuidSchema).min(1).max(200) });

export const categorySchema = z.object({
  name: text(2, 80, "نام دسته"),
  slug: slugSchema,
  description: optionalText(1000, "توضیحات"),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200, "متن جایگزین"),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isVisible: z.boolean().default(true),
  seoTitle: optionalText(70, "عنوان سئو"),
  seoDescription: optionalText(170, "توضیح سئو"),
});

export const collectionSchema = categorySchema.extend({
  subtitle: optionalText(120, "زیرعنوان"),
  type: z.enum(["CURATED", "SEASON", "OCCASION", "CAMPAIGN"]),
  accentColor: z.enum(ACCENT_KEYS).nullable().optional(),
  isFeatured: z.boolean().default(false),
});

export const discountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, { error: "کد تخفیف فقط حروف لاتین، عدد، - و _ (۳ تا ۴۰ کاراکتر)" }),
    description: optionalText(300, "توضیح"),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
    scope: z.enum(["ALL", "PRODUCTS", "COLLECTIONS"]),
    value: moneyInputSchema,
    currency: z.enum(CURRENCY_CODES).nullable().optional(),
    maxDiscountAmount: optionalMoney,
    minOrderAmount: optionalMoney,
    startsAt: optionalDate,
    endsAt: optionalDate,
    usageLimit: z.coerce.number().int().min(1).max(10_000_000).nullable().optional(),
    perCustomerLimit: z.coerce.number().int().min(1).max(1000).nullable().optional(),
    isActive: z.boolean().default(true),
    productIds: z.array(uuidSchema).max(500).default([]),
    collectionIds: z.array(uuidSchema).max(100).default([]),
  })
  .refine((d) => d.type !== "PERCENTAGE" || Number(d.value) <= 100, { error: "درصد تخفیف حداکثر ۱۰۰ است", path: ["value"] })
  .refine((d) => d.type !== "FIXED_AMOUNT" || Boolean(d.currency), { error: "ارز تخفیف مبلغ ثابت را انتخاب کنید", path: ["currency"] })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, { error: "تاریخ پایان باید بعد از شروع باشد", path: ["endsAt"] })
  .refine((d) => d.scope !== "PRODUCTS" || d.productIds.length > 0, { error: "حداقل یک محصول انتخاب کنید", path: ["productIds"] })
  .refine((d) => d.scope !== "COLLECTIONS" || d.collectionIds.length > 0, { error: "حداقل یک مجموعه انتخاب کنید", path: ["collectionIds"] });

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
  carrier: optionalText(80, "شرکت حمل"),
  trackingNumber: optionalText(80, "کد رهگیری"),
  trackingUrl: optionalHrefSchema,
  note: optionalText(1000, "یادداشت"),
  notifyCustomer: z.boolean().default(true),
  restockReturned: z.boolean().default(false),
  cancelReason: z.enum(["CUSTOMER_REQUEST", "PAYMENT_FAILED", "PAYMENT_EXPIRED", "OUT_OF_STOCK", "FRAUD_SUSPECTED", "ADMIN_DECISION"]).optional(),
});

export const refundSchema = z.object({
  amount: moneyInputSchema,
  reason: text(3, 300, "علت بازپرداخت"),
  method: optionalText(80, "روش بازپرداخت"),
  reference: optionalText(120, "شمارهٔ پیگیری بازپرداخت"),
  idempotencyKey: uuidSchema,
});

export const noteSchema = z.object({ note: text(2, 2000, "یادداشت") });

export const customerUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  role: z.enum([...STAFF_ROLES, "CUSTOMER"]).optional(),
});

export const bannerSchema = z.object({
  placement: z.enum(["HOME_HERO", "HOME_CAMPAIGN", "HOME_STORY"]),
  eyebrow: optionalText(80, "برچسب بالایی"),
  title: text(2, 160, "عنوان"),
  subtitle: optionalText(400, "متن"),
  ctaLabel: optionalText(40, "متن دکمه"),
  ctaHref: optionalHrefSchema,
  secondaryCtaLabel: optionalText(40, "متن دکمهٔ دوم"),
  secondaryCtaHref: optionalHrefSchema,
  imageUrl: optionalUrl,
  imageAlt: optionalText(200, "متن جایگزین تصویر"),
  mobileImageUrl: optionalUrl,
  /** ویدئوی فشردهٔ اسلاید؛ تصویر اصلی به‌عنوان پوستر و جایگزین (کاهش حرکت/خطای پخش) استفاده می‌شود */
  videoUrl: optionalUrl.refine((v) => v === null || /\.(mp4|webm)(\?.*)?$/i.test(v), { error: "ویدئو باید فایل MP4 یا WebM باشد" }),
  accentColor: z.enum(ACCENT_KEYS).nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const announcementSchema = z.object({
  message: text(3, 200, "متن اطلاعیه"),
  linkLabel: optionalText(40, "متن پیوند"),
  href: optionalHrefSchema,
  isActive: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const pageSchema = z.object({
  slug: slugSchema,
  title: text(2, 160, "عنوان"),
  summary: optionalText(400, "خلاصه"),
  body: text(10, 50000, "متن"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  seoTitle: optionalText(70, "عنوان سئو"),
  seoDescription: optionalText(170, "توضیح سئو"),
});

export const articleSchema = pageSchema.extend({
  excerpt: text(10, 400, "خلاصه"),
  authorName: text(2, 80, "نویسنده"),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200, "متن جایگزین تصویر"),
  publishedAt: optionalDate,
  readingMinutes: z.coerce.number().int().min(1).max(120).nullable().optional(),
});

export const faqSchema = z.object({
  question: text(5, 300, "پرسش"),
  answer: text(5, 3000, "پاسخ"),
  group: optionalText(60, "گروه"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isVisible: z.boolean().default(true),
});

export const reviewModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]).optional(),
  isFeatured: z.boolean().optional(),
});

export const shippingMethodSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, { error: "کد فقط حروف کوچک لاتین، عدد و خط تیره" }),
  name: text(2, 80, "نام روش ارسال"),
  description: optionalText(200, "توضیح"),
  price: moneyInputSchema,
  minDays: z.coerce.number().int().min(0).max(60).nullable().optional(),
  maxDays: z.coerce.number().int().min(0).max(90).nullable().optional(),
  freeShippingEligible: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export const settingsSchema = z.object({
  storeName: text(2, 80, "نام فروشگاه"),
  storeNameEn: text(2, 80, "نام لاتین"),
  tagline: optionalText(200, "شعار"),
  currency: z.enum(CURRENCY_CODES),
  taxRate: moneyInputSchema.refine((v) => Number(v) <= 100, { error: "نرخ مالیات حداکثر ۱۰۰٪" }),
  pricesIncludeTax: z.boolean(),
  freeShippingThreshold: optionalMoney,
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  reservationMinutes: z.coerce.number().int().min(5).max(1440),
  returnWindowDays: z.coerce.number().int().min(0).max(365),
  contactEmail: z.union([z.email(), z.literal(""), z.null()]).optional().transform((v) => (v ? v : null)),
  contactPhone: optionalText(40, "تلفن"),
  contactAddress: optionalText(300, "نشانی"),
  workingHours: optionalText(120, "ساعات کاری"),
  instagramUrl: optionalUrl,
  telegramUrl: optionalUrl,
  whatsappUrl: optionalUrl,
  pinterestUrl: optionalUrl,
  newsletterEnabled: z.boolean(),
  newsletterDoubleOptIn: z.boolean(),
  enabledPaymentProviders: z.array(z.enum(["ZARINPAL"])).max(5),
  emailFromName: optionalText(80, "نام فرستندهٔ ایمیل"),
  seoTitleTemplate: z.string().trim().max(80).refine((v) => v.includes("%s"), { error: "قالب عنوان باید شامل %s باشد" }),
  seoDefaultTitle: text(5, 80, "عنوان پیش‌فرض"),
  seoDefaultDescription: text(20, 200, "توضیح پیش‌فرض"),
  ogImageUrl: optionalUrl,
  googleSiteVerification: optionalText(120, "کد تأیید گوگل"),
  analyticsEnabled: z.boolean(),
  gaMeasurementId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^G-[A-Z0-9]{4,15}$/.test(v), { error: "شناسهٔ Google Analytics باید با G- شروع شود" }),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});

export { hrefSchema };

export const orderFilterSchema = listQuerySchema.extend({
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
