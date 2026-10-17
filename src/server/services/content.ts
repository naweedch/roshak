/** خواندن محتوای مدیریت‌پذیر برای ویترین (بنر، اطلاعیه، صفحات، پرسش‌ها، مجله، نظرات منتخب) */
import "server-only";
import type { BannerPlacement } from "@/generated/prisma/enums";
import { db } from "../db";

export interface BannerDTO {
  id: string;
  placement: BannerPlacement;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  mobileImageUrl: string | null;
  videoUrl: string | null;
  accentColor: string | null;
}

function activeWindow(now: Date) {
  return {
    isActive: true,
    AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
  };
}

export async function listActiveBanners(): Promise<BannerDTO[]> {
  const rows = await db.banner.findMany({ where: activeWindow(new Date()), orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  return rows.map((b) => ({
    id: b.id,
    placement: b.placement,
    eyebrow: b.eyebrow,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    secondaryCtaLabel: b.secondaryCtaLabel,
    secondaryCtaHref: b.secondaryCtaHref,
    imageUrl: b.imageUrl,
    imageAlt: b.imageAlt,
    mobileImageUrl: b.mobileImageUrl,
    videoUrl: b.videoUrl,
    accentColor: b.accentColor,
  }));
}

export async function listActiveAnnouncements() {
  const rows = await db.announcement.findMany({ where: activeWindow(new Date()), orderBy: { sortOrder: "asc" }, take: 5 });
  return rows.map((a) => ({ id: a.id, message: a.message, href: a.href, linkLabel: a.linkLabel }));
}

export async function getContentPage(slug: string) {
  const page = await db.contentPage.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!page) return null;
  return {
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    body: page.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function listPublishedPageSlugs() {
  return db.contentPage.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
}

export async function listFaq() {
  const rows = await db.faqItem.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }] });
  return rows.map((f) => ({ id: f.id, question: f.question, answer: f.answer, group: f.group }));
}

export interface ArticleCardDTO {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string;
  readingMinutes: number | null;
  publishedAt: string;
}

export async function listPublishedArticles(limit = 12, page = 1): Promise<{ items: ArticleCardDTO[]; total: number }> {
  const where = { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const [rows, total] = await Promise.all([
    db.article.findMany({ where, orderBy: { publishedAt: "desc" }, take: limit, skip: (page - 1) * limit }),
    db.article.count({ where }),
  ]);
  return {
    total,
    items: rows.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      coverImageUrl: a.coverImageUrl,
      coverImageAlt: a.coverImageAlt,
      authorName: a.authorName,
      readingMinutes: a.readingMinutes,
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
    })),
  };
}

export async function getPublishedArticle(slug: string) {
  const a = await db.article.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } } });
  if (!a) return null;
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    coverImageUrl: a.coverImageUrl,
    coverImageAlt: a.coverImageAlt,
    authorName: a.authorName,
    readingMinutes: a.readingMinutes,
    publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    seoTitle: a.seoTitle,
    seoDescription: a.seoDescription,
  };
}

/** نظرات واقعی، تأییدشده و منتخب برای بخش «گفته‌های مشتریان» */
export async function listFeaturedTestimonials(limit = 6) {
  const rows = await db.review.findMany({
    where: { status: "APPROVED", isFeatured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { firstName: true, lastName: true } }, product: { select: { name: true, slug: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
    isVerifiedPurchase: r.isVerifiedPurchase,
    product: r.product,
  }));
}

export async function listActiveShippingMethods() {
  const rows = await db.shippingMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return rows.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    description: m.description,
    price: m.price.toString(),
    currency: m.currency,
    minDays: m.minDays,
    maxDays: m.maxDays,
    freeShippingEligible: m.freeShippingEligible,
  }));
}
