import { after } from "next/server";
import { z } from "zod";
import { route } from "@/server/http/handler";
import { db } from "@/server/db";
import { appUrl, env, isTestPaymentEnabled } from "@/server/env";
import { errors } from "@/server/errors";
import { logger } from "@/server/logger";
import { signWebhook } from "@/server/payments/webhook";
import { callbackUrlFor } from "@/server/services/payment-flow";

/**
 * «تصمیم» در درگاه آزمایشی (شبیه‌سازی صفحهٔ بانک). فقط وقتی PAYMENT_TEST_MODE فعال است در دسترس است.
 * نتیجه در جدول TestGatewayTransaction ثبت می‌شود و مرورگر به callback برمی‌گردد؛
 * یک وب‌هوک امضاشده نیز (مثل درگاه واقعی) به سرور ارسال می‌شود.
 */
export const POST = route<{ reference: string }>({ rateLimit: { name: "test-gateway", rule: { limit: 30, windowSeconds: 60 } } }, async (ctx) => {
  if (!isTestPaymentEnabled()) throw errors.notFound();
  const reference = ctx.params.reference.slice(0, 100);
  const { decision } = await ctx.body(z.object({ decision: z.enum(["success", "fail"]) }));

  const transaction = await db.testGatewayTransaction.findUnique({ where: { reference } });
  if (!transaction) throw errors.notFound("تراکنش آزمایشی یافت نشد");
  await db.testGatewayTransaction.updateMany({
    where: { reference, status: "PENDING" },
    data: { status: decision === "success" ? "SUCCEEDED" : "FAILED", decidedAt: new Date() },
  });

  const payment = await db.payment.findFirst({ where: { provider: "TEST", providerReference: reference } });
  if (!payment) throw errors.notFound("پرداخت مرتبط یافت نشد");

  const secret = env().PAYMENT_TEST_WEBHOOK_SECRET;
  if (secret) {
    const body = JSON.stringify({ reference, event: "payment.updated" });
    const { timestamp, signature } = signWebhook(secret, body);
    after(async () => {
      try {
        await fetch(`${appUrl()}/api/v1/payments/webhook/test`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-roshnak-timestamp": timestamp, "x-roshnak-signature": signature },
          body,
          signal: AbortSignal.timeout(5000),
        });
      } catch (error) {
        logger.warn("test_webhook_delivery_failed", { error });
      }
    });
  }

  const callback = new URL(callbackUrlFor("TEST", payment.id));
  callback.searchParams.set("reference", reference);
  return { redirectUrl: callback.toString() };
});
