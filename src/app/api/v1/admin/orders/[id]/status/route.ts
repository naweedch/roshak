import { orderStatusSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { RATE_LIMITS } from "@/server/rate-limit";
import { updateOrderStatusByStaff } from "@/server/services/orders";

/** تغییر وضعیت سفارش (ماشین حالت در سرور بررسی و تغییر ممیزی می‌شود) */
export const POST = route<{ id: string }>({ auth: "staff", permission: "order:write", rateLimit: { name: "admin-write", rule: RATE_LIMITS.adminWrite } }, async (ctx) => {
  const data = await ctx.body(orderStatusSchema);
  await updateOrderStatusByStaff(parseId(ctx.params.id), data, actorFrom(ctx));
  return { ok: true };
});
