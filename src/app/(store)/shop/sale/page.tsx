import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton } from "@/components/store/catalog-view";
import { CatalogHeader, CatalogResults, catalogMetadata, type SearchParams } from "../_catalog";

const DEFAULTS = { onSale: true };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return catalogMetadata(searchParams, {
    title: "حراج لباس مجلسی",
    description: "لباس‌های شب و مجلسی روشاک با قیمت ویژه؛ تا پایان موجودی.",
    basePath: "/shop/sale",
    defaults: DEFAULTS,
  });
}

export default function SalePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <CatalogHeader title="حراج" description="طرح‌هایی که اکنون با قیمت ویژه عرضه می‌شوند.">
        <Breadcrumbs items={[{ name: "فروشگاه", path: "/shop" }, { name: "حراج", path: "/shop/sale" }]} />
      </CatalogHeader>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults searchParams={searchParams} basePath="/shop/sale" defaults={DEFAULTS} lockedOnSale emptyTitle="در حال حاضر حراجی فعال نیست" />
      </Suspense>
    </div>
  );
}
