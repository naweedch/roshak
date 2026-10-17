import { discountCodeSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { applyCartDiscount, CART_COOKIE, getCartView, removeCartDiscount } from "@/server/services/cart";

export const POST = route({ auth: "optional-customer", rateLimit: { name: "discount-check", rule: RATE_LIMITS.discountCheck } }, async (ctx) => {
  const { code } = await ctx.body(discountCodeSchema);
  const owner = { userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) };
  return applyCartDiscount(owner, code);
});

export const DELETE = route({ auth: "optional-customer" }, async (ctx) => {
  const owner = { userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) };
  await removeCartDiscount(owner);
  return getCartView(owner);
});
