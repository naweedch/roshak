import { parseCatalogParams } from "@/lib/validation/catalog";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { getCatalogPage, getCollection } from "@/server/queries/public";

/** جزئیات مجموعه به همراه صفحهٔ اول محصولات آن */
export const GET = route<{ slug: string }>({ cache: "public-short" }, async (ctx) => {
  const slug = decodeURIComponent(ctx.params.slug).slice(0, 160);
  const collection = await getCollection(slug);
  if (!collection) throw errors.notFound("مجموعه یافت نشد");
  const params = Object.fromEntries(new URL(ctx.request.url).searchParams.entries());
  const products = await getCatalogPage(parseCatalogParams(params, { collection: slug }));
  return { collection, products };
});
