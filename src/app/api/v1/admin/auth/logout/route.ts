import { route } from "@/server/http/handler";
import { clearSessionCookie, deleteSessionByToken, SESSION_POLICY } from "@/server/auth/session";

export const POST = route({}, async (ctx) => {
  await deleteSessionByToken(ctx.cookies.get(SESSION_POLICY.STAFF.cookie));
  ctx.cookies.append(clearSessionCookie("STAFF"));
  return { ok: true };
});
