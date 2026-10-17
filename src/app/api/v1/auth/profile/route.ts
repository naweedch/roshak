import { profileSchema } from "@/lib/validation/auth";
import { route } from "@/server/http/handler";
import { getProfile, updateProfile } from "@/server/services/customer";

export const GET = route({ auth: "customer" }, async (ctx) => getProfile(ctx.requireCustomer().user.id));

export const PATCH = route({ auth: "customer" }, async (ctx) => {
  const data = await ctx.body(profileSchema);
  return updateProfile(ctx.requireCustomer().user.id, data);
});
