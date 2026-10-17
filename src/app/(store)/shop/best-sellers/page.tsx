import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton } from "@/components/store/catalog-view";
import { FormMessage } from "@/components/ui/form";
import { getSalesSignal } from "@/server/queries/public";
import { CatalogHeader, CatalogResults, catalogMetadata, type SearchParams } from "../_catalog";

const DEFAULTS = { sort: "popular" as const };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return catalogMetadata(searchParams, {
    title: "پرفروش‌ترین لباس‌ها",
    description: "لباس‌های شب و مجلسی روشاک که بیشترین سفارش را داشته‌اند.",
    basePath: "/shop/best-sellers",
    defaults: DEFAULTS,
  });
}

export default function BestSellersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <CatalogHeader title="پرفروش‌ها" description="ترتیب بر اساس تعداد فروش ثبت‌شده در فروشگاه.">
        <Breadcrumbs items={[{ name: "فروشگاه", path: "/shop" }, { name: "پرفروش‌ها", path: "/shop/best-sellers" }]} />
      </CatalogHeader>
      <Suspense fallback={<CatalogSkeleton />}>
        <SalesNotice />
        <CatalogResults searchParams={searchParams} basePath="/shop/best-sellers" defaults={DEFAULTS} />
      </Suspense>
    </div>
  );
}

/** تا وقتی فروش کافی ثبت نشده، صادقانه اعلام می‌شود که ترتیب بر اساس فروش واقعی نیست */
async function SalesNotice() {
  // داده‌ها فقط هنگام درخواست خوانده می‌شوند (build به پایگاه داده نیاز ندارد)
  await connection();
  const productsWithSales = await getSalesSignal();
  if (productsWithSales >= 4) return null;
  return (
    <FormMessage tone="info" className="mb-6">
      هنوز آمار فروش کافی برای رتبه‌بندی ثبت نشده است؛ فعلاً لباس‌ها به ترتیب جدیدترین نمایش داده می‌شوند.
    </FormMessage>
  );
}
