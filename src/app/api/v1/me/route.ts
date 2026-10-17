import { route } from "@/server/http/handler";
import { CART_COOKIE, getCartCount } from "@/server/services/cart";
import { getWishlistProductIds } from "@/server/services/customer";

/** وضعیت سبک کاربر برای سربرگ سایت: کاربر واردشده، تعداد سبد، علاقه‌مندی‌ها */
export const GET = route({ auth: "optional-customer" }, async (ctx) => {
  const user = ctx.customer?.user ?? null;
  const [cartCount, wishlist] = await Promise.all([
    getCartCount({ userId: user?.id, guestToken: ctx.cookies.get(CART_COOKIE) }),
    user ? getWishlistProductIds(user.id) : Promise.resolve([]),
  ]);
  return {
    user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerified: user.emailVerified } : null,
    cartCount,
    wishlist,
  };
});
