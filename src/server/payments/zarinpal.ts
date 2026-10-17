/**
 * آداپتور درگاه زرین‌پال (API نسخهٔ ۴).
 * فقط با تنظیم ZARINPAL_MERCHANT_ID فعال می‌شود. ZARINPAL_SANDBOX=true از محیط آزمایشی زرین‌پال استفاده می‌کند.
 *
 * وضعیت: پیاده‌سازی بر اساس مستندات رسمی زرین‌پال انجام شده اما در این مخزن با شناسهٔ پذیرندهٔ واقعی
 * آزموده نشده است؛ پیش از فعال‌سازی در محیط عملیاتی، یک تراکنش sandbox و یک تراکنش واقعی کم‌مبلغ بررسی شود.
 */
import "server-only";
import { toIsoAmount } from "@/lib/money";
import { env } from "../env";
import { logger } from "../logger";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProviderAdapter, VerifyPaymentInput, VerifyPaymentResult } from "./types";

function baseUrl(): string {
  return env().ZARINPAL_SANDBOX ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
}

interface ZarinpalResponse<T> {
  data: T | [] | null;
  errors: { code?: number; message?: string } | [] | null;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<ZarinpalResponse<T>> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => null)) as ZarinpalResponse<T> | null;
  if (!json) throw new Error(`پاسخ نامعتبر از زرین‌پال (HTTP ${response.status})`);
  return json;
}

/** مبلغ به ریال صحیح (زرین‌پال مبلغ را عدد صحیح می‌خواهد) */
function rialAmount(amount: string, currency: string): number {
  const iso = toIsoAmount(amount, currency);
  if (iso.currency !== "IRR") throw new Error("زرین‌پال فقط ریال/تومان را پشتیبانی می‌کند");
  return Number(iso.amount);
}

export const zarinpalProvider: PaymentProviderAdapter = {
  id: "ZARINPAL",
  label: "زرین‌پال",

  isConfigured() {
    return Boolean(env().ZARINPAL_MERCHANT_ID);
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const result = await post<{ code: number; authority: string }>("/pg/v4/payment/request.json", {
      merchant_id: env().ZARINPAL_MERCHANT_ID,
      amount: rialAmount(input.amount, input.currency),
      currency: "IRR",
      callback_url: input.callbackUrl,
      description: input.description,
      metadata: { mobile: input.mobile, email: input.email, order_id: input.orderNumber },
    });
    const data = Array.isArray(result.data) ? null : result.data;
    if (!data || data.code !== 100 || !data.authority) {
      logger.warn("zarinpal_request_failed", { errors: result.errors, code: data?.code });
      throw new Error("ایجاد تراکنش در زرین‌پال ناموفق بود");
    }
    return { reference: data.authority, redirectUrl: `${baseUrl()}/pg/StartPay/${encodeURIComponent(data.authority)}` };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // Status=NOK یعنی کاربر انصراف داده یا پرداخت انجام نشده؛ نیازی به فراخوانی تأیید نیست
    if (input.callbackParams?.get("Status") === "NOK") {
      return { status: "FAILED", reason: "پرداخت توسط کاربر لغو شد یا ناموفق بود" };
    }
    const result = await post<{ code: number; ref_id: number; card_pan?: string }>("/pg/v4/payment/verify.json", {
      merchant_id: env().ZARINPAL_MERCHANT_ID,
      amount: rialAmount(input.amount, input.currency),
      authority: input.reference,
    });
    const data = Array.isArray(result.data) ? null : result.data;
    if (data && (data.code === 100 || data.code === 101)) {
      return { status: "SUCCEEDED", transactionId: String(data.ref_id), cardPanMasked: data.card_pan };
    }
    const errorCode = !Array.isArray(result.errors) && result.errors ? result.errors.code : undefined;
    logger.info("zarinpal_verify_not_successful", { code: data?.code, errorCode });
    return { status: "FAILED", reason: "پرداخت توسط درگاه تأیید نشد" };
  },
};
