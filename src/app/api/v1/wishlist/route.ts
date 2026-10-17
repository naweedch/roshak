import { wishlistSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/rate-limit";
import { addToWishlist, getWishlistProductIds, getWishlistProducts } from "@/server/services/customer";

export const GET = route({ auth: "customer" }, async (ctx) => ({ items: await getWishlistProducts(ctx.requireCustomer().user.id) }));

export const POST = route({ auth: "customer", rateLimit: { name: "wishlist", rule: RATE_LIMITS.cartWrite } }, async (ctx) => {
  const { productId } = await ctx.body(wishlistSchema);
  const userId = ctx.requireCustomer().user.id;
  await addToWishlist(userId, productId);
  return { productIds: await getWishlistProductIds(userId) };
});
