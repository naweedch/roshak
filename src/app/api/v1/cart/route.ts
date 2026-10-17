import { route } from "@/server/http/handler";
import { CART_COOKIE, getCartView } from "@/server/services/cart";

/** سبد خرید فعلی با قیمت‌ها و موجودی محاسبه‌شده در سرور */
export const GET = route({ auth: "optional-customer" }, async (ctx) =>
  getCartView({ userId: ctx.customer?.user.id, email: ctx.customer?.user.email, guestToken: ctx.cookies.get(CART_COOKIE) }),
);
