import { changePasswordSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { createSession, sessionCookie } from "@/server/auth/session";
import { changePassword } from "@/server/services/auth";

/** تغییر رمز: همهٔ نشست‌ها باطل و یک نشست تازه برای دستگاه فعلی صادر می‌شود */
export const POST = route({ auth: "customer", rateLimit: { name: "change-password", rule: RATE_LIMITS.passwordReset } }, async (ctx) => {
  const { currentPassword, newPassword } = await ctx.body(changePasswordSchema);
  const userId = ctx.requireCustomer().user.id;
  await changePassword(userId, currentPassword, newPassword);
  const { token } = await createSession(userId, "CUSTOMER", { ipAddress: ctx.ip, userAgent: ctx.userAgent });
  ctx.cookies.append(sessionCookie("CUSTOMER", token));
  return { message: "رمز عبور تغییر کرد و از سایر دستگاه‌ها خارج شدید." };
});
