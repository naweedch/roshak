import { privateMetadata } from "@/server/seo";
import { CartPageClient } from "./cart-client";

export const metadata = privateMetadata("سبد خرید");

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-10 sm:px-8">
      <h1 className="font-display text-5xl text-burgundy">سبد خرید</h1>
      <CartPageClient />
    </div>
  );
}
