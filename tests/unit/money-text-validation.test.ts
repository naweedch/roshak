/** تست مبالغ، متن فارسی و اعتبارسنجی‌های مشترک */
import { describe, expect, it } from "vitest";
import { discountPercent, formatMoney, moneyString, roundMoney, toIsoAmount } from "@/lib/money";
import { normalizePersianText, normalizeSearchText, toEnglishDigits, toPersianDigits } from "@/lib/persian";
import { IRAN_POSTAL_CODE_REGEX, mobileSchema, normalizeIranMobile, passwordSchema, postalCodeSchema } from "@/lib/validation/common";
import { discountSchema, settingsSchema } from "@/lib/validation/admin";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("مبالغ", () => {
  it("تومان برای درگاه و schema.org به ریال (×۱۰) تبدیل می‌شود", () => {
    expect(toIsoAmount("2450000", "IRT")).toEqual({ amount: "24500000", currency: "IRR" });
    expect(toIsoAmount("10.5", "USD")).toEqual({ amount: "10.50", currency: "USD" });
  });

  it("گرد کردن نیم به بالا بر اساس ارقام اعشار ارز", () => {
    expect(roundMoney("1000.5", "IRT").toFixed(0)).toBe("1001");
    expect(roundMoney("10.005", "USD").toFixed(2)).toBe("10.01");
    expect(moneyString("12")).toBe("12.00");
  });

  it("قالب‌بندی فارسی و درصد تخفیف", () => {
    expect(formatMoney("12500000", "IRT")).toBe("۱۲٬۵۰۰٬۰۰۰ تومان");
    expect(discountPercent("1000", "750")).toBe(25);
    expect(discountPercent("1000", "1000")).toBe(0);
  });

  it("ارز ناشناخته خطا می‌دهد", () => {
    expect(() => roundMoney("1", "XYZ")).toThrow();
  });
});

describe("متن فارسی", () => {
  it("ارقام فارسی و عربی به انگلیسی و برعکس", () => {
    expect(toEnglishDigits("۰۹۱۲۳٤٥٦")).toBe("09123456");
    expect(toPersianDigits(1405)).toBe("۱۴۰۵");
  });

  it("یکسان‌سازی ی و ک عربی و حذف کشیده", () => {
    expect(normalizePersianText("  پيراهن  مجلسـی  كوتاه ")).toBe("پیراهن مجلسی کوتاه");
    expect(normalizeSearchText("لباس‌شب، قرمز!")).toBe("لباس شب قرمز");
  });
});

describe("اعتبارسنجی مشترک", () => {
  it("شمارهٔ موبایل ایران در قالب‌های مختلف یکسان می‌شود", () => {
    expect(normalizeIranMobile("+98 912 345 6789")).toBe("09123456789");
    expect(normalizeIranMobile("00989123456789")).toBe("09123456789");
    expect(normalizeIranMobile("۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(mobileSchema.safeParse("0912345678").success).toBe(false);
    expect(mobileSchema.parse("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("کد پستی ده‌رقمی بدون ۰ و ۲ در پنج رقم نخست", () => {
    expect(IRAN_POSTAL_CODE_REGEX.test("1345678901")).toBe(true);
    expect(postalCodeSchema.safeParse("1204567890").success).toBe(false);
    expect(postalCodeSchema.parse("۱۳۴۵۶-۷۸۹۰۱")).toBe("1345678901");
  });

  it("رمزهای رایج یا فقط عددی پذیرفته نمی‌شوند", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("98765432101").success).toBe(false);
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("Shab-e-Yalda-1405").success).toBe(true);
  });

  it("بدون پذیرش قوانین، ثبت سفارش معتبر نیست", () => {
    const base = {
      idempotencyKey: "0199a9b0-0000-7000-8000-000000000001",
      contact: { firstName: "نگار", lastName: "رضایی", email: "negar@example.com", phone: "09123456789" },
      shippingAddress: { recipientName: "نگار رضایی", phone: "09123456789", province: "تهران", city: "تهران", addressLine: "خیابان ولیعصر، پلاک ۱۰", postalCode: "1345678901" },
      shippingMethodId: "0199a9b0-0000-7000-8000-000000000002",
      paymentProvider: "TEST",
    };
    expect(checkoutSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    const ok = checkoutSchema.safeParse({ ...base, acceptTerms: true });
    expect(ok.success).toBe(true);
  });
});

describe("اعتبارسنجی پنل مدیریت", () => {
  const valid = { code: "yalda-20", type: "PERCENTAGE", scope: "ALL", value: "20" };

  it("کد تخفیف به حروف بزرگ تبدیل می‌شود", () => {
    expect(discountSchema.parse(valid).code).toBe("YALDA-20");
  });

  it("درصد بیش از ۱۰۰ و تاریخ پایان پیش از شروع رد می‌شود", () => {
    expect(discountSchema.safeParse({ ...valid, value: "120" }).success).toBe(false);
    const r = discountSchema.safeParse({ ...valid, startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" });
    expect(r.success).toBe(false);
  });

  it("تخفیف مبلغ ثابت ارز می‌خواهد و دامنهٔ محصول حداقل یک محصول", () => {
    expect(discountSchema.safeParse({ ...valid, type: "FIXED_AMOUNT", value: "50000" }).success).toBe(false);
    expect(discountSchema.safeParse({ ...valid, type: "FIXED_AMOUNT", value: "50000", currency: "IRT" }).success).toBe(true);
    expect(discountSchema.safeParse({ ...valid, scope: "PRODUCTS", productIds: [] }).success).toBe(false);
  });

  it("قالب عنوان سئو باید %s داشته باشد و شناسهٔ GA قالب درست", () => {
    const shape = settingsSchema.shape;
    expect(shape.seoTitleTemplate.safeParse("روشاک").success).toBe(false);
    expect(shape.seoTitleTemplate.safeParse("%s | روشاک").success).toBe(true);
    expect(shape.gaMeasurementId.safeParse("UA-1234").success).toBe(false);
    expect(shape.gaMeasurementId.safeParse("G-ABC1234").success).toBe(true);
  });
});
