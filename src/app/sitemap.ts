import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/server/db";
import { appUrl } from "@/server/env";

/**
 * نقشهٔ سایت XML: صفحات اصلی، محصولات منتشرشده، مجموعه‌ها، مقاله‌ها و صفحات محتوایی.
 * در زمان درخواست ساخته می‌شود تا محصول تازه بدون نیاز به build دوباره وارد نقشه شود.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = appUrl();
  const now = new Date();
  const [products, collections, articles, pages] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", publishedAt: { lte: now } },
      select: { slug: true, updatedAt: true, images: { where: { kind: "GALLERY" }, orderBy: { sortOrder: "asc" }, take: 3, select: { url: true } } },
    }),
    db.collection.findMany({ where: { isVisible: true, products: { some: { product: { status: "ACTIVE" } } } }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: now } }, select: { slug: true, updatedAt: true } }),
    db.contentPage.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : `${base}${u}`);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/shop/new`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/shop/sale`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/journal`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/size-guide`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({
      url: `${base}/products/${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      images: p.images.map((i) => abs(i.url)),
    })),
    ...collections.map((c) => ({ url: `${base}/collections/${encodeURIComponent(c.slug)}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${base}/journal/${encodeURIComponent(a.slug)}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...pages.map((p) => ({ url: `${base}/pages/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
