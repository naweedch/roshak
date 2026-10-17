/**
 * اعتبارسنجی کد تخفیف در برابر دیتابیس (فعال بودن، بازهٔ زمانی، سقف استفاده، سقف هر مشتری).
 * محاسبهٔ مبلغ تخفیف در ماژول خالص pricing انجام می‌شود.
 */
import "server-only";
import type { PricingDiscount } from "@/lib/commerce/pricing";
import { normalizePersianText } from "@/lib/persian";
import { db, type DbClient } from "../db";

export function normalizeDiscountCode(code: string): string {
  return normalizePersianText(code).replace(/\s+/g, "").toUpperCase().slice(0, 40);
}

export type DiscountLookup =
  | { ok: true; id: string; discount: PricingDiscount; usageLimit: number | null; perCustomerLimit: number | null }
  | { ok: false; reason: string };

export interface DiscountCustomer {
  userId?: string | null;
  email?: string | null;
}

export async function lookupDiscount(rawCode: string, customer: DiscountCustomer = {}, client: DbClient = db): Promise<DiscountLookup> {
  const code = normalizeDiscountCode(rawCode);
  if (!code) return { ok: false, reason: "کد تخفیف را وارد کنید" };

  const discount = await client.discount.findUnique({
    where: { code },
    include: { products: { select: { productId: true } }, collections: { select: { collectionId: true } } },
  });
  const now = new Date();
  if (!discount || !discount.isActive) return { ok: false, reason: "کد تخفیف معتبر نیست" };
  if (discount.startsAt && discount.startsAt > now) return { ok: false, reason: "زمان استفاده از این کد هنوز شروع نشده است" };
  if (discount.endsAt && discount.endsAt <= now) return { ok: false, reason: "مهلت استفاده از این کد به پایان رسیده است" };
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return { ok: false, reason: "ظرفیت استفاده از این کد تکمیل شده است" };
  }

  if (discount.perCustomerLimit !== null && (customer.userId || customer.email)) {
    const used = await client.discountRedemption.count({
      where: {
        discountId: discount.id,
        OR: [...(customer.userId ? [{ userId: customer.userId }] : []), ...(customer.email ? [{ email: customer.email }] : [])],
      },
    });
    if (used >= discount.perCustomerLimit) return { ok: false, reason: "سقف استفادهٔ شما از این کد تکمیل شده است" };
  }

  return {
    ok: true,
    id: discount.id,
    usageLimit: discount.usageLimit,
    perCustomerLimit: discount.perCustomerLimit,
    discount: {
      code: discount.code,
      type: discount.type,
      scope: discount.scope,
      value: discount.value.toString(),
      currency: discount.currency,
      maxDiscountAmount: discount.maxDiscountAmount?.toString() ?? null,
      minOrderAmount: discount.minOrderAmount?.toString() ?? null,
      productIds: discount.products.map((p) => p.productId),
      collectionIds: discount.collections.map((c) => c.collectionId),
    },
  };
}
