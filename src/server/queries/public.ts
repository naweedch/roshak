/**
 * لایهٔ کش داده‌های عمومی (Cache Components).
 * هر تابع با «use cache» و برچسب مشخص کش می‌شود و پس از ویرایش در پنل مدیریت
 * با invalidate() در server/cache.ts فوراً باطل می‌شود.
 * هیچ داده‌ای که به کاربر خاص وابسته است از این‌جا عبور نمی‌کند.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CatalogFilters } from "@/lib/validation/catalog";
import { TAGS } from "../cache";
import * as catalog from "../services/catalog";
import * as content from "../services/content";
import { loadStoreSettings } from "../services/settings";
import { fetchInstagramMedia } from "../services/instagram";

export async function getSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.settings);
  return loadStoreSettings();
}

export async function getBanners() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.content);
  return content.listActiveBanners();
}

export async function getAnnouncements() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.content);
  return content.listActiveAnnouncements();
}

export async function getCatalogPage(filters: CatalogFilters, pageSize?: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.catalog);
  return catalog.listProducts(filters, pageSize);
}

export async function getFacets(filters: CatalogFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.catalog);
  return catalog.getFacets(filters);
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalog, TAGS.product(slug));
  return catalog.getProductDetail(slug);
}

export async function getProductRedirect(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalog);
  return catalog.resolveProductRedirect(slug);
}

export async function getRelated(productId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalog);
  return catalog.getRelatedProducts(productId);
}

export async function getCollections() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.collections, TAGS.catalog);
  return catalog.listCollections();
}

export async function getCollection(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.collections, TAGS.collection(slug));
  return catalog.getCollection(slug);
}

export async function getCollectionRedirect(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.collections);
  return catalog.resolveCollectionRedirect(slug);
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.categories, TAGS.taxonomy);
  return catalog.listCategories();
}

export async function getShopColors() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalog, TAGS.taxonomy);
  return catalog.listShopColors();
}

export async function getPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.content);
  return content.getContentPage(slug);
}

export async function getFaq() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.content);
  return content.listFaq();
}

export async function getArticles(limit = 12, page = 1) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return content.listPublishedArticles(limit, page);
}

export async function getArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return content.getPublishedArticle(slug);
}

export async function getTestimonials() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.testimonials);
  return content.listFeaturedTestimonials();
}

export async function getShippingMethods() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.shipping, TAGS.settings);
  return content.listActiveShippingMethods();
}

export async function getFeaturedCollections() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.collections, TAGS.catalog);
  return catalog.listCollections({ featuredOnly: true });
}

export async function getSalesSignal() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalog);
  return catalog.countProductsWithSales();
}

export async function getInstagramPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.content);
  return fetchInstagramMedia();
}
