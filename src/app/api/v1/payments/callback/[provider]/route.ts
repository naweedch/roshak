import { z } from "zod";
import { route } from "@/server/http/handler";
import { appUrl } from "@/server/env";
import { handlePaymentCallback } from "@/server/services/orders";

/**
 * بازگشت مرورگر از درگاه پرداخت.
 * پارامترهای URL فقط برای یافتن پرداخت استفاده می‌شوند؛ وضعیت نهایی با فراخوانی API تأیید درگاه
 * (یا پایگاه دادهٔ درگاه آزمایشی) تعیین می‌شود. رسیدن به این آدرس به‌تنهایی سفارش را پرداخت‌شده نمی‌کند.
 */
export const GET = route<{ provider: string }>({}, async (ctx) => {
  const url = new URL(ctx.request.url);
  const parsed = z.uuid().safeParse(url.searchParams.get("pid"));
  if (!parsed.success) {
    return Response.redirect(`${appUrl()}/checkout/result?status=invalid`, 303);
  }
  try {
    const result = await handlePaymentCallback(parsed.data, url.searchParams);
    const status = result.outcome === "PAID" ? "paid" : result.outcome === "PENDING" ? "pending" : "failed";
    return Response.redirect(`${appUrl()}/checkout/result?order=${encodeURIComponent(result.orderNumber)}&status=${status}`, 303);
  } catch (error) {
    ctx.log.error("payment_callback_error", { error });
    return Response.redirect(`${appUrl()}/checkout/result?status=error`, 303);
  }
});
