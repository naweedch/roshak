import { z } from "zod";
import { route } from "@/server/http/handler";
import { db } from "@/server/db";
import { env, isTestPaymentEnabled } from "@/server/env";
import { errors } from "@/server/errors";
import { getPaymentProvider } from "@/server/payments";
import { verifyWebhookSignature } from "@/server/payments/webhook";
import { settlePayment } from "@/server/services/orders";

const bodySchema = z.object({ reference: z.string().min(5).max(100), event: z.string().max(60) });

/**
 * وب‌هوک امضاشدهٔ درگاه آزمایشی.
 * امضای HMAC و تازگی زمان بررسی می‌شود؛ سپس وضعیت دوباره از منبع درگاه تأیید می‌شود
 * (به محتوای بدنهٔ وب‌هوک به‌تنهایی اعتماد نمی‌شود). پردازش idempotent است.
 */
export const POST = route({ csrf: false, maxBodyBytes: 10_000 }, async (ctx) => {
  if (!isTestPaymentEnabled()) throw errors.notFound();
  const secret = env().PAYMENT_TEST_WEBHOOK_SECRET;
  if (!secret) throw errors.unavailable("کلید وب‌هوک آزمایشی تنظیم نشده است");

  const raw = await ctx.request.text();
  const verification = verifyWebhookSignature(
    secret,
    raw,
    ctx.request.headers.get("x-roshnak-timestamp"),
    ctx.request.headers.get("x-roshnak-signature"),
  );
  if (!verification.ok) {
    ctx.log.warn("webhook_signature_rejected", { reason: verification.reason });
    throw errors.unauthorized("امضای وب‌هوک نامعتبر است");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw errors.badRequest("بدنهٔ وب‌هوک نامعتبر است");
  }
  const parsed = bodySchema.safeParse(parsedJson);
  if (!parsed.success) throw errors.badRequest("بدنهٔ وب‌هوک نامعتبر است");

  const payment = await db.payment.findFirst({ where: { provider: "TEST", providerReference: parsed.data.reference } });
  if (!payment) return { received: true, matched: false };

  const result = await getPaymentProvider("TEST").verifyPayment({
    reference: parsed.data.reference,
    amount: payment.amount.toString(),
    currency: payment.currency,
  });
  const settlement = await settlePayment(payment.id, result);
  return { received: true, matched: true, outcome: settlement.outcome };
});
