/**
 * مدیریت نشست سمت سرور.
 * - انقضای لغزنده (با هر فعالیت تمدید می‌شود) و سقف مطلق.
 * - نشست کارکنان کوتاه‌تر و با کوکی جداگانه (SameSite=Strict).
 * - خروج، ردیف نشست را حذف می‌کند؛ تغییر رمز همهٔ نشست‌های قدیمی را باطل می‌کند.
 */
import "server-only";
import type { Role, SessionKind } from "@/generated/prisma/enums";
import { isStaffRole } from "@/lib/rbac";
import { db } from "../db";
import { secureCookies, serializeCookie } from "../http/request";
import { generateToken, hashToken } from "./tokens";

const DAY = 24 * 60 * 60;

export const SESSION_POLICY: Record<
  SessionKind,
  { cookie: string; idleSeconds: number; absoluteSeconds: number; sameSite: "lax" | "strict" }
> = {
  CUSTOMER: { cookie: "rsk_session", idleSeconds: 30 * DAY, absoluteSeconds: 90 * DAY, sameSite: "lax" },
  STAFF: { cookie: "rsk_staff", idleSeconds: 4 * 60 * 60, absoluteSeconds: 12 * 60 * 60, sameSite: "strict" },
};

/** کمترین فاصلهٔ به‌روزرسانی lastSeenAt برای کاهش نوشتن در دیتابیس */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
}

export interface ValidSession {
  sessionId: string;
  kind: SessionKind;
  expiresAt: Date;
  user: SessionUser;
}

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(userId: string, kind: SessionKind, meta: SessionMeta = {}) {
  const policy = SESSION_POLICY[kind];
  const token = generateToken();
  const expiresAt = new Date(Date.now() + policy.idleSeconds * 1000);
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      kind,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });
  return { token, expiresAt };
}

export async function validateSession(token: string | undefined | null, kind: SessionKind): Promise<ValidSession | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const id = hashToken(token);
  const session = await db.session.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          passwordChangedAt: true,
        },
      },
    },
  });
  if (!session || session.kind !== kind) return null;

  const now = Date.now();
  const policy = SESSION_POLICY[kind];
  const absoluteEnd = session.createdAt.getTime() + policy.absoluteSeconds * 1000;
  const { user } = session;

  const invalid =
    session.expiresAt.getTime() <= now ||
    absoluteEnd <= now ||
    user.status !== "ACTIVE" ||
    (kind === "STAFF" && !isStaffRole(user.role)) ||
    (user.passwordChangedAt !== null && session.createdAt < user.passwordChangedAt);

  if (invalid) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }

  let expiresAt = session.expiresAt;
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    expiresAt = new Date(Math.min(now + policy.idleSeconds * 1000, absoluteEnd));
    await db.session.update({ where: { id }, data: { lastSeenAt: new Date(now), expiresAt } });
  }

  return {
    sessionId: id,
    kind,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    },
  };
}

export async function deleteSessionByToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function deleteUserSessions(userId: string, options: { exceptSessionId?: string; kind?: SessionKind } = {}) {
  await db.session.deleteMany({
    where: {
      userId,
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.exceptSessionId ? { id: { not: options.exceptSessionId } } : {}),
    },
  });
}

export async function purgeExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return result.count;
}

export function sessionCookie(kind: SessionKind, token: string): string {
  const policy = SESSION_POLICY[kind];
  return serializeCookie(policy.cookie, token, {
    maxAge: policy.absoluteSeconds,
    httpOnly: true,
    secure: secureCookies(),
    sameSite: policy.sameSite,
  });
}

export function clearSessionCookie(kind: SessionKind): string {
  const policy = SESSION_POLICY[kind];
  return serializeCookie(policy.cookie, "", { maxAge: 0, httpOnly: true, secure: secureCookies(), sameSite: policy.sameSite });
}
