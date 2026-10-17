/**
 * هش رمز عبور با Argon2id (پارامترهای پیش‌فرض کتابخانه مطابق توصیهٔ OWASP:
 * حافظهٔ ۱۹ مگابایت، ۲ تکرار، ۱ رشته).
 */
import "server-only";
import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * هشی ثابت برای زمانی که کاربر وجود ندارد؛ با بررسی آن، زمان پاسخ ورود
 * برای ایمیل موجود و ناموجود یکسان می‌ماند و از شناسایی حساب‌ها جلوگیری می‌شود.
 */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash("roshnak-timing-equalizer-password");
  await verifyPassword(await dummyHash, password);
}
