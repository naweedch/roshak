/**
 * محاسبهٔ قیمت نهایی سبد/سفارش: جمع جزء، تخفیف، هزینهٔ ارسال، مالیات و مبلغ قابل پرداخت.
 * این ماژول خالص است (بدون دیتابیس) تا با تست واحد به‌طور کامل پوشش داده شود.
 * ورودی‌ها همیشه از دیتابیس می‌آیند؛ قیمت‌های ارسالی کلاینت هرگز به این تابع نمی‌رسند.
 */
import type { DiscountScope, DiscountType } from "@/generated/prisma/enums";
import { Decimal, roundMoney, toDecimal, type MoneyLike } from "../money";

export interface PricingLine {
  key: string;
  productId: string;
  collectionIds: readonly string[];
  unitPrice: MoneyLike;
  quantity: number;
}

export interface PricingDiscount {
  code: string;
  type: DiscountType;
  scope: DiscountScope;
  value: MoneyLike;
  currency: string | null;
  maxDiscountAmount: MoneyLike | null;
  minOrderAmount: MoneyLike | null;
  productIds: readonly string[];
  collectionIds: readonly string[];
}

export interface PricingShipping {
  price: MoneyLike;
  freeShippingEligible: boolean;
}

export interface PricingTax {
  /** درصد مالیات (مثلاً "10") */
  rate: MoneyLike;
  pricesIncludeTax: boolean;
}

export interface PricingInput {
  currency: string;
  lines: readonly PricingLine[];
  discount?: PricingDiscount | null;
  shipping?: PricingShipping | null;
  freeShippingThreshold?: MoneyLike | null;
  tax: PricingTax;
}

export interface PricedLine {
  key: string;
  unitPrice: Decimal;
  quantity: number;
  lineTotal: Decimal;
  discountAmount: Decimal;
}

export type DiscountRejection = "MIN_ORDER_NOT_MET" | "NO_ELIGIBLE_ITEMS" | "CURRENCY_MISMATCH";

export interface PricingResult {
  currency: string;
  lines: PricedLine[];
  subtotal: Decimal;
  discountTotal: Decimal;
  discountApplied: boolean;
  discountRejection: DiscountRejection | null;
  freeShipping: boolean;
  shippingTotal: Decimal;
  /** اگر روش ارسال انتخاب نشده باشد، هزینهٔ ارسال هنوز مشخص نیست */
  shippingPending: boolean;
  taxTotal: Decimal;
  grandTotal: Decimal;
}

export const DISCOUNT_REJECTION_MESSAGES: Record<DiscountRejection, string> = {
  MIN_ORDER_NOT_MET: "مبلغ سبد خرید به حداقل لازم برای این کد تخفیف نرسیده است",
  NO_ELIGIBLE_ITEMS: "این کد تخفیف برای کالاهای سبد شما معتبر نیست",
  CURRENCY_MISMATCH: "ارز کد تخفیف با ارز فروشگاه یکسان نیست",
};

function isLineEligible(line: PricingLine, discount: PricingDiscount): boolean {
  switch (discount.scope) {
    case "ALL":
      return true;
    case "PRODUCTS":
      return discount.productIds.includes(line.productId);
    case "COLLECTIONS":
      return line.collectionIds.some((id) => discount.collectionIds.includes(id));
  }
}

/**
 * سهم تخفیف هر سطر به نسبت مبلغ آن سطر؛ باقیماندهٔ گرد کردن به آخرین سطر واجد شرایط اضافه می‌شود
 * تا جمع سهم‌ها دقیقاً برابر کل تخفیف باشد.
 */
export function allocateDiscount(lineTotals: readonly Decimal[], eligible: readonly boolean[], total: Decimal, currency: string): Decimal[] {
  const allocations = lineTotals.map(() => new Decimal(0));
  const eligibleIndexes = lineTotals.map((_, i) => i).filter((i) => eligible[i]);
  const base = eligibleIndexes.reduce((acc, i) => acc.plus(lineTotals[i]), new Decimal(0));
  if (total.lte(0) || base.lte(0) || eligibleIndexes.length === 0) return allocations;

  let allocated = new Decimal(0);
  eligibleIndexes.forEach((i, position) => {
    if (position === eligibleIndexes.length - 1) {
      allocations[i] = total.minus(allocated);
    } else {
      const share = roundMoney(total.times(lineTotals[i]).div(base), currency);
      allocations[i] = share;
      allocated = allocated.plus(share);
    }
  });
  return allocations;
}

export function computeTotals(input: PricingInput): PricingResult {
  const { currency } = input;
  const lineTotals = input.lines.map((line) => roundMoney(toDecimal(line.unitPrice).times(line.quantity), currency));
  const subtotal = lineTotals.reduce((acc, v) => acc.plus(v), new Decimal(0));

  let discountTotal = new Decimal(0);
  let discountApplied = false;
  let discountRejection: DiscountRejection | null = null;
  let freeShippingFromDiscount = false;
  let allocations = lineTotals.map(() => new Decimal(0));

  const discount = input.discount ?? null;
  if (discount && input.lines.length > 0) {
    const eligible = input.lines.map((line) => isLineEligible(line, discount));
    const eligibleSubtotal = lineTotals.reduce((acc, v, i) => (eligible[i] ? acc.plus(v) : acc), new Decimal(0));

    if (discount.minOrderAmount !== null && subtotal.lt(toDecimal(discount.minOrderAmount))) {
      discountRejection = "MIN_ORDER_NOT_MET";
    } else if (eligibleSubtotal.lte(0)) {
      discountRejection = "NO_ELIGIBLE_ITEMS";
    } else if (discount.type === "FIXED_AMOUNT" && discount.currency !== currency) {
      discountRejection = "CURRENCY_MISMATCH";
    } else {
      discountApplied = true;
      if (discount.type === "PERCENTAGE") {
        let amount = roundMoney(eligibleSubtotal.times(toDecimal(discount.value)).div(100), currency);
        if (discount.maxDiscountAmount !== null) amount = Decimal.min(amount, toDecimal(discount.maxDiscountAmount));
        discountTotal = Decimal.min(amount, eligibleSubtotal);
      } else if (discount.type === "FIXED_AMOUNT") {
        discountTotal = Decimal.min(roundMoney(discount.value, currency), eligibleSubtotal);
      } else {
        freeShippingFromDiscount = true;
      }
      allocations = allocateDiscount(lineTotals, eligible, discountTotal, currency);
    }
  }

  const merchandiseAfterDiscount = subtotal.minus(discountTotal);

  const shipping = input.shipping ?? null;
  const shippingPending = shipping === null;
  let freeShipping = false;
  let shippingTotal = new Decimal(0);
  if (shipping) {
    const thresholdMet =
      input.freeShippingThreshold !== null &&
      input.freeShippingThreshold !== undefined &&
      merchandiseAfterDiscount.gte(toDecimal(input.freeShippingThreshold));
    freeShipping = shipping.freeShippingEligible && (freeShippingFromDiscount || thresholdMet);
    shippingTotal = freeShipping ? new Decimal(0) : roundMoney(shipping.price, currency);
  } else if (freeShippingFromDiscount) {
    freeShipping = true;
  }

  const taxRate = toDecimal(input.tax.rate);
  const taxableBase = merchandiseAfterDiscount.plus(shippingTotal);
  let taxTotal: Decimal;
  let grandTotal: Decimal;
  if (taxRate.lte(0)) {
    taxTotal = new Decimal(0);
    grandTotal = taxableBase;
  } else if (input.tax.pricesIncludeTax) {
    // مالیات در قیمت‌ها لحاظ شده است؛ فقط سهم آن برای نمایش و گزارش محاسبه می‌شود
    taxTotal = roundMoney(taxableBase.times(taxRate).div(taxRate.plus(100)), currency);
    grandTotal = taxableBase;
  } else {
    taxTotal = roundMoney(taxableBase.times(taxRate).div(100), currency);
    grandTotal = taxableBase.plus(taxTotal);
  }

  return {
    currency,
    lines: input.lines.map((line, i) => ({
      key: line.key,
      unitPrice: roundMoney(line.unitPrice, currency),
      quantity: line.quantity,
      lineTotal: lineTotals[i],
      discountAmount: allocations[i],
    })),
    subtotal,
    discountTotal,
    discountApplied,
    discountRejection,
    freeShipping,
    shippingTotal,
    shippingPending,
    taxTotal,
    grandTotal: roundMoney(grandTotal, currency),
  };
}

/** قیمت مؤثر محصول (قیمت ویژه در صورت وجود) */
export function effectivePrice(price: MoneyLike, salePrice: MoneyLike | null | undefined): Decimal {
  const p = toDecimal(price);
  if (salePrice === null || salePrice === undefined) return p;
  const s = toDecimal(salePrice);
  return s.lt(p) ? s : p;
}
