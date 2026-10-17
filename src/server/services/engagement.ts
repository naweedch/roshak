/** خبرنامه و فرم تماس */
import "server-only";
import { db } from "../db";
import { appUrl, env } from "../env";
import { enqueueEmail, flushOutboxAfterResponse } from "../email/outbox";
import { generateToken, hashToken } from "../auth/tokens";
import { loadStoreSettings } from "./settings";

/**
 * عضویت در خبرنامه با تأیید دومرحله‌ای (در صورت فعال بودن در تنظیمات).
 * پاسخ برای ایمیل‌های تکراری یکسان است تا عضویت افراد قابل کشف نباشد.
 */
export async function subscribeNewsletter(email: string, source: string): Promise<{ requiresConfirmation: boolean }> {
  const settings = await loadStoreSettings();
  const doubleOptIn = settings.newsletterDoubleOptIn;
  const existing = await db.newsletterSubscription.findUnique({ where: { email } });
  if (existing?.status === "SUBSCRIBED") return { requiresConfirmation: false };

  const confirmToken = generateToken();
  const unsubscribeToken = generateToken();
  await db.$transaction(async (tx) => {
    if (existing) {
      await tx.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          status: doubleOptIn ? "PENDING" : "SUBSCRIBED",
          confirmTokenHash: doubleOptIn ? hashToken(confirmToken) : null,
          confirmedAt: doubleOptIn ? null : new Date(),
          unsubscribedAt: null,
          source,
        },
      });
    } else {
      await tx.newsletterSubscription.create({
        data: {
          email,
          source,
          status: doubleOptIn ? "PENDING" : "SUBSCRIBED",
          confirmTokenHash: doubleOptIn ? hashToken(confirmToken) : null,
          unsubscribeTokenHash: hashToken(unsubscribeToken),
          confirmedAt: doubleOptIn ? null : new Date(),
        },
      });
    }
    if (doubleOptIn) {
      await enqueueEmail(tx, email, {
        template: "newsletter-confirm",
        payload: { url: `${appUrl()}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}` },
      });
    }
  });
  await flushOutboxAfterResponse();
  return { requiresConfirmation: doubleOptIn };
}

export async function confirmNewsletter(token: string): Promise<boolean> {
  const result = await db.newsletterSubscription.updateMany({
    where: { confirmTokenHash: hashToken(token), status: "PENDING" },
    data: { status: "SUBSCRIBED", confirmedAt: new Date(), confirmTokenHash: null },
  });
  return result.count === 1;
}

export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const result = await db.newsletterSubscription.updateMany({
    where: { unsubscribeTokenHash: hashToken(token), status: { not: "UNSUBSCRIBED" } },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  return result.count === 1;
}

export async function submitContactMessage(input: { name: string; email: string; phone?: string; subject: string; message: string }) {
  const settings = await loadStoreSettings();
  const notify = env().STORE_NOTIFICATION_EMAIL || settings.contactEmail;
  await db.$transaction(async (tx) => {
    await tx.contactMessage.create({ data: input });
    if (notify) {
      await enqueueEmail(tx, notify, {
        template: "contact-notification",
        payload: { name: input.name, email: input.email, subject: input.subject, message: input.message },
      });
    }
  });
  await flushOutboxAfterResponse();
}
