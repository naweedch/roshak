import { z } from "zod";
import { route } from "@/server/http/handler";
import { ORDER_ACCESS_COOKIE, orderAccessFromCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { retryOrderPayment } from "@/server/services/orders";

/** تلاش دوباره برای پرداخت سفارشی که در مهلت رزرو است */
export const POST = route<{ orderNumber: string }>(
  { auth: "optional-customer", rateLimit: { name: "retry-payment", rule: RATE_LIMITS.checkout } },
  async (ctx) => {
    const orderNumber = ctx.params.orderNumber.toUpperCase().slice(0, 32);
    const { key } = await ctx.body(z.object({ key: z.string().max(200).optional() }));
    return retryOrderPayment(orderNumber, {
      userId: ctx.customer?.user.id,
      accessToken: key ?? orderAccessFromCookie(ctx.cookies.get(ORDER_ACCESS_COOKIE), orderNumber),
    });
  },
);
