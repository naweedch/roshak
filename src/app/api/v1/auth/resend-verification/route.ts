import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { resendEmailVerification } from "@/server/services/auth";

export const POST = route({ auth: "customer", rateLimit: { name: "resend-verification", rule: RATE_LIMITS.emailVerification } }, async (ctx) => {
  const result = await resendEmailVerification(ctx.requireCustomer().user.id);
  return { message: result.alreadyVerified ? "ایمیل شما قبلاً تأیید شده است." : "پیوند تأیید دوباره ارسال شد." };
});
