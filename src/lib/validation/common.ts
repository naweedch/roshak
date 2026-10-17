/**
 * طرح‌های اعتبارسنجی مشترک بین کلاینت و سرور.
 * سرور همیشه دوباره اعتبارسنجی می‌کند؛ اعتبارسنجی کلاینت فقط برای تجربهٔ کاربری است.
 */
import { z } from "zod";
import { normalizePersianText, toEnglishDigits } from "../persian";

/** متن کوتاه فارسی با یکسان‌سازی حروف */
export const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} الزامی است` })
    .transform((v) => normalizePersianText(v))
    .pipe(
      z
        .string()
        .min(min, { error: min <= 1 ? `${label} الزامی است` : `${label} باید حداقل ${min} کاراکتر باشد` })
        .max(max, { error: `${label} حداکثر ${max} کاراکتر است` }),
    );

/** متن اختیاری؛ رشتهٔ خالی به undefined تبدیل می‌شود */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const t = v ? normalizePersianText(v) : "";
      return t.length ? t : undefined;
    })
    .pipe(z.string().max(max, { error: `${label} حداکثر ${max} کاراکتر است` }).optional());

export const emailSchema = z
  .string({ error: "ایمیل الزامی است" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "ایمیل معتبر نیست" }).max(254, { error: "ایمیل بیش از حد طولانی است" }));

/** نرمال‌سازی شمارهٔ موبایل ایران به قالب 09xxxxxxxxx */
export function normalizeIranMobile(input: string): string {
  let v = toEnglishDigits(input).replace(/[\s\-()]/g, "");
  if (v.startsWith("+98")) v = `0${v.slice(3)}`;
  else if (v.startsWith("0098")) v = `0${v.slice(4)}`;
  else if (v.startsWith("98") && v.length === 12) v = `0${v.slice(2)}`;
  else if (v.startsWith("9") && v.length === 10) v = `0${v}`;
  return v;
}

export const IRAN_MOBILE_REGEX = /^09\d{9}$/;

export const mobileSchema = z
  .string({ error: "شمارهٔ موبایل الزامی است" })
  .transform(normalizeIranMobile)
  .pipe(z.string().regex(IRAN_MOBILE_REGEX, { error: "شمارهٔ موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" }));

/**
 * کد پستی ایران: ده رقم؛ در پنج رقم نخست از ارقام ۰ و ۲ استفاده نمی‌شود.
 */
export const IRAN_POSTAL_CODE_REGEX = /^[13-9]{5}\d{5}$/;

export function normalizePostalCode(input: string): string {
  return toEnglishDigits(input).replace(/[\s-]/g, "");
}

export const postalCodeSchema = z
  .string({ error: "کد پستی الزامی است" })
  .transform(normalizePostalCode)
  .pipe(z.string().regex(IRAN_POSTAL_CODE_REGEX, { error: "کد پستی باید ده رقم معتبر باشد" }));

export const PASSWORD_MIN_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwertyui",
  "qwerty123",
  "11111111",
  "00000000",
  "iloveyou",
  "abcd1234",
  "1q2w3e4r",
  "asdfghjk",
  "88888888",
  "987654321",
  "roshnak123",
]);

export const passwordSchema = z
  .string({ error: "رمز عبور الزامی است" })
  .min(PASSWORD_MIN_LENGTH, { error: `رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} کاراکتر باشد` })
  .max(128, { error: "رمز عبور حداکثر ۱۲۸ کاراکتر است" })
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), { error: "این رمز عبور بسیار رایج است؛ رمز دیگری انتخاب کنید" })
  .refine((v) => /[^\d]/.test(v), { error: "رمز عبور نباید فقط از عدد تشکیل شده باشد" });

export const uuidSchema = z.uuid({ error: "شناسه نامعتبر است" });

export const slugSchema = z
  .string()
  .trim()
  .min(2, { error: "نامک باید حداقل ۲ کاراکتر باشد" })
  .max(120, { error: "نامک حداکثر ۱۲۰ کاراکتر است" })
  .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, { error: "نامک فقط شامل حروف، اعداد و خط تیره است" });

/** مبلغ پولی به‌صورت رشتهٔ اعشاری نامنفی (حداکثر دو رقم اعشار) */
export const moneyInputSchema = z
  .union([z.string(), z.number()])
  .transform((v) => toEnglishDigits(String(v)).replace(/[,٬\s]/g, ""))
  .pipe(z.string().regex(/^\d{1,14}(\.\d{1,2})?$/, { error: "مبلغ نامعتبر است" }));

/** پیوند داخلی یا https */
export const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), { error: "پیوند باید داخلی (با / شروع شود) یا https باشد" });

export const optionalHrefSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : undefined))
  .pipe(hrefSchema.optional());

/** تبدیل خطاهای Zod به نگاشت فیلد → پیام برای نمایش در فرم */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
