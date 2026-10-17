/** برچسب‌های فارسی برای مقادیر شمارشی دیتابیس */
import type {
  CollectionType,
  ColorFamily,
  DiscountScope,
  DiscountType,
  DressLength,
  InventoryReason,
  PaymentProvider,
  PaymentStatus,
  ProductStatus,
  PublishStatus,
  ReviewStatus,
  ShipmentStatus,
  BannerPlacement,
} from "@/generated/prisma/enums";

export const DRESS_LENGTH_LABELS: Record<DressLength, string> = {
  MINI: "کوتاه",
  KNEE: "تا زانو",
  MIDI: "میدی",
  MAXI: "ماکسی",
  FLOOR: "بلند تا زمین",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "منتشر شده",
  ARCHIVED: "بایگانی",
};

export const COLLECTION_TYPE_LABELS: Record<CollectionType, string> = {
  CURATED: "منتخب",
  SEASON: "فصلی",
  OCCASION: "مناسبتی",
  CAMPAIGN: "کمپین",
};

export const COLOR_FAMILY_LABELS: Record<ColorFamily, string> = {
  RED: "قرمز و زرشکی",
  PINK: "صورتی",
  PURPLE: "بنفش و یاسی",
  BLUE: "آبی و سرمه‌ای",
  GREEN: "سبز و زمردی",
  GOLD: "طلایی و شامپاینی",
  NEUTRAL: "خنثی و کرم",
  BLACK: "مشکی",
  WHITE: "سفید و عاجی",
  SILVER: "نقره‌ای",
};

export const INVENTORY_REASON_LABELS: Record<InventoryReason, string> = {
  INITIAL: "موجودی اولیه",
  ADJUSTMENT: "اصلاح دستی",
  RESTOCK: "ورود کالا",
  SALE: "فروش",
  ORDER_CANCELLED: "لغو سفارش",
  PAYMENT_FAILED: "پرداخت ناموفق",
  RESERVATION_EXPIRED: "پایان مهلت رزرو",
  RETURN: "مرجوعی",
  CORRECTION: "تصحیح انبارگردانی",
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "درصدی",
  FIXED_AMOUNT: "مبلغ ثابت",
  FREE_SHIPPING: "ارسال رایگان",
};

export const DISCOUNT_SCOPE_LABELS: Record<DiscountScope, string> = {
  ALL: "همهٔ محصولات",
  PRODUCTS: "محصولات انتخابی",
  COLLECTIONS: "مجموعه‌های انتخابی",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
};

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
  ARCHIVED: "بایگانی",
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PREPARING: "در حال آماده‌سازی",
  SHIPPED: "تحویل به پست",
  DELIVERED: "تحویل به مشتری",
  RETURNED: "مرجوع شده",
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  TEST: "درگاه آزمایشی (بدون پرداخت واقعی)",
  ZARINPAL: "زرین‌پال",
};

export const PAYMENT_ATTEMPT_LABELS: Record<PaymentStatus, string> = {
  PENDING: "در انتظار",
  SUCCEEDED: "موفق",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی",
};

export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  HOME_HERO: "صفحهٔ اصلی — بخش آغازین",
  HOME_CAMPAIGN: "صفحهٔ اصلی — کمپین فصل",
  HOME_STORY: "صفحهٔ اصلی — داستان برند",
};
