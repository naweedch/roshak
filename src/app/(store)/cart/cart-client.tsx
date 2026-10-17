"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartLineList, CartTotals, DiscountForm, FreeShippingProgress } from "@/components/store/cart-lines";
import { useStore } from "@/components/store/store-provider";
import { ClientProductCard } from "@/components/store/client-product-card";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api-client";
import type { ProductCardDTO } from "@/lib/types/catalog";

/** صفحهٔ کامل سبد خرید با پیشنهاد محصولات مکمل (از همان دسته/مجموعه‌های اقلام سبد) */
export function CartPageClient() {
  const { cart, loadCart, cartLoading } = useStore();
  const [suggestions, setSuggestions] = React.useState<ProductCardDTO[]>([]);

  React.useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const firstSlug = cart?.items[0]?.slug;
  React.useEffect(() => {
    if (!firstSlug) return;
    const controller = new AbortController();
    api<{ items: ProductCardDTO[] }>(`/api/v1/products/${encodeURIComponent(firstSlug)}/related`, { signal: controller.signal })
      .then((r) => setSuggestions(r.items.filter((p) => !cart?.items.some((i) => i.productId === p.id)).slice(0, 4)))
      .catch(() => {});
    return () => controller.abort();
  }, [firstSlug, cart?.items]);

  if (!cart && cartLoading) {
    return (
      <div className="mt-10 space-y-4" aria-busy>
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="سبد خرید شما خالی است"
        description="هر لباسی را که پسندیدید، با انتخاب رنگ و سایز به سبد اضافه کنید."
        action={
          <Button asChild>
            <Link href="/shop">مشاهدهٔ لباس‌ها</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          <FreeShippingProgress cart={cart} />
          <CartLineList cart={cart} />
        </div>
        <aside className="h-fit space-y-5 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6 lg:sticky lg:top-28" aria-label="خلاصهٔ سفارش">
          <DiscountForm cart={cart} />
          <CartTotals cart={cart} />
          {cart.hasIssues ? (
            <p role="alert" className="rounded-2xl bg-warning-soft p-3 text-sm text-warning">
              برخی اقلام سبد ناموجود هستند یا موجودی کافی ندارند؛ برای ادامه آن‌ها را اصلاح کنید.
            </p>
          ) : null}
          {cart.hasIssues ? (
            <Button className="w-full" size="lg" disabled>
              ادامهٔ فرایند خرید
            </Button>
          ) : (
            <Button asChild className="w-full" size="lg">
              <Link href="/checkout">ادامهٔ فرایند خرید</Link>
            </Button>
          )}
          <Link href="/shop" className="block text-center text-sm text-burgundy underline-offset-[6px] hover:underline">
            ادامهٔ خرید از فروشگاه
          </Link>
        </aside>
      </div>
      {suggestions.length ? (
        <section aria-labelledby="complements-title" className="mt-24">
          <h2 id="complements-title" className="font-display text-3xl text-burgundy">
            همراه با سبد شما
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {suggestions.map((p) => (
              <li key={p.id}>
                <ClientProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
