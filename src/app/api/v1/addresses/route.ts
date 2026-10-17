import { savedAddressSchema } from "@/lib/validation/checkout";
import { route } from "@/server/http/handler";
import { createAddress, listAddresses } from "@/server/services/customer";

export const GET = route({ auth: "customer" }, async (ctx) => ({ items: await listAddresses(ctx.requireCustomer().user.id) }));

export const POST = route({ auth: "customer", status: 201 }, async (ctx) => {
  const data = await ctx.body(savedAddressSchema);
  return createAddress(ctx.requireCustomer().user.id, data);
});
