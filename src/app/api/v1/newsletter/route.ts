import { newsletterSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { getSettings } from "@/server/queries/public";
import { subscribeNewsletter } from "@/server/services/engagement";

export const POST = route({ rateLimit: { name: "newsletter", rule: RATE_LIMITS.newsletter } }, async (ctx) => {
  const settings = await getSettings();
  if (!settings.newsletterEnabled) throw errors.unavailable("عضویت در خبرنامه در حال حاضر فعال نیست");
  const { email, source } = await ctx.body(newsletterSchema);
  const result = await subscribeNewsletter(email, source);
  return {
    message: result.requiresConfirmation
      ? "ایمیل تأیید عضویت ارسال شد؛ برای تکمیل عضویت روی پیوند آن بزنید."
      : "عضویت شما در خبرنامهٔ روشاک ثبت شد.",
  };
});
