import { z } from "zod";
import { parseCatalogParams } from "@/lib/validation/catalog";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { getCatalogPage, getFacets } from "@/server/queries/public";
import { getProductCardsByIds } from "@/server/services/catalog";

const idsSchema = z.object({ ids: z.string().max(2000).optional(), facets: z.enum(["1"]).optional() });

/**
 * فهرست محصولات منتشرشده با فیلتر و مرتب‌سازی (همان پارامترهای URL صفحهٔ فروشگاه).
 * با ?ids=a,b,c کارت محصولات مشخص (مثلاً «بازدیدهای اخیر») برگردانده می‌شود.
 */
export const GET = route({ rateLimit: { name: "catalog", rule: RATE_LIMITS.search }, cache: "public-short" }, async (ctx) => {
  const extra = ctx.query(idsSchema);
  if (extra.ids) {
    const ids = extra.ids
      .split(",")
      .map((s) => s.trim())
      .filter((s) => z.uuid().safeParse(s).success)
      .slice(0, 24);
    return { items: await getProductCardsByIds(ids) };
  }
  const params = Object.fromEntries(new URL(ctx.request.url).searchParams.entries());
  const filters = parseCatalogParams(params, {
    collection: typeof params.collection === "string" ? params.collection : undefined,
  });
  const [page, facets] = await Promise.all([getCatalogPage(filters), extra.facets ? getFacets(filters) : Promise.resolve(null)]);
  return { ...page, facets };
});
