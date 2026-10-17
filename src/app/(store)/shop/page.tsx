import { Suspense } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton } from "@/components/store/catalog-view";
import { getCategories } from "@/server/queries/public";
import { CatalogHeader, CatalogResults, catalogMetadata, type SearchParams } from "./_catalog";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const category = categorySlug ? (await getCategories()).find((c) => c.slug === categorySlug) : undefined;
  return catalogMetadata(searchParams, {
    title: category?.seoTitle ?? category?.name ?? "همهٔ لباس‌ها",
    description: category?.seoDescription ?? category?.description ?? "لباس شب، پیراهن مجلسی، لباس نامزدی و جامپسوت رسمی روشاک با امکان فیلتر بر اساس رنگ، سایز، قد و قیمت.",
    basePath: category ? `/shop?category=${category.slug}` : "/shop",
  });
}

export default function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <Suspense fallback={<CatalogSkeleton />}>
        <ShopContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ShopContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const categories = await getCategories();
  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  return (
    <>
      <CatalogHeader title={category?.name ?? "همهٔ لباس‌ها"} description={category?.description ?? "هر طرح را با رنگ، سایز و قد دلخواه پیدا کنید."}>
        <Breadcrumbs items={category ? [{ name: "فروشگاه", path: "/shop" }, { name: category.name, path: `/shop?category=${category.slug}` }] : [{ name: "فروشگاه", path: "/shop" }]} />
      </CatalogHeader>
      <nav aria-label="دسته‌ها" className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Link href="/shop" aria-current={!category ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${!category ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40"}`}>
          همه
        </Link>
        {categories.map((c) => (
          <Link key={c.slug}
            href={`/shop?category=${c.slug}`}
            aria-current={c.slug === category?.slug ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${c.slug === category?.slug ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40"}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <CatalogResults searchParams={searchParams} basePath="/shop" />
    </>
  );
}
