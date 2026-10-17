/**
 * پیش از هر فایل تست یکپارچه همهٔ جدول‌ها خالی می‌شوند تا تست‌ها مستقل از هم باشند.
 */
import { afterAll, beforeAll } from "vitest";
import { db } from "@/server/db";

export async function truncateAll() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

beforeAll(async () => {
  await truncateAll();
});

afterAll(async () => {
  await db.$disconnect();
});
