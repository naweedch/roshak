import { z } from "zod";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { confirmNewsletter, unsubscribeNewsletter } from "@/server/services/engagement";

const schema = z.object({ token: z.string().min(20).max(200), action: z.enum(["confirm", "unsubscribe"]).default("confirm") });

export const POST = route({ rateLimit: { name: "newsletter-confirm", rule: RATE_LIMITS.newsletter } }, async (ctx) => {
  const { token, action } = await ctx.body(schema);
  const ok = action === "confirm" ? await confirmNewsletter(token) : await unsubscribeNewsletter(token);
  if (!ok) throw errors.badRequest("پیوند نامعتبر است یا قبلاً استفاده شده است");
  return { message: action === "confirm" ? "عضویت شما تأیید شد." : "از خبرنامه خارج شدید." };
});
