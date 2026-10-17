/**
 * صف خروجی ایمیل (Outbox pattern).
 * ایمیل‌ها درون همان تراکنش تجاری در جدول EmailOutbox ثبت می‌شوند و سپس:
 *  - بلافاصله پس از پاسخ HTTP با after() پردازش می‌شوند، و
 *  - به‌صورت دوره‌ای با «npm run jobs:run» یا endpoint زمان‌بندی‌شده (cron) دوباره تلاش می‌شوند.
 * بنابراین ارسال ایمیل هرگز درخواست کاربر را کند یا شکست‌خورده نمی‌کند.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type DbClient } from "../db";
import { logger } from "../logger";
import { getEmailProvider } from "./provider";
import { renderEmail, type EmailTemplate } from "./templates";

const MAX_ATTEMPTS = 5;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export async function enqueueEmail(client: DbClient, to: string, email: EmailTemplate): Promise<void> {
  const rendered = renderEmail(email);
  await client.emailOutbox.create({
    data: {
      to,
      subject: rendered.subject,
      template: email.template,
      payload: email.payload as unknown as Prisma.InputJsonValue,
    },
  });
}

interface ClaimedRow {
  id: string;
  to: string;
  template: string;
  payload: unknown;
  attempts: number;
}

/** برداشتن دسته‌ای از ایمیل‌های آماده با قفل ردیف (چند پردازشگر هم‌زمان تداخل ندارند) */
async function claimBatch(limit: number): Promise<ClaimedRow[]> {
  const staleLock = new Date(Date.now() - LOCK_TIMEOUT_MS);
  return db.$queryRaw<ClaimedRow[]>`
    UPDATE "EmailOutbox" SET "lockedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "EmailOutbox"
      WHERE "status" = 'PENDING' AND "sendAfter" <= now()
        AND ("lockedAt" IS NULL OR "lockedAt" < ${staleLock})
      ORDER BY "createdAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "to", "template", "payload", "attempts"`;
}

export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const rows = await claimBatch(limit);
  const provider = getEmailProvider();
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const rendered = renderEmail({ template: row.template, payload: row.payload } as EmailTemplate);
      await provider.send({ to: row.to, ...rendered });
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), lockedAt: null, attempts: row.attempts + 1, lastError: null },
      });
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(60 * 60 * 1000, 2 ** attempts * 30 * 1000);
      await db.emailOutbox.update({
        where: { id: row.id },
        data: {
          attempts,
          status: giveUp ? "FAILED" : "PENDING",
          lockedAt: null,
          sendAfter: new Date(Date.now() + backoffMs),
          lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        },
      });
      logger.warn("email_send_failed", { outboxId: row.id, attempts, giveUp, error });
      failed += 1;
    }
  }
  return { sent, failed };
}

/** پردازش صف پس از ارسال پاسخ (اگر در زمینهٔ درخواست Next.js باشیم) */
export async function flushOutboxAfterResponse(): Promise<void> {
  try {
    const { after } = await import("next/server");
    after(async () => {
      try {
        await processOutbox(10);
      } catch (error) {
        logger.warn("outbox_flush_failed", { error });
      }
    });
  } catch {
    // خارج از درخواست Next.js (تست/اسکریپت): پردازش با job دوره‌ای انجام می‌شود
  }
}
