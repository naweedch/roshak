"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useStore } from "./store-provider";

/** دکمهٔ علاقه‌مندی با وضعیت aria-pressed و ریزتعامل قلب */
export function WishlistButton({
  productId,
  productName,
  className,
  variant = "floating",
}: {
  productId: string;
  productName: string;
  className?: string;
  variant?: "floating" | "inline";
}) {
  const { wishlist, toggleWishlist } = useStore();
  const reduce = useReducedMotion();
  const active = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(productId, productName);
      }}
      aria-pressed={active}
      aria-label={active ? `حذف «${productName}» از علاقه‌مندی‌ها` : `افزودن «${productName}» به علاقه‌مندی‌ها`}
      className={cn(
        "grid place-items-center rounded-full transition-colors duration-300",
        variant === "floating"
          ? "size-10 bg-ivory/85 text-burgundy shadow-soft backdrop-blur hover:bg-ivory"
          : "size-12 border border-burgundy/30 text-burgundy hover:border-burgundy",
        className,
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="size-5"
        aria-hidden
        animate={reduce ? undefined : { scale: active ? [1, 1.28, 1] : 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <path
          d="M12 20.3s-7.3-4.4-9.2-9.1C1.5 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.4 4.2 6.7-1.9 4.7-9.2 9.1-9.2 9.1Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </motion.svg>
    </button>
  );
}
