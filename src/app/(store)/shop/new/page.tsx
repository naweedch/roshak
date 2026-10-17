import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton } from "@/components/store/catalog-view";
import { CatalogHeader, CatalogResults, catalogMetadata, type SearchParams } from "../_catalog";

const DEFAULTS = { isNew: true, sort: "newest" as const };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return catalogMetadata(searchParams, {
    title: "تازه‌های روشاک",
    description: "جدیدترین لباس‌های شب و مجلسی روشاک که در هفته‌های اخیر به فروشگاه اضافه شده‌اند.",
    basePath: "/shop/new",
    defaults: DEFAULTS,
  });
}

export default function NewArrivalsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <CatalogHeader title="تازه‌ها" description="طرح‌هایی که به‌تازگی به ویترین روشاک اضافه شده‌اند.">
        <Breadcrumbs items={[{ name: "فروشگاه", path: "/shop" }, { name: "تازه‌ها", path: "/shop/new" }]} />
      </CatalogHeader>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults searchParams={searchParams} basePath="/shop/new" defaults={DEFAULTS} lockedNew emptyTitle="فعلاً طرح تازه‌ای منتشر نشده است" />
      </Suspense>
    </div>
  );
}
