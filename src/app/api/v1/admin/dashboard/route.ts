import { z } from "zod";
import { hasPermission } from "@/lib/rbac";
import { route } from "@/server/http/handler";
import { getDashboardMetrics } from "@/server/services/admin/dashboard";

/** شاخص‌های پیشخوان؛ ارقام درآمد فقط برای نقش‌های دارای مجوز analytics:revenue */
export const GET = route({ auth: "staff", permission: "dashboard:view" }, async (ctx) => {
  const { days } = ctx.query(z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90, 365].includes(d)).default(30) }));
  const metrics = await getDashboardMetrics(days);
  if (!hasPermission(ctx.requireStaff().user.role, "analytics:revenue")) {
    return { ...metrics, revenue: null, averageOrderValue: null, salesByDay: metrics.salesByDay.map((d) => ({ ...d, revenue: null })), bestSellers: metrics.bestSellers.map((b) => ({ ...b, revenue: null })) };
  }
  return metrics;
});
