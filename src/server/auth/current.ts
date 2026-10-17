/**
 * لایهٔ دسترسی به نشست برای Server Componentها (Data Access Layer).
 * هر صفحهٔ محافظت‌شده خودش این توابع را فراخوانی می‌کند؛ به چیدمان (layout) تکیه نمی‌شود.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission, type Permission } from "@/lib/rbac";
import { SESSION_POLICY, validateSession, type ValidSession } from "./session";

export const getCustomerSession = cache(async (): Promise<ValidSession | null> => {
  const token = (await cookies()).get(SESSION_POLICY.CUSTOMER.cookie)?.value;
  return validateSession(token, "CUSTOMER");
});

export const getStaffSession = cache(async (): Promise<ValidSession | null> => {
  const token = (await cookies()).get(SESSION_POLICY.STAFF.cookie)?.value;
  return validateSession(token, "STAFF");
});

/** مشتری واردشده یا انتقال به صفحهٔ ورود با بازگشت به مسیر فعلی */
export async function requireCustomer(returnTo: string): Promise<ValidSession> {
  const session = await getCustomerSession();
  if (!session) redirect(`/account/login?next=${encodeURIComponent(returnTo)}`);
  return session;
}

export interface StaffAccess {
  session: ValidSession;
  allowed: boolean;
}

/**
 * کارمند واردشده یا انتقال به ورود مدیریت. نتیجهٔ allowed باید در صفحه بررسی شود
 * (در صورت نبود مجوز، صفحه پیام «عدم دسترسی» نمایش می‌دهد و هیچ داده‌ای بارگذاری نمی‌کند).
 */
export async function requireStaff(permission?: Permission): Promise<StaffAccess> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return { session, allowed: permission ? hasPermission(session.user.role, permission) : true };
}
