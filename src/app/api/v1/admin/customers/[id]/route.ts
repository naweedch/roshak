import { hasPermission } from "@/lib/rbac";
import { customerUpdateSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { errors } from "@/server/errors";
import { getCustomerAdmin, updateCustomerAdmin } from "@/server/services/admin/customers";

export const GET = route<{ id: string }>({ auth: "staff", permission: "customer:read" }, async (ctx) => getCustomerAdmin(parseId(ctx.params.id)));

/** تغییر وضعیت حساب (customer:write) یا نقش (فقط staff:manage) */
export const PATCH = route<{ id: string }>({ auth: "staff", permission: "customer:write" }, async (ctx) => {
  const data = await ctx.body(customerUpdateSchema);
  const actor = actorFrom(ctx);
  if (data.role !== undefined && !hasPermission(actor.role, "staff:manage")) throw errors.forbidden("تغییر نقش فقط برای مدیر ارشد مجاز است");
  await updateCustomerAdmin(parseId(ctx.params.id), data, actor);
  return { ok: true };
});
