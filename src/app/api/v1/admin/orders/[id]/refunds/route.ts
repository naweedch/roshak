import { refundSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { RATE_LIMITS } from "@/server/rate-limit";
import { recordRefund } from "@/server/services/orders";

/** ثبت بازپرداخت انجام‌شده (idempotent با idempotencyKey) */
export const POST = route<{ id: string }>({ auth: "staff", permission: "order:refund", status: 201, rateLimit: { name: "admin-write", rule: RATE_LIMITS.adminWrite } }, async (ctx) => {
  const refund = await recordRefund(parseId(ctx.params.id), await ctx.body(refundSchema), actorFrom(ctx));
  return { id: refund.id };
});
