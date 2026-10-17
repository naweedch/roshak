import Link from "next/link";
import { SearchX } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { CatalogPage, FacetOptions } from "@/lib/types/catalog";
import { catalogQueryString, hasActiveFilters, type CatalogFilters } from "@/lib/validation/catalog";
import { CatalogSidebar, CatalogToolbar } from "./catalog-filters";
import { Pagination } from "./pagination";
import { ProductCard, ProductCardSkeleton } from "./product-card";

interface CatalogViewProps {
  basePath: string;
  filters: CatalogFilters;
  page: CatalogPage;
  facets: FacetOptions;
  lockedOnSale?: boolean;
  lockedNew?: boolean;
  allowRelevance?: boolean;
  emptyTitle?: string;
}

/** شبکهٔ محصولات + فیلتر + صفحه‌بندی؛ مشترک برای فروشگاه، مجموعه‌ها و نتایج جست‌وجو */
export function CatalogView({ basePath, filters, page, facets, lockedOnSale, lockedNew, allowRelevance, emptyTitle }: CatalogViewProps) {
  const filtered = hasActiveFilters(filters);
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr] xl:grid-cols-[17rem_1fr]">
      <CatalogSidebar filters={filters} facets={facets} total={page.total} lockedOnSale={lockedOnSale} lockedNew={lockedNew} />
      <div className="min-w-0">
        <CatalogToolbar filters={filters} facets={facets} total={page.total} lockedOnSale={lockedOnSale} lockedNew={lockedNew} allowRelevance={allowRelevance} />
        {page.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title={emptyTitle ?? "لباسی با این مشخصات پیدا نشد"}
            description={filtered ? "بعضی فیلترها را بردارید یا محدودهٔ قیمت را گسترده‌تر کنید." : "به‌زودی طرح‌های تازه به این بخش اضافه می‌شود."}
            action={
              filtered ? (
                <Button asChild variant="secondary">
                  <Link href={basePath}>حذف همهٔ فیلترها</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/shop">مشاهدهٔ همهٔ لباس‌ها</Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">
            {page.items.map((product, i) => (
              <Reveal as="li" key={product.id} delay={Math.min(i % 6, 5) * 0.06}>
                <ProductCard product={product} priority={page.page === 1 && i < 3} />
              </Reveal>
            ))}
          </ul>
        )}
        <Pagination page={page.page} pageCount={page.pageCount} hrefFor={(p) => `${basePath}${catalogQueryString(filters, { page: p, onSale: lockedOnSale ? false : filters.onSale, isNew: lockedNew ? false : filters.isNew })}`} />
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr] xl:grid-cols-[17rem_1fr]" aria-busy aria-label="در حال بارگذاری لباس‌ها">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-8 rounded-full" />
        ))}
      </div>
      <div>
        <div className="skeleton h-14 rounded-2xl" />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
