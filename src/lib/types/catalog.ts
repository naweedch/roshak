/** ساختارهای داده‌ای کاتالوگ که از سرور به کامپوننت‌ها منتقل می‌شوند (همه قابل سریال‌سازی) */
import type { CollectionType, ColorFamily, DressLength, ImageKind } from "@/generated/prisma/enums";
import type { StockLevel } from "../commerce/inventory";

export interface ImageDTO {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface ColorDTO {
  id: string;
  slug: string;
  name: string;
  hex: string;
  family: ColorFamily;
}

export interface SizeDTO {
  id: string;
  label: string;
}

export interface ProductCardDTO {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  categoryName: string;
  currency: string;
  price: string;
  salePrice: string | null;
  isNew: boolean;
  image: ImageDTO | null;
  hoverImage: ImageDTO | null;
  colors: Array<Pick<ColorDTO, "slug" | "name" | "hex">>;
  available: boolean;
  ratingAverage: string | null;
  reviewCount: number;
}

export interface VariantDTO {
  id: string;
  sku: string;
  colorId: string;
  sizeId: string;
  /** حداکثر تعداد قابل خرید در یک سفارش (صفر یعنی ناموجود) */
  maxQuantity: number;
  stockLevel: StockLevel;
}

export interface ProductImageDTO extends ImageDTO {
  id: string;
  colorId: string | null;
  kind: ImageKind;
}

export interface SizeGuideRow {
  size: string;
  bust: number;
  waist: number;
  hips: number;
  length?: number;
}

export interface SizeGuideDTO {
  name: string;
  description: string | null;
  rows: SizeGuideRow[];
}

export interface ProductDetailDTO extends ProductCardDTO {
  description: string;
  fabric: string | null;
  careInstructions: string | null;
  modelInfo: string | null;
  length: DressLength | null;
  category: { slug: string; name: string };
  images: ProductImageDTO[];
  view360: ProductImageDTO[];
  model3dUrl: string | null;
  sizeGuide: SizeGuideDTO | null;
  variants: VariantDTO[];
  colorOptions: ColorDTO[];
  sizeOptions: SizeDTO[];
  collections: Array<{ slug: string; name: string }>;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export interface CollectionDTO {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  type: CollectionType;
  coverImage: ImageDTO | null;
  accentColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  productCount: number;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: ImageDTO | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface CatalogPage {
  items: ProductCardDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface FacetOptions {
  colors: Array<ColorDTO & { count: number }>;
  sizes: Array<SizeDTO & { count: number }>;
  lengths: Array<{ value: DressLength; count: number }>;
  priceRange: { min: string; max: string } | null;
  currency: string;
}
