import { orderLookupSchema } from "@/lib/validation/checkout";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { lookupGuestOrder } from "@/server/services/orders";

/** پیگیری سفارش مهمان با شمارهٔ سفارش و ایمیل ثبت‌شده (با محدودیت نرخ در برابر حدس زدن) */
export const POST = route({ rateLimit: { name: "order-lookup", rule: RATE_LIMITS.orderLookup } }, async (ctx) => {
  const { orderNumber, email } = await ctx.body(orderLookupSchema);
  const order = await lookupGuestOrder(orderNumber, email);
  if (!order) throw errors.notFound("سفارشی با این مشخصات یافت نشد؛ شمارهٔ سفارش و ایمیل را بررسی کنید");
  return order;
});
