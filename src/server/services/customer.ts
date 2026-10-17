/**
 * سرویس‌های حساب مشتری: علاقه‌مندی‌ها، آدرس‌ها، پروفایل و نظرات.
 * همهٔ پرس‌وجوها با userId نشست فعلی محدود می‌شوند (هیچ شناسهٔ کاربری از ورودی پذیرفته نمی‌شود).
 */
import "server-only";
import type { z } from "zod";
import type { savedAddressSchema } from "@/lib/validation/checkout";
import type { profileSchema } from "@/lib/validation/auth";
import { db } from "../db";
import { errors } from "../errors";
import { invalidate, TAGS } from "../cache";
import { getProductCardsByIds } from "./catalog";

// ─────────────── علاقه‌مندی ───────────────

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const items = await db.wishlistItem.findMany({ where: { wishlist: { userId } }, select: { productId: true }, orderBy: { createdAt: "desc" } });
  return items.map((i) => i.productId);
}

export async function getWishlistProducts(userId: string) {
  return getProductCardsByIds(await getWishlistProductIds(userId));
}

export async function addToWishlist(userId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  const wishlist = await db.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
  await db.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
}

export async function removeFromWishlist(userId: string, productId: string) {
  await db.wishlistItem.deleteMany({ where: { productId, wishlist: { userId } } });
}

// ─────────────── آدرس ───────────────

type AddressData = z.output<typeof savedAddressSchema>;
const MAX_ADDRESSES = 10;

export async function listAddresses(userId: string) {
  return db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export async function createAddress(userId: string, data: AddressData) {
  const count = await db.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) throw errors.conflict(`حداکثر ${MAX_ADDRESSES} آدرس می‌توانید ذخیره کنید`);
  return db.$transaction(async (tx) => {
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, userId, isDefault: makeDefault } });
  });
}

export async function updateAddress(userId: string, addressId: string, data: AddressData) {
  const existing = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw errors.notFound("آدرس یافت نشد");
  return db.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId, isDefault: true, id: { not: addressId } }, data: { isDefault: false } });
    return tx.address.update({ where: { id: addressId }, data: { ...data, isDefault: data.isDefault || existing.isDefault } });
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const existing = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw errors.notFound("آدرس یافت نشد");
  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

// ─────────────── پروفایل ───────────────

export async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, marketingOptIn: true, emailVerifiedAt: true, createdAt: true, lastLoginAt: true },
  });
  if (!user) throw errors.unauthorized();
  return user;
}

export async function updateProfile(userId: string, data: z.output<typeof profileSchema>) {
  return db.user.update({
    where: { id: userId },
    data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, marketingOptIn: data.marketingOptIn },
    select: { id: true, firstName: true, lastName: true, phone: true, marketingOptIn: true },
  });
}

export async function listUserSessions(userId: string) {
  return db.session.findMany({
    where: { userId, kind: "CUSTOMER", expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, createdAt: true, lastSeenAt: true, ipAddress: true, userAgent: true },
  });
}

// ─────────────── نظرات ───────────────

export interface ReviewInput {
  rating: number;
  title?: string;
  body: string;
}

/** ثبت نظر؛ نظرات پیش از انتشار توسط کارکنان بررسی می‌شوند */
export async function submitReview(userId: string, productId: string, input: ReviewInput) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  const purchased = await db.orderItem.count({
    where: { productId, order: { userId, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
  });
  const existing = await db.review.findUnique({ where: { productId_userId: { productId, userId } } });
  if (existing) throw errors.conflict("شما قبلاً برای این محصول نظر ثبت کرده‌اید");
  return db.review.create({
    data: { productId, userId, rating: input.rating, title: input.title, body: input.body, isVerifiedPurchase: purchased > 0, status: "PENDING" },
    select: { id: true, status: true },
  });
}

export async function listApprovedReviews(productId: string, page = 1, pageSize = 10) {
  const where = { productId, status: "APPROVED" as const };
  const [rows, total, distribution] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["rating"], where, _count: { rating: true } }),
  ]);
  return {
    total,
    distribution: Object.fromEntries(distribution.map((d) => [d.rating, d._count.rating])) as Record<number, number>,
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** بازمحاسبهٔ میانگین امتیاز محصول پس از تأیید/رد نظر */
export async function recomputeProductRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: { rating: true } });
  const product = await db.product.update({
    where: { id: productId },
    data: {
      reviewCount: agg._count.rating,
      ratingAverage: agg._avg.rating === null ? null : agg._avg.rating.toFixed(2),
    },
    select: { slug: true },
  });
  invalidate(TAGS.product(product.slug), TAGS.catalog, TAGS.reviews(productId), TAGS.testimonials);
}
