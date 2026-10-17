import { registerSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { clearGuestCartCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { createSession, sessionCookie } from "@/server/auth/session";
import { registerCustomer } from "@/server/services/auth";
import { CART_COOKIE, mergeGuestCart } from "@/server/services/cart";

/** ثبت‌نام مشتری و ورود خودکار */
export const POST = route({ rateLimit: { name: "register", rule: RATE_LIMITS.register }, status: 201 }, async (ctx) => {
  const data = await ctx.body(registerSchema);
  const user = await registerCustomer(data);
  const { token } = await createSession(user.id, "CUSTOMER", { ipAddress: ctx.ip, userAgent: ctx.userAgent });
  const guestCart = ctx.cookies.get(CART_COOKIE);
  if (guestCart) {
    await mergeGuestCart(guestCart, user.id);
    clearGuestCartCookie(ctx);
  }
  ctx.cookies.append(sessionCookie("CUSTOMER", token));
  return { user: { id: user.id, email: user.email, firstName: user.firstName } };
});
