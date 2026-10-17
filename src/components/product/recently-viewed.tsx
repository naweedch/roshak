"use client";

/**
 * بازدیدهای اخیر: شناسهٔ محصولات در حافظهٔ مرورگر نگه داشته می‌شود و اطلاعات به‌روز
 * (قیمت، موجودی) از API خوانده می‌شود.
 */
import * as React from "react";
import { api } from "@/lib/api-client";
import type { ProductCardDTO } from "@/lib/types/catalog";
import { ClientProductCard } from "@/components/store/client-product-card";

const KEY = "rsk_recently_viewed";
const MAX = 12;

function read(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function RecentlyViewed({ currentId }: { currentId: string }) {
  const [items, setItems] = React.useState<ProductCardDTO[]>([]);

  React.useEffect(() => {
    const previous = read().filter((id) => id !== currentId);
    try {
      window.localStorage.setItem(KEY, JSON.stringify([currentId, ...previous].slice(0, MAX)));
    } catch {
      // حافظهٔ مرورگر در دسترس نیست
    }
    if (previous.length === 0) return;
    const controller = new AbortController();
    api<{ items: ProductCardDTO[] }>(`/api/v1/products?ids=${previous.slice(0, 4).join(",")}`, { signal: controller.signal })
      .then((r) => setItems(r.items))
      .catch(() => {});
    return () => controller.abort();
  }, [currentId]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recent-title" className="mt-24">
      <h2 id="recent-title" className="font-display text-3xl text-burgundy">
        بازدیدهای اخیر شما
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <ClientProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
