import { variantUpdateSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { updateVariant } from "@/server/services/admin/products";

export const PATCH = route<{ id: string }>({ auth: "staff", permission: "product:write" }, async (ctx) => {
  await updateVariant(parseId(ctx.params.id), await ctx.body(variantUpdateSchema), actorFrom(ctx));
  return { ok: true };
});
