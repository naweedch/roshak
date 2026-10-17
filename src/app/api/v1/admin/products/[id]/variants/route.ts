import { variantSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { addVariant } from "@/server/services/admin/products";

export const POST = route<{ id: string }>({ auth: "staff", permission: "product:write", status: 201 }, async (ctx) => {
  const data = await ctx.body(variantSchema);
  const variant = await addVariant(parseId(ctx.params.id), data, actorFrom(ctx));
  return { id: variant.id };
});
