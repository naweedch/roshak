import { z } from "zod";
import { reviewSchema } from "@/lib/validation/engagement";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { RATE_LIMITS } from "@/server/rate-limit";
import { db } from "@/server/db";
import { listApprovedReviews, submitReview } from "@/server/services/customer";

async function productIdFor(slug: string) {
  const product = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  return product.id;
}

/** نظرات تأییدشدهٔ محصول (صفحه‌بندی‌شده) */
export const GET = route<{ slug: string }>({}, async (ctx) => {
  const { page } = ctx.query(z.object({ page: z.coerce.number().int().min(1).max(200).default(1) }));
  return listApprovedReviews(await productIdFor(decodeURIComponent(ctx.params.slug)), page);
});

/** ثبت نظر؛ پس از بررسی کارکنان منتشر می‌شود */
export const POST = route<{ slug: string }>(
  { auth: "customer", rateLimit: { name: "review", rule: RATE_LIMITS.review }, status: 201 },
  async (ctx) => {
    const input = await ctx.body(reviewSchema);
    const productId = await productIdFor(decodeURIComponent(ctx.params.slug));
    await submitReview(ctx.requireCustomer().user.id, productId, input);
    return { message: "نظر شما ثبت شد و پس از بررسی منتشر می‌شود. از همراهی شما سپاسگزاریم." };
  },
);
