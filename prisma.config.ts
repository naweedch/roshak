// پیکربندی Prisma CLI (مهاجرت‌ها و seed)
// Prisma 7 فایل .env را خودکار نمی‌خواند؛ بنابراین dotenv این‌جا بارگذاری می‌شود.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
