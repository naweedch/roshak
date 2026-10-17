/**
 * امضای وب‌هوک با HMAC-SHA256 روی «timestamp.body» و جلوگیری از بازپخش با بازهٔ زمانی محدود.
 * (الگوی رایج درگاه‌ها؛ برای درگاه آزمایشی پیاده‌سازی و تست شده است.)
 */
import "server-only";
import { hmacSha256Hex, safeEqual } from "../auth/tokens";

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  return { timestamp: String(timestamp), signature: hmacSha256Hex(secret, `${timestamp}.${body}`) };
}

export type WebhookVerification = { ok: true } | { ok: false; reason: "missing" | "stale" | "invalid" };

export function verifyWebhookSignature(
  secret: string,
  body: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  now = Math.floor(Date.now() / 1000),
): WebhookVerification {
  if (!timestampHeader || !signatureHeader) return { ok: false, reason: "missing" };
  const timestamp = Number(timestampHeader);
  if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: "stale" };
  const expected = hmacSha256Hex(secret, `${timestamp}.${body}`);
  return safeEqual(expected, signatureHeader.trim().toLowerCase()) ? { ok: true } : { ok: false, reason: "invalid" };
}
