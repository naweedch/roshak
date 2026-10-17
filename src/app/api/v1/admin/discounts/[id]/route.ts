import { discountSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { deleteDiscount, saveDiscount } from "@/server/services/admin/catalog-admin";

export const PATCH = route<{ id: string }>({ auth: "staff", permission: "discount:write" }, async (ctx) => {
  await saveDiscount(parseId(ctx.params.id), await ctx.body(discountSchema), actorFrom(ctx));
  return { ok: true };
});

/** کد استفاده‌شده حذف نمی‌شود و فقط غیرفعال می‌شود */
export const DELETE = route<{ id: string }>({ auth: "staff", permission: "discount:write" }, async (ctx) => ({ result: await deleteDiscount(parseId(ctx.params.id), actorFrom(ctx)) }));
