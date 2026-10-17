/**
 * اجرای کارهای دوره‌ای (لغو سفارش‌های پرداخت‌نشدهٔ منقضی و آزادسازی موجودی، ارسال صف ایمیل،
 * پاک‌سازی نشست‌ها و سبدهای رهاشده) بیرون از وب‌سرور.
 *
 *   npm run jobs:run              یک بار اجرا (مناسب cron سیستم‌عامل، هر ۵ دقیقه)
 *   npm run jobs:run -- --loop    اجرای پیوسته با فاصلهٔ JOBS_INTERVAL_SECONDS (پیش‌فرض ۳۰۰) برای کانتینر جانبی
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { db } from "@/server/db";
import { runScheduledJobs } from "@/server/jobs";

async function main() {
  const { values } = parseArgs({ options: { loop: { type: "boolean", default: false } } });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL تنظیم نشده است");

  if (!values.loop) {
    const results = await runScheduledJobs();
    console.log(JSON.stringify(results));
    return;
  }

  const interval = Math.max(30, Number(process.env.JOBS_INTERVAL_SECONDS ?? 300)) * 1000;
  const controller = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => controller.abort());
  while (!controller.signal.aborted) {
    await runScheduledJobs();
    await sleep(interval, undefined, { signal: controller.signal }).catch(() => undefined);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
