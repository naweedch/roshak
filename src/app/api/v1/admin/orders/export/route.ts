import { route } from "@/server/http/handler";
import { exportOrdersCsv } from "@/server/services/admin/orders";
import { orderFilterSchema } from "@/lib/validation/admin";

/** خروجی CSV سفارش‌ها با همان فیلترهای فهرست؛ هر خروجی ممیزی می‌شود */
export const GET = route({ auth: "staff", permission: "order:export" }, async (ctx) => {
  const query = ctx.query(orderFilterSchema);
  const filters = { q: query.q, status: query.status, paymentStatus: query.paymentStatus, from: query.from, to: query.to };
  const csv = await exportOrdersCsv(filters);
  await ctx.audit({ action: "order.export", entityType: "Order", summary: "خروجی CSV سفارش‌ها", changes: { filters } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="roshak-orders-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
});
