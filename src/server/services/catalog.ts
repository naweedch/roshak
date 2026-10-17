/**
 * خواندن کاتالوگ برای ویترین: فهرست با فیلتر/مرتب‌سازی/صفحه‌بندی، جزئیات محصول، فیلترهای پویا و جست‌وجو.
 * فهرست محصولات با SQL پارامتری (Prisma.sql) ساخته می‌شود تا فیلتر روی تنوع‌ها، قیمت مؤثر
 * و جست‌وجوی تمام‌متن PostgreSQL در یک پرس‌وجو انجام شود؛ سپس کارت‌ها با Prisma بارگذاری می‌شوند.
 */
import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { DressLength } from "@/generated/prisma/enums";
import { purchasableQuantity, stockLevel } from "@/lib/commerce/inventory";
import { normalizeSearchText } from "@/lib/persian";
import type {
  CatalogPage,
  CategoryDTO,
  CollectionDTO,
  ColorDTO,
  FacetOptions,
  ImageDTO,
  ProductCardDTO,
  ProductDetailDTO,
  SizeGuideRow,
} from "@/lib/types/catalog";
import { CATALOG_PAGE_SIZE, type CatalogFilters } from "@/lib/validation/catalog";
import { db } from "../db";
import { loadStoreSettings } from "./settings";

const NEW_ARRIVAL_DAYS = 45;

// ─────────────── ابزار جست‌وجو ───────────────

/** ساخت عبارت tsquery با تطبیق پیشوندی؛ فقط حروف و ارقام عبور می‌کنند */
export function buildTsQuery(q: string): string | null {
  const tokens = normalizeSearchText(q)
    .split(" ")
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 0)
    .slice(0, 6);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(" & ") : null;
}

function likePattern(q: string): string {
  return `%${normalizeSearchText(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// ─────────────── انتخاب‌های Prisma و تبدیل به DTO ───────────────

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  subtitle: true,
  currency: true,
  price: true,
  salePrice: true,
  publishedAt: true,
  status: true,
  ratingAverage: true,
  reviewCount: true,
  category: { select: { name: true } },
  images: {
    where: { kind: "GALLERY" },
    orderBy: { sortOrder: "asc" },
    take: 2,
    select: { url: true, alt: true, width: true, height: true },
  },
  variants: {
    where: { isActive: true },
    select: { stock: true, color: { select: { slug: true, name: true, hex: true, sortOrder: true } } },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toImage(img: { url: string; alt: string; width: number; height: number } | undefined | null): ImageDTO | null {
  return img ? { url: img.url, alt: img.alt, width: img.width, height: img.height } : null;
}

function isNewArrival(publishedAt: Date | null): boolean {
  if (!publishedAt) return false;
  return Date.now() - publishedAt.getTime() < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}

function toCard(row: CardRow): ProductCardDTO {
  const colorMap = new Map<string, { slug: string; name: string; hex: string; sortOrder: number }>();
  let available = false;
  for (const v of row.variants) {
    colorMap.set(v.color.slug, v.color);
    if (row.status === "ACTIVE" && v.stock > 0) available = true;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    categoryName: row.category.name,
    currency: row.currency,
    price: row.price.toString(),
    salePrice: row.salePrice?.toString() ?? null,
    isNew: isNewArrival(row.publishedAt),
    image: toImage(row.images[0]),
    hoverImage: toImage(row.images[1]),
    colors: [...colorMap.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ slug, name, hex }) => ({ slug, name, hex })),
    available,
    ratingAverage: row.ratingAverage?.toString() ?? null,
    reviewCount: row.reviewCount,
  };
}

/** بارگذاری کارت محصولات با حفظ ترتیب شناسه‌ها (فقط محصولات منتشرشده) */
export async function getProductCardsByIds(ids: readonly string[]): Promise<ProductCardDTO[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: [...ids] }, status: "ACTIVE", publishedAt: { lte: new Date() } },
    select: cardSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ProductCardDTO => Boolean(c));
}

export async function getProductCardsBySlugs(slugs: readonly string[]): Promise<ProductCardDTO[]> {
  if (slugs.length === 0) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: [...slugs] }, status: "ACTIVE", publishedAt: { lte: new Date() } },
    select: cardSelect,
  });
  const bySlug = new Map(rows.map((r) => [r.slug, toCard(r)]));
  return slugs.map((s) => bySlug.get(s)).filter((c): c is ProductCardDTO => Boolean(c));
}

// ─────────────── فهرست با فیلتر ───────────────

interface ScopeOptions {
  includeFacetFilters: boolean;
}

function buildConditions(f: CatalogFilters, options: ScopeOptions): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [
    Prisma.sql`p."status" = 'ACTIVE'`,
    Prisma.sql`p."publishedAt" IS NOT NULL AND p."publishedAt" <= now()`,
  ];

  if (f.category) {
    conds.push(Prisma.sql`p."categoryId" IN (SELECT c."id" FROM "Category" c WHERE c."slug" = ${f.category} AND c."isVisible")`);
  }
  if (f.collection) {
    conds.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductCollection" pcx JOIN "Collection" colx ON colx."id" = pcx."collectionId"
      WHERE pcx."productId" = p."id" AND colx."slug" = ${f.collection} AND colx."isVisible")`);
  }
  if (f.onSale) conds.push(Prisma.sql`p."salePrice" IS NOT NULL`);
  if (f.isNew) conds.push(Prisma.sql`p."publishedAt" >= now() - make_interval(days => ${NEW_ARRIVAL_DAYS})`);

  if (f.q) {
    const tsq = buildTsQuery(f.q);
    if (tsq) {
      conds.push(Prisma.sql`(to_tsvector('simple', p."searchText") @@ to_tsquery('simple', ${tsq}) OR p."searchText" ILIKE ${likePattern(f.q)})`);
    } else {
      conds.push(Prisma.sql`FALSE`);
    }
  }

  if (options.includeFacetFilters) {
    if (f.lengths.length) conds.push(Prisma.sql`p."length"::text = ANY(${f.lengths}::text[])`);
    if (f.minPrice) conds.push(Prisma.sql`COALESCE(p."salePrice", p."price") >= ${f.minPrice}::numeric`);
    if (f.maxPrice) conds.push(Prisma.sql`COALESCE(p."salePrice", p."price") <= ${f.maxPrice}::numeric`);

    const variantConds: Prisma.Sql[] = [Prisma.sql`v."productId" = p."id"`, Prisma.sql`v."isActive"`];
    if (f.colors.length) variantConds.push(Prisma.sql`vc."slug" = ANY(${f.colors}::text[])`);
    if (f.sizes.length) variantConds.push(Prisma.sql`vs."label" = ANY(${f.sizes}::text[])`);
    if (f.inStock) variantConds.push(Prisma.sql`v."stock" > 0`);
    if (f.colors.length || f.sizes.length || f.inStock) {
      conds.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ProductVariant" v
        JOIN "Color" vc ON vc."id" = v."colorId"
        JOIN "Size" vs ON vs."id" = v."sizeId"
        WHERE ${Prisma.join(variantConds, " AND ")})`);
    }
  }
  return conds;
}

function orderBy(f: CatalogFilters): Prisma.Sql {
  switch (f.sort) {
    case "newest":
      return Prisma.sql`p."publishedAt" DESC, p."id" DESC`;
    case "popular":
      return Prisma.sql`p."salesCount" DESC, p."publishedAt" DESC, p."id" DESC`;
    case "price-asc":
      return Prisma.sql`COALESCE(p."salePrice", p."price") ASC, p."id" ASC`;
    case "price-desc":
      return Prisma.sql`COALESCE(p."salePrice", p."price") DESC, p."id" DESC`;
    case "relevance": {
      const tsq = f.q ? buildTsQuery(f.q) : null;
      if (tsq) {
        return Prisma.sql`ts_rank(to_tsvector('simple', p."searchText"), to_tsquery('simple', ${tsq})) DESC, p."salesCount" DESC, p."id" DESC`;
      }
      return Prisma.sql`p."salesCount" DESC, p."id" DESC`;
    }
    case "featured":
    default:
      if (f.collection) {
        return Prisma.sql`(
          SELECT pco."sortOrder" FROM "ProductCollection" pco JOIN "Collection" cco ON cco."id" = pco."collectionId"
          WHERE pco."productId" = p."id" AND cco."slug" = ${f.collection} LIMIT 1
        ) ASC NULLS LAST, p."sortOrder" ASC, p."publishedAt" DESC, p."id" DESC`;
      }
      return Prisma.sql`p."isFeatured" DESC, p."sortOrder" ASC, p."publishedAt" DESC, p."id" DESC`;
  }
}

export async function listProducts(filters: CatalogFilters, pageSize = CATALOG_PAGE_SIZE): Promise<CatalogPage> {
  const conds = buildConditions(filters, { includeFacetFilters: true });
  const offset = (filters.page - 1) * pageSize;
  const rows = await db.$queryRaw<Array<{ id: string; total: bigint }>>`
    SELECT p."id", COUNT(*) OVER() AS "total"
    FROM "Product" p
    WHERE ${Prisma.join(conds, " AND ")}
    ORDER BY ${orderBy(filters)}
    LIMIT ${pageSize} OFFSET ${offset}`;

  let total = rows.length ? Number(rows[0].total) : 0;
  if (rows.length === 0 && offset > 0) {
    // صفحهٔ خارج از محدوده: تعداد کل را جداگانه محاسبه می‌کنیم تا صفحه‌بندی درست نمایش داده شود
    const countRows = await db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS "total" FROM "Product" p WHERE ${Prisma.join(conds, " AND ")}`;
    total = Number(countRows[0]?.total ?? 0);
  }
  const items = await getProductCardsByIds(rows.map((r) => r.id));
  return {
    items,
    total,
    page: filters.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFacets(filters: CatalogFilters): Promise<FacetOptions> {
  const conds = buildConditions(filters, { includeFacetFilters: false });
  const scope = Prisma.sql`SELECT p."id", p."length", COALESCE(p."salePrice", p."price") AS ep FROM "Product" p WHERE ${Prisma.join(conds, " AND ")}`;

  const [colors, sizes, lengths, price, settings] = await Promise.all([
    db.$queryRaw<Array<{ id: string; slug: string; name: string; hex: string; family: ColorDTO["family"]; count: number }>>`
      WITH scope AS (${scope})
      SELECT c."id", c."slug", c."name", c."hex", c."family", COUNT(DISTINCT v."productId")::int AS "count"
      FROM scope JOIN "ProductVariant" v ON v."productId" = scope."id" AND v."isActive"
      JOIN "Color" c ON c."id" = v."colorId"
      GROUP BY c."id" ORDER BY c."sortOrder", c."name"`,
    db.$queryRaw<Array<{ id: string; label: string; count: number }>>`
      WITH scope AS (${scope})
      SELECT s."id", s."label", COUNT(DISTINCT v."productId")::int AS "count"
      FROM scope JOIN "ProductVariant" v ON v."productId" = scope."id" AND v."isActive"
      JOIN "Size" s ON s."id" = v."sizeId"
      GROUP BY s."id" ORDER BY s."sortOrder", s."label"`,
    db.$queryRaw<Array<{ length: DressLength; count: number }>>`
      WITH scope AS (${scope})
      SELECT "length", COUNT(*)::int AS "count" FROM scope WHERE "length" IS NOT NULL GROUP BY "length"`,
    db.$queryRaw<Array<{ min: Prisma.Decimal | null; max: Prisma.Decimal | null }>>`
      WITH scope AS (${scope}) SELECT MIN(ep) AS "min", MAX(ep) AS "max" FROM scope`,
    loadStoreSettings(),
  ]);

  const order: DressLength[] = ["MINI", "KNEE", "MIDI", "MAXI", "FLOOR"];
  return {
    colors,
    sizes,
    lengths: lengths.map((l) => ({ value: l.length, count: l.count })).sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value)),
    priceRange: price[0]?.min !== null && price[0]?.max !== null && price[0] ? { min: price[0].min!.toString(), max: price[0].max!.toString() } : null,
    currency: settings.currency,
  };
}

// ─────────────── جزئیات محصول ───────────────

export async function getProductDetail(slug: string, options: { includeUnpublished?: boolean } = {}): Promise<ProductDetailDTO | null> {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true } },
      sizeGuide: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        include: {
          color: true,
          size: true,
        },
      },
      collections: {
        where: { collection: { isVisible: true } },
        include: { collection: { select: { slug: true, name: true } } },
      },
    },
  });
  if (!product) return null;
  const published = product.status === "ACTIVE" && product.publishedAt !== null && product.publishedAt <= new Date();
  if (!published && !options.includeUnpublished) return null;

  const settings = await loadStoreSettings();
  const colorOptions = new Map<string, ColorDTO & { sortOrder: number }>();
  const sizeOptions = new Map<string, { id: string; label: string; sortOrder: number }>();
  for (const v of product.variants) {
    colorOptions.set(v.colorId, { id: v.color.id, slug: v.color.slug, name: v.color.name, hex: v.color.hex, family: v.color.family, sortOrder: v.color.sortOrder });
    sizeOptions.set(v.sizeId, { id: v.size.id, label: v.size.label, sortOrder: v.size.sortOrder });
  }

  const gallery = product.images.filter((i) => i.kind === "GALLERY");
  const view360 = product.images.filter((i) => i.kind === "VIEW360");
  const card = toCard({
    ...product,
    category: { name: product.category.name },
    images: gallery.slice(0, 2),
    variants: product.variants.map((v) => ({ stock: v.stock, color: v.color })),
  });

  return {
    ...card,
    description: product.description,
    fabric: product.fabric,
    careInstructions: product.careInstructions,
    modelInfo: product.modelInfo,
    length: product.length,
    category: product.category,
    images: gallery.map((i) => ({ id: i.id, url: i.url, alt: i.alt, width: i.width, height: i.height, colorId: i.colorId, kind: i.kind })),
    view360: view360.map((i) => ({ id: i.id, url: i.url, alt: i.alt, width: i.width, height: i.height, colorId: i.colorId, kind: i.kind })),
    model3dUrl: product.model3dUrl,
    sizeGuide: product.sizeGuide
      ? { name: product.sizeGuide.name, description: product.sizeGuide.description, rows: product.sizeGuide.rows as unknown as SizeGuideRow[] }
      : null,
    variants: product.variants.map((v) => {
      const threshold = v.lowStockThreshold ?? settings.lowStockThreshold;
      return {
        id: v.id,
        sku: v.sku,
        colorId: v.colorId,
        sizeId: v.sizeId,
        maxQuantity: purchasableQuantity({ stock: v.stock, isActive: v.isActive, productStatus: product.status }),
        stockLevel: stockLevel(v.stock, threshold),
      };
    }),
    colorOptions: [...colorOptions.values()].sort((a, b) => a.sortOrder - b.sortOrder).map((c): ColorDTO => ({ id: c.id, slug: c.slug, name: c.name, hex: c.hex, family: c.family })),
    sizeOptions: [...sizeOptions.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, label }) => ({ id, label })),
    collections: product.collections.map((pc) => pc.collection),
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    updatedAt: product.updatedAt.toISOString(),
    status: product.status,
  };
}

/** نامک جدید محصول در صورت تغییر نامک (برای ریدایرکت ۳۰۱) */
export async function resolveProductRedirect(slug: string): Promise<string | null> {
  const redirect = await db.productSlugRedirect.findUnique({ where: { fromSlug: slug }, include: { product: { select: { slug: true } } } });
  return redirect?.product.slug ?? null;
}

export async function resolveCollectionRedirect(slug: string): Promise<string | null> {
  const redirect = await db.collectionSlugRedirect.findUnique({ where: { fromSlug: slug }, include: { collection: { select: { slug: true } } } });
  return redirect?.collection.slug ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductCardDTO[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH me AS (SELECT "id", "categoryId" FROM "Product" WHERE "id" = ${productId}::uuid)
    SELECT p."id" FROM "Product" p, me
    WHERE p."id" <> me."id" AND p."status" = 'ACTIVE' AND p."publishedAt" <= now()
      AND (p."categoryId" = me."categoryId" OR EXISTS (
        SELECT 1 FROM "ProductCollection" a JOIN "ProductCollection" b ON a."collectionId" = b."collectionId"
        WHERE a."productId" = p."id" AND b."productId" = me."id"))
    ORDER BY (p."categoryId" = me."categoryId") DESC, p."salesCount" DESC, p."publishedAt" DESC
    LIMIT ${limit}`;
  return getProductCardsByIds(rows.map((r) => r.id));
}

/** تعداد محصولات منتشرشده‌ای که فروش واقعی داشته‌اند (برای تصمیم نمایش بخش «پرفروش‌ها») */
export async function countProductsWithSales(): Promise<number> {
  return db.product.count({ where: { status: "ACTIVE", salesCount: { gt: 0 } } });
}

// ─────────────── مجموعه‌ها و دسته‌ها ───────────────

function collectionToDTO(c: {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  type: CollectionDTO["type"];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  accentColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  _count?: { products: number };
}): CollectionDTO {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle,
    description: c.description,
    type: c.type,
    coverImage: c.coverImageUrl ? { url: c.coverImageUrl, alt: c.coverImageAlt ?? c.name, width: 1200, height: 1500 } : null,
    accentColor: c.accentColor,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    productCount: c._count?.products ?? 0,
  };
}

export async function listCollections(options: { featuredOnly?: boolean } = {}): Promise<CollectionDTO[]> {
  const rows = await db.collection.findMany({
    where: { isVisible: true, ...(options.featuredOnly ? { isFeatured: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { product: { status: "ACTIVE" } } } } } },
  });
  return rows.map(collectionToDTO);
}

export async function getCollection(slug: string): Promise<CollectionDTO | null> {
  const row = await db.collection.findFirst({
    where: { slug, isVisible: true },
    include: { _count: { select: { products: { where: { product: { status: "ACTIVE" } } } } } },
  });
  return row ? collectionToDTO(row) : null;
}

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await db.category.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    coverImage: c.coverImageUrl ? { url: c.coverImageUrl, alt: c.coverImageAlt ?? c.name, width: 1200, height: 1500 } : null,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
  }));
}

export async function getCategory(slug: string): Promise<CategoryDTO | null> {
  const categories = await listCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

/** رنگ‌هایی که حداقل یک محصول منتشرشده دارند (برای کشف بر اساس رنگ) */
export async function listShopColors(): Promise<Array<ColorDTO & { count: number; image: ImageDTO | null }>> {
  const colors = await db.$queryRaw<Array<ColorDTO & { count: number; imageUrl: string | null; imageAlt: string | null; imageWidth: number | null; imageHeight: number | null }>>`
    WITH counted AS (
      SELECT c."id", c."slug", c."name", c."hex", c."family", c."sortOrder", COUNT(DISTINCT p."id")::int AS "count"
      FROM "Color" c
      JOIN "ProductVariant" v ON v."colorId" = c."id" AND v."isActive"
      JOIN "Product" p ON p."id" = v."productId" AND p."status" = 'ACTIVE' AND p."publishedAt" <= now()
      GROUP BY c."id"
    )
    SELECT counted."id", counted."slug", counted."name", counted."hex", counted."family", counted."count",
      img."url" AS "imageUrl", img."alt" AS "imageAlt", img."width" AS "imageWidth", img."height" AS "imageHeight"
    FROM counted
    LEFT JOIN LATERAL (
      SELECT i."url", i."alt", i."width", i."height" FROM "ProductImage" i
      JOIN "Product" ip ON ip."id" = i."productId"
      WHERE i."colorId" = counted."id" AND ip."status" = 'ACTIVE' AND i."kind" = 'GALLERY'
      ORDER BY ip."salesCount" DESC, i."sortOrder" ASC LIMIT 1
    ) img ON TRUE
    ORDER BY counted."sortOrder", counted."name"`;
  return colors.map(({ imageUrl, imageAlt, imageWidth, imageHeight, ...c }) => ({
    ...c,
    image: imageUrl ? { url: imageUrl, alt: imageAlt ?? c.name, width: imageWidth ?? 1200, height: imageHeight ?? 1600 } : null,
  }));
}

// ─────────────── پیشنهادهای جست‌وجو ───────────────

export interface SearchSuggestions {
  products: Array<Pick<ProductCardDTO, "slug" | "name" | "currency" | "price" | "salePrice" | "image" | "categoryName">>;
  collections: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}

export async function searchSuggestions(q: string, limit = 6): Promise<SearchSuggestions> {
  const normalized = normalizeSearchText(q);
  if (normalized.length < 2) return { products: [], collections: [], categories: [] };
  const like = likePattern(q);
  const page = await listProducts(
    {
      q,
      colors: [],
      sizes: [],
      lengths: [],
      inStock: false,
      onSale: false,
      isNew: false,
      sort: "relevance",
      page: 1,
    },
    limit,
  );
  const [collections, categories] = await Promise.all([
    db.$queryRaw<Array<{ slug: string; name: string }>>`
      SELECT "slug", "name" FROM "Collection" WHERE "isVisible" AND "name" ILIKE ${like} ORDER BY "sortOrder" LIMIT 4`,
    db.$queryRaw<Array<{ slug: string; name: string }>>`
      SELECT "slug", "name" FROM "Category" WHERE "isVisible" AND "name" ILIKE ${like} ORDER BY "sortOrder" LIMIT 4`,
  ]);
  return {
    products: page.items.map((p) => ({
      slug: p.slug,
      name: p.name,
      currency: p.currency,
      price: p.price,
      salePrice: p.salePrice,
      image: p.image,
      categoryName: p.categoryName,
    })),
    collections,
    categories,
  };
}

export async function logSearch(term: string, resultCount: number): Promise<void> {
  const normalized = normalizeSearchText(term).slice(0, 100);
  if (!normalized) return;
  await db.searchQueryLog.create({ data: { term: normalized, resultCount } });
}
