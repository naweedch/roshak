import { cartAddSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { setGuestCartCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { addToCart, CART_COOKIE, getCartView } from "@/server/services/cart";

/** افزودن تنوع (رنگ/سایز) به سبد با بررسی موجودی در سرور */
export const POST = route({ auth: "optional-customer", rateLimit: { name: "cart-write", rule: RATE_LIMITS.cartWrite } }, async (ctx) => {
  const { variantId, quantity } = await ctx.body(cartAddSchema);
  const owner = { userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) };
  const { newGuestToken } = await addToCart(owner, variantId, quantity);
  if (newGuestToken) setGuestCartCookie(ctx, newGuestToken);
  return getCartView({ ...owner, guestToken: newGuestToken ?? owner.guestToken });
});
