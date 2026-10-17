import { imageMetaSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { deleteProductImage, updateProductImage } from "@/server/services/admin/products";

export const PATCH = route<{ id: string; imageId: string }>({ auth: "staff", permission: "product:write" }, async (ctx) => {
  await updateProductImage(parseId(ctx.params.id), parseId(ctx.params.imageId), await ctx.body(imageMetaSchema));
  return { ok: true };
});

export const DELETE = route<{ id: string; imageId: string }>({ auth: "staff", permission: "product:write" }, async (ctx) => {
  await deleteProductImage(parseId(ctx.params.id), parseId(ctx.params.imageId), actorFrom(ctx));
  return { ok: true };
});
