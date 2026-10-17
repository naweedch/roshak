/**
 * پیکربندی Vitest با دو پروژه:
 *  - unit: توابع خالص (بدون دیتابیس و شبکه)
 *  - integration: سرویس‌های سرور روی پایگاه دادهٔ جداگانهٔ تست (TEST_DATABASE_URL)
 *
 * پایگاه دادهٔ تست هرگز همان پایگاه دادهٔ توسعه نیست؛ اگر TEST_DATABASE_URL تنظیم نشده باشد
 * تست‌های یکپارچه اجرا نمی‌شوند تا داده‌های واقعی پاک نشوند.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const fileEnv = loadDotenv({ path: path.resolve(root, ".env"), quiet: true }).parsed ?? {};
const read = (key: string) => process.env[key] ?? fileEnv[key];

const testDatabaseUrl = read("TEST_DATABASE_URL");

const sharedEnv = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3100",
  // در تست‌ها کلید ثابت کافی است؛ کلید واقعی محیط هرگز در تست‌ها لازم نیست
  TOKEN_HASH_SECRET: "test-token-hash-secret-0123456789abcdef",
  PAYMENT_TEST_MODE: "true",
  PAYMENT_TEST_WEBHOOK_SECRET: "test-webhook-secret",
  EMAIL_PROVIDER: "log",
  STORAGE_DRIVER: "local",
  LOG_LEVEL: "error",
} satisfies Partial<NodeJS.ProcessEnv>;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // «server-only» خارج از Next.js خطا می‌دهد؛ در تست با ماژول خالی جایگزین می‌شود
      "server-only": path.resolve(root, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          env: sharedEnv,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: { ...sharedEnv, DATABASE_URL: testDatabaseUrl ?? "", TEST_DATABASE_URL: testDatabaseUrl ?? "", DATABASE_POOL_MAX: "8" },
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          // همهٔ فایل‌ها یک پایگاه داده را به اشتراک دارند؛ اجرای پشت‌سرهم از تداخل جلوگیری می‌کند
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
