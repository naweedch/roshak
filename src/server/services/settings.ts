/**
 * تنظیمات فروشگاه (جدول تک‌سطری StoreSettings).
 * رازها (کلید درگاه، رمز SMTP و ...) هرگز این‌جا نیستند؛ فقط در متغیرهای محیطی.
 */
import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { db, type DbClient } from "../db";

export interface StoreSettingsDTO {
  storeName: string;
  storeNameEn: string;
  tagline: string | null;
  currency: string;
  taxRate: string;
  pricesIncludeTax: boolean;
  freeShippingThreshold: string | null;
  lowStockThreshold: number;
  reservationMinutes: number;
  returnWindowDays: number;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  workingHours: string | null;
  instagramUrl: string | null;
  telegramUrl: string | null;
  whatsappUrl: string | null;
  pinterestUrl: string | null;
  newsletterEnabled: boolean;
  newsletterDoubleOptIn: boolean;
  enabledPaymentProviders: PaymentProvider[];
  emailFromName: string | null;
  seoTitleTemplate: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  ogImageUrl: string | null;
  googleSiteVerification: string | null;
  analyticsEnabled: boolean;
  gaMeasurementId: string | null;
  updatedAt: string;
}

/** مقادیر پیش‌فرض در صورت نبود ردیف تنظیمات (پیش از اجرای seed) */
export const DEFAULT_SETTINGS: StoreSettingsDTO = {
  storeName: "روشاک",
  storeNameEn: "ROSHAK",
  tagline: "لباس‌های مجلسی و شب، با ظرافتی ماندگار",
  currency: "IRT",
  taxRate: "0",
  pricesIncludeTax: true,
  freeShippingThreshold: null,
  lowStockThreshold: 2,
  reservationMinutes: 30,
  returnWindowDays: 7,
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  workingHours: null,
  instagramUrl: null,
  telegramUrl: null,
  whatsappUrl: null,
  pinterestUrl: null,
  newsletterEnabled: true,
  newsletterDoubleOptIn: true,
  enabledPaymentProviders: [],
  emailFromName: null,
  seoTitleTemplate: "%s | روشاک",
  seoDefaultTitle: "روشاک | لباس مجلسی و شب زنانه",
  seoDefaultDescription: "روشاک؛ طراحی و فروش لباس مجلسی، لباس شب و پوشاک مناسبتی زنانه با دوخت دقیق و پارچه‌های مرغوب.",
  ogImageUrl: null,
  googleSiteVerification: null,
  analyticsEnabled: false,
  gaMeasurementId: null,
  updatedAt: new Date(0).toISOString(),
};

export async function loadStoreSettings(client: DbClient = db): Promise<StoreSettingsDTO> {
  const row = await client.storeSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    storeName: row.storeName,
    storeNameEn: row.storeNameEn,
    tagline: row.tagline,
    currency: row.currency,
    taxRate: row.taxRate.toString(),
    pricesIncludeTax: row.pricesIncludeTax,
    freeShippingThreshold: row.freeShippingThreshold?.toString() ?? null,
    lowStockThreshold: row.lowStockThreshold,
    reservationMinutes: row.reservationMinutes,
    returnWindowDays: row.returnWindowDays,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    contactAddress: row.contactAddress,
    workingHours: row.workingHours,
    instagramUrl: row.instagramUrl,
    telegramUrl: row.telegramUrl,
    whatsappUrl: row.whatsappUrl,
    pinterestUrl: row.pinterestUrl,
    newsletterEnabled: row.newsletterEnabled,
    newsletterDoubleOptIn: row.newsletterDoubleOptIn,
    enabledPaymentProviders: row.enabledPaymentProviders,
    emailFromName: row.emailFromName,
    seoTitleTemplate: row.seoTitleTemplate,
    seoDefaultTitle: row.seoDefaultTitle,
    seoDefaultDescription: row.seoDefaultDescription,
    ogImageUrl: row.ogImageUrl,
    googleSiteVerification: row.googleSiteVerification,
    analyticsEnabled: row.analyticsEnabled,
    gaMeasurementId: row.gaMeasurementId,
    updatedAt: row.updatedAt.toISOString(),
  };
}
