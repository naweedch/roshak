/**
 * ابزار مشترک صفحات فهرست محصولات (فروشگاه، تازه‌ها، حراج، پرفروش‌ها، مجموعه‌ها).
 */
import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { hasActiveFilters, parseCatalogParams, type CatalogFilters } from "@/lib/validation/catalog";
import { toPersianDigits } from "@/lib/persian";
import { getCatalogPage, getFacets } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function catalogMetadata(
  searchParams: SearchParams,
  input: { title: string; description: string; basePath: string; defaults?: Partial<CatalogFilters>; image?: string | null },
): Promise<Metadata> {
  const filters = parseCatalogParams(await searchParams, input.defaults);
  const filtered = hasActiveFilters(filters) || Boolean(filters.q);
  const path = filters.page > 1 && !filtered ? `${input.basePath}?page=${filters.page}` : input.basePath;
  const meta = await pageMetadata({
    title: filters.page > 1 ? `${input.title} — صفحهٔ ${toPersianDigits(filters.page)}` : input.title,
    description: input.description,
    path,
    image: input.image,
    // ترکیب‌های فیلتر ایندکس نمی‌شوند تا صفحات تکراری در نتایج جست‌وجو ایجاد نشود
    noindex: filtered,
  });
  return meta;
}

export async function CatalogResults({
  searchParams,
  basePath,
  defaults,
  lockedOnSale,
  lockedNew,
  allowRelevance,
  emptyTitle,
}: {
  searchParams: SearchParams;
  basePath: string;
  defaults?: Partial<CatalogFilters>;
  lockedOnSale?: boolean;
  lockedNew?: boolean;
  allowRelevance?: boolean;
  emptyTitle?: string;
}) {
  const filters = parseCatalogParams(await searchParams, defaults);
  const [page, facets] = await Promise.all([getCatalogPage(filters), getFacets(filters)]);
  return (
    <CatalogView
      basePath={basePath}
      filters={filters}
      page={page}
      facets={facets}
      lockedOnSale={lockedOnSale}
      lockedNew={lockedNew}
      allowRelevance={allowRelevance}
      emptyTitle={emptyTitle}
    />
  );
}

export function CatalogHeader({ title, description, children }: { title: string; description?: string | null; children?: React.ReactNode }) {
  return (
    <header className="mb-10">
      {children}
      <h1 className="mt-6 font-display text-5xl text-burgundy sm:text-6xl">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-lg text-ink-muted">{description}</p> : null}
    </header>
  );
}
