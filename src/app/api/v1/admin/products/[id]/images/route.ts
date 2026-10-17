import { hasPermission } from "@/lib/rbac";
import { imageMetaSchema, imageOrderSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/common";
import { route } from "@/server/http/handler";
import { actorFrom, parseId, readUpload } from "@/server/http/admin";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { reorderProductImages, uploadProductImage } from "@/server/services/admin/products";

/** بارگذاری تصویر محصول (multipart: file, alt, colorId?, kind?) */
export const POST = route<{ id: string }>({ auth: "staff", permission: "product:write", status: 201, rateLimit: { name: "upload", rule: RATE_LIMITS.upload } }, async (ctx) => {
  if (!hasPermission(ctx.requireStaff().user.role, "media:upload")) throw errors.forbidden();
  const { buffer, form } = await readUpload(ctx);
  const meta = imageMetaSchema.safeParse({
    alt: form.get("alt"),
    colorId: form.get("colorId") || null,
    kind: form.get("kind") || "GALLERY",
  });
  if (!meta.success) throw errors.validation(fieldErrors(meta.error));
  const image = await uploadProductImage(parseId(ctx.params.id), buffer, meta.data, actorFrom(ctx));
  return { id: image.id, url: image.url };
});

/** ترتیب جدید تصاویر */
export const PATCH = route<{ id: string }>({ auth: "staff", permission: "product:write" }, async (ctx) => {
  const { imageIds } = await ctx.body(imageOrderSchema);
  await reorderProductImages(parseId(ctx.params.id), imageIds);
  return { ok: true };
});
