/**
 * مدیریت محصولات: فهرست، ایجاد، ویرایش، بایگانی/حذف، تنوع‌ها، موجودی و تصاویر.
 * هر تغییر درون تراکنش با ممیزی ثبت و کش ویترین فوراً باطل می‌شود.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import { buildProductSearchText } from "@/lib/commerce/search-text";
import type { imageMetaSchema, productSchema, stockAdjustmentSchema, variantSchema, variantUpdateSchema } from "@/lib/validation/admin";
import { db, type Tx } from "../../db";
import { errors, isUniqueViolation } from "../../errors";
import { invalidate, TAGS } from "../../cache";
import { getStorage } from "../../storage";
import { diffFields, writeAudit, type AuditActor } from "../audit";
import { adjustStock } from "../inventory";
import { processAndStoreImage } from "../media";

export interface Actor extends AuditActor {
  ipAddress?: string;
  userAgent?: string;
}

type ProductData = z.output<typeof productSchema>;

const PRODUCT_AUDIT_FIELDS = [
  "name",
  "slug",
  "subtitle",
  "status",
  "price",
  "salePrice",
  "categoryId",
  "isFeatured",
  "sortOrder",
  "publishedAt",
  "seoTitle",
  "seoDescription",
  "length",
  "sizeGuideId",
  "model3dUrl",
] as const;

export async function listProductsAdmin(params: { page: number; pageSize: number; q?: string; status?: string; categoryId?: string }) {
  const where: Prisma.ProductWhereInput = {
    ...(params.status ? { status: params.status as Prisma.EnumProductStatusFilter["equals"] } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: params.q.toUpperCase() } } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        price: true,
        salePrice: true,
        currency: true,
        isFeatured: true,
        salesCount: true,
        updatedAt: true,
        publishedAt: true,
        category: { select: { name: true } },
        images: { where: { kind: "GALLERY" }, orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        variants: { select: { stock: true, isActive: true } },
      },
    }),
    db.product.count({ where }),
  ]);
  return {
    total,
    items: items.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      price: p.price.toString(),
      salePrice: p.salePrice?.toString() ?? null,
      currency: p.currency,
      isFeatured: p.isFeatured,
      salesCount: p.salesCount,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url ?? null,
      variantCount: p.variants.length,
      totalStock: p.variants.filter((v) => v.isActive).reduce((acc, v) => acc + v.stock, 0),
      updatedAt: p.updatedAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
  };
}

export async function getProductAdmin(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      collections: { select: { collectionId: true } },
      images: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      variants: {
        orderBy: [{ color: { sortOrder: "asc" } }, { size: { sortOrder: "asc" } }],
        include: { color: { select: { id: true, name: true, hex: true } }, size: { select: { id: true, label: true } } },
      },
    },
  });
  if (!product) throw errors.notFound("محصول یافت نشد");
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle,
    description: product.description,
    fabric: product.fabric,
    careInstructions: product.careInstructions,
    modelInfo: product.modelInfo,
    status: product.status,
    categoryId: product.categoryId,
    sizeGuideId: product.sizeGuideId,
    length: product.length,
    currency: product.currency,
    price: product.price.toString(),
    salePrice: product.salePrice?.toString() ?? null,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    model3dUrl: product.model3dUrl,
    collectionIds: product.collections.map((c) => c.collectionId),
    salesCount: product.salesCount,
    images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, width: i.width, height: i.height, colorId: i.colorId, kind: i.kind, sortOrder: i.sortOrder })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      isActive: v.isActive,
      lowStockThreshold: v.lowStockThreshold,
      color: v.color,
      size: v.size,
    })),
  };
}

export type AdminProduct = Awaited<ReturnType<typeof getProductAdmin>>;

/** بازسازی متن جست‌وجوی محصول پس از تغییر نام، رنگ‌ها، مجموعه‌ها یا کد کالا */
export async function refreshSearchText(tx: Tx, productId: string) {
  const p = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      category: { select: { name: true } },
      collections: { include: { collection: { select: { name: true } } } },
      variants: { include: { color: { select: { name: true } }, size: { select: { label: true } } } },
    },
  });
  const searchText = buildProductSearchText({
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    fabric: p.fabric,
    categoryName: p.category.name,
    collectionNames: p.collections.map((c) => c.collection.name),
    colorNames: [...new Set(p.variants.map((v) => v.color.name))],
    sizeLabels: [...new Set(p.variants.map((v) => v.size.label))],
    sku: p.variants.map((v) => v.sku),
  });
  await tx.product.update({ where: { id: productId }, data: { searchText } });
}

function productData(data: ProductData, currency: string) {
  return {
    name: data.name,
    slug: data.slug,
    subtitle: data.subtitle ?? null,
    description: data.description,
    fabric: data.fabric ?? null,
    careInstructions: data.careInstructions ?? null,
    modelInfo: data.modelInfo ?? null,
    status: data.status,
    categoryId: data.categoryId,
    sizeGuideId: data.sizeGuideId ?? null,
    length: data.length ?? null,
    currency,
    price: data.price,
    salePrice: data.salePrice,
    isFeatured: data.isFeatured,
    sortOrder: data.sortOrder,
    // انتشار بدون تاریخ = همین حالا
    publishedAt: data.status === "ACTIVE" ? (data.publishedAt ?? new Date()) : data.publishedAt,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    model3dUrl: data.model3dUrl,
  };
}

export async function createProduct(data: ProductData, actor: Actor) {
  const settings = await db.storeSettings.findUnique({ where: { id: 1 }, select: { currency: true } });
  try {
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({ data: productData(data, settings?.currency ?? "IRT") });
      if (data.collectionIds.length) {
        await tx.productCollection.createMany({ data: data.collectionIds.map((collectionId) => ({ productId: created.id, collectionId })) });
      }
      await refreshSearchText(tx, created.id);
      await writeAudit(tx, actor, {
        action: "product.create",
        entityType: "Product",
        entityId: created.id,
        summary: `ایجاد محصول «${created.name}»`,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return created;
    });
    invalidate(TAGS.catalog, TAGS.collections);
    return product;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ slug: "این نامک قبلاً استفاده شده است" });
    throw error;
  }
}

export async function updateProduct(id: string, data: ProductData, actor: Actor) {
  const before = await db.product.findUnique({ where: { id }, include: { collections: true } });
  if (!before) throw errors.notFound("محصول یافت نشد");
  try {
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.product.update({ where: { id }, data: productData(data, before.currency) });
      // نامک قدیمی برای ریدایرکت ۳۰۱ نگه داشته می‌شود
      if (before.slug !== next.slug) {
        await tx.productSlugRedirect.deleteMany({ where: { fromSlug: next.slug } });
        await tx.productSlugRedirect.upsert({ where: { fromSlug: before.slug }, create: { fromSlug: before.slug, productId: id }, update: { productId: id } });
      }
      await tx.productCollection.deleteMany({ where: { productId: id, collectionId: { notIn: data.collectionIds } } });
      const existing = new Set(before.collections.map((c) => c.collectionId));
      const toAdd = data.collectionIds.filter((c) => !existing.has(c));
      if (toAdd.length) await tx.productCollection.createMany({ data: toAdd.map((collectionId) => ({ productId: id, collectionId })) });
      await refreshSearchText(tx, id);
      await writeAudit(tx, actor, {
        action: "product.update",
        entityType: "Product",
        entityId: id,
        summary: `ویرایش محصول «${next.name}»`,
        changes: diffFields(before as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, PRODUCT_AUDIT_FIELDS),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return next;
    });
    invalidate(TAGS.catalog, TAGS.collections, TAGS.product(before.slug), TAGS.product(updated.slug));
    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ slug: "این نامک قبلاً استفاده شده است" });
    throw error;
  }
}

/** محصول دارای سفارش حذف نمی‌شود و فقط بایگانی می‌شود تا سوابق مالی سالم بماند */
export async function deleteOrArchiveProduct(id: string, actor: Actor): Promise<"deleted" | "archived"> {
  const product = await db.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } }, variants: { select: { id: true } }, images: { select: { storageKey: true } } } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  const hasMovements = await db.inventoryMovement.count({ where: { variantId: { in: product.variants.map((v) => v.id) }, reason: { not: "INITIAL" } } });
  if (product._count.orderItems > 0 || hasMovements > 0) {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { status: "ARCHIVED", isFeatured: false } });
      await writeAudit(tx, actor, { action: "product.archive", entityType: "Product", entityId: id, summary: `بایگانی محصول «${product.name}» (دارای سابقهٔ سفارش/انبار)`, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
    });
    invalidate(TAGS.catalog, TAGS.product(product.slug));
    return "archived";
  }
  await db.$transaction(async (tx) => {
    await tx.inventoryMovement.deleteMany({ where: { variantId: { in: product.variants.map((v) => v.id) } } });
    await tx.product.delete({ where: { id } });
    await writeAudit(tx, actor, { action: "product.delete", entityType: "Product", entityId: id, summary: `حذف محصول «${product.name}»`, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
  });
  invalidate(TAGS.catalog, TAGS.product(product.slug));
  return "deleted";
}

// ─────────────── تنوع‌ها و موجودی ───────────────

export async function addVariant(productId: string, data: z.output<typeof variantSchema>, actor: Actor) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true, name: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  try {
    const variant = await db.$transaction(async (tx) => {
      const created = await tx.productVariant.create({
        data: { productId, colorId: data.colorId, sizeId: data.sizeId, sku: data.sku, stock: 0, lowStockThreshold: data.lowStockThreshold ?? null, isActive: data.isActive },
      });
      if (data.initialStock > 0) {
        await adjustStock(tx, { variantId: created.id, delta: data.initialStock, reason: "INITIAL", actorId: actor.id, note: "موجودی اولیه" });
      }
      await refreshSearchText(tx, productId);
      await writeAudit(tx, actor, { action: "variant.create", entityType: "ProductVariant", entityId: created.id, summary: `افزودن تنوع ${created.sku} به «${product.name}»`, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return created;
    });
    invalidate(TAGS.catalog, TAGS.product(product.slug));
    return variant;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.conflict("این ترکیب رنگ و سایز یا این کد کالا قبلاً ثبت شده است");
    throw error;
  }
}

export async function updateVariant(variantId: string, data: z.output<typeof variantUpdateSchema>, actor: Actor) {
  const before = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { slug: true, id: true } } } });
  if (!before) throw errors.notFound("تنوع یافت نشد");
  try {
    await db.$transaction(async (tx) => {
      const after = await tx.productVariant.update({
        where: { id: variantId },
        data: { ...(data.sku ? { sku: data.sku } : {}), ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: data.lowStockThreshold } : {}), ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) },
      });
      if (data.sku) await refreshSearchText(tx, before.product.id);
      await writeAudit(tx, actor, {
        action: "variant.update",
        entityType: "ProductVariant",
        entityId: variantId,
        summary: `ویرایش تنوع ${after.sku}`,
        changes: diffFields(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, ["sku", "lowStockThreshold", "isActive"]),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ sku: "این کد کالا قبلاً ثبت شده است" });
    throw error;
  }
  invalidate(TAGS.catalog, TAGS.product(before.product.slug));
}

export async function adjustVariantStock(variantId: string, data: z.output<typeof stockAdjustmentSchema>, actor: Actor) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { slug: true, name: true } } } });
  if (!variant) throw errors.notFound("تنوع یافت نشد");
  const result = await db.$transaction(async (tx) => {
    const r = await adjustStock(tx, { variantId, delta: data.delta, reason: data.reason, actorId: actor.id, note: data.note });
    await writeAudit(tx, actor, {
      action: "inventory.adjust",
      entityType: "ProductVariant",
      entityId: variantId,
      summary: `تغییر موجودی ${variant.sku}: ${r.stockBefore} ← ${r.stockAfter}`,
      changes: { stock: { from: r.stockBefore, to: r.stockAfter }, reason: data.reason, note: data.note ?? null },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return r;
  });
  invalidate(TAGS.catalog, TAGS.product(variant.product.slug));
  return result;
}

// ─────────────── تصاویر ───────────────

export async function uploadProductImage(productId: string, file: Buffer, meta: z.output<typeof imageMetaSchema>, actor: Actor) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true, name: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  const stored = await processAndStoreImage(file, { folder: "products", alt: meta.alt, uploadedById: actor.id });
  const image = await db.$transaction(async (tx) => {
    const last = await tx.productImage.aggregate({ where: { productId, kind: meta.kind }, _max: { sortOrder: true } });
    const created = await tx.productImage.create({
      data: {
        productId,
        url: stored.url,
        storageKey: stored.storageKey,
        alt: meta.alt,
        width: stored.width,
        height: stored.height,
        colorId: meta.colorId ?? null,
        kind: meta.kind,
        sortOrder: meta.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
      },
    });
    await writeAudit(tx, actor, { action: "product.image_upload", entityType: "Product", entityId: productId, summary: `افزودن تصویر به «${product.name}»`, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
    return created;
  });
  invalidate(TAGS.catalog, TAGS.product(product.slug));
  return image;
}

export async function updateProductImage(productId: string, imageId: string, meta: z.output<typeof imageMetaSchema>) {
  const image = await db.productImage.findFirst({ where: { id: imageId, productId }, include: { product: { select: { slug: true } } } });
  if (!image) throw errors.notFound("تصویر یافت نشد");
  await db.productImage.update({ where: { id: imageId }, data: { alt: meta.alt, colorId: meta.colorId ?? null, kind: meta.kind, ...(meta.sortOrder !== undefined ? { sortOrder: meta.sortOrder } : {}) } });
  invalidate(TAGS.catalog, TAGS.product(image.product.slug));
}

export async function reorderProductImages(productId: string, imageIds: string[]) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) throw errors.notFound("محصول یافت نشد");
  const count = await db.productImage.count({ where: { productId, id: { in: imageIds } } });
  if (count !== imageIds.length) throw errors.badRequest("برخی تصاویر به این محصول تعلق ندارند");
  await db.$transaction(imageIds.map((id, index) => db.productImage.update({ where: { id }, data: { sortOrder: index } })));
  invalidate(TAGS.catalog, TAGS.product(product.slug));
}

export async function deleteProductImage(productId: string, imageId: string, actor: Actor) {
  const image = await db.productImage.findFirst({ where: { id: imageId, productId }, include: { product: { select: { slug: true, name: true } } } });
  if (!image) throw errors.notFound("تصویر یافت نشد");
  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    await writeAudit(tx, actor, { action: "product.image_delete", entityType: "Product", entityId: productId, summary: `حذف تصویر از «${image.product.name}»`, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
  });
  // فایل فقط وقتی حذف می‌شود که تصویر دیگری از آن استفاده نکند
  if (image.storageKey) {
    const stillUsed = await db.productImage.count({ where: { storageKey: image.storageKey } });
    if (!stillUsed) {
      await getStorage().delete(image.storageKey).catch(() => undefined);
      await db.mediaAsset.deleteMany({ where: { storageKey: image.storageKey } });
    }
  }
  invalidate(TAGS.catalog, TAGS.product(image.product.slug));
}

// ─────────────── داده‌های کمکی فرم ───────────────

export async function productFormOptions() {
  const [categories, collections, colors, sizes, sizeGuides] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.color.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, hex: true, slug: true } }),
    db.size.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, label: true } }),
    db.sizeGuide.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, collections, colors, sizes, sizeGuides };
}

export type ProductFormOptions = Awaited<ReturnType<typeof productFormOptions>>;
