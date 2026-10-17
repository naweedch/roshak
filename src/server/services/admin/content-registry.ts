/** نگاشت نوع محتوا به طرح اعتبارسنجی و سرویس آن (برای مسیرهای عمومی محتوای پنل) */
import "server-only";
import type { z } from "zod";
import { announcementSchema, articleSchema, bannerSchema, faqSchema, pageSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/common";
import { errors } from "../../errors";
import * as content from "./content-admin";
import type { Actor } from "./products";

interface ContentType {
  list: () => Promise<unknown[]>;
  /** ورودی خام را با طرح همان نوع اعتبارسنجی و ذخیره می‌کند */
  save: (id: string | null, input: unknown, actor: Actor) => Promise<{ id: string }>;
  remove: (id: string, actor: Actor) => Promise<void>;
}

function define<S extends z.ZodType>(
  schema: S,
  list: () => Promise<unknown[]>,
  save: (id: string | null, data: z.output<S>, actor: Actor) => Promise<{ id: string }>,
  remove: (id: string, actor: Actor) => Promise<void>,
): ContentType {
  return {
    list,
    remove,
    save: (id, input, actor) => {
      const parsed = schema.safeParse(input);
      if (!parsed.success) throw errors.validation(fieldErrors(parsed.error));
      return save(id, parsed.data, actor);
    },
  };
}

export const CONTENT_TYPES: Record<"banners" | "announcements" | "pages" | "articles" | "faq", ContentType> = {
  banners: define(bannerSchema, content.listBanners, content.saveBanner, content.deleteBanner),
  announcements: define(announcementSchema, content.listAnnouncements, content.saveAnnouncement, content.deleteAnnouncement),
  pages: define(pageSchema, content.listPagesAdmin, content.savePage, content.deletePage),
  articles: define(articleSchema, content.listArticlesAdmin, content.saveArticle, content.deleteArticle),
  faq: define(faqSchema, content.listFaqAdmin, content.saveFaq, content.deleteFaq),
};

export type ContentTypeKey = keyof typeof CONTENT_TYPES;

export function contentTypeOf(value: string): ContentTypeKey {
  if (!(value in CONTENT_TYPES)) throw errors.notFound();
  return value as ContentTypeKey;
}
