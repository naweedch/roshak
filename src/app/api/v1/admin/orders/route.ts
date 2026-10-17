import { orderFilterSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { listOrdersAdmin } from "@/server/services/admin/orders";

export const GET = route({ auth: "staff", permission: "order:read" }, async (ctx) => listOrdersAdmin(ctx.query(orderFilterSchema)));
