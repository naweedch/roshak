import { discountSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { listDiscountsAdmin, saveDiscount } from "@/server/services/admin/catalog-admin";

export const GET = route({ auth: "staff", permission: "discount:read" }, async () => ({ items: await listDiscountsAdmin() }));

export const POST = route({ auth: "staff", permission: "discount:write", status: 201 }, async (ctx) => {
  const d = await saveDiscount(null, await ctx.body(discountSchema), actorFrom(ctx));
  return { id: d.id };
});
