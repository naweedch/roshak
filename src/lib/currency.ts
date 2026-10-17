/**
 * ثبت ارزهای پشتیبانی‌شده.
 * «تومان» کد ISO ندارد؛ برای داده‌های ساختاریافته و درگاه‌ها به ریال (IRR) تبدیل می‌شود.
 */
export const CURRENCY_CODES = ["IRT", "IRR", "USD", "EUR", "AED"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface CurrencyInfo {
  code: CurrencyCode;
  /** کد ISO 4217 برای schema.org و درگاه‌ها */
  isoCode: string;
  /** ضریب تبدیل یک واحد این ارز به واحد ISO (تومان → ریال = ۱۰) */
  isoFactor: number;
  fractionDigits: number;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IRT: { code: "IRT", isoCode: "IRR", isoFactor: 10, fractionDigits: 0, label: "تومان" },
  IRR: { code: "IRR", isoCode: "IRR", isoFactor: 1, fractionDigits: 0, label: "ریال" },
  USD: { code: "USD", isoCode: "USD", isoFactor: 1, fractionDigits: 2, label: "دلار" },
  EUR: { code: "EUR", isoCode: "EUR", isoFactor: 1, fractionDigits: 2, label: "یورو" },
  AED: { code: "AED", isoCode: "AED", isoFactor: 1, fractionDigits: 2, label: "درهم" },
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

export function getCurrency(code: string): CurrencyInfo {
  if (!isCurrencyCode(code)) {
    throw new Error(`ارز پشتیبانی‌نشده: ${code}`);
  }
  return CURRENCIES[code];
}
