import { z } from "zod";
import { route } from "@/server/http/handler";
import { actorFrom, readUpload } from "@/server/http/admin";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { processAndStoreImage } from "@/server/services/media";

const folderSchema = z.enum(["content", "collections", "products"]).default("content");

/** بارگذاری تصویر عمومی (کاور مجموعه، بنر، مقاله) و برگرداندن نشانی آن */
export const POST = route({ auth: "staff", permission: "media:upload", status: 201, rateLimit: { name: "upload", rule: RATE_LIMITS.upload } }, async (ctx) => {
  const { buffer, form } = await readUpload(ctx);
  const folder = folderSchema.safeParse(form.get("folder") ?? undefined);
  if (!folder.success) throw errors.badRequest("پوشهٔ نامعتبر");
  const alt = typeof form.get("alt") === "string" ? String(form.get("alt")).slice(0, 200) : undefined;
  const stored = await processAndStoreImage(buffer, { folder: folder.data, alt, uploadedById: actorFrom(ctx).id });
  return stored;
});
