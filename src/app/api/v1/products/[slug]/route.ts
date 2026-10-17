import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { getProduct } from "@/server/queries/public";

/** جزئیات کامل محصول منتشرشده (تنوع‌ها، تصاویر، راهنمای سایز) */
export const GET = route<{ slug: string }>({ cache: "public-short" }, async (ctx) => {
  const slug = decodeURIComponent(ctx.params.slug).slice(0, 160);
  const product = await getProduct(slug);
  if (!product) throw errors.notFound("محصول یافت نشد");
  return product;
});
