import { cartUpdateSchema } from "@/lib/validation/engagement";
import { uuidSchema } from "@/lib/validation/common";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { CART_COOKIE, getCartView, removeCartItem, updateCartItem } from "@/server/services/cart";

/** تغییر تعداد یک قلم (۰ یعنی حذف)؛ مالکیت قلم نسبت به سبد فعلی بررسی می‌شود */
export const PATCH = route<{ id: string }>(
  { auth: "optional-customer", rateLimit: { name: "cart-write", rule: RATE_LIMITS.cartWrite } },
  async (ctx) => {
    const id = uuidSchema.parse(ctx.params.id);
    const { quantity } = await ctx.body(cartUpdateSchema);
    const owner = { userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) };
    await updateCartItem(owner, id, quantity);
    return getCartView(owner);
  },
);

export const DELETE = route<{ id: string }>(
  { auth: "optional-customer", rateLimit: { name: "cart-write", rule: RATE_LIMITS.cartWrite } },
  async (ctx) => {
    const id = uuidSchema.parse(ctx.params.id);
    const owner = { userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) };
    await removeCartItem(owner, id);
    return getCartView(owner);
  },
);
