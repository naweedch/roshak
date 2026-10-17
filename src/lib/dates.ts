/** قالب‌بندی تاریخ به تقویم خورشیدی با ارقام فارسی */
export function formatPersianDate(value: string | Date, options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", ...options }).format(date);
}

export function formatPersianDateTime(value: string | Date): string {
  return formatPersianDate(value, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** تاریخ کوتاه عددی برای جدول‌ها، مثل ۱۴۰۵/۰۷/۲۴ */
export function formatPersianShortDate(value: string | Date): string {
  return formatPersianDate(value, { year: "numeric", month: "2-digit", day: "2-digit" });
}
