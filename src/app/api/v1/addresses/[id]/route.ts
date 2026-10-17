import { savedAddressSchema } from "@/lib/validation/checkout";
import { uuidSchema } from "@/lib/validation/common";
import { route } from "@/server/http/handler";
import { deleteAddress, updateAddress } from "@/server/services/customer";

export const PATCH = route<{ id: string }>({ auth: "customer" }, async (ctx) => {
  const data = await ctx.body(savedAddressSchema);
  return updateAddress(ctx.requireCustomer().user.id, uuidSchema.parse(ctx.params.id), data);
});

export const DELETE = route<{ id: string }>({ auth: "customer" }, async (ctx) => {
  await deleteAddress(ctx.requireCustomer().user.id, uuidSchema.parse(ctx.params.id));
  return { ok: true };
});
