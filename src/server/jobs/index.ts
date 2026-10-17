/**
 * کارهای دوره‌ای پس‌زمینه. با یکی از روش‌های زیر هر ۵ دقیقه اجرا شوند:
 *  - فراخوانی POST /api/v1/internal/jobs با هدر Authorization: Bearer $CRON_SECRET (cron سرور یا سرویس زمان‌بندی)
 *  - یا اجرای «npm run jobs:run» در cron سیستم‌عامل/کانتینر.
 */
import "server-only";
import { logger } from "../logger";
import { processOutbox } from "../email/outbox";
import { purgeExpiredSessions } from "../auth/session";
import { purgeAbandonedGuestCarts } from "../services/cart";
import { expireStaleOrders } from "../services/orders";

export async function runScheduledJobs() {
  const startedAt = Date.now();
  const results: Record<string, unknown> = {};
  const jobs: Array<[string, () => Promise<unknown>]> = [
    ["expireStaleOrders", () => expireStaleOrders()],
    ["emailOutbox", () => processOutbox(50)],
    ["purgeExpiredSessions", () => purgeExpiredSessions()],
    ["purgeAbandonedGuestCarts", () => purgeAbandonedGuestCarts()],
  ];
  for (const [name, job] of jobs) {
    try {
      results[name] = await job();
    } catch (error) {
      logger.error("scheduled_job_failed", { job: name, error });
      results[name] = { error: true };
    }
  }
  logger.info("scheduled_jobs_completed", { durationMs: Date.now() - startedAt, results });
  return results;
}
