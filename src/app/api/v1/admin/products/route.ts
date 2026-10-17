import { z } from "zod";
import { listQuerySchema, productSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { RATE_LIMITS } from "@/server/rate-limit";
import { createProduct, listProductsAdmin } from "@/server/services/admin/products";

export const GET = route({ auth: "staff", permission: "product:read" }, async (ctx) => {
  const q = ctx.query(listQuerySchema.extend({ status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(), categoryId: z.uuid().optional() }));
  return listProductsAdmin(q);
});

export const POST = route({ auth: "staff", permission: "product:write", status: 201, rateLimit: { name: "admin-write", rule: RATE_LIMITS.adminWrite } }, async (ctx) => {
  const data = await ctx.body(productSchema);
  const product = await createProduct(data, actorFrom(ctx));
  return { id: product.id, slug: product.slug };
});
