/**
 * ثبت ممیزی اقدامات حساس مدیریتی (سفارش، پرداخت، بازپرداخت، انبار، دسترسی‌ها، تنظیمات).
 * ثبت درون همان تراکنشِ تغییر انجام می‌شود تا تغییر بدون ردپا ممکن نباشد.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "../db";

export interface AuditActor {
  id: string;
  email: string;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

const SENSITIVE_FIELDS = /password|token|secret|hash/i;

function serializable(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toFixed" in (value as object)) return String(value);
  if (Array.isArray(value)) return value.map(serializable);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializable(v)]));
  }
  return value;
}

/** تفاوت فیلدهای مشخص‌شده بین قبل و بعد (فیلدهای حساس همیشه حذف می‌شوند) */
export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  fields: readonly string[],
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    if (SENSITIVE_FIELDS.test(field)) continue;
    const from = serializable(before?.[field]);
    const to = serializable(after[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
}

export async function writeAudit(client: DbClient, actor: AuditActor, entry: AuditEntry): Promise<void> {
  await client.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      changes: entry.changes ? (serializable(entry.changes) as Prisma.InputJsonValue) : undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  });
}
