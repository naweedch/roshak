import { checkoutSchema } from "@/lib/validation/checkout";
import { route } from "@/server/http/handler";
import { setOrderAccessCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { CART_COOKIE } from "@/server/services/cart";
import { placeOrder } from "@/server/services/checkout";

/**
 * ثبت سفارش. کلید idempotency در بدنه الزامی است؛ ارسال دوبارهٔ همان کلید سفارش جدید نمی‌سازد.
 * پاسخ شامل آدرس هدایت به درگاه است. وضعیت پرداخت فقط پس از تأیید سمت سرور تغییر می‌کند.
 */
export const POST = route(
  { auth: "optional-customer", rateLimit: { name: "checkout", rule: RATE_LIMITS.checkout }, status: 201 },
  async (ctx) => {
    const input = await ctx.body(checkoutSchema);
    const result = await placeOrder(input, {
      userId: ctx.customer?.user.id ?? null,
      guestCartToken: ctx.cookies.get(CART_COOKIE) ?? null,
    });
    if (result.accessToken) setOrderAccessCookie(ctx, result.orderNumber, result.accessToken);
    ctx.log.info("order_placed", { orderNumber: result.orderNumber, duplicate: result.duplicate, paid: result.paid });
    return {
      orderNumber: result.orderNumber,
      redirectUrl: result.redirectUrl,
      paid: result.paid,
      paymentInitError: result.paymentInitError,
      duplicate: result.duplicate,
    };
  },
);
