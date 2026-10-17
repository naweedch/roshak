import { route } from "@/server/http/handler";
import { env } from "@/server/env";
import { errors } from "@/server/errors";
import { safeEqual } from "@/server/auth/tokens";
import { runScheduledJobs } from "@/server/jobs";

/**
 * اجرای کارهای دوره‌ای (لغو سفارش‌های منقضی، صف ایمیل، پاک‌سازی). فقط با CRON_SECRET.
 * POST برای cron سرور یا سرویس زمان‌بندی؛ GET برای Vercel Cron (که همان هدر Authorization را می‌فرستد).
 */
const runJobs = route({ csrf: false }, async (ctx) => {
  const secret = env().CRON_SECRET;
  const header = ctx.request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !provided || !safeEqual(provided, secret)) throw errors.unauthorized("دسترسی غیرمجاز");
  return runScheduledJobs();
});

export const POST = runJobs;
export const GET = runJobs;
