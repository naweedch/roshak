/**
 * نگاشت رنگ تأکیدی مجموعه‌ها (ذخیره‌شده با کلید در دیتابیس) به کلاس‌های توکن‌های طراحی.
 * فقط کلیدهای این فهرست پذیرفته می‌شوند تا هیچ کلاس دلخواهی از داده ساخته نشود.
 */
export const ACCENT_KEYS = ["burgundy", "ruby", "champagne", "midnight", "emerald", "rose", "lavender", "terracotta"] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

const ACCENTS: Record<AccentKey, { bg: string; text: string; textOnDark: string; ring: string; soft: string }> = {
  burgundy: { bg: "bg-burgundy", text: "text-burgundy", textOnDark: "text-champagne", ring: "ring-burgundy", soft: "bg-burgundy/10" },
  ruby: { bg: "bg-ruby", text: "text-ruby", textOnDark: "text-rose", ring: "ring-ruby", soft: "bg-ruby/10" },
  champagne: { bg: "bg-champagne-deep", text: "text-champagne-deep", textOnDark: "text-champagne-soft", ring: "ring-champagne", soft: "bg-champagne/20" },
  midnight: { bg: "bg-midnight", text: "text-midnight", textOnDark: "text-champagne", ring: "ring-midnight", soft: "bg-midnight/10" },
  emerald: { bg: "bg-emerald", text: "text-emerald", textOnDark: "text-champagne-soft", ring: "ring-emerald", soft: "bg-emerald/10" },
  rose: { bg: "bg-rose", text: "text-burgundy", textOnDark: "text-ivory", ring: "ring-rose", soft: "bg-rose/20" },
  lavender: { bg: "bg-lavender", text: "text-midnight", textOnDark: "text-ivory", ring: "ring-lavender", soft: "bg-lavender/20" },
  terracotta: { bg: "bg-terracotta", text: "text-terracotta", textOnDark: "text-champagne-soft", ring: "ring-terracotta", soft: "bg-terracotta/15" },
};

export function isAccentKey(value: string | null | undefined): value is AccentKey {
  return Boolean(value) && (ACCENT_KEYS as readonly string[]).includes(value as string);
}

export function accentClasses(key: string | null | undefined) {
  return ACCENTS[isAccentKey(key) ? key : "burgundy"];
}

export const ACCENT_LABELS: Record<AccentKey, string> = {
  burgundy: "زرشکی",
  ruby: "یاقوتی",
  champagne: "شامپاینی",
  midnight: "سرمه‌ای",
  emerald: "زمردی",
  rose: "صورتی",
  lavender: "یاسی",
  terracotta: "آجری",
};
