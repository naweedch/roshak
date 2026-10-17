import { z } from "zod";
import { route } from "@/server/http/handler";
import { ORDER_ACCESS_COOKIE, orderAccessFromCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { cancelUnpaidOrderByCustomer } from "@/server/services/orders";

/** لغو سفارش پرداخت‌نشده توسط مشتری؛ موجودی رزروشده به انبار برمی‌گردد */
export const POST = route<{ orderNumber: string }>(
  { auth: "optional-customer", rateLimit: { name: "order-cancel", rule: RATE_LIMITS.checkout } },
  async (ctx) => {
    const orderNumber = ctx.params.orderNumber.toUpperCase().slice(0, 32);
    const { key } = await ctx.body(z.object({ key: z.string().max(200).optional() }));
    await cancelUnpaidOrderByCustomer(orderNumber, {
      userId: ctx.customer?.user.id,
      accessToken: key ?? orderAccessFromCookie(ctx.cookies.get(ORDER_ACCESS_COOKIE), orderNumber),
    });
    return { message: "سفارش لغو شد." };
  },
);
