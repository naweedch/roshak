import { forgotPasswordSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { requestPasswordReset } from "@/server/services/auth";

/** پاسخ همیشه یکسان است تا وجود حساب قابل تشخیص نباشد */
export const POST = route({ rateLimit: { name: "password-reset", rule: RATE_LIMITS.passwordReset } }, async (ctx) => {
  const { email } = await ctx.body(forgotPasswordSchema);
  await ctx.limit(`password-reset-account:${email}`, { limit: 3, windowSeconds: 60 * 60 });
  await requestPasswordReset(email);
  return { message: "اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی رمز برای آن ارسال شد." };
});
