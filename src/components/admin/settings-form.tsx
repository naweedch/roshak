"use client";

/** فرم تنظیمات فروشگاه؛ اعتبارسنجی نهایی با settingsSchema در سرور */
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency";
import { EntityForm, type FieldDef, type Values } from "./entity-manager";

const FIELDS: FieldDef[] = [
  { name: "storeName", label: "نام فروشگاه", type: "text", required: true },
  { name: "storeNameEn", label: "نام لاتین", type: "text", required: true, ltr: true },
  { name: "tagline", label: "شعار", type: "text", wide: true },
  { name: "currency", label: "ارز فروشگاه", type: "select", options: CURRENCY_CODES.map((c) => ({ value: c, label: `${CURRENCIES[c].label} (${c})` })), hint: "تا وقتی محصولی با ارز فعلی قیمت دارد، قابل تغییر نیست" },
  { name: "taxRate", label: "نرخ مالیات (درصد)", type: "money", hint: "۰ = بدون مالیات" },
  { name: "pricesIncludeTax", label: "قیمت‌ها شامل مالیات هستند", type: "checkbox" },
  { name: "freeShippingThreshold", label: "حد ارسال رایگان", type: "money", hint: "خالی = ارسال رایگان غیرفعال" },
  { name: "lowStockThreshold", label: "آستانهٔ موجودی کم", type: "number" },
  { name: "reservationMinutes", label: "مهلت رزرو موجودی تا پرداخت (دقیقه)", type: "number", hint: "پس از این مدت سفارش پرداخت‌نشده لغو و موجودی آزاد می‌شود" },
  { name: "returnWindowDays", label: "مهلت مرجوعی (روز)", type: "number" },
  { name: "contactEmail", label: "ایمیل تماس", type: "text", ltr: true },
  { name: "contactPhone", label: "تلفن تماس", type: "text", ltr: true },
  { name: "workingHours", label: "ساعات پاسخ‌گویی", type: "text" },
  { name: "contactAddress", label: "نشانی", type: "textarea", rows: 2 },
  { name: "instagramUrl", label: "اینستاگرام", type: "text", ltr: true, hint: "نشانی کامل https" },
  { name: "telegramUrl", label: "تلگرام", type: "text", ltr: true },
  { name: "whatsappUrl", label: "واتس‌اپ", type: "text", ltr: true },
  { name: "pinterestUrl", label: "پینترست", type: "text", ltr: true },
  { name: "newsletterEnabled", label: "فرم خبرنامه فعال باشد", type: "checkbox" },
  { name: "newsletterDoubleOptIn", label: "تأیید دومرحله‌ای عضویت خبرنامه", type: "checkbox" },
  { name: "enabledPaymentProviders", label: "درگاه‌های پرداخت فعال", type: "multiselect", options: [{ value: "ZARINPAL", label: "زرین‌پال" }], hint: "درگاه فقط وقتی واقعاً فعال می‌شود که کلید آن در متغیرهای محیطی سرور تنظیم شده باشد" },
  { name: "emailFromName", label: "نام فرستندهٔ ایمیل‌ها", type: "text" },
  { name: "seoTitleTemplate", label: "قالب عنوان صفحات", type: "text", ltr: true, hint: "باید شامل %s باشد، مثلاً: %s | روشاک" },
  { name: "seoDefaultTitle", label: "عنوان پیش‌فرض", type: "text", wide: true },
  { name: "seoDefaultDescription", label: "توضیح پیش‌فرض", type: "textarea", rows: 2 },
  { name: "ogImageUrl", label: "تصویر اشتراک‌گذاری (OG)", type: "image", folder: "content" },
  { name: "googleSiteVerification", label: "کد تأیید Google Search Console", type: "text", ltr: true },
  { name: "gaMeasurementId", label: "شناسهٔ Google Analytics", type: "text", ltr: true, hint: "مثل G-XXXXXXX — فقط ذخیره می‌شود؛ بارگذاری اسکریپت آمار در سایت هنوز پیاده‌سازی نشده است" },
  { name: "analyticsEnabled", label: "آمار بازدید فعال باشد (پس از پیاده‌سازی اسکریپت آمار اعمال می‌شود)", type: "checkbox" },
];

export function SettingsForm({ settings }: { settings: Values }) {
  const router = useRouter();
  return (
    <EntityForm
      fields={FIELDS}
      initial={settings}
      isNew={false}
      submitLabel="ذخیرهٔ تنظیمات"
      onSubmit={async (payload) => {
        await api("/api/v1/admin/settings", { method: "PATCH", body: payload });
        toast.success("تنظیمات ذخیره شد");
        router.refresh();
      }}
    />
  );
}
