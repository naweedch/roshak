/** محتوای مدیریت‌پذیر: بنرها، اطلاعیه‌ها، صفحات، مقاله‌ها، پرسش‌ها، نظرات، تنظیمات و گزارش ممیزی */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type {
  announcementSchema,
  articleSchema,
  bannerSchema,
  faqSchema,
  pageSchema,
  reviewModerationSchema,
  settingsSchema,
} from "@/lib/validation/admin";
import { db } from "../../db";
import { errors, isUniqueViolation } from "../../errors";
import { invalidate, TAGS } from "../../cache";
import { diffFields, writeAudit } from "../audit";
import { recomputeProductRating } from "../customer";
import type { Actor } from "./products";

function audit(tx: Prisma.TransactionClient, actor: Actor, action: string, entityType: string, entityId: string, summary: string, changes?: Record<string, unknown>) {
  return writeAudit(tx, actor, { action, entityType, entityId, summary, changes, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

// ─────────────── بنر و اطلاعیه ───────────────

export async function listBanners() {
  const rows = await db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  return rows.map((b) => ({ ...b, startsAt: iso(b.startsAt), endsAt: iso(b.endsAt), createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }));
}

export async function saveBanner(id: string | null, data: z.output<typeof bannerSchema>, actor: Actor) {
  const values = {
    ...data,
    eyebrow: data.eyebrow ?? null,
    subtitle: data.subtitle ?? null,
    ctaLabel: data.ctaLabel ?? null,
    ctaHref: data.ctaHref ?? null,
    secondaryCtaLabel: data.secondaryCtaLabel ?? null,
    secondaryCtaHref: data.secondaryCtaHref ?? null,
    imageAlt: data.imageAlt ?? null,
    videoUrl: data.videoUrl ?? null,
    accentColor: data.accentColor ?? null,
  };
  const row = await db.$transaction(async (tx) => {
    const saved = id ? await tx.banner.update({ where: { id }, data: values }) : await tx.banner.create({ data: values });
    await audit(tx, actor, id ? "banner.update" : "banner.create", "Banner", saved.id, `${id ? "ویرایش" : "ایجاد"} بنر «${saved.title}»`);
    return saved;
  });
  invalidate(TAGS.content);
  return row;
}

export async function deleteBanner(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    const d = await tx.banner.delete({ where: { id } });
    await audit(tx, actor, "banner.delete", "Banner", id, `حذف بنر «${d.title}»`);
  });
  invalidate(TAGS.content);
}

export async function listAnnouncements() {
  const rows = await db.announcement.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((a) => ({ ...a, startsAt: iso(a.startsAt), endsAt: iso(a.endsAt), createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() }));
}

export async function saveAnnouncement(id: string | null, data: z.output<typeof announcementSchema>, actor: Actor) {
  const values = { ...data, linkLabel: data.linkLabel ?? null, href: data.href ?? null };
  const row = await db.$transaction(async (tx) => {
    const saved = id ? await tx.announcement.update({ where: { id }, data: values }) : await tx.announcement.create({ data: values });
    await audit(tx, actor, id ? "announcement.update" : "announcement.create", "Announcement", saved.id, "ذخیرهٔ اطلاعیه");
    return saved;
  });
  invalidate(TAGS.content);
  return row;
}

export async function deleteAnnouncement(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    await tx.announcement.delete({ where: { id } });
    await audit(tx, actor, "announcement.delete", "Announcement", id, "حذف اطلاعیه");
  });
  invalidate(TAGS.content);
}

// ─────────────── صفحات و مقاله‌ها ───────────────

export async function listPagesAdmin() {
  const rows = await db.contentPage.findMany({ orderBy: { title: "asc" } });
  return rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
}

export async function savePage(id: string | null, data: z.output<typeof pageSchema>, actor: Actor) {
  const values = { ...data, summary: data.summary ?? null, seoTitle: data.seoTitle ?? null, seoDescription: data.seoDescription ?? null };
  try {
    const row = await db.$transaction(async (tx) => {
      const saved = id ? await tx.contentPage.update({ where: { id }, data: values }) : await tx.contentPage.create({ data: values });
      await audit(tx, actor, id ? "page.update" : "page.create", "ContentPage", saved.id, `ذخیرهٔ صفحهٔ «${saved.title}»`);
      return saved;
    });
    invalidate(TAGS.content);
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ slug: "این نامک قبلاً استفاده شده است" });
    throw error;
  }
}

export async function deletePage(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    const d = await tx.contentPage.delete({ where: { id } });
    await audit(tx, actor, "page.delete", "ContentPage", id, `حذف صفحهٔ «${d.title}»`);
  });
  invalidate(TAGS.content);
}

export async function listArticlesAdmin() {
  const rows = await db.article.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map((a) => ({ ...a, publishedAt: iso(a.publishedAt), createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() }));
}

export async function saveArticle(id: string | null, data: z.output<typeof articleSchema>, actor: Actor) {
  const values = {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    body: data.body,
    status: data.status,
    authorName: data.authorName,
    coverImageUrl: data.coverImageUrl,
    coverImageAlt: data.coverImageAlt ?? null,
    readingMinutes: data.readingMinutes ?? Math.max(1, Math.round(data.body.split(/\s+/).length / 200)),
    publishedAt: data.status === "PUBLISHED" ? (data.publishedAt ?? new Date()) : data.publishedAt,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
  };
  try {
    const row = await db.$transaction(async (tx) => {
      const saved = id ? await tx.article.update({ where: { id }, data: values }) : await tx.article.create({ data: { ...values, createdById: actor.id } });
      await audit(tx, actor, id ? "article.update" : "article.create", "Article", saved.id, `ذخیرهٔ مقالهٔ «${saved.title}»`);
      return saved;
    });
    invalidate(TAGS.articles);
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.validation({ slug: "این نامک قبلاً استفاده شده است" });
    throw error;
  }
}

export async function deleteArticle(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    const d = await tx.article.delete({ where: { id } });
    await audit(tx, actor, "article.delete", "Article", id, `حذف مقالهٔ «${d.title}»`);
  });
  invalidate(TAGS.articles);
}

export async function listFaqAdmin() {
  return db.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }] });
}

export async function saveFaq(id: string | null, data: z.output<typeof faqSchema>, actor: Actor) {
  const values = { ...data, group: data.group ?? null };
  const row = await db.$transaction(async (tx) => {
    const saved = id ? await tx.faqItem.update({ where: { id }, data: values }) : await tx.faqItem.create({ data: values });
    await audit(tx, actor, id ? "faq.update" : "faq.create", "FaqItem", saved.id, "ذخیرهٔ پرسش پرتکرار");
    return saved;
  });
  invalidate(TAGS.content);
  return row;
}

export async function deleteFaq(id: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    await tx.faqItem.delete({ where: { id } });
    await audit(tx, actor, "faq.delete", "FaqItem", id, "حذف پرسش پرتکرار");
  });
  invalidate(TAGS.content);
}

// ─────────────── نظرات ───────────────

export async function listReviewsAdmin(params: { page: number; pageSize: number; status?: "PENDING" | "APPROVED" | "REJECTED" }) {
  const where = params.status ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { user: { select: { email: true, firstName: true, lastName: true } }, product: { select: { name: true, slug: true } } },
    }),
    db.review.count({ where }),
  ]);
  return {
    total,
    items: items.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      isFeatured: r.isFeatured,
      isVerifiedPurchase: r.isVerifiedPurchase,
      author: `${r.user.firstName} ${r.user.lastName}`,
      authorEmail: r.user.email,
      product: r.product,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function moderateReview(id: string, data: z.output<typeof reviewModerationSchema>, actor: Actor) {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw errors.notFound("نظر یافت نشد");
  if (data.isFeatured && (data.status ?? review.status) !== "APPROVED") throw errors.validation({ isFeatured: "فقط نظر تأییدشده می‌تواند منتخب صفحهٔ اصلی باشد" });
  await db.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status, moderatedById: actor.id, moderatedAt: new Date() } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.status && data.status !== "APPROVED" ? { isFeatured: false } : {}),
      },
    });
    await audit(tx, actor, "review.moderate", "Review", id, "بررسی نظر مشتری", { status: { from: review.status, to: data.status ?? review.status }, isFeatured: data.isFeatured ?? review.isFeatured });
  });
  await recomputeProductRating(review.productId);
}

// ─────────────── تنظیمات ───────────────

export async function updateSettings(data: z.output<typeof settingsSchema>, actor: Actor) {
  const before = await db.storeSettings.findUnique({ where: { id: 1 } });
  if (!before) throw errors.notFound("تنظیمات فروشگاه هنوز ایجاد نشده است؛ seed یا مهاجرت را اجرا کنید");
  if (before.currency !== data.currency) {
    const products = await db.product.count({ where: { currency: before.currency } });
    if (products > 0) {
      throw errors.validation({ currency: `${products} محصول با ارز ${before.currency} قیمت‌گذاری شده‌اند؛ تغییر ارز بدون تبدیل قیمت‌ها مجاز نیست` });
    }
  }
  const values = {
    ...data,
    tagline: data.tagline ?? null,
    contactPhone: data.contactPhone ?? null,
    contactAddress: data.contactAddress ?? null,
    workingHours: data.workingHours ?? null,
    emailFromName: data.emailFromName ?? null,
    googleSiteVerification: data.googleSiteVerification ?? null,
    updatedById: actor.id,
  };
  await db.$transaction(async (tx) => {
    const after = await tx.storeSettings.update({ where: { id: 1 }, data: values });
    await audit(
      tx,
      actor,
      "settings.update",
      "StoreSettings",
      "1",
      "ویرایش تنظیمات فروشگاه",
      diffFields(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, Object.keys(data)),
    );
  });
  invalidate(TAGS.settings, TAGS.catalog, TAGS.shipping);
}

// ─────────────── گزارش ممیزی ───────────────

export async function listAuditLogs(params: { page: number; pageSize: number; q?: string; entityType?: string }) {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.q ? { OR: [{ actorEmail: { contains: params.q.toLowerCase() } }, { action: { contains: params.q } }, { summary: { contains: params.q } }, { entityId: params.q }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
    db.adminAuditLog.count({ where }),
  ]);
  return {
    total,
    items: items.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  };
}
