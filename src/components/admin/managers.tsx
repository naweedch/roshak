"use client";

/** تعریف فرم و ستون‌های هر بخش مدیریتی روی مدیر عمومی موجودیت‌ها */
import Image from "next/image";
import { Badge } from "@/components/ui/misc";
import { ACCENT_KEYS, ACCENT_LABELS } from "@/lib/accent";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency";
import { formatPersianDate } from "@/lib/dates";
import { BANNER_PLACEMENT_LABELS, COLLECTION_TYPE_LABELS, DISCOUNT_SCOPE_LABELS, DISCOUNT_TYPE_LABELS, PUBLISH_STATUS_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { EntityManager, type FieldDef } from "./entity-manager";

type Option = { value: string; label: string };
const opts = (labels: Record<string, string>): Option[] => Object.entries(labels).map(([value, label]) => ({ value, label }));
const ACCENT_OPTIONS = ACCENT_KEYS.map((k) => ({ value: k, label: ACCENT_LABELS[k] }));
const CURRENCY_OPTIONS = CURRENCY_CODES.map((c) => ({ value: c, label: CURRENCIES[c].label }));

const SEO_FIELDS: FieldDef[] = [
  { name: "seoTitle", label: "عنوان سئو", type: "text", hint: "حداکثر ۷۰ کاراکتر؛ خالی = عنوان اصلی" },
  { name: "seoDescription", label: "توضیح سئو", type: "textarea", rows: 2, hint: "حداکثر ۱۷۰ کاراکتر" },
];

function Thumb({ src }: { src: string | null }) {
  if (!src) return <span className="block size-12 rounded-lg bg-ivory-deep" />;
  return (
    <span className="relative block size-12 overflow-hidden rounded-lg bg-ivory-deep">
      <Image src={src} alt="" fill sizes="48px" className="object-cover" />
    </span>
  );
}

function Visible({ on, labels = ["نمایش", "پنهان"] }: { on: boolean; labels?: [string, string] }) {
  return <Badge tone={on ? "success" : "neutral"}>{on ? labels[0] : labels[1]}</Badge>;
}

function window_(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "همیشه";
  return `${startsAt ? formatPersianDate(startsAt) : "…"} تا ${endsAt ? formatPersianDate(endsAt) : "…"}`;
}

// ─────────────── دسته‌ها و مجموعه‌ها ───────────────

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
  productCount: number;
}

const CATEGORY_FIELDS: FieldDef[] = [
  { name: "name", label: "نام", type: "text", required: true },
  { name: "slug", label: "نامک (URL)", type: "text", required: true, ltr: true, slugFrom: "name", hint: "حروف، عدد و خط تیره" },
  { name: "description", label: "توضیحات", type: "textarea" },
  { name: "coverImageUrl", label: "تصویر کاور", type: "image", folder: "collections" },
  { name: "coverImageAlt", label: "متن جایگزین کاور", type: "text", wide: true },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number", hint: "عدد کمتر = بالاتر" },
  { name: "isVisible", label: "نمایش در فروشگاه", type: "checkbox" },
  ...SEO_FIELDS,
];

export function CategoryManager({ items, canWrite }: { items: CategoryRow[]; canWrite: boolean }) {
  return (
    <EntityManager
      items={items}
      fields={CATEGORY_FIELDS}
      noun="دسته"
      caption="دسته‌ها"
      createUrl="/api/v1/admin/taxonomy/categories"
      itemUrl={(id) => `/api/v1/admin/taxonomy/categories/${id}`}
      canWrite={canWrite}
      defaults={{ isVisible: true, sortOrder: 0 }}
      deleteConfirm="این دسته حذف شود؟ دسته‌ای که محصول دارد حذف نمی‌شود."
      columns={[
        { header: "", className: "w-16", cell: (c) => <Thumb src={c.coverImageUrl} /> },
        { header: "نام", cell: (c) => c.name },
        { header: "نامک", cell: (c) => <span dir="ltr" className="text-xs text-ink-muted">{c.slug}</span> },
        { header: "محصولات", cell: (c) => toPersianDigits(c.productCount) },
        { header: "وضعیت", cell: (c) => <Visible on={c.isVisible} /> },
      ]}
    />
  );
}

interface CollectionRow extends CategoryRow {
  type: string;
  isFeatured: boolean;
}

const COLLECTION_FIELDS: FieldDef[] = [
  { name: "name", label: "نام", type: "text", required: true },
  { name: "slug", label: "نامک (URL)", type: "text", required: true, ltr: true, slugFrom: "name", hint: "تغییر نامک، نشانی قبلی را با ریدایرکت حفظ می‌کند" },
  { name: "subtitle", label: "زیرعنوان", type: "text" },
  { name: "type", label: "نوع", type: "select", options: opts(COLLECTION_TYPE_LABELS), required: true },
  { name: "description", label: "توضیحات", type: "textarea" },
  { name: "coverImageUrl", label: "تصویر کاور", type: "image", folder: "collections" },
  { name: "coverImageAlt", label: "متن جایگزین کاور", type: "text", wide: true },
  { name: "accentColor", label: "رنگ تأکیدی", type: "select", options: ACCENT_OPTIONS, nullable: true },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "isVisible", label: "نمایش در فروشگاه", type: "checkbox" },
  { name: "isFeatured", label: "ویژه در صفحهٔ اصلی", type: "checkbox" },
  ...SEO_FIELDS,
];

export function CollectionManager({ items, canWrite }: { items: CollectionRow[]; canWrite: boolean }) {
  return (
    <EntityManager
      items={items}
      fields={COLLECTION_FIELDS}
      noun="مجموعه"
      caption="مجموعه‌ها"
      createUrl="/api/v1/admin/taxonomy/collections"
      itemUrl={(id) => `/api/v1/admin/taxonomy/collections/${id}`}
      canWrite={canWrite}
      defaults={{ isVisible: true, isFeatured: false, sortOrder: 0, type: "CURATED" }}
      deleteConfirm="این مجموعه حذف شود؟ محصولات آن حذف نمی‌شوند و فقط از مجموعه خارج می‌شوند."
      columns={[
        { header: "", className: "w-16", cell: (c) => <Thumb src={c.coverImageUrl} /> },
        { header: "نام", cell: (c) => c.name },
        { header: "نوع", cell: (c) => COLLECTION_TYPE_LABELS[c.type as keyof typeof COLLECTION_TYPE_LABELS] },
        { header: "محصولات", cell: (c) => toPersianDigits(c.productCount) },
        {
          header: "وضعیت",
          cell: (c) => (
            <span className="flex flex-wrap gap-1">
              <Visible on={c.isVisible} />
              {c.isFeatured ? <Badge tone="champagne">ویژه</Badge> : null}
            </span>
          ),
        },
      ]}
    />
  );
}

// ─────────────── تخفیف‌ها ───────────────

interface DiscountRow {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  scope: "ALL" | "PRODUCTS" | "COLLECTIONS";
  value: string;
  currency: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

export function DiscountManager({ items, canWrite, products, collections, storeCurrency }: { items: DiscountRow[]; canWrite: boolean; products: Option[]; collections: Option[]; storeCurrency: string }) {
  const fields: FieldDef[] = [
    { name: "code", label: "کد", type: "text", required: true, ltr: true, hint: "حروف لاتین بزرگ، عدد، - و _" },
    { name: "type", label: "نوع", type: "select", options: opts(DISCOUNT_TYPE_LABELS), required: true },
    { name: "value", label: "مقدار", type: "money", required: true, hint: "برای درصدی: ۱ تا ۱۰۰؛ برای مبلغ ثابت: مبلغ", visible: (v) => v.type !== "FREE_SHIPPING" },
    { name: "currency", label: "ارز مبلغ ثابت", type: "select", options: CURRENCY_OPTIONS, nullable: true, visible: (v) => v.type === "FIXED_AMOUNT" },
    { name: "maxDiscountAmount", label: "سقف مبلغ تخفیف", type: "money", hint: "اختیاری، فقط برای درصدی", visible: (v) => v.type === "PERCENTAGE" },
    { name: "minOrderAmount", label: "حداقل مبلغ سفارش", type: "money", hint: "اختیاری" },
    { name: "scope", label: "دامنه", type: "select", options: opts(DISCOUNT_SCOPE_LABELS), required: true },
    { name: "productIds", label: "محصولات", type: "multiselect", options: products, visible: (v) => v.scope === "PRODUCTS" },
    { name: "collectionIds", label: "مجموعه‌ها", type: "multiselect", options: collections, visible: (v) => v.scope === "COLLECTIONS" },
    { name: "startsAt", label: "شروع", type: "datetime", hint: "خالی = از همین حالا" },
    { name: "endsAt", label: "پایان", type: "datetime", hint: "خالی = بدون انقضا" },
    { name: "usageLimit", label: "سقف کل استفاده", type: "number", nullable: true, hint: "خالی = نامحدود" },
    { name: "perCustomerLimit", label: "سقف استفادهٔ هر مشتری", type: "number", nullable: true, hint: "خالی = نامحدود" },
    { name: "description", label: "توضیح داخلی", type: "textarea", rows: 2 },
    { name: "isActive", label: "فعال", type: "checkbox" },
  ];
  return (
    <EntityManager
      items={items}
      fields={fields}
      noun="کد تخفیف"
      caption="کدهای تخفیف"
      wide
      createUrl="/api/v1/admin/discounts"
      itemUrl={(id) => `/api/v1/admin/discounts/${id}`}
      canWrite={canWrite}
      defaults={{ type: "PERCENTAGE", scope: "ALL", value: "10", currency: storeCurrency, isActive: true, productIds: [], collectionIds: [] }}
      toInitial={(d) => ({ ...d, value: d.type === "FREE_SHIPPING" ? "0" : d.value })}
      deleteConfirm="این کد حذف شود؟ کدی که قبلاً استفاده شده فقط غیرفعال می‌شود تا سابقهٔ سفارش‌ها حفظ شود."
      deleteResultMessage={(r) => ((r as { result?: string })?.result === "deactivated" ? "کد استفاده شده بود و غیرفعال شد" : "کد تخفیف حذف شد")}
      columns={[
        { header: "کد", cell: (d) => <span dir="ltr" className="font-mono text-sm">{d.code}</span> },
        {
          header: "مقدار",
          cell: (d) =>
            d.type === "PERCENTAGE" ? `${toPersianDigits(Number(d.value))}٪` : d.type === "FIXED_AMOUNT" ? formatMoney(d.value, d.currency ?? storeCurrency) : "ارسال رایگان",
        },
        { header: "دامنه", cell: (d) => DISCOUNT_SCOPE_LABELS[d.scope] },
        { header: "استفاده", cell: (d) => `${toPersianDigits(d.usageCount)}${d.usageLimit ? ` از ${toPersianDigits(d.usageLimit)}` : ""}` },
        { header: "بازه", cell: (d) => <span className="text-xs text-ink-muted">{window_(d.startsAt, d.endsAt)}</span> },
        { header: "وضعیت", cell: (d) => <Visible on={d.isActive} labels={["فعال", "غیرفعال"]} /> },
      ]}
    />
  );
}

// ─────────────── روش‌های ارسال ───────────────

interface ShippingRow {
  id: string;
  code: string;
  name: string;
  price: string;
  currency: string;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
  freeShippingEligible: boolean;
}

const SHIPPING_FIELDS: FieldDef[] = [
  { name: "name", label: "نام", type: "text", required: true },
  { name: "code", label: "کد", type: "text", required: true, ltr: true, hint: "حروف کوچک لاتین، مثلاً express" },
  { name: "price", label: "هزینه", type: "money", required: true },
  { name: "sortOrder", label: "ترتیب", type: "number" },
  { name: "minDays", label: "حداقل روز تحویل", type: "number", nullable: true },
  { name: "maxDays", label: "حداکثر روز تحویل", type: "number", nullable: true },
  { name: "description", label: "توضیح", type: "textarea", rows: 2 },
  { name: "freeShippingEligible", label: "مشمول ارسال رایگان (با رسیدن به حد آستانه)", type: "checkbox" },
  { name: "isActive", label: "فعال", type: "checkbox" },
];

export function ShippingManager({ items, canWrite }: { items: ShippingRow[]; canWrite: boolean }) {
  return (
    <EntityManager
      items={items}
      fields={SHIPPING_FIELDS}
      noun="روش ارسال"
      caption="روش‌های ارسال"
      createUrl="/api/v1/admin/shipping"
      itemUrl={(id) => `/api/v1/admin/shipping/${id}`}
      canWrite={canWrite}
      canDelete={false}
      defaults={{ isActive: true, freeShippingEligible: true, sortOrder: 0, price: "0" }}
      columns={[
        { header: "نام", cell: (m) => m.name },
        { header: "هزینه", cell: (m) => formatMoney(m.price, m.currency) },
        { header: "زمان تحویل", cell: (m) => (m.minDays != null && m.maxDays != null ? `${toPersianDigits(m.minDays)} تا ${toPersianDigits(m.maxDays)} روز` : "—") },
        { header: "وضعیت", cell: (m) => <Visible on={m.isActive} labels={["فعال", "غیرفعال"]} /> },
      ]}
    />
  );
}

// ─────────────── محتوا ───────────────

interface BannerRow {
  id: string;
  placement: keyof typeof BANNER_PLACEMENT_LABELS;
  title: string;
  imageUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const BANNER_FIELDS: FieldDef[] = [
  { name: "placement", label: "جایگاه", type: "select", options: opts(BANNER_PLACEMENT_LABELS), required: true },
  { name: "eyebrow", label: "برچسب بالای عنوان", type: "text" },
  { name: "title", label: "عنوان", type: "text", required: true, wide: true },
  { name: "subtitle", label: "متن", type: "textarea", rows: 3 },
  { name: "ctaLabel", label: "متن دکمهٔ اصلی", type: "text" },
  { name: "ctaHref", label: "پیوند دکمهٔ اصلی", type: "text", ltr: true, hint: "مسیر داخلی مثل /shop یا نشانی https" },
  { name: "secondaryCtaLabel", label: "متن دکمهٔ دوم", type: "text" },
  { name: "secondaryCtaHref", label: "پیوند دکمهٔ دوم", type: "text", ltr: true },
  { name: "imageUrl", label: "تصویر", type: "image", folder: "content" },
  { name: "imageAlt", label: "متن جایگزین تصویر", type: "text", wide: true },
  { name: "mobileImageUrl", label: "تصویر موبایل (اختیاری)", type: "image", folder: "content" },
  {
    name: "videoUrl",
    label: "ویدئوی اسلاید (اختیاری)",
    type: "text",
    ltr: true,
    wide: true,
    hint: "نشانی فایل MP4 یا WebM فشرده (ترجیحاً زیر ۴ مگابایت). تصویر بالا پوستر آن است و با «کاهش حرکت» به‌جای ویدئو نمایش داده می‌شود.",
  },
  { name: "accentColor", label: "رنگ تأکیدی", type: "select", options: ACCENT_OPTIONS, nullable: true },
  { name: "sortOrder", label: "ترتیب", type: "number" },
  { name: "startsAt", label: "شروع نمایش", type: "datetime" },
  { name: "endsAt", label: "پایان نمایش", type: "datetime" },
  { name: "isActive", label: "فعال", type: "checkbox" },
];

export function BannerManager({ items }: { items: BannerRow[] }) {
  return (
    <EntityManager
      items={items}
      fields={BANNER_FIELDS}
      noun="بنر"
      caption="بنرها"
      wide
      createUrl="/api/v1/admin/content/banners"
      itemUrl={(id) => `/api/v1/admin/content/banners/${id}`}
      canWrite
      defaults={{ placement: "HOME_CAMPAIGN", isActive: true, sortOrder: 0 }}
      columns={[
        { header: "", className: "w-16", cell: (b) => <Thumb src={b.imageUrl} /> },
        { header: "عنوان", cell: (b) => b.title },
        { header: "جایگاه", cell: (b) => <span className="text-xs">{BANNER_PLACEMENT_LABELS[b.placement]}</span> },
        { header: "بازه", cell: (b) => <span className="text-xs text-ink-muted">{window_(b.startsAt, b.endsAt)}</span> },
        { header: "وضعیت", cell: (b) => <Visible on={b.isActive} labels={["فعال", "غیرفعال"]} /> },
      ]}
    />
  );
}

interface AnnouncementRow {
  id: string;
  message: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const ANNOUNCEMENT_FIELDS: FieldDef[] = [
  { name: "message", label: "متن اطلاعیه", type: "text", required: true, wide: true, hint: "یک جملهٔ کوتاه و دقیق؛ فقط پیشنهادهای واقعی" },
  { name: "linkLabel", label: "متن پیوند", type: "text" },
  { name: "href", label: "پیوند", type: "text", ltr: true },
  { name: "startsAt", label: "شروع نمایش", type: "datetime" },
  { name: "endsAt", label: "پایان نمایش", type: "datetime" },
  { name: "sortOrder", label: "ترتیب", type: "number" },
  { name: "isActive", label: "فعال", type: "checkbox" },
];

export function AnnouncementManager({ items }: { items: AnnouncementRow[] }) {
  return (
    <EntityManager
      items={items}
      fields={ANNOUNCEMENT_FIELDS}
      noun="اطلاعیه"
      caption="اطلاعیه‌های نوار بالا"
      createUrl="/api/v1/admin/content/announcements"
      itemUrl={(id) => `/api/v1/admin/content/announcements/${id}`}
      canWrite
      defaults={{ isActive: true, sortOrder: 0 }}
      columns={[
        { header: "متن", cell: (a) => a.message },
        { header: "بازه", cell: (a) => <span className="text-xs text-ink-muted">{window_(a.startsAt, a.endsAt)}</span> },
        { header: "وضعیت", cell: (a) => <Visible on={a.isActive} labels={["فعال", "غیرفعال"]} /> },
      ]}
    />
  );
}

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: keyof typeof PUBLISH_STATUS_LABELS;
  updatedAt: string;
}

const PAGE_FIELDS: FieldDef[] = [
  { name: "title", label: "عنوان", type: "text", required: true },
  { name: "slug", label: "نامک", type: "text", required: true, ltr: true, slugFrom: "title", hint: "نشانی: /pages/نامک" },
  { name: "status", label: "وضعیت", type: "select", options: opts(PUBLISH_STATUS_LABELS), required: true },
  { name: "summary", label: "خلاصه", type: "textarea", rows: 2 },
  { name: "body", label: "متن", type: "markdown", required: true },
  ...SEO_FIELDS,
];

export function PageManager({ items }: { items: PageRow[] }) {
  return (
    <EntityManager
      items={items}
      fields={PAGE_FIELDS}
      noun="صفحه"
      caption="صفحات ثابت"
      wide
      createUrl="/api/v1/admin/content/pages"
      itemUrl={(id) => `/api/v1/admin/content/pages/${id}`}
      canWrite
      defaults={{ status: "DRAFT" }}
      columns={[
        {
          header: "عنوان",
          cell: (p) =>
            p.status === "PUBLISHED" ? (
              <a href={`/pages/${p.slug}`} target="_blank" rel="noopener" className="text-burgundy hover:underline">
                {p.title}
              </a>
            ) : (
              p.title
            ),
        },
        { header: "نامک", cell: (p) => <span dir="ltr" className="text-xs text-ink-muted">{p.slug}</span> },
        { header: "وضعیت", cell: (p) => <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>{PUBLISH_STATUS_LABELS[p.status]}</Badge> },
        { header: "آخرین ویرایش", cell: (p) => <span className="text-xs text-ink-muted">{formatPersianDate(p.updatedAt)}</span> },
      ]}
    />
  );
}

interface ArticleRow extends PageRow {
  coverImageUrl: string | null;
  publishedAt: string | null;
  authorName: string;
}

const ARTICLE_FIELDS: FieldDef[] = [
  { name: "title", label: "عنوان", type: "text", required: true },
  { name: "slug", label: "نامک", type: "text", required: true, ltr: true, slugFrom: "title", hint: "نشانی: /journal/نامک" },
  { name: "status", label: "وضعیت", type: "select", options: opts(PUBLISH_STATUS_LABELS), required: true },
  { name: "publishedAt", label: "تاریخ انتشار", type: "datetime", hint: "خالی = هنگام انتشار" },
  { name: "authorName", label: "نویسنده", type: "text", required: true },
  { name: "readingMinutes", label: "زمان مطالعه (دقیقه)", type: "number", nullable: true, hint: "خالی = محاسبهٔ خودکار" },
  { name: "excerpt", label: "خلاصه", type: "textarea", rows: 2, required: true },
  { name: "coverImageUrl", label: "تصویر کاور", type: "image", folder: "content" },
  { name: "coverImageAlt", label: "متن جایگزین کاور", type: "text", wide: true },
  { name: "body", label: "متن مقاله", type: "markdown", required: true, rows: 16 },
  ...SEO_FIELDS,
];

export function ArticleManager({ items }: { items: ArticleRow[] }) {
  return (
    <EntityManager
      items={items}
      fields={ARTICLE_FIELDS}
      noun="مقاله"
      caption="مقاله‌های مجله"
      wide
      createUrl="/api/v1/admin/content/articles"
      itemUrl={(id) => `/api/v1/admin/content/articles/${id}`}
      canWrite
      defaults={{ status: "DRAFT", authorName: "تحریریهٔ روشاک" }}
      columns={[
        { header: "", className: "w-16", cell: (a) => <Thumb src={a.coverImageUrl} /> },
        {
          header: "عنوان",
          cell: (a) =>
            a.status === "PUBLISHED" ? (
              <a href={`/journal/${a.slug}`} target="_blank" rel="noopener" className="text-burgundy hover:underline">
                {a.title}
              </a>
            ) : (
              a.title
            ),
        },
        { header: "نویسنده", cell: (a) => a.authorName },
        { header: "وضعیت", cell: (a) => <Badge tone={a.status === "PUBLISHED" ? "success" : "neutral"}>{PUBLISH_STATUS_LABELS[a.status]}</Badge> },
        { header: "انتشار", cell: (a) => <span className="text-xs text-ink-muted">{a.publishedAt ? formatPersianDate(a.publishedAt) : "—"}</span> },
      ]}
    />
  );
}

interface FaqRow {
  id: string;
  question: string;
  group: string | null;
  isVisible: boolean;
  sortOrder: number;
}

const FAQ_FIELDS: FieldDef[] = [
  { name: "question", label: "پرسش", type: "text", required: true, wide: true },
  { name: "answer", label: "پاسخ", type: "textarea", rows: 5, required: true },
  { name: "group", label: "گروه", type: "text", hint: "مثلاً «ارسال» یا «سایز»" },
  { name: "sortOrder", label: "ترتیب", type: "number" },
  { name: "isVisible", label: "نمایش در سایت", type: "checkbox" },
];

export function FaqManager({ items }: { items: FaqRow[] }) {
  return (
    <EntityManager
      items={items}
      fields={FAQ_FIELDS}
      noun="پرسش"
      caption="پرسش‌های پرتکرار"
      createUrl="/api/v1/admin/content/faq"
      itemUrl={(id) => `/api/v1/admin/content/faq/${id}`}
      canWrite
      defaults={{ isVisible: true, sortOrder: 0 }}
      columns={[
        { header: "پرسش", cell: (f) => f.question },
        { header: "گروه", cell: (f) => f.group ?? "—" },
        { header: "ترتیب", cell: (f) => toPersianDigits(f.sortOrder) },
        { header: "وضعیت", cell: (f) => <Visible on={f.isVisible} /> },
      ]}
    />
  );
}
