import { z } from "zod";
import { route } from "@/server/http/handler";
import { listCustomerOrders } from "@/server/services/orders";

/** سفارش‌های مشتری واردشده (فقط سفارش‌های خودش) */
export const GET = route({ auth: "customer" }, async (ctx) => {
  const { page } = ctx.query(z.object({ page: z.coerce.number().int().min(1).max(500).default(1) }));
  return listCustomerOrders(ctx.requireCustomer().user.id, page);
});
