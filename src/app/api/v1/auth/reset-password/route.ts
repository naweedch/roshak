import { resetPasswordSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { clearSessionCookie } from "@/server/auth/session";
import { resetPassword } from "@/server/services/auth";

export const POST = route({ rateLimit: { name: "password-reset-submit", rule: RATE_LIMITS.passwordReset } }, async (ctx) => {
  const { token, password } = await ctx.body(resetPasswordSchema);
  await resetPassword(token, password);
  ctx.cookies.append(clearSessionCookie("CUSTOMER"));
  return { message: "رمز عبور شما تغییر کرد؛ اکنون با رمز جدید وارد شوید." };
});
