import { contactSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { submitContactMessage } from "@/server/services/engagement";

export const POST = route({ rateLimit: { name: "contact", rule: RATE_LIMITS.contact }, status: 201 }, async (ctx) => {
  const data = await ctx.body(contactSchema);
  await submitContactMessage(data);
  return { message: "پیام شما دریافت شد؛ همکاران ما در اولین فرصت پاسخ می‌دهند." };
});
