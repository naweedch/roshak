import { hasPermission } from "@/lib/rbac";
import { route } from "@/server/http/handler";
import { parseId } from "@/server/http/admin";
import { getOrderAdmin } from "@/server/services/admin/orders";

/** جزئیات سفارش؛ اطلاعات پرداخت فقط برای نقش‌های دارای مجوز بازپرداخت/مالی */
export const GET = route<{ id: string }>({ auth: "staff", permission: "order:read" }, async (ctx) => {
  const role = ctx.requireStaff().user.role;
  return getOrderAdmin(parseId(ctx.params.id), { includePayments: hasPermission(role, "order:refund") });
});
