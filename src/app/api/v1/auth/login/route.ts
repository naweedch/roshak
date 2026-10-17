import { loginSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { clearGuestCartCookie } from "@/server/http/cookies";
import { RATE_LIMITS } from "@/server/rate-limit";
import { createSession, deleteSessionByToken, sessionCookie, SESSION_POLICY } from "@/server/auth/session";
import { authenticate } from "@/server/services/auth";
import { CART_COOKIE, mergeGuestCart } from "@/server/services/cart";

/** ورود مشتری؛ محدودیت نرخ هم بر اساس IP و هم بر اساس حساب اعمال می‌شود */
export const POST = route({ rateLimit: { name: "login-ip", rule: RATE_LIMITS.loginPerIp } }, async (ctx) => {
  const { email, password } = await ctx.body(loginSchema);
  await ctx.limit(`login-account:${email}`, RATE_LIMITS.loginPerAccount);
  const user = await authenticate(email, password, "CUSTOMER");

  // نشست قبلی (در صورت وجود) حذف می‌شود تا تثبیت نشست (session fixation) ممکن نباشد
  await deleteSessionByToken(ctx.cookies.get(SESSION_POLICY.CUSTOMER.cookie));
  const { token } = await createSession(user.id, "CUSTOMER", { ipAddress: ctx.ip, userAgent: ctx.userAgent });

  const guestCart = ctx.cookies.get(CART_COOKIE);
  if (guestCart) {
    await mergeGuestCart(guestCart, user.id);
    clearGuestCartCookie(ctx);
  }
  ctx.cookies.append(sessionCookie("CUSTOMER", token));
  ctx.log.info("customer_login", { userId: user.id });
  return { ok: true };
});
