/**
 * ساخت متادیتای صفحات و داده‌های ساختاریافتهٔ schema.org بر اساس تنظیمات قابل ویرایش فروشگاه.
 * هیچ داده‌ای از کاربر، سبد یا پنل مدیریت در متادیتای عمومی قرار نمی‌گیرد.
 */
import "server-only";
import type { Metadata } from "next";
import { toIsoAmount } from "@/lib/money";
import type { ProductDetailDTO } from "@/lib/types/catalog";
import { appUrl } from "./env";
import { getSettings } from "./queries/public";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${appUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface PageMetaInput {
  title?: string;
  description?: string | null;
  path: string;
  image?: string | null;
  noindex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
}

export async function pageMetadata(input: PageMetaInput): Promise<Metadata> {
  const settings = await getSettings();
  const title = input.title ? settings.seoTitleTemplate.replace("%s", input.title) : settings.seoDefaultTitle;
  const description = (input.description ?? settings.seoDefaultDescription).slice(0, 300);
  const url = absoluteUrl(input.path);
  const image = input.image ?? settings.ogImageUrl;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: input.type ?? "website",
      url,
      title,
      description,
      siteName: settings.storeName,
      locale: "fa_IR",
      images: image ? [{ url: absoluteUrl(image) }] : undefined,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [absoluteUrl(image)] : undefined },
    robots: input.noindex ? { index: false, follow: false, googleBot: { index: false, follow: false } } : { index: true, follow: true },
    verification: settings.googleSiteVerification ? { google: settings.googleSiteVerification } : undefined,
  };
}

/** متادیتای صفحات خصوصی (حساب، سبد، تسویه، مدیریت) */
export function privateMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false, googleBot: { index: false, follow: false } } };
}

// ─────────────── JSON-LD ───────────────

export async function organizationJsonLd() {
  const settings = await getSettings();
  const sameAs = [settings.instagramUrl, settings.telegramUrl, settings.pinterestUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.storeName,
    alternateName: settings.storeNameEn,
    url: appUrl(),
    logo: absoluteUrl("/images/logo.png"),
    ...(sameAs.length ? { sameAs } : {}),
    ...(settings.contactEmail || settings.contactPhone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
            ...(settings.contactPhone ? { telephone: settings.contactPhone } : {}),
            availableLanguage: ["fa"],
          },
        }
      : {}),
  };
}

export function websiteJsonLd(storeName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeName,
    url: appUrl(),
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${appUrl()}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** داده‌های ساختاریافتهٔ محصول بر اساس قیمت و موجودی واقعی (ارز به ISO تبدیل می‌شود) */
export function productJsonLd(product: ProductDetailDTO, storeName: string) {
  const price = product.salePrice ?? product.price;
  const iso = toIsoAmount(price, product.currency);
  const inStock = product.variants.some((v) => v.maxQuantity > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.description.slice(0, 500),
    image: product.images.slice(0, 6).map((i) => absoluteUrl(i.url)),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: storeName },
    category: product.category.name,
    ...(product.fabric ? { material: product.fabric } : {}),
    color: product.colorOptions.map((c) => c.name).join("، ") || undefined,
    offers: {
      "@type": "AggregateOffer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: iso.currency,
      lowPrice: iso.amount,
      highPrice: iso.amount,
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.ratingAverage && product.reviewCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAverage, reviewCount: product.reviewCount, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}

export function articleJsonLd(article: { title: string; excerpt: string; slug: string; coverImageUrl: string | null; authorName: string; publishedAt: string; updatedAt: string }, storeName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.coverImageUrl ? [absoluteUrl(article.coverImageUrl)] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "fa-IR",
    author: { "@type": "Organization", name: article.authorName },
    publisher: { "@type": "Organization", name: storeName, logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo.png") } },
    mainEntityOfPage: absoluteUrl(`/journal/${article.slug}`),
  };
}
