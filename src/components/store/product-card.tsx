import Image from "next/image";
import Link from "next/link";
import type { ProductCardDTO } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";
import { Badge, RatingStars } from "@/components/ui/misc";
import { Price } from "./price";
import { WishlistButton } from "./wishlist-button";

const CARD_SIZES = "(min-width: 1280px) 23vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw";

/**
 * کارت محصول با قاب طاق‌نما. با هاور (یا فوکوس کیبورد) تصویر دوم با محوشدگی نمایش داده می‌شود.
 * وضعیت موجودی با متن اعلام می‌شود، نه فقط با رنگ.
 */
export function ProductCard({ product, priority = false, className }: { product: ProductCardDTO; priority?: boolean; className?: string }) {
  const href = `/products/${product.slug}`;
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative">
        <Link
          href={href}
          className="arch-3-4 relative block aspect-[3/4] overflow-hidden bg-ivory-deep outline-offset-4"
          aria-label={`${product.name}، ${product.subtitle ?? product.categoryName}`}
        >
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt}
              fill
              sizes={CARD_SIZES}
              priority={priority}
              quality={75}
              className="object-cover transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-silk)] group-hover:scale-[1.04] motion-reduce:transition-none"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-ink-soft">تصویر به‌زودی</span>
          )}
          {product.hoverImage ? (
            <Image
              src={product.hoverImage.url}
              alt=""
              aria-hidden
              fill
              sizes={CARD_SIZES}
              quality={75}
              loading="lazy"
              className="object-cover opacity-0 transition-opacity duration-700 ease-[var(--ease-silk)] group-focus-within:opacity-100 group-hover:opacity-100"
            />
          ) : null}
          <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-l from-transparent via-champagne/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </Link>
        <div className="absolute start-3 top-[18%] flex flex-col items-start gap-1.5">
          {!product.available ? <Badge tone="neutral">ناموجود</Badge> : null}
          {product.available && product.isNew ? <Badge tone="champagne">تازه</Badge> : null}
        </div>
        <WishlistButton productId={product.id} productName={product.name} className="absolute end-3 top-[18%]" />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">{product.categoryName}</p>
          {product.colors.length ? (
            <ul className="flex items-center gap-1" aria-label={`رنگ‌ها: ${product.colors.map((c) => c.name).join("، ")}`}>
              {product.colors.slice(0, 4).map((c) => (
                <li key={c.slug} className="size-3 rounded-full border border-ink/15" style={{ backgroundColor: c.hex }} aria-hidden />
              ))}
              {product.colors.length > 4 ? <li className="text-[0.65rem] text-ink-muted">+{toPersianDigits(product.colors.length - 4)}</li> : null}
            </ul>
          ) : null}
        </div>
        <h3 className="font-display text-xl leading-snug text-ink">
          <Link href={href} className="transition-colors hover:text-burgundy">
            {product.name}
          </Link>
        </h3>
        {product.subtitle ? <p className="line-clamp-1 text-sm text-ink-muted">{product.subtitle}</p> : null}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <Price price={product.price} salePrice={product.salePrice} currency={product.currency} size="sm" />
          {product.ratingAverage && product.reviewCount > 0 ? <RatingStars value={Number(product.ratingAverage)} count={product.reviewCount} /> : null}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <div className="arch-3-4 skeleton aspect-[3/4]" />
      <div className="mt-4 space-y-2 px-1">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-5 w-2/3 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
