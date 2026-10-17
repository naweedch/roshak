/**
 * آماده‌سازی پایگاه دادهٔ تست پیش از همهٔ تست‌های یکپارچه: اعمال مهاجرت‌ها با prisma migrate deploy.
 * از اجرای تست روی پایگاه دادهٔ توسعه یا عملیاتی جلوگیری می‌کند.
 */
import { execSync } from "node:child_process";
import path from "node:path";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL تنظیم نشده است؛ تست‌های یکپارچه به پایگاه دادهٔ جداگانه نیاز دارند (مثلاً roshnak_test).");
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(`نام پایگاه دادهٔ تست باید شامل «test» باشد (فعلی: ${dbName}) تا داده‌های واقعی به اشتباه پاک نشوند.`);
  }
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
