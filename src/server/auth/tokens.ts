/**
 * توکن‌های تصادفی و هش آن‌ها.
 * توکن خام فقط یک‌بار به کاربر داده می‌شود (کوکی یا لینک ایمیل)؛ در دیتابیس فقط HMAC آن ذخیره می‌شود
 * تا نشت دیتابیس به تنهایی برای جعل نشست کافی نباشد.
 */
import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function secret(): string {
  const value = process.env.TOKEN_HASH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("TOKEN_HASH_SECRET تنظیم نشده یا کوتاه است");
  }
  return value;
}

export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** امضای HMAC با کلید دلخواه (برای وب‌هوک‌ها) */
export function hmacSha256Hex(key: string, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}
