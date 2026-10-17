"use client";

import Link from "next/link";
import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { toPersianDigits } from "@/lib/persian";
import { CartLineList, CartTotals, DiscountForm, FreeShippingProgress } from "./cart-lines";
import { useStore } from "./store-provider";

/** کشوی سبد خرید؛ هنگام باز شدن آخرین وضعیت سبد از سرور خوانده می‌شود */
export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, loadCart, cartLoading } = useStore();

  React.useEffect(() => {
    if (cartOpen) void loadCart();
  }, [cartOpen, loadCart]);

  const empty = cart && cart.items.length === 0;

  return (
    <Dialog open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="left" title="سبد خرید" description={cart && cart.itemCount ? `${toPersianDigits(cart.itemCount)} کالا` : undefined}>
        {!cart && cartLoading ? (
          <div className="space-y-5 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-32 w-24" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : empty || !cart ? (
          <EmptyState
            icon={<ShoppingBag className="size-7" />}
            title="سبد خرید خالی است"
            description="لباس‌های تازهٔ روشاک را ببینید و هر کدام را پسندیدید، با انتخاب رنگ و سایز به سبد اضافه کنید."
            action={
              <Button asChild onClick={() => setCartOpen(false)}>
                <Link href="/shop">مشاهدهٔ لباس‌ها</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              <div className="pt-4">
                <FreeShippingProgress cart={cart} />
              </div>
              <CartLineList cart={cart} compact />
            </div>
            <div className="space-y-4 border-t border-line bg-ivory px-6 py-5">
              <DiscountForm cart={cart} />
              <CartTotals cart={cart} />
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" onClick={() => setCartOpen(false)}>
                  <Link href="/cart">مشاهدهٔ سبد</Link>
                </Button>
                {cart.hasIssues ? (
                  <Button disabled title="ابتدا مشکل اقلام ناموجود را برطرف کنید">
                    ادامهٔ خرید
                  </Button>
                ) : (
                  <Button asChild onClick={() => setCartOpen(false)}>
                    <Link href="/checkout">ادامهٔ خرید</Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
