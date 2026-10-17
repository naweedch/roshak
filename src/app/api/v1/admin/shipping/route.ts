import { shippingMethodSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { listShippingMethodsAdmin, saveShippingMethod } from "@/server/services/admin/catalog-admin";

export const GET = route({ auth: "staff", permission: "settings:read" }, async () => ({ items: await listShippingMethodsAdmin() }));

export const POST = route({ auth: "staff", permission: "settings:write", status: 201 }, async (ctx) => {
  const row = await saveShippingMethod(null, await ctx.body(shippingMethodSchema), actorFrom(ctx));
  return { id: row.id };
});
