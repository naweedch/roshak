/**
 * «درگاه آزمایشی» برای توسعه و تست خودکار. هیچ پولی جابه‌جا نمی‌شود و در رابط کاربری
 * صراحتاً با برچسب «آزمایشی» نمایش داده می‌شود.
 *
 * برای اینکه مسیر تأیید پرداخت همان رفتار درگاه واقعی را داشته باشد:
 *  - تصمیم «پرداخت موفق/ناموفق» در جدول TestGatewayTransaction (نقش پایگاه دادهٔ درگاه) ثبت می‌شود؛
 *  - بازگشت مرورگر (callback) هیچ وضعیتی را مستقیماً نمی‌پذیرد و verifyPayment
 *    وضعیت را از همین جدول و با تطبیق مبلغ می‌خواند؛
 *  - وب‌هوک امضاشده (HMAC) نیز ارسال و در سرور اعتبارسنجی می‌شود.
 */
import "server-only";
import { db } from "../db";
import { appUrl, isTestPaymentEnabled } from "../env";
import { generateToken } from "../auth/tokens";
import { toDecimal } from "@/lib/money";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProviderAdapter, VerifyPaymentInput, VerifyPaymentResult } from "./types";

export const testPaymentProvider: PaymentProviderAdapter = {
  id: "TEST",
  label: "درگاه آزمایشی (بدون پرداخت واقعی)",

  isConfigured() {
    return isTestPaymentEnabled();
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const reference = `test_${generateToken(18)}`;
    await db.testGatewayTransaction.create({
      data: { reference, amount: input.amount, currency: input.currency },
    });
    return { reference, redirectUrl: `${appUrl()}/payment/test-gateway/${reference}` };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const tx = await db.testGatewayTransaction.findUnique({ where: { reference: input.reference } });
    if (!tx) return { status: "FAILED", reason: "تراکنش در درگاه آزمایشی یافت نشد" };
    if (tx.currency !== input.currency || !toDecimal(tx.amount).eq(toDecimal(input.amount))) {
      return { status: "FAILED", reason: "مبلغ تراکنش با مبلغ سفارش مطابقت ندارد" };
    }
    if (tx.status === "SUCCEEDED") {
      return { status: "SUCCEEDED", transactionId: `TEST-${tx.id.slice(-12).toUpperCase()}`, cardPanMasked: "0000-00**-****-0000" };
    }
    if (tx.status === "PENDING") return { status: "PENDING" };
    return { status: "FAILED", reason: "پرداخت در درگاه آزمایشی لغو یا ناموفق اعلام شد" };
  },
};
