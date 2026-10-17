/**
 * ابزارهای متن فارسی: تبدیل ارقام، یکسان‌سازی حروف عربی/فارسی و آماده‌سازی متن برای جست‌وجو.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی و عربی به ارقام انگلیسی */
export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p >= 0) return String(p);
    return String(ARABIC_DIGITS.indexOf(ch));
  });
}

/** تبدیل ارقام انگلیسی به ارقام فارسی برای نمایش */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** قالب‌بندی عدد با ارقام و جداکنندهٔ فارسی */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

/**
 * یکسان‌سازی متن فارسی: «ي» و «ك» عربی به «ی» و «ک»، حذف کشیده و اعراب،
 * و تبدیل ارقام به انگلیسی. فاصلهٔ مجازی حفظ می‌شود.
 */
export function normalizePersianText(input: string): string {
  return toEnglishDigits(input)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[أإٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ـ/g, "")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * متن مناسب جست‌وجو: نسخهٔ یکسان‌شده، با حروف کوچک لاتین،
 * فاصلهٔ مجازی تبدیل به فاصله و حذف علائم نگارشی.
 */
export function normalizeSearchText(input: string): string {
  return normalizePersianText(input)
    .toLowerCase()
    .replace(/[‌‏‎]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
