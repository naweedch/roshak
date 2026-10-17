import { stockAdjustmentSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { RATE_LIMITS } from "@/server/rate-limit";
import { adjustVariantStock } from "@/server/services/admin/products";

/** تغییر دستی موجودی با ثبت حرکت انبار و ممیزی */
export const POST = route<{ id: string }>({ auth: "staff", permission: "inventory:write", rateLimit: { name: "admin-write", rule: RATE_LIMITS.adminWrite } }, async (ctx) => {
  return adjustVariantStock(parseId(ctx.params.id), await ctx.body(stockAdjustmentSchema), actorFrom(ctx));
});
