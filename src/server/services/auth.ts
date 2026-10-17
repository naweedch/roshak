/**
 * سرویس احراز هویت: ثبت‌نام، ورود، بازیابی رمز، تأیید ایمیل و تغییر رمز.
 * پاسخ‌ها طوری طراحی شده‌اند که وجود یا عدم وجود یک حساب را لو ندهند (به‌جز ثبت‌نام تکراری).
 */
import "server-only";
import type { SessionKind } from "@/generated/prisma/enums";
import type { z } from "zod";
import type { registerSchema } from "@/lib/validation/auth";
import { isStaffRole } from "@/lib/rbac";
import { db } from "../db";
import { appUrl } from "../env";
import { errors, isUniqueViolation } from "../errors";
import { enqueueEmail, flushOutboxAfterResponse } from "../email/outbox";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../auth/password";
import { deleteUserSessions } from "../auth/session";
import { generateToken, hashToken } from "../auth/tokens";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type RegisterData = z.output<typeof registerSchema>;

async function issueEmailVerification(userId: string, email: string, firstName: string) {
  const token = generateToken();
  await db.$transaction(async (tx) => {
    await tx.authToken.deleteMany({ where: { userId, purpose: "EMAIL_VERIFICATION", usedAt: null } });
    await tx.authToken.create({
      data: {
        userId,
        purpose: "EMAIL_VERIFICATION",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });
    await enqueueEmail(tx, email, {
      template: "email-verification",
      payload: { name: firstName, url: `${appUrl()}/account/verify-email?token=${encodeURIComponent(token)}` },
    });
  });
  await flushOutboxAfterResponse();
}

export async function registerCustomer(data: RegisterData) {
  const passwordHash = await hashPassword(data.password);
  try {
    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        marketingOptIn: data.marketingOptIn,
        role: "CUSTOMER",
      },
      select: { id: true, email: true, firstName: true },
    });
    await issueEmailVerification(user.id, user.email, user.firstName);
    return user;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw errors.conflict("با این ایمیل قبلاً حساب ساخته شده است؛ وارد شوید یا رمز خود را بازیابی کنید");
    }
    throw error;
  }
}

export async function resendEmailVerification(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, emailVerifiedAt: true } });
  if (!user) throw errors.notFound();
  if (user.emailVerifiedAt) return { alreadyVerified: true };
  await issueEmailVerification(user.id, user.email, user.firstName);
  return { alreadyVerified: false };
}

/** بررسی نام کاربری و رمز؛ پیام خطا برای ایمیل نادرست و رمز نادرست یکسان است */
export async function authenticate(email: string, password: string, kind: SessionKind) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, status: true, role: true },
  });
  if (!user) {
    await burnPasswordCheck(password);
    throw errors.unauthorized("ایمیل یا رمز عبور نادرست است");
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw errors.unauthorized("ایمیل یا رمز عبور نادرست است");
  if (user.status !== "ACTIVE") throw errors.forbidden("این حساب غیرفعال شده است؛ با پشتیبانی تماس بگیرید");
  if (kind === "STAFF" && !isStaffRole(user.role)) throw errors.forbidden("این حساب دسترسی به پنل مدیریت ندارد");

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, role: user.role };
}

/** همیشه موفق برمی‌گردد تا وجود حساب قابل تشخیص نباشد */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, firstName: true, status: true } });
  if (!user || user.status !== "ACTIVE") return;
  const token = generateToken();
  await db.$transaction(async (tx) => {
    await tx.authToken.deleteMany({ where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null } });
    await tx.authToken.create({
      data: {
        userId: user.id,
        purpose: "PASSWORD_RESET",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await enqueueEmail(tx, email, {
      template: "password-reset",
      payload: { name: user.firstName, url: `${appUrl()}/account/reset-password?token=${encodeURIComponent(token)}` },
    });
  });
  await flushOutboxAfterResponse();
}

async function consumeToken(token: string, purpose: "PASSWORD_RESET" | "EMAIL_VERIFICATION") {
  const record = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date()) {
    throw errors.badRequest(purpose === "PASSWORD_RESET" ? "پیوند بازیابی نامعتبر یا منقضی شده است" : "پیوند تأیید نامعتبر یا منقضی شده است");
  }
  return record;
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await consumeToken(token, "PASSWORD_RESET");
  const passwordHash = await hashPassword(newPassword);
  const user = await db.$transaction(async (tx) => {
    // علامت‌گذاری شرطی: اگر هم‌زمان دو بار استفاده شود، فقط یکی موفق است
    const marked = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (marked.count !== 1) throw errors.badRequest("پیوند بازیابی قبلاً استفاده شده است");
    const updated = await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
      select: { id: true, email: true, firstName: true },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await enqueueEmail(tx, updated.email, { template: "password-changed", payload: { name: updated.firstName } });
    return updated;
  });
  await flushOutboxAfterResponse();
  return user;
}

export async function verifyEmail(token: string) {
  const record = await consumeToken(token, "EMAIL_VERIFICATION");
  await db.$transaction(async (tx) => {
    const marked = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (marked.count !== 1) throw errors.badRequest("پیوند تأیید قبلاً استفاده شده است");
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true, firstName: true } });
  if (!user) throw errors.unauthorized();
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw errors.validation({ currentPassword: "رمز فعلی نادرست است" });
  }
  if (currentPassword === newPassword) throw errors.validation({ newPassword: "رمز جدید باید با رمز فعلی متفاوت باشد" });
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await enqueueEmail(tx, user.email, { template: "password-changed", payload: { name: user.firstName } });
  });
  // همهٔ نشست‌ها (حتی نشست فعلی) باطل می‌شوند؛ مسیر API یک نشست تازه صادر می‌کند
  await deleteUserSessions(userId);
  await flushOutboxAfterResponse();
}
