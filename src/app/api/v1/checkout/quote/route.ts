import { z } from "zod";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { CART_COOKIE } from "@/server/services/cart";
import { quoteCheckout } from "@/server/services/checkout";

const quoteSchema = z.object({
  shippingMethodId: z.uuid().nullable().optional(),
  email: z.email().optional(),
});

/**
 * پیش‌نمایش مبلغ نهایی بر اساس روش ارسال انتخاب‌شده.
 * فقط محاسبه است و هیچ تغییری در سفارش یا موجودی ایجاد نمی‌کند.
 */
export const POST = route({ auth: "optional-customer", rateLimit: { name: "checkout-quote", rule: RATE_LIMITS.cartWrite } }, async (ctx) => {
  const { shippingMethodId, email } = await ctx.body(quoteSchema);
  return quoteCheckout(
    { userId: ctx.customer?.user.id ?? null, guestCartToken: ctx.cookies.get(CART_COOKIE) ?? null, email: ctx.customer?.user.email ?? email ?? null },
    shippingMethodId ?? null,
  );
});
