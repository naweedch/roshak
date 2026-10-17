/** دسته‌ها، مجموعه‌ها، تخفیف‌ها، روش‌های ارسال و گزارش انبار در پنل مدیریت */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type { categorySchema, collectionSchema, discountSchema, shippingMethodSchema } from "@/lib/validation/admin";
import { db } from "../../db";
import { errors, isUniqueViolation } from "../../errors";
import { invalidate, TAGS } from "../../cache";
import { diffFields, writeAudit } from "../audit";
import type { Actor } from "./products";

function audit(tx: Prisma.TransactionClient, actor: Actor, action: string, entityType: string, entityId: string, summary: string, changes?: Record<string, unknown>) {
  return writeAudit(tx, actor, { action, entityType, entityId, summary, changes, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
}

function slugConflict(error: unknown): never {
  if (isUniqueViolation(error)) throw errors.validation({ slug: "این نامک قبلاً استفاده شده است" });
  throw error;
}

// ─────────────── دسته‌ها ───────────────

export async function listCategoriesAdmin() {
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), productCount: c._count.products }));
}

export async function saveCategory(id: string | null, data: z.output<typeof categorySchema>, actor: Actor) {
  try {
    const row = await db.$transaction(async (tx) => {
      const values = {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        coverImageUrl: data.coverImageUrl,
        coverImageAlt: data.coverImageAlt ?? null,
        sortOrder: data.sortOrder,
        isVisible: data.isVisible,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      };
      const saved = id ? await tx.category.update({ where: { id }, data: values }) : await tx.category.create({ data: values });
      await audit(tx, actor, id ? "category.update" : "category.create", "Category", saved.id, `${id ? "ویرایش" : "ایجاد"} دستهٔ «${saved.name}»`);
      return saved;
    });
    invalidate(TAGS.categories, TAGS.catalog, TAGS.taxonomy);
    return row;
  } catch (error) {
    slugConflict(error);
  }
}

export async function deleteCategory(id: string, actor: Actor) {
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) throw errors.conflict(`این دسته ${count} محصول دارد؛ ابتدا محصولات را به دستهٔ دیگری منتقل کنید یا دسته را پنهان کنید`);
  await db.$transaction(async (tx) => {
    const deleted = await tx.category.delete({ where: { id } });
    await audit(tx, actor, "category.delete", "Category", id, `حذف دستهٔ «${deleted.name}»`);
  });
  invalidate(TAGS.categories, TAGS.taxonomy);
}

// ─────────────── مجموعه‌ها ───────────────

export async function listCollectionsAdmin() {
  const rows = await db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), productCount: c._count.products }));
}

export async function saveCollection(id: string | null, data: z.output<typeof collectionSchema>, actor: Actor) {
  const before = id ? await db.collection.findUnique({ where: { id } }) : null;
  if (id && !before) throw errors.notFound("مجموعه یافت نشد");
  try {
    const row = await db.$transaction(async (tx) => {
      const values = {
        name: data.name,
        slug: data.slug,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        type: data.type,
        coverImageUrl: data.coverImageUrl,
        coverImageAlt: data.coverImageAlt ?? null,
        accentColor: data.accentColor ?? null,
        isVisible: data.isVisible,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      };
      const saved = id ? await tx.collection.update({ where: { id }, data: values }) : await tx.collection.create({ data: values });
      if (before && before.slug !== saved.slug) {
        await tx.collectionSlugRedirect.deleteMany({ where: { fromSlug: saved.slug } });
        await tx.collectionSlugRedirect.upsert({ where: { fromSlug: before.slug }, create: { fromSlug: before.slug, collectionId: saved.id }, update: { collectionId: saved.id } });
      }
      await audit(tx, actor, id ? "collection.update" : "collection.create", "Collection", saved.id, `${id ? "ویرایش" : "ایجاد"} مجموعهٔ «${saved.name}»`, before ? diffFields(before as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>, ["name", "slug", "isVisible", "isFeatured", "type", "sortOrder"]) : undefined);
      return saved;
    });
    invalidate(TAGS.collections, TAGS.catalog, TAGS.collection(row.slug), ...(before ? [TAGS.collection(before.slug)] : []));
    return row;
  } catch (error) {
    slugConflict(error);
  }
}

export async function deleteCollection(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    const deleted = await tx.collection.delete({ where: { id } });
    await audit(tx, actor, "collection.delete", "Collection", id, `حذف مجموعهٔ «${deleted.name}»`);
  });
  invalidate(TAGS.collections, TAGS.catalog);
}

/** ترتیب محصولات داخل یک مجموعه */
export async function reorderCollectionProducts(collectionId: string, productIds: string[], actor: Actor) {
  await db.$transaction(async (tx) => {
    for (const [index, productId] of productIds.entries()) {
      await tx.productCollection.updateMany({ where: { collectionId, productId }, data: { sortOrder: index } });
    }
    await audit(tx, actor, "collection.reorder", "Collection", collectionId, "تغییر ترتیب محصولات مجموعه");
  });
  invalidate(TAGS.collections, TAGS.catalog);
}

// ─────────────── تخفیف‌ها ───────────────

/** گزینه‌های انتخاب محصول و مجموعه در فرم تخفیف (محصولات بایگانی‌شده حذف می‌شوند) */
export async function discountTargetOptions() {
  const [products, collections] = await Promise.all([
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    products: products.map((p) => ({ value: p.id, label: p.name })),
    collections: collections.map((c) => ({ value: c.id, label: c.name })),
  };
}

export async function listDiscountsAdmin() {
  const rows = await db.discount.findMany({
    orderBy: { createdAt: "desc" },
    include: { products: { select: { productId: true } }, collections: { select: { collectionId: true } }, _count: { select: { redemptions: true } } },
  });
  return rows.map((d) => ({
    id: d.id,
    code: d.code,
    description: d.description,
    type: d.type,
    scope: d.scope,
    value: d.value.toString(),
    currency: d.currency,
    maxDiscountAmount: d.maxDiscountAmount?.toString() ?? null,
    minOrderAmount: d.minOrderAmount?.toString() ?? null,
    startsAt: d.startsAt?.toISOString() ?? null,
    endsAt: d.endsAt?.toISOString() ?? null,
    usageLimit: d.usageLimit,
    usageCount: d.usageCount,
    perCustomerLimit: d.perCustomerLimit,
    isActive: d.isActive,
    productIds: d.products.map((p) => p.productId),
    collectionIds: d.collections.map((c) => c.collectionId),
    redemptions: d._count.redemptions,
  }));
}

export async function saveDiscount(id: string | null, data: z.output<typeof discountSchema>, actor: Actor) {
  try {
    const row = await db.$transaction(async (tx) => {
      const values = {
        code: data.code,
        description: data.description ?? null,
        type: data.type,
        scope: data.scope,
        value: data.type === "FREE_SHIPPING" ? "0" : data.value,
        currency: data.type === "FIXED_AMOUNT" ? (data.currency ?? null) : null,
        maxDiscountAmount: data.type === "PERCENTAGE" ? data.maxDiscountAmount : null,
        minOrderAmount: data.minOrderAmount,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        usageLimit: data.usageLimit ?? null,
        perCustomerLimit: data.perCustomerLimit ?? null,
        isActive: data.isActive,
      };
      if (id) {
        const current = await tx.discount.findUnique({ where: { id }, select: { usageCount: true } });
        if (!current) throw errors.notFound("کد تخفیف یافت نشد");
        if (values.usageLimit !== null && values.usageLimit < current.usageCount) {
          throw errors.validation({ usageLimit: `این کد ${current.usageCount} بار استفاده شده است؛ سقف نمی‌تواند کمتر باشد` });
        }
      }
      const saved = id ? await tx.discount.update({ where: { id }, data: values }) : await tx.discount.create({ data: values });
      await tx.discountProduct.deleteMany({ where: { discountId: saved.id } });
      await tx.discountCollection.deleteMany({ where: { discountId: saved.id } });
      if (data.scope === "PRODUCTS") await tx.discountProduct.createMany({ data: data.productIds.map((productId) => ({ discountId: saved.id, productId })) });
      if (data.scope === "COLLECTIONS") await tx.discountCollection.createMany({ data: data.collectionIds.map((collectionId) => ({ discountId: saved.id, collectionId })) });
      await audit(tx, actor, id ? "discount.update" : "discount.create", "Discount", saved.id, `${id ? "ویرایش" : "ایجاد"} کد تخفیف ${saved.code}`, { type: saved.type, value: saved.value.toString(), isActive: saved.isActive });
      return saved;
    });
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ code: "این کد تخفیف قبلاً ثبت شده است" });
    throw error;
  }
}

export async function deleteDiscount(id: string, actor: Actor) {
  const used = await db.discountRedemption.count({ where: { discountId: id } });
  if (used > 0) {
    await db.$transaction(async (tx) => {
      await tx.discount.update({ where: { id }, data: { isActive: false } });
      await audit(tx, actor, "discount.deactivate", "Discount", id, "غیرفعال‌سازی کد تخفیف استفاده‌شده (حذف نشد)");
    });
    return "deactivated" as const;
  }
  await db.$transaction(async (tx) => {
    const d = await tx.discount.delete({ where: { id } });
    await audit(tx, actor, "discount.delete", "Discount", id, `حذف کد تخفیف ${d.code}`);
  });
  return "deleted" as const;
}

// ─────────────── روش‌های ارسال ───────────────

export async function listShippingMethodsAdmin() {
  const rows = await db.shippingMethod.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((m) => ({ ...m, price: m.price.toString(), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }));
}

export async function saveShippingMethod(id: string | null, data: z.output<typeof shippingMethodSchema>, actor: Actor) {
  const settings = await db.storeSettings.findUnique({ where: { id: 1 }, select: { currency: true } });
  if (data.minDays != null && data.maxDays != null && data.minDays > data.maxDays) throw errors.validation({ maxDays: "حداکثر روز باید بیشتر یا مساوی حداقل باشد" });
  try {
    const row = await db.$transaction(async (tx) => {
      const values = { ...data, minDays: data.minDays ?? null, maxDays: data.maxDays ?? null, description: data.description ?? null, currency: settings?.currency ?? "IRT" };
      const saved = id ? await tx.shippingMethod.update({ where: { id }, data: values }) : await tx.shippingMethod.create({ data: values });
      await audit(tx, actor, id ? "shipping.update" : "shipping.create", "ShippingMethod", saved.id, `${id ? "ویرایش" : "ایجاد"} روش ارسال «${saved.name}»`, { price: saved.price.toString(), isActive: saved.isActive });
      return saved;
    });
    invalidate(TAGS.shipping);
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ code: "این کد قبلاً استفاده شده است" });
    throw error;
  }
}

// ─────────────── انبار ───────────────

export async function listInventory(params: { page: number; pageSize: number; q?: string; lowOnly?: boolean; threshold: number }) {
  const conds: Prisma.ProductVariantWhereInput[] = [];
  if (params.q) conds.push({ OR: [{ sku: { contains: params.q.toUpperCase() } }, { product: { name: { contains: params.q, mode: "insensitive" } } }] });
  const all = await db.productVariant.findMany({
    where: conds.length ? { AND: conds } : undefined,
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
    include: { product: { select: { id: true, name: true, status: true } }, color: { select: { name: true, hex: true } }, size: { select: { label: true } } },
  });
  const rows = all
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      isActive: v.isActive,
      threshold: v.lowStockThreshold ?? params.threshold,
      productId: v.product.id,
      productName: v.product.name,
      productStatus: v.product.status,
      colorName: v.color.name,
      colorHex: v.color.hex,
      sizeLabel: v.size.label,
    }))
    .filter((v) => !params.lowOnly || (v.isActive && v.stock <= v.threshold));
  return { total: rows.length, items: rows.slice((params.page - 1) * params.pageSize, params.page * params.pageSize) };
}

export async function listInventoryMovements(params: { page: number; pageSize: number; variantId?: string }) {
  const where = params.variantId ? { variantId: params.variantId } : {};
  const [items, total] = await Promise.all([
    db.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { variant: { select: { sku: true, product: { select: { name: true } } } }, actor: { select: { email: true } }, order: { select: { orderNumber: true, id: true } } },
    }),
    db.inventoryMovement.count({ where }),
  ]);
  return {
    total,
    items: items.map((m) => ({
      id: m.id,
      sku: m.variant.sku,
      productName: m.variant.product.name,
      delta: m.delta,
      stockAfter: m.stockAfter,
      reason: m.reason,
      note: m.note,
      actorEmail: m.actor?.email ?? null,
      order: m.order,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
