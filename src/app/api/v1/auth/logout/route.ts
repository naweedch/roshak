import { route } from "@/server/http/handler";
import { clearSessionCookie, deleteSessionByToken, SESSION_POLICY } from "@/server/auth/session";

/** خروج: ردیف نشست در دیتابیس حذف می‌شود، نه فقط کوکی */
export const POST = route({}, async (ctx) => {
  await deleteSessionByToken(ctx.cookies.get(SESSION_POLICY.CUSTOMER.cookie));
  ctx.cookies.append(clearSessionCookie("CUSTOMER"));
  return { ok: true };
});
