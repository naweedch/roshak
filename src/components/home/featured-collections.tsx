import Image from "next/image";
import Link from "next/link";
import type { CollectionDTO } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";
import { Reveal } from "@/components/motion/reveal";
import { accentClasses } from "@/lib/accent";

/** چیدمان مجله‌ای مجموعه‌های منتخب: یک قاب بلند و دو قاب کنار آن */
export function FeaturedCollections({ collections }: { collections: CollectionDTO[] }) {
  const items = collections.slice(0, 3);
  if (items.length === 0) return null;
  const [lead, ...rest] = items;

  return (
    <section id="home-collections" aria-labelledby="collections-title" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-24 sm:px-8 lg:py-32">
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:pt-16">
          <h2 id="collections-title" className="font-display text-4xl text-burgundy sm:text-5xl">
            مجموعه‌های فصل
          </h2>
          <p className="mt-5 max-w-sm text-ink-muted">
            هر مجموعه داستان یک شب است؛ از مخمل‌های عمیق یلدا تا ساتن‌های روشن مهمانی‌های عروسی.
          </p>
          <Link href="/collections" className="mt-8 inline-flex text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
            همهٔ مجموعه‌ها
          </Link>
        </div>

        <Reveal className="lg:col-span-5">
          <CollectionTile collection={lead} large />
        </Reveal>

        <div className="grid gap-10 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1 lg:pt-28">
          {rest.map((c, i) => (
            <Reveal key={c.slug} delay={0.12 * (i + 1)}>
              <CollectionTile collection={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CollectionTile({ collection, large = false }: { collection: CollectionDTO; large?: boolean }) {
  const accent = accentClasses(collection.accentColor);
  return (
    <Link href={`/collections/${collection.slug}`} className="group block">
      <div className={cn("arch-3-4 relative aspect-[3/4] overflow-hidden", accent.bg)}>
        {collection.coverImage ? (
          <Image
            src={collection.coverImage.url}
            alt={collection.coverImage.alt}
            fill
            sizes={large ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 24vw, 45vw"}
            className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-silk)] group-hover:scale-[1.05]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
          {collection.subtitle ? <p className={cn("text-xs", accent.textOnDark)}>{collection.subtitle}</p> : null}
          <h3 className={cn("font-display text-ivory", large ? "text-4xl" : "text-2xl")}>{collection.name}</h3>
          <p className="mt-1 text-xs text-ivory/70">{toPersianDigits(collection.productCount)} طرح</p>
        </div>
      </div>
      {large && collection.description ? <p className="mt-4 max-w-md text-sm text-ink-muted">{collection.description}</p> : null}
    </Link>
  );
}
