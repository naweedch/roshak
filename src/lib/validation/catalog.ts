/**
 * تبدیل پارامترهای URL فهرست محصولات به فیلترهای ساخت‌یافته (و برعکس).
 * مقادیر نامعتبر نادیده گرفته می‌شوند تا URLهای اشتراکی هیچ‌وقت صفحه را خراب نکنند.
 */
import type { DressLength } from "@/generated/prisma/enums";
import { toEnglishDigits } from "../persian";

export const SORT_OPTIONS = ["featured", "newest", "popular", "price-asc", "price-desc", "relevance"] as const;
export type CatalogSort = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<CatalogSort, string> = {
  featured: "پیشنهاد روشاک",
  newest: "جدیدترین",
  popular: "پرفروش‌ترین",
  "price-asc": "ارزان‌ترین",
  "price-desc": "گران‌ترین",
  relevance: "مرتبط‌ترین",
};

const LENGTHS: readonly DressLength[] = ["MINI", "KNEE", "MIDI", "MAXI", "FLOOR"];

export const CATALOG_PAGE_SIZE = 12;

export interface CatalogFilters {
  q?: string;
  category?: string;
  collection?: string;
  colors: string[];
  sizes: string[];
  lengths: DressLength[];
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  sort: CatalogSort;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined, max = 20): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && v.length <= 60),
    ),
  ).slice(0, max);
}

function price(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = toEnglishDigits(value).replace(/[,٬\s]/g, "");
  return /^\d{1,14}$/.test(v) ? v : undefined;
}

export function parseCatalogParams(params: RawParams, defaults: Partial<CatalogFilters> = {}): CatalogFilters {
  const q = first(params.q)?.trim().slice(0, 100) || undefined;
  const sortParam = first(params.sort) as CatalogSort | undefined;
  const sort = sortParam && SORT_OPTIONS.includes(sortParam) ? sortParam : (defaults.sort ?? (q ? "relevance" : "featured"));
  const pageNum = Number.parseInt(toEnglishDigits(first(params.page) ?? "1"), 10);
  return {
    q,
    category: first(params.category)?.slice(0, 120) || defaults.category,
    collection: defaults.collection,
    colors: list(params.color),
    sizes: list(params.size),
    lengths: list(params.length)
      .map((v) => v.toUpperCase() as DressLength)
      .filter((v) => LENGTHS.includes(v)),
    minPrice: price(first(params.min)),
    maxPrice: price(first(params.max)),
    inStock: first(params.stock) === "1",
    onSale: first(params.sale) === "1" || defaults.onSale === true,
    isNew: first(params.new) === "1" || defaults.isNew === true,
    sort: sort === "relevance" && !q ? "featured" : sort,
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 500) : 1,
  };
}

/** ساخت query string از فیلترها (فقط مقادیر غیرپیش‌فرض) */
export function catalogQueryString(filters: Partial<CatalogFilters>, overrides: Partial<CatalogFilters> = {}): string {
  const f = { ...filters, ...overrides };
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.category) sp.set("category", f.category);
  if (f.colors?.length) sp.set("color", f.colors.join(","));
  if (f.sizes?.length) sp.set("size", f.sizes.join(","));
  if (f.lengths?.length) sp.set("length", f.lengths.map((l) => l.toLowerCase()).join(","));
  if (f.minPrice) sp.set("min", f.minPrice);
  if (f.maxPrice) sp.set("max", f.maxPrice);
  if (f.inStock) sp.set("stock", "1");
  if (f.onSale) sp.set("sale", "1");
  if (f.isNew) sp.set("new", "1");
  if (f.sort && f.sort !== "featured" && !(f.sort === "relevance" && f.q)) sp.set("sort", f.sort);
  if (f.page && f.page > 1) sp.set("page", String(f.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: CatalogFilters): boolean {
  return Boolean(f.colors.length || f.sizes.length || f.lengths.length || f.minPrice || f.maxPrice || f.inStock || f.onSale);
}
