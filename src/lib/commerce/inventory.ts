/** قواعد خالص موجودی و دسترس‌پذیری تنوع‌ها */
import type { ProductStatus } from "@/generated/prisma/enums";

export const MAX_QUANTITY_PER_LINE = 10;

export type StockLevel = "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";

export interface VariantAvailabilityInput {
  stock: number;
  isActive: boolean;
  productStatus: ProductStatus;
}

/** تعداد قابل خرید یک تنوع (برای محصول غیرفعال یا تنوع غیرفعال صفر است) */
export function purchasableQuantity(v: VariantAvailabilityInput): number {
  if (v.productStatus !== "ACTIVE" || !v.isActive) return 0;
  return Math.max(0, Math.min(v.stock, MAX_QUANTITY_PER_LINE));
}

export function canPurchase(v: VariantAvailabilityInput, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= purchasableQuantity(v);
}

export function stockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= threshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  OUT_OF_STOCK: "ناموجود",
  LOW_STOCK: "تعداد محدود",
  IN_STOCK: "موجود",
};

/**
 * محاسبهٔ موجودی جدید پس از یک تغییر دستی؛ موجودی منفی مجاز نیست.
 * null یعنی تغییر نامعتبر است.
 */
export function applyStockDelta(current: number, delta: number): number | null {
  if (!Number.isInteger(delta) || delta === 0) return null;
  const next = current + delta;
  return next < 0 ? null : next;
}
