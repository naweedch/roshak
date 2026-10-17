import { uuidSchema } from "@/lib/validation/common";
import { route } from "@/server/http/handler";
import { getWishlistProductIds, removeFromWishlist } from "@/server/services/customer";

export const DELETE = route<{ productId: string }>({ auth: "customer" }, async (ctx) => {
  const productId = uuidSchema.parse(ctx.params.productId);
  const userId = ctx.requireCustomer().user.id;
  await removeFromWishlist(userId, productId);
  return { productIds: await getWishlistProductIds(userId) };
});
