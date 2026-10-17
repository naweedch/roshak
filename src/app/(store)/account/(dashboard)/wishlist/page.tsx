import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { requireCustomer } from "@/server/auth/current";
import { getWishlistProducts } from "@/server/services/customer";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("علاقه‌مندی‌ها");

export default function WishlistPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-burgundy">علاقه‌مندی‌ها</h1>
      <Suspense fallback={<div className="skeleton mt-8 h-96 rounded-2xl" />}>
        <Wishlist />
      </Suspense>
    </>
  );
}

async function Wishlist() {
  await connection();
  const session = await requireCustomer("/account/wishlist");
  const items = await getWishlistProducts(session.user.id);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-7" />}
        title="فهرست علاقه‌مندی خالی است"
        description="با زدن نماد قلب روی هر لباس، آن را برای بعد ذخیره کنید."
        action={
          <Button asChild>
            <Link href="/shop">مشاهدهٔ لباس‌ها</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
