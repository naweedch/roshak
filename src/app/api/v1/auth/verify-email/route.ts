import { verifyEmailSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { verifyEmail } from "@/server/services/auth";

export const POST = route({ rateLimit: { name: "verify-email", rule: RATE_LIMITS.emailVerification } }, async (ctx) => {
  const { token } = await ctx.body(verifyEmailSchema);
  await verifyEmail(token);
  return { message: "ایمیل شما تأیید شد." };
});
