import { z } from "zod";
import { listQuerySchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { listReviewsAdmin } from "@/server/services/admin/content-admin";

export const GET = route({ auth: "staff", permission: "review:moderate" }, async (ctx) => {
  const q = ctx.query(listQuerySchema.extend({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() }));
  return listReviewsAdmin(q);
});
