import { normalizePersianText } from "./persian";

/**
 * ساخت نامک خوانا از عنوان فارسی یا لاتین.
 * حروف فارسی حفظ می‌شوند (URLهای فارسی برای سئوی محلی مناسب‌اند) و فاصله‌ها به خط تیره تبدیل می‌شوند.
 */
export function slugify(input: string): string {
  return normalizePersianText(input)
    .toLowerCase()
    .replace(/[‌\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
