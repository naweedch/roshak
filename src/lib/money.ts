/**
 * محاسبات پولی با decimal.js؛ هیچ مبلغی با number محاسبه نمی‌شود.
 * مبالغ بین سرور و کلاینت به صورت رشتهٔ اعشاری جابه‌جا می‌شوند.
 */
import DecimalJs from "decimal.js";
import { getCurrency } from "./currency";

export const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

/** هر مقداری که بتوان آن را به‌صورت دقیق به عدد اعشاری تبدیل کرد */
export type MoneyLike = string | number | Decimal | { toString(): string };

export function toDecimal(value: MoneyLike | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("مقدار پولی نامعتبر است");
    return new Decimal(value);
  }
  return new Decimal(value.toString());
}

/** گرد کردن به تعداد ارقام اعشار ارز (نیم به بالا) */
export function roundMoney(value: MoneyLike, currency: string): Decimal {
  return toDecimal(value).toDecimalPlaces(getCurrency(currency).fractionDigits, Decimal.ROUND_HALF_UP);
}

/** رشتهٔ استاندارد ذخیره/انتقال (مثلاً "12500000.00") */
export function moneyString(value: MoneyLike): string {
  return toDecimal(value).toFixed(2);
}

export function sumMoney(values: MoneyLike[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0));
}

export function minMoney(a: MoneyLike, b: MoneyLike): Decimal {
  return Decimal.min(toDecimal(a), toDecimal(b));
}

export function maxMoney(a: MoneyLike, b: MoneyLike): Decimal {
  return Decimal.max(toDecimal(a), toDecimal(b));
}

export interface FormatMoneyOptions {
  /** نمایش واحد ارز (پیش‌فرض: بله) */
  withUnit?: boolean;
  /** استفاده از ارقام فارسی (پیش‌فرض: بله) */
  persianDigits?: boolean;
}

/** قالب‌بندی مبلغ برای نمایش، مثل «۱۲٬۵۰۰٬۰۰۰ تومان» */
export function formatMoney(value: MoneyLike, currency: string, options: FormatMoneyOptions = {}): string {
  const { withUnit = true, persianDigits = true } = options;
  const info = getCurrency(currency);
  const rounded = roundMoney(value, currency);
  const formatter = new Intl.NumberFormat(persianDigits ? "fa-IR" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: info.fractionDigits,
  });
  const text = formatter.format(rounded.toFixed(info.fractionDigits) as Intl.StringNumericLiteral);
  return withUnit ? `${text} ${info.label}` : text;
}

/** تبدیل مبلغ به واحد ISO (برای schema.org و درگاه پرداخت) */
export function toIsoAmount(value: MoneyLike, currency: string): { amount: string; currency: string } {
  const info = getCurrency(currency);
  const converted = toDecimal(value).times(info.isoFactor);
  const isoDigits = info.isoCode === "IRR" ? 0 : info.fractionDigits;
  return { amount: converted.toFixed(isoDigits), currency: info.isoCode };
}

/** درصد تخفیف بین قیمت اصلی و قیمت فروش ویژه (گرد شده به پایین) */
export function discountPercent(price: MoneyLike, salePrice: MoneyLike): number {
  const p = toDecimal(price);
  const s = toDecimal(salePrice);
  if (p.lte(0) || s.gte(p)) return 0;
  return p.minus(s).div(p).times(100).floor().toNumber();
}
