import { z } from "zod";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { searchSuggestions } from "@/server/services/catalog";

/** پیشنهادهای جست‌وجوی زنده (محصول، مجموعه، دسته) */
export const GET = route({ rateLimit: { name: "search", rule: RATE_LIMITS.search }, cache: "public-short" }, async (ctx) => {
  const { q } = ctx.query(z.object({ q: z.string().trim().max(80).default("") }));
  return searchSuggestions(q);
});
