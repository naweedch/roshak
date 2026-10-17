import { z } from "zod";
import { listQuerySchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { listAuditLogs } from "@/server/services/admin/content-admin";

export const GET = route({ auth: "staff", permission: "audit:read" }, async (ctx) => {
  const q = ctx.query(listQuerySchema.extend({ entityType: z.string().max(40).optional() }));
  return listAuditLogs(q);
});
