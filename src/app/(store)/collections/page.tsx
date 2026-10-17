import { Suspense } from "react";
import { connection } from "next/server";
import { CollectionTile } from "@/components/home/featured-collections";
import { Reveal } from "@/components/motion/reveal";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { COLLECTION_TYPE_LABELS } from "@/lib/labels";
import type { CollectionType } from "@/generated/prisma/enums";
import { getCollections } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  await connection();
  return pageMetadata({
    title: "مجموعه‌های روشاک",
    description: "کمپین‌ها، کالکشن‌های فصلی و مجموعه‌های مناسبتی روشاک؛ از شب‌های یلدا تا مهمانی عروسی و نامزدی.",
    path: "/collections",
  });
}

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <Breadcrumbs items={[{ name: "مجموعه‌ها", path: "/collections" }]} />
      <h1 className="mt-6 font-display text-5xl text-burgundy sm:text-6xl">مجموعه‌ها</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">هر مجموعه برای یک حال‌وهوا و یک شب خاص طراحی شده است.</p>
      <Suspense fallback={<div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="arch-3-4 skeleton aspect-[3/4]" />)}</div>}>
        <CollectionsGrid />
      </Suspense>
    </div>
  );
}

async function CollectionsGrid() {
  await connection();
  // مجموعه‌های بدون محصول منتشرشده در ویترین نمایش داده نمی‌شوند
  const collections = (await getCollections()).filter((c) => c.productCount > 0);
  const order: CollectionType[] = ["CAMPAIGN", "SEASON", "OCCASION", "CURATED"];
  const groups = order.map((type) => ({ type, items: collections.filter((c) => c.type === type) })).filter((g) => g.items.length);
  return (
    <div className="mt-14 space-y-20">
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`group-${group.type}`}>
          <h2 id={`group-${group.type}`} className="font-display text-3xl text-ink">
            {group.type === "OCCASION" ? "برای هر مناسبت" : group.type === "CAMPAIGN" ? "کمپین‌ها" : group.type === "SEASON" ? "کالکشن‌های فصلی" : COLLECTION_TYPE_LABELS[group.type]}
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
            {group.items.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={i * 0.06}>
                <CollectionTile collection={c} />
              </Reveal>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
