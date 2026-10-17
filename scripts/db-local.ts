/**
 * راه‌اندازی PostgreSQL محلی بدون نیاز به Docker (فقط برای توسعه و تست).
 *
 * این اسکریپت از بستهٔ embedded-postgres استفاده می‌کند که باینری واقعی PostgreSQL را
 * داخل node_modules نگه می‌دارد.
 *
 * داده‌ها بیرون از پوشهٔ پروژه نگه داشته می‌شوند (پیش‌فرض: ~/.roshnak/postgres) چون نوشتن مداوم
 * PostgreSQL در پوشهٔ پروژه، ناظر فایل Turbopack را به بازسازی پیاپی وادار می‌کند.
 * مسیر با LOCAL_PG_DATA_DIR قابل تغییر است.
 *
 * اجرا:  npm run db:local
 * توقف:  Ctrl+C
 *
 * اگر Docker دارید می‌توانید به‌جای این اسکریپت از docker compose استفاده کنید.
 */
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const user = process.env.LOCAL_PG_USER ?? "roshnak";
const password = process.env.LOCAL_PG_PASSWORD ?? "roshnak_dev_password";
const databaseDir = path.resolve(process.env.LOCAL_PG_DATA_DIR ?? path.join(os.homedir(), ".roshnak", "postgres"));
const databases = ["roshnak", "roshnak_test"];

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: true,
    authMethod: "scram-sha-256",
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: (error) => console.error("[postgres]", error),
  });

  const alreadyInitialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));
  if (!alreadyInitialised) {
    console.log("در حال ساخت کلاستر PostgreSQL محلی...");
    await pg.initialise();
  }

  await pg.start();
  console.log(`PostgreSQL محلی روی پورت ${port} اجرا شد.`);

  const client = pg.getPgClient();
  await client.connect();
  for (const name of databases) {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
      console.log(`دیتابیس ${name} ساخته شد.`);
    }
  }
  await client.end();

  console.log("برای توقف Ctrl+C را بزنید.");

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nدر حال توقف PostgreSQL...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // نگه داشتن فرایند تا زمان توقف
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error("راه‌اندازی PostgreSQL محلی ناموفق بود:", error);
  process.exit(1);
});
