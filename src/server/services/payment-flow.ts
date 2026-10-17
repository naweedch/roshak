/**
 * شروع تراکنش نزد درگاه برای یک پرداخت در انتظار (خارج از تراکنش دیتابیس).
 */
import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { db } from "../db";
import { appUrl } from "../env";
import { errors } from "../errors";
import { logger } from "../logger";
import { getPaymentProvider } from "../payments";

export function callbackUrlFor(provider: PaymentProvider, paymentId: string): string {
  return `${appUrl()}/api/v1/payments/callback/${provider.toLowerCase()}?pid=${paymentId}`;
}

/** ایجاد تراکنش نزد درگاه برای یک پرداخت در انتظار (خارج از تراکنش دیتابیس) */
export async function initiatePayment(paymentId: string): Promise<{ redirectUrl: string | null; error: string | null }> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { orderNumber: true, email: true, phone: true } } },
  });
  if (!payment) throw errors.notFound("پرداخت یافت نشد");
  const provider = getPaymentProvider(payment.provider);
  try {
    const result = await provider.createPayment({
      paymentId: payment.id,
      orderNumber: payment.order.orderNumber,
      amount: payment.amount.toString(),
      currency: payment.currency,
      callbackUrl: callbackUrlFor(payment.provider, payment.id),
      description: `سفارش ${payment.order.orderNumber} از فروشگاه روشاک`,
      email: payment.order.email,
      mobile: payment.order.phone,
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerReference: result.reference } });
    return { redirectUrl: result.redirectUrl, error: null };
  } catch (error) {
    logger.error("payment_init_failed", { paymentId, provider: payment.provider, error });
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", failureReason: "اتصال به درگاه پرداخت برقرار نشد" },
    });
    return { redirectUrl: null, error: "اتصال به درگاه پرداخت برقرار نشد؛ از صفحهٔ سفارش دوباره برای پرداخت اقدام کنید" };
  }
}
