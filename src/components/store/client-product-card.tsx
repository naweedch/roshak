"use client";

/** نسخهٔ کلاینتی کارت محصول برای فهرست‌هایی که در مرورگر بارگذاری می‌شوند (همان ظاهر کارت سروری) */
import { ProductCard } from "./product-card";
import type { ProductCardDTO } from "@/lib/types/catalog";

export function ClientProductCard({ product }: { product: ProductCardDTO }) {
  return <ProductCard product={product} />;
}
