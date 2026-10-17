import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** ترکیب کلاس‌های Tailwind با حذف کلاس‌های متعارض */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** تبدیل امن ورودی به عدد صحیح مثبت (برای پارامترهای URL) */
export function toPositiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

/** حذف کلیدهای undefined از یک شیء (برای ساخت query string و داده‌های Prisma) */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** فقط مسیرهای داخلی امن را برای ریدایرکت می‌پذیرد (جلوگیری از open redirect) */
export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  try {
    const url = new URL(value, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
