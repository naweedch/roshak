import { shippingMethodSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { saveShippingMethod } from "@/server/services/admin/catalog-admin";

export const PATCH = route<{ id: string }>({ auth: "staff", permission: "settings:write" }, async (ctx) => {
  await saveShippingMethod(parseId(ctx.params.id), await ctx.body(shippingMethodSchema), actorFrom(ctx));
  return { ok: true };
});
