/** تست محاسبهٔ قیمت نهایی (جمع جزء، تخفیف، ارسال، مالیات) */
import { describe, expect, it } from "vitest";
import { allocateDiscount, computeTotals, effectivePrice, type PricingDiscount, type PricingInput } from "@/lib/commerce/pricing";
import { Decimal } from "@/lib/money";

const P1 = "p1";
const P2 = "p2";
const C1 = "c1";

function input(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    currency: "IRT",
    lines: [
      { key: "a", productId: P1, collectionIds: [C1], unitPrice: "1000000", quantity: 2 },
      { key: "b", productId: P2, collectionIds: [], unitPrice: "500000", quantity: 1 },
    ],
    tax: { rate: "0", pricesIncludeTax: true },
    ...overrides,
  };
}

function discount(overrides: Partial<PricingDiscount>): PricingDiscount {
  return {
    code: "TEST",
    type: "PERCENTAGE",
    scope: "ALL",
    value: "10",
    currency: null,
    maxDiscountAmount: null,
    minOrderAmount: null,
    productIds: [],
    collectionIds: [],
    ...overrides,
  };
}

const str = (d: Decimal) => d.toFixed(0);

describe("computeTotals", () => {
  it("جمع جزء را بدون تخفیف و ارسال محاسبه می‌کند و هزینهٔ ارسال را نامشخص می‌گذارد", () => {
    const r = computeTotals(input());
    expect(str(r.subtotal)).toBe("2500000");
    expect(str(r.grandTotal)).toBe("2500000");
    expect(r.shippingPending).toBe(true);
    expect(r.discountApplied).toBe(false);
  });

  it("تخفیف درصدی با سقف مبلغ اعمال می‌شود", () => {
    const r = computeTotals(input({ discount: discount({ value: "20", maxDiscountAmount: "300000" }) }));
    // ۲۰٪ از ۲٬۵۰۰٬۰۰۰ = ۵۰۰٬۰۰۰ اما سقف ۳۰۰٬۰۰۰ است
    expect(str(r.discountTotal)).toBe("300000");
    expect(str(r.grandTotal)).toBe("2200000");
    expect(r.discountApplied).toBe(true);
  });

  it("تخفیف مبلغ ثابت از مبلغ کالاهای واجد شرایط بیشتر نمی‌شود", () => {
    const r = computeTotals(input({ discount: discount({ type: "FIXED_AMOUNT", value: "9000000", currency: "IRT" }) }));
    expect(str(r.discountTotal)).toBe("2500000");
    expect(str(r.grandTotal)).toBe("0");
  });

  it("تخفیف مبلغ ثابت با ارز متفاوت رد می‌شود", () => {
    const r = computeTotals(input({ discount: discount({ type: "FIXED_AMOUNT", value: "100", currency: "USD" }) }));
    expect(r.discountRejection).toBe("CURRENCY_MISMATCH");
    expect(str(r.discountTotal)).toBe("0");
  });

  it("حداقل مبلغ سفارش رعایت می‌شود", () => {
    const r = computeTotals(input({ discount: discount({ minOrderAmount: "3000000" }) }));
    expect(r.discountRejection).toBe("MIN_ORDER_NOT_MET");
    expect(r.discountApplied).toBe(false);
  });

  it("کد محدود به محصولات دیگر برای این سبد رد می‌شود", () => {
    const r = computeTotals(input({ discount: discount({ scope: "PRODUCTS", productIds: ["other"] }) }));
    expect(r.discountRejection).toBe("NO_ELIGIBLE_ITEMS");
  });

  it("تخفیف مجموعه فقط روی سطرهای همان مجموعه اعمال می‌شود", () => {
    const r = computeTotals(input({ discount: discount({ scope: "COLLECTIONS", collectionIds: [C1], value: "10" }) }));
    expect(str(r.discountTotal)).toBe("200000");
    expect(str(r.lines[0].discountAmount)).toBe("200000");
    expect(str(r.lines[1].discountAmount)).toBe("0");
  });

  it("کد ارسال رایگان هزینهٔ ارسال را صفر می‌کند", () => {
    const r = computeTotals(input({ discount: discount({ type: "FREE_SHIPPING", value: "0" }), shipping: { price: "150000", freeShippingEligible: true } }));
    expect(r.freeShipping).toBe(true);
    expect(str(r.shippingTotal)).toBe("0");
    expect(str(r.discountTotal)).toBe("0");
  });

  it("حد ارسال رایگان بر اساس مبلغ پس از تخفیف سنجیده می‌شود", () => {
    const shipping = { price: "150000", freeShippingEligible: true };
    const noDiscount = computeTotals(input({ shipping, freeShippingThreshold: "2500000" }));
    expect(noDiscount.freeShipping).toBe(true);
    const withDiscount = computeTotals(input({ shipping, freeShippingThreshold: "2500000", discount: discount({ value: "10" }) }));
    expect(withDiscount.freeShipping).toBe(false);
    expect(str(withDiscount.shippingTotal)).toBe("150000");
    expect(str(withDiscount.grandTotal)).toBe("2400000");
  });

  it("روش ارسال غیرمشمول، با رسیدن به حد آستانه هم رایگان نمی‌شود", () => {
    const r = computeTotals(input({ shipping: { price: "300000", freeShippingEligible: false }, freeShippingThreshold: "1000" }));
    expect(r.freeShipping).toBe(false);
    expect(str(r.shippingTotal)).toBe("300000");
  });

  it("مالیات خارج از قیمت به مبلغ نهایی اضافه می‌شود", () => {
    const r = computeTotals(input({ tax: { rate: "10", pricesIncludeTax: false }, shipping: { price: "100000", freeShippingEligible: true } }));
    expect(str(r.taxTotal)).toBe("260000");
    expect(str(r.grandTotal)).toBe("2860000");
  });

  it("مالیات داخل قیمت فقط سهم مالیات را گزارش می‌کند و مبلغ نهایی تغییر نمی‌کند", () => {
    const r = computeTotals(input({ tax: { rate: "10", pricesIncludeTax: true } }));
    // ۲٬۵۰۰٬۰۰۰ × ۱۰ / ۱۱۰ = ۲۲۷٬۲۷۲٫۷۲ → گرد به تومان
    expect(str(r.taxTotal)).toBe("227273");
    expect(str(r.grandTotal)).toBe("2500000");
  });
});

describe("allocateDiscount", () => {
  it("جمع سهم‌ها دقیقاً برابر کل تخفیف است (بدون خطای گرد کردن)", () => {
    const totals = [new Decimal(333), new Decimal(333), new Decimal(334)];
    const shares = allocateDiscount(totals, [true, true, true], new Decimal(100), "IRT");
    const sum = shares.reduce((a, b) => a.plus(b), new Decimal(0));
    expect(sum.toFixed(0)).toBe("100");
    shares.forEach((s) => expect(s.gte(0)).toBe(true));
  });

  it("به سطر غیرواجد شرایط سهمی نمی‌دهد", () => {
    const shares = allocateDiscount([new Decimal(100), new Decimal(100)], [false, true], new Decimal(50), "IRT");
    expect(shares[0].toFixed(0)).toBe("0");
    expect(shares[1].toFixed(0)).toBe("50");
  });
});

describe("effectivePrice", () => {
  it("قیمت ویژه فقط وقتی کمتر از قیمت اصلی است اعمال می‌شود", () => {
    expect(effectivePrice("1000", "800").toFixed(0)).toBe("800");
    expect(effectivePrice("1000", "1200").toFixed(0)).toBe("1000");
    expect(effectivePrice("1000", null).toFixed(0)).toBe("1000");
  });
});
