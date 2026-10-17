import { productSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { RATE_LIMITS } from "@/server/rate-limit";
import { deleteOrArchiveProduct, getProductAdmin, updateProduct } from "@/server/services/admin/products";

export const GET = route<{ id: string }>({ auth: "staff", permission: "product:read" }, async (ctx) => getProductAdmin(parseId(ctx.params.id)));

export const PATCH = route<{ id: string }>({ auth: "staff", permission: "product:write", rateLimit: { name: "admin-write", rule: RATE_LIMITS.adminWrite } }, async (ctx) => {
  const data = await ctx.body(productSchema);
  const product = await updateProduct(parseId(ctx.params.id), data, actorFrom(ctx));
  return { id: product.id, slug: product.slug };
});

/** حذف واقعی فقط برای محصول بدون سابقه؛ در غیر این صورت بایگانی */
export const DELETE = route<{ id: string }>({ auth: "staff", permission: "product:delete" }, async (ctx) => {
  const result = await deleteOrArchiveProduct(parseId(ctx.params.id), actorFrom(ctx));
  return { result };
});
