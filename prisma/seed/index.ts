/**
 * Seed توسعه: تنظیمات، کاتالوگ نمونه، محتوا، روش‌های ارسال، کدهای تخفیف آزمایشی و حساب مدیر توسعه.
 *
 * - اجرای دوباره امن است (upsert)؛ محتوایی که مدیر ویرایش کرده (بنر، صفحه، مقاله) بازنویسی نمی‌شود.
 * - در محیط عملیاتی اجرا نمی‌شود مگر با SEED_ALLOW_PRODUCTION=true (فقط برای محیط staging).
 * - هیچ نظر مشتری، سفارش یا آمار فروش ساختگی ساخته نمی‌شود.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { buildProductSearchText } from "../../src/lib/commerce/search-text";
import { silkSvg } from "./art";
import { ARTICLES, CATEGORIES, COLLECTIONS, COLORS, FAQ, LEGACY_PLACEHOLDER_SLUGS, PAGES, PRODUCTS, SHIPPING_METHODS, SIZE_GUIDE_ROWS, SIZES } from "./data";

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
  console.error("Seed نمونه در محیط عملیاتی اجرا نمی‌شود. برای ساخت مدیر از «npm run admin:create» استفاده کنید.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const storageRoot = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR ?? "./storage");

function seedNumber(text: string): number {
  return createHash("sha256").update(text).digest().readUInt32BE(0);
}

/** رندر SVG به WebP و ذخیره در پوشهٔ رسانه؛ اگر فایل وجود داشته باشد دوباره ساخته نمی‌شود */
async function renderImage(key: string, svg: string, width: number, height: number) {
  const file = path.join(storageRoot, key);
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await sharp(Buffer.from(svg)).resize(width, height).webp({ quality: 82 }).toFile(file);
  }
  return { url: `/media/${key}`, width, height };
}

/** کپی عکس برند از prisma/seed/photos به پوشهٔ رسانه */
async function copyPhoto(file: string) {
  const key = `seed/photos/${file}`;
  const target = path.join(storageRoot, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.resolve(process.cwd(), "prisma/seed/photos", file), target);
  return { url: `/media/${key}` };
}

/** نمای نزدیک بالاتنه از عکس روبه‌رو (برش ۳:۴ و بزرگ‌نمایی) */
async function detailCrop(file: string) {
  const key = `seed/photos/detail-${file}`;
  const target = path.join(storageRoot, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp(path.resolve(process.cwd(), "prisma/seed/photos", file))
    .extract({ left: 270, top: 170, width: 660, height: 880 })
    .resize(1200, 1600)
    .webp({ quality: 86 })
    .toFile(target);
  return { url: `/media/${key}` };
}

function stockFor(sku: string): number {
  const n = seedNumber(sku) % 10;
  // توزیع واقع‌گرا: برخی ناموجود، برخی کم، بیشتر موجود
  if (n === 0) return 0;
  if (n <= 2) return 1 + (n % 2);
  return 3 + (n % 6);
}

async function seedSettings() {
  await db.storeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      storeName: "روشاک",
      storeNameEn: "ROSHAK",
      tagline: "لباس مجلسی و شب، با ظرافتی ماندگار",
      currency: "IRT",
      taxRate: "10",
      pricesIncludeTax: true,
      freeShippingThreshold: "15000000",
      lowStockThreshold: 2,
      reservationMinutes: 30,
      returnWindowDays: 7,
      newsletterEnabled: true,
      newsletterDoubleOptIn: true,
      enabledPaymentProviders: [],
      seoTitleTemplate: "%s | روشاک",
      seoDefaultTitle: "روشاک | لباس مجلسی و لباس شب زنانه",
      seoDefaultDescription:
        "فروشگاه اینترنتی روشاک؛ لباس شب، پیراهن مجلسی، لباس نامزدی و جامپسوت رسمی زنانه با دوخت دقیق و پارچه‌های مرغوب.",
      ogImageUrl: "/media/seed/brand/og-default.webp",
    },
    update: {},
  });
}

async function seedTaxonomy() {
  for (const [i, c] of COLORS.entries()) {
    await db.color.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: { name: c.name, hex: c.hex, family: c.family, sortOrder: i } });
  }
  for (const [i, label] of SIZES.entries()) {
    await db.size.upsert({ where: { label }, create: { label, sortOrder: i }, update: { sortOrder: i } });
  }
  await db.sizeGuide.upsert({
    where: { name: "جدول سایز استاندارد روشاک" },
    create: {
      name: "جدول سایز استاندارد روشاک",
      description: "اندازه‌ها به سانتی‌متر و بر اساس اندازهٔ بدن است (نه لباس). قد لباس از سرشانه تا پایین دامن اندازه‌گیری شده است.",
      rows: SIZE_GUIDE_ROWS,
    },
    update: { rows: SIZE_GUIDE_ROWS },
  });

  for (const [i, c] of CATEGORIES.entries()) {
    // پوشش دسته: عکس اولین محصول آن دسته، یا ترکیب‌بندی پارچه اگر محصولی ندارد
    const firstProduct = PRODUCTS.find((p) => p.category === c.slug);
    const cover = firstProduct
      ? await copyPhoto(firstProduct.photos[0].file)
      : await renderImage(
          `seed/categories/${c.slug}.webp`,
          silkSvg({ width: 1200, height: 1600, background: ["#3a2a30", "#1e1519"], ribbon: ["#641E32", "#D6B56D", "#A51D3A"], seed: seedNumber(`cat-${c.slug}`), arch: true }),
          1200,
          1600,
        );
    await db.category.upsert({
      where: { slug: c.slug },
      create: { ...c, sortOrder: i, coverImageUrl: cover.url, coverImageAlt: c.name },
      update: { sortOrder: i, coverImageUrl: cover.url, coverImageAlt: c.name },
    });
  }

  for (const [i, c] of COLLECTIONS.entries()) {
    const cover = await renderImage(
      `seed/collections/${c.slug}.webp`,
      silkSvg({ width: 1200, height: 1500, background: c.art.background, ribbon: c.art.ribbon, seed: seedNumber(c.slug), arch: true, sparkle: c.type === "CAMPAIGN" }),
      1200,
      1500,
    );
    await db.collection.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        subtitle: c.subtitle,
        description: c.description,
        type: c.type,
        accentColor: c.accent,
        isFeatured: c.featured,
        sortOrder: i,
        coverImageUrl: cover.url,
        coverImageAlt: `ترکیب‌بندی پارچه برای مجموعهٔ ${c.name}`,
      },
      update: { coverImageUrl: cover.url, sortOrder: i },
    });
  }
}

async function seedProducts() {
  const [colors, sizes, categories, collections, sizeGuide] = await Promise.all([
    db.color.findMany(),
    db.size.findMany(),
    db.category.findMany(),
    db.collection.findMany(),
    db.sizeGuide.findFirstOrThrow(),
  ]);
  const colorBySlug = new Map(colors.map((c) => [c.slug, c]));
  const sizeByLabel = new Map(sizes.map((s) => [s.label, s]));

  for (const [index, p] of PRODUCTS.entries()) {
    const category = categories.find((c) => c.slug === p.category)!;
    const productCollections = collections.filter((c) => p.collections.includes(c.slug));
    const published = p.publishedDaysAgo >= 0;
    // کد کالا از نامک ساخته می‌شود تا با محصولات قبلی (حتی بایگانی‌شده) برخورد نکند
    const code = p.slug
      .split("-")
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    const variantDefs = p.colors.flatMap((colorSlug) =>
      p.sizes.map((label) => ({
        sku: `RSK-${code}-${colorSlug.slice(0, 3).toUpperCase()}-${label}`,
        color: colorBySlug.get(colorSlug)!,
        size: sizeByLabel.get(label)!,
      })),
    );

    const searchText = buildProductSearchText({
      name: p.name,
      subtitle: p.subtitle,
      description: p.description,
      fabric: p.fabric,
      categoryName: category.name,
      collectionNames: productCollections.map((c) => c.name),
      colorNames: p.colors.map((c) => colorBySlug.get(c)!.name),
      sizeLabels: p.sizes,
      sku: variantDefs.map((v) => v.sku),
    });

    const data = {
      name: p.name,
      subtitle: p.subtitle,
      description: p.description,
      fabric: p.fabric,
      careInstructions: "فقط خشکشویی. با بخار ملایم و از پشت پارچه اتو شود. روی چوب‌لباسی پهن و در کاور پارچه‌ای نگهداری شود.",
      modelInfo: "قد مانکن خیاطی ۱۷۵ سانتی‌متر، سایز ۳۸",
      status: published ? ("ACTIVE" as const) : ("DRAFT" as const),
      categoryId: category.id,
      sizeGuideId: sizeGuide.id,
      length: p.length,
      currency: "IRT",
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : null,
      isFeatured: Boolean(p.featured),
      sortOrder: index,
      publishedAt: published ? new Date(Date.now() - p.publishedDaysAgo * 86_400_000) : null,
      searchText,
      seoDescription: `${p.name}، ${p.subtitle}. ${p.description.split("\n")[0].slice(0, 110)}`,
    };

    const product = await db.product.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });

    for (const v of variantDefs) {
      const existing = await db.productVariant.findUnique({ where: { sku: v.sku } });
      if (existing) {
        if (existing.productId !== product.id) throw new Error(`کد کالای ${v.sku} قبلاً برای محصول دیگری ثبت شده است`);
        continue;
      }
      const stock = stockFor(v.sku);
      const variant = await db.productVariant.create({
        data: { productId: product.id, sku: v.sku, colorId: v.color.id, sizeId: v.size.id, stock },
      });
      if (stock > 0) {
        await db.inventoryMovement.create({ data: { variantId: variant.id, delta: stock, stockAfter: stock, reason: "INITIAL", note: "موجودی نمونهٔ seed" } });
      }
    }

    await db.productCollection.deleteMany({ where: { productId: product.id } });
    for (const [i, c] of productCollections.entries()) {
      await db.productCollection.create({ data: { productId: product.id, collectionId: c.id, sortOrder: index * 10 + i } });
    }

    // تصاویر واقعی: برای هر عکس یک نمای کامل؛ برای نمای روبه‌رو یک نمای نزدیک بالاتنه نیز ساخته می‌شود.
    await db.productImage.deleteMany({ where: { productId: product.id } });
    let sortOrder = 0;
    const angleLabel = { front: "نمای روبه‌رو", side: "نمای سه‌رخ", back: "نمای پشت" } as const;
    for (const photo of p.photos) {
      const color = colorBySlug.get(photo.color)!;
      const full = await copyPhoto(photo.file);
      await db.productImage.create({
        data: { productId: product.id, url: full.url, alt: `${p.name} به رنگ ${color.name}، ${angleLabel[photo.angle]}`, width: 1200, height: 1600, colorId: color.id, sortOrder: sortOrder++ },
      });
      if (photo.angle === "front") {
        const detail = await detailCrop(photo.file);
        await db.productImage.create({
          data: { productId: product.id, url: detail.url, alt: `${p.name} به رنگ ${color.name}، نمای نزدیک جزئیات بالاتنه`, width: 1200, height: 1600, colorId: color.id, sortOrder: sortOrder++ },
        });
      }
    }
    // نمای چندزاویه: وقتی برای یک رنگ بیش از یک زاویهٔ واقعی عکس وجود دارد
    for (const colorSlug of p.colors) {
      const angles = p.photos.filter((ph) => ph.color === colorSlug);
      if (angles.length < 2) continue;
      const color = colorBySlug.get(colorSlug)!;
      for (const ph of angles) {
        const full = await copyPhoto(ph.file);
        await db.productImage.create({
          data: { productId: product.id, url: full.url, alt: `${p.name}، ${angleLabel[ph.angle]}`, width: 1200, height: 1600, colorId: color.id, kind: "VIEW360", sortOrder: sortOrder++ },
        });
      }
    }
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  // محصولات تصویرسازی‌شدهٔ نسخهٔ قبلی seed بایگانی می‌شوند (حذف نمی‌شوند تا تاریخچه حفظ شود)
  const archived = await db.product.updateMany({
    where: { slug: { in: LEGACY_PLACEHOLDER_SLUGS }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED", isFeatured: false },
  });
  if (archived.count) console.log(`${archived.count} محصول تصویرسازی‌شدهٔ قدیمی بایگانی شد.`);
}

async function seedCommerce() {
  // پیک ویژه از تهران به اصفهان منتقل شد؛ ردیف قدیمی تغییر نام می‌گیرد تا روش تکراری ساخته نشود
  if (!(await db.shippingMethod.findUnique({ where: { code: "courier-isfahan" } }))) {
    await db.shippingMethod.updateMany({ where: { code: "courier-tehran" }, data: { code: "courier-isfahan" } });
  }
  for (const m of SHIPPING_METHODS) {
    await db.shippingMethod.upsert({
      where: { code: m.code },
      create: { ...m, currency: "IRT", price: String(m.price) },
      update: { name: m.name, description: m.description, sortOrder: m.sortOrder },
    });
  }
  const yalda = await db.collection.findUniqueOrThrow({ where: { slug: "yalda-nights" } });
  const discounts = [
    { code: "WELCOME10", description: "۱۰٪ تخفیف اولین خرید (کد آزمایشی)", type: "PERCENTAGE" as const, value: "10", minOrderAmount: "5000000", maxDiscountAmount: "3000000", perCustomerLimit: 1 },
    { code: "FREESHIP", description: "ارسال رایگان (کد آزمایشی)", type: "FREE_SHIPPING" as const, value: "0", minOrderAmount: "3000000" },
    { code: "YALDA15", description: "۱۵٪ تخفیف کالکشن شب‌های یلدا (کد آزمایشی)", type: "PERCENTAGE" as const, value: "15", scope: "COLLECTIONS" as const, usageLimit: 100 },
  ];
  for (const d of discounts) {
    const discount = await db.discount.upsert({ where: { code: d.code }, create: d, update: {} });
    if (d.code === "YALDA15") {
      await db.discountCollection.upsert({
        where: { discountId_collectionId: { discountId: discount.id, collectionId: yalda.id } },
        create: { discountId: discount.id, collectionId: yalda.id },
        update: {},
      });
    }
  }
}

async function seedContent() {
  const hero = await renderImage(
    "seed/brand/hero.webp",
    silkSvg({ width: 1920, height: 1200, background: ["#1C0911", "#3B0D1E"], ribbon: ["#641E32", "#A51D3A", "#D6B56D"], seed: 41, arch: true, sparkle: true }),
    1920,
    1200,
  );
  const campaign = await renderImage(
    "seed/brand/campaign-yalda.webp",
    silkSvg({ width: 1920, height: 1200, background: ["#2A0C17", "#17243A"], ribbon: ["#A51D3A", "#641E32", "#D6B56D"], seed: 77, arch: false, sparkle: true }),
    1920,
    1200,
  );
  // تصویر داستان برند: عکس واقعی لباس گلبرگ زرشکی
  const story = await copyPhoto("golbarg-burgundy-front.webp");
  const storyAlt = "لباس شب گلبرگ زرشکی با گلبرگ‌های پارچه‌ای روی بالاتنه";
  await renderImage(
    "seed/brand/og-default.webp",
    silkSvg({ width: 1200, height: 630, background: ["#1C0911", "#3B0D1E"], ribbon: ["#641E32", "#A51D3A", "#D6B56D"], seed: 41, arch: true }),
    1200,
    630,
  );

  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        {
          placement: "HOME_HERO",
          eyebrow: "کالکشن زمستان ۱۴۰۵",
          title: "درخشش یک شب، ماندگار برای همیشه",
          subtitle: "لباس‌های شب و مجلسی روشاک؛ دوخت دقیق، پارچه‌های خوش‌افت و جزئیاتی که دیده می‌شوند.",
          ctaLabel: "مشاهدهٔ کالکشن",
          ctaHref: "/collections/yalda-nights",
          secondaryCtaLabel: "همهٔ لباس‌ها",
          secondaryCtaHref: "/shop",
          imageUrl: hero.url,
          imageAlt: "ترکیب‌بندی انتزاعی نوارهای ابریشم زرشکی و طلایی",
          accentColor: "burgundy",
        },
        {
          placement: "HOME_CAMPAIGN",
          eyebrow: "کمپین فصل",
          title: "شب‌های یلدا",
          subtitle: "رنگ انار، مخمل و نور شمع. کالکشنی برای بلندترین شب سال.",
          ctaLabel: "کشف کالکشن",
          ctaHref: "/collections/yalda-nights",
          imageUrl: campaign.url,
          imageAlt: "ترکیب‌بندی نوارهای ابریشم یاقوتی روی زمینهٔ سرمه‌ای",
          accentColor: "ruby",
        },
        {
          placement: "HOME_STORY",
          eyebrow: "داستان برند",
          title: "روشاک، برای شب‌هایی که می‌درخشند",
          subtitle: "هر طرح ابتدا روی مانکن خیاطی شکل می‌گیرد، بارها آزموده می‌شود و تنها وقتی افتادگی پارچه بی‌نقص شد به تولید می‌رسد.",
          ctaLabel: "داستان ما",
          ctaHref: "/pages/our-story",
          imageUrl: story.url,
          imageAlt: storyAlt,
          accentColor: "champagne",
        },
      ],
    });
  }
  // اسلایدهای بخش آغازین: عکس واقعی مدل (برش‌خورده و بهینه در public/images/hero).
  // فقط متن قدیمی seed جایگزین می‌شود تا ویرایش‌های پنل مدیریت دست نخورد.
  const heroSlide = {
    eyebrow: "درخشش متفاوت",
    title: "درخشش به سبک شما",
    subtitle: "جدیدترین مدل‌های لباس مجلسی، با طراحی خاص و کیفیت بی‌نظیر برای لحظات خاص شما.",
    ctaLabel: "مشاهده محصولات",
    ctaHref: "/shop",
    secondaryCtaLabel: "درباره ما",
    secondaryCtaHref: "/pages/our-story",
    imageUrl: "/images/hero/golbarg-burgundy.webp",
    imageAlt: "مدل با لباس شب زرشکی گلبرگ با گلبرگ‌های ساتن ژاکارد روی بالاتنه",
    accentColor: "burgundy",
    sortOrder: 0,
  };
  await db.banner.updateMany({ where: { placement: "HOME_HERO", title: "درخشش یک شب، ماندگار برای همیشه" }, data: heroSlide });
  if ((await db.banner.count({ where: { placement: "HOME_HERO" } })) < 2) {
    await db.banner.create({
      data: {
        placement: "HOME_HERO",
        eyebrow: "یاقوت و شب",
        title: "افسون، شکوه بی‌زمان",
        subtitle: "لباس دکلته با دامن ساتن مشکی و آبشار یاقوتی؛ برای مهمانی‌هایی که در یاد می‌مانند.",
        ctaLabel: "مشاهدهٔ افسون",
        ctaHref: "/products/afsoon-strapless-ballgown",
        secondaryCtaLabel: "همهٔ لباس‌ها",
        secondaryCtaHref: "/shop",
        imageUrl: "/images/hero/afsoon-ruby.webp",
        imageAlt: "مدل با لباس دکلتهٔ افسون؛ دامن ساتن مشکی و آبشار یاقوتی",
        accentColor: "ruby",
        sortOrder: 1,
      },
    });
  }

  // بنر داستانی که هنوز تصویرسازی قدیمی seed را دارد، به عکس واقعی منتقل می‌شود
  await db.banner.updateMany({
    where: { placement: "HOME_STORY", imageUrl: "/media/seed/brand/story.webp" },
    data: { imageUrl: story.url, imageAlt: storyAlt, subtitle: "هر طرح با دقت در دوخت، انتخاب پارچه و جزئیات دست‌دوز ساخته می‌شود تا در شب مهمانی همان‌قدر خوش‌فرم بماند که در لحظهٔ پوشیدن." },
  });

  if ((await db.announcement.count()) === 0) {
    await db.announcement.createMany({
      data: [
        { message: "ارسال رایگان برای سفارش‌های بالای ۱۵ میلیون تومان", href: "/pages/shipping", linkLabel: "شرایط ارسال", sortOrder: 0 },
        { message: "کالکشن «شب‌های یلدا» منتشر شد", href: "/collections/yalda-nights", linkLabel: "مشاهده", sortOrder: 1 },
      ],
    });
  }

  for (const page of PAGES) {
    await db.contentPage.upsert({ where: { slug: page.slug }, create: { ...page, status: "PUBLISHED" }, update: {} });
  }
  // متن قدیمی seed دربارهٔ پیک تهران (فقط اگر هنوز دست‌نخورده باشد) به‌روز می‌شود
  const shippingPage = await db.contentPage.findUnique({ where: { slug: "shipping" }, select: { body: true } });
  const oldCourierLine = "- **پیک ویژهٔ تهران:** تحویل در تهران طی یک روز کاری.";
  if (shippingPage?.body.includes(oldCourierLine)) {
    await db.contentPage.update({
      where: { slug: "shipping" },
      data: { body: shippingPage.body.replace(oldCourierLine, "- **پیک ویژهٔ اصفهان:** تحویل در اصفهان طی یک روز کاری.") },
    });
  }

  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({ data: FAQ.map((f, i) => ({ ...f, sortOrder: i })) });
  }

  for (const [i, a] of ARTICLES.entries()) {
    const cover = await renderImage(
      `seed/journal/${a.slug}.webp`,
      silkSvg({ width: 1600, height: 1000, background: a.art.background, ribbon: a.art.ribbon, seed: seedNumber(a.slug), arch: i === 0, sparkle: false }),
      1600,
      1000,
    );
    await db.article.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        body: a.body,
        authorName: a.author,
        readingMinutes: a.minutes,
        coverImageUrl: cover.url,
        coverImageAlt: `تصویر انتزاعی برای مقالهٔ ${a.title}`,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - (i + 1) * 9 * 86_400_000),
      },
      update: {},
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD تنظیم نشده است؛ حساب مدیر توسعه ساخته نشد.");
    return;
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD باید حداقل ۱۲ کاراکتر باشد");
  const passwordHash = await hash(password);
  await db.user.upsert({
    where: { email },
    create: { email, passwordHash, firstName: "مدیر", lastName: "توسعه", role: "SUPER_ADMIN", emailVerifiedAt: new Date() },
    update: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  console.log(`حساب مدیر توسعه: ${email} (رمز از SEED_ADMIN_PASSWORD در فایل .env)`);
}

async function main() {
  console.log("Seed: تنظیمات...");
  await seedSettings();
  console.log("Seed: رنگ، سایز، دسته و مجموعه...");
  await seedTaxonomy();
  console.log("Seed: محصولات و تصاویر نمونه...");
  await seedProducts();
  console.log("Seed: ارسال و تخفیف...");
  await seedCommerce();
  console.log("Seed: محتوا...");
  await seedContent();
  await seedAdmin();
  console.log("Seed کامل شد.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
