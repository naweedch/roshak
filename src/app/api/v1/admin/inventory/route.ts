import { z } from "zod";
import { listQuerySchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { listInventory, listInventoryMovements } from "@/server/services/admin/catalog-admin";
import { loadStoreSettings } from "@/server/services/settings";

/** وضعیت موجودی تنوع‌ها (با فیلتر موجودی کم) یا تاریخچهٔ حرکات انبار (?view=movements) */
export const GET = route({ auth: "staff", permission: "inventory:read" }, async (ctx) => {
  const q = ctx.query(listQuerySchema.extend({ low: z.enum(["1"]).optional(), view: z.enum(["stock", "movements"]).default("stock"), variantId: z.uuid().optional() }));
  if (q.view === "movements") return listInventoryMovements({ page: q.page, pageSize: q.pageSize, variantId: q.variantId });
  const settings = await loadStoreSettings();
  return listInventory({ page: q.page, pageSize: q.pageSize, q: q.q, lowOnly: q.low === "1", threshold: settings.lowStockThreshold });
});
