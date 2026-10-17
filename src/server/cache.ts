/**
 * برچسب‌های کش و ابطال آن‌ها.
 * داده‌های عمومی (کاتالوگ، محتوا، تنظیمات) با «use cache» و این برچسب‌ها کش می‌شوند
 * و پس از هر تغییر در پنل مدیریت فوراً باطل می‌شوند.
 */
import "server-only";
import { revalidateTag } from "next/cache";
import { logger } from "./logger";

export const TAGS = {
  catalog: "catalog",
  product: (slug: string) => `product:${slug}`,
  collections: "collections",
  collection: (slug: string) => `collection:${slug}`,
  categories: "categories",
  taxonomy: "taxonomy",
  content: "content",
  articles: "articles",
  settings: "settings",
  reviews: (productId: string) => `reviews:${productId}`,
  testimonials: "testimonials",
  shipping: "shipping",
} as const;

/**
 * ابطال فوری برچسب‌ها. خارج از اجرای Next.js (مثلاً در تست‌ها و اسکریپت‌ها) بی‌اثر است.
 */
export function invalidate(...tags: string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        logger.debug("cache_invalidate_skipped", { tag, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}
