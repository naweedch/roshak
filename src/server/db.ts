/**
 * نمونهٔ یکتای Prisma Client با آداپتور pg.
 * در محیط توسعه روی globalThis نگه داشته می‌شود تا HMR اتصال‌های اضافه نسازد.
 */
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { __roshnakPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.__roshnakPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__roshnakPrisma = db;
}

/** نوع کلاینت درون تراکنش تعاملی */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
export type DbClient = PrismaClient | Tx;
