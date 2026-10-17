import { loginSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { createSession, deleteSessionByToken, sessionCookie, SESSION_POLICY } from "@/server/auth/session";
import { authenticate } from "@/server/services/auth";
import { writeAudit } from "@/server/services/audit";
import { db } from "@/server/db";

/** ورود کارکنان: نشست جداگانه و کوتاه‌مدت با کوکی SameSite=Strict؛ هر ورود موفق ممیزی می‌شود */
export const POST = route({ rateLimit: { name: "staff-login-ip", rule: RATE_LIMITS.loginPerIp } }, async (ctx) => {
  const { email, password } = await ctx.body(loginSchema);
  await ctx.limit(`staff-login-account:${email}`, { limit: 5, windowSeconds: 15 * 60 });
  try {
    const user = await authenticate(email, password, "STAFF");
    await deleteSessionByToken(ctx.cookies.get(SESSION_POLICY.STAFF.cookie));
    const { token } = await createSession(user.id, "STAFF", { ipAddress: ctx.ip, userAgent: ctx.userAgent });
    ctx.cookies.append(sessionCookie("STAFF", token));
    await writeAudit(db, { id: user.id, email }, { action: "auth.staff_login", entityType: "User", entityId: user.id, summary: "ورود به پنل مدیریت", ipAddress: ctx.ip, userAgent: ctx.userAgent });
    return { ok: true };
  } catch (error) {
    ctx.log.warn("staff_login_failed", { ip: ctx.ip });
    throw error;
  }
});
