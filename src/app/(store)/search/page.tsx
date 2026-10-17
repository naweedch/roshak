import { Suspense } from "react";
import { after, connection } from "next/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton, CatalogView } from "@/components/store/catalog-view";
import { parseCatalogParams } from "@/lib/validation/catalog";
import { getCatalogPage, getFacets } from "@/server/queries/public";
import { logSearch } from "@/server/services/catalog";
import { pageMetadata } from "@/server/seo";
import type { SearchParams } from "../shop/_catalog";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  // صفحات نتایج جست‌وجو ایندکس نمی‌شوند
  return pageMetadata({ title: q ? `جست‌وجو: ${q}` : "جست‌وجو", path: "/search", noindex: true });
}

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <Suspense fallback={<CatalogSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  // نتایج و ثبت جست‌وجو فقط هنگام درخواست
  await connection();
  const filters = parseCatalogParams(await searchParams);
  const [page, facets] = await Promise.all([getCatalogPage(filters), getFacets(filters)]);
  // ثبت ناشناس عبارت جست‌وجو برای تحلیل (پس از ارسال پاسخ)
  if (filters.q && filters.page === 1) {
    const term = filters.q;
    after(() => logSearch(term, page.total).catch(() => undefined));
  }
  return (
    <>
      <Breadcrumbs items={[{ name: "جست‌وجو", path: "/search" }]} />
      <header className="mb-10 mt-6">
        <h1 className="font-display text-5xl text-burgundy">{filters.q ? `نتایج «${filters.q}»` : "جست‌وجو"}</h1>
        <form action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="search-q" className="sr-only">
            عبارت جست‌وجو
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="نام لباس، رنگ یا پارچه"
            className="h-12 min-w-0 flex-1 rounded-full border border-line-strong/70 bg-surface-raised px-5 outline-none focus:border-burgundy focus:ring-4 focus:ring-burgundy/10"
          />
          <button type="submit" className="h-12 shrink-0 rounded-full bg-burgundy px-6 text-ivory hover:bg-burgundy-deep">
            جست‌وجو
          </button>
        </form>
      </header>
      <CatalogView basePath="/search" filters={filters} page={page} facets={facets} allowRelevance emptyTitle={filters.q ? `نتیجه‌ای برای «${filters.q}» پیدا نشد` : "عبارتی برای جست‌وجو وارد کنید"} />
    </>
  );
}
