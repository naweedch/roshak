import { connection } from "next/server";
import { db } from "@/server/db";

/** بررسی سلامت برای load balancer و Docker healthcheck (بدون افشای جزئیات داخلی) */
export async function GET() {
  await connection();
  const started = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", database: "ok", latencyMs: Math.round(performance.now() - started), time: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "degraded", database: "unreachable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
