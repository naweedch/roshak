import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { getProduct, getRelated } from "@/server/queries/public";

/** محصولات مرتبط/مکمل (هم‌دسته یا هم‌مجموعه) */
export const GET = route<{ slug: string }>({ cache: "public-short" }, async (ctx) => {
  const product = await getProduct(decodeURIComponent(ctx.params.slug).slice(0, 160));
  if (!product) throw errors.notFound("محصول یافت نشد");
  return { items: await getRelated(product.id) };
});
