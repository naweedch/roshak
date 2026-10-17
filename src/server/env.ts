/**
 * متغیرهای محیطی سرور با اعتبارسنجی Zod.
 * ارزیابی تنبل است تا ساخت پروژه (build) برای ماژول‌هایی که به همهٔ متغیرها نیاز ندارند شکست نخورد.
 */
import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL تنظیم نشده است"),
  TOKEN_HASH_SECRET: z.string().min(32, "TOKEN_HASH_SECRET باید حداقل ۳۲ کاراکتر باشد"),
  CRON_SECRET: optionalString,
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  EMAIL_PROVIDER: z.enum(["log", "smtp"]).default("log"),
  EMAIL_FROM: z.string().default("روشاک <no-reply@roshnak.local>"),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  STORE_NOTIFICATION_EMAIL: optionalString,

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_PUBLIC_URL: optionalString,
  S3_FORCE_PATH_STYLE: bool,

  PAYMENT_TEST_MODE: bool,
  ALLOW_TEST_PAYMENTS_IN_PRODUCTION: bool,
  PAYMENT_TEST_WEBHOOK_SECRET: optionalString,
  ZARINPAL_MERCHANT_ID: optionalString,
  ZARINPAL_SANDBOX: bool,

  REDIS_URL: optionalString,
  INSTAGRAM_ACCESS_TOKEN: optionalString,
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`پیکربندی متغیرهای محیطی نامعتبر است:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** آدرس پایهٔ سایت بدون اسلش انتهایی */
export function appUrl(): string {
  return env().APP_URL.replace(/\/+$/, "");
}

/** درگاه آزمایشی فقط در توسعه یا با اجازهٔ صریح در محیط عملیاتی فعال است */
export function isTestPaymentEnabled(): boolean {
  const e = env();
  if (!e.PAYMENT_TEST_MODE) return false;
  return e.NODE_ENV !== "production" || e.ALLOW_TEST_PAYMENTS_IN_PRODUCTION;
}
