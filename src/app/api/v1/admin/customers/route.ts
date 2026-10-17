import { z } from "zod";
import { listQuerySchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { listCustomersAdmin } from "@/server/services/admin/customers";

export const GET = route({ auth: "staff", permission: "customer:read" }, async (ctx) => {
  const q = ctx.query(listQuerySchema.extend({ staff: z.enum(["1"]).optional() }));
  return listCustomersAdmin({ ...q, staffOnly: q.staff === "1" });
});
