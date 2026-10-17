"use client";

/**
 * فیلترها و مرتب‌سازی فهرست محصولات. وضعیت کامل در URL نگه داشته می‌شود
 * (قابل اشتراک‌گذاری، قابل بازگشت با دکمهٔ Back) و داده‌ها در سرور از دیتابیس فیلتر می‌شوند.
 */
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { DressLength } from "@/generated/prisma/enums";
import type { FacetOptions } from "@/lib/types/catalog";
import { catalogQueryString, SORT_LABELS, SORT_OPTIONS, type CatalogFilters, type CatalogSort } from "@/lib/validation/catalog";
import { DRESS_LENGTH_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { toEnglishDigits, toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  filters: CatalogFilters;
  facets: FacetOptions;
  total: number;
  /** فیلترهایی که توسط مسیر تعیین شده‌اند و نباید قابل حذف باشند (مثلاً «حراج» در /shop/sale) */
  lockedOnSale?: boolean;
  lockedNew?: boolean;
  allowRelevance?: boolean;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function CatalogToolbar({ filters, facets, total, lockedOnSale, lockedNew, allowRelevance }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const navigate = React.useCallback(
    (overrides: Partial<CatalogFilters>) => {
      const next: CatalogFilters = { ...filters, ...overrides, page: overrides.page ?? 1 };
      const qs = catalogQueryString({
        ...next,
        onSale: lockedOnSale ? false : next.onSale,
        isNew: lockedNew ? false : next.isNew,
        category: next.category,
      });
      startTransition(() => router.push(`${pathname}${qs}`, { scroll: false }));
    },
    [filters, lockedNew, lockedOnSale, pathname, router],
  );

  const activeChips: Array<{ key: string; label: string; remove: () => void }> = [
    ...filters.colors.map((slug) => ({
      key: `c-${slug}`,
      label: facets.colors.find((c) => c.slug === slug)?.name ?? slug,
      remove: () => navigate({ colors: filters.colors.filter((c) => c !== slug) }),
    })),
    ...filters.sizes.map((size) => ({ key: `s-${size}`, label: `سایز ${toPersianDigits(size)}`, remove: () => navigate({ sizes: filters.sizes.filter((s) => s !== size) }) })),
    ...filters.lengths.map((l) => ({ key: `l-${l}`, label: DRESS_LENGTH_LABELS[l], remove: () => navigate({ lengths: filters.lengths.filter((x) => x !== l) }) })),
    ...(filters.minPrice || filters.maxPrice
      ? [
          {
            key: "price",
            label: `قیمت ${filters.minPrice ? `از ${formatMoney(filters.minPrice, facets.currency, { withUnit: false })}` : ""} ${filters.maxPrice ? `تا ${formatMoney(filters.maxPrice, facets.currency, { withUnit: false })}` : ""}`.trim(),
            remove: () => navigate({ minPrice: undefined, maxPrice: undefined }),
          },
        ]
      : []),
    ...(filters.inStock ? [{ key: "stock", label: "فقط موجود", remove: () => navigate({ inStock: false }) }] : []),
    ...(filters.onSale && !lockedOnSale ? [{ key: "sale", label: "تخفیف‌دار", remove: () => navigate({ onSale: false }) }] : []),
  ];

  const sortOptions = SORT_OPTIONS.filter((s) => s !== "relevance" || allowRelevance);

  return (
    <div className="flex flex-col gap-4 border-y border-line py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
            <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)} className="lg:hidden" aria-expanded={sheetOpen}>
              <SlidersHorizontal />
              فیلترها
              {activeChips.length ? <span className="tabular">({toPersianDigits(activeChips.length)})</span> : null}
            </Button>
            <SheetContent side="bottom" title="فیلتر لباس‌ها" className="lg:hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <FilterPanel filters={filters} facets={facets} navigate={navigate} lockedOnSale={lockedOnSale} />
              </div>
              <div className="border-t border-line p-4">
                <Button className="w-full" onClick={() => setSheetOpen(false)}>
                  نمایش {toPersianDigits(total)} لباس
                </Button>
              </div>
            </SheetContent>
          </Dialog>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {pending ? "در حال به‌روزرسانی..." : `${toPersianDigits(total)} لباس`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">مرتب‌سازی:</span>
          <select
            value={filters.sort}
            onChange={(e) => navigate({ sort: e.target.value as CatalogSort })}
            className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm outline-none focus:border-burgundy"
          >
            {sortOptions.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {activeChips.length ? (
        <ul className="flex flex-wrap items-center gap-2" aria-label="فیلترهای فعال">
          {activeChips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.remove}
                className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/[0.07] px-3 py-1 text-xs text-burgundy hover:bg-burgundy/15"
                aria-label={`حذف فیلتر ${chip.label}`}
              >
                {chip.label}
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => navigate({ colors: [], sizes: [], lengths: [], minPrice: undefined, maxPrice: undefined, inStock: false, onSale: false })}
              className="text-xs text-ink-muted underline underline-offset-4 hover:text-burgundy"
            >
              پاک کردن همه
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

/** پنل فیلتر (ستون کناری در دسکتاپ و کشوی پایینی در موبایل) */
export function CatalogSidebar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = React.useTransition();
  const navigate = React.useCallback(
    (overrides: Partial<CatalogFilters>) => {
      const next = { ...props.filters, ...overrides, page: 1 };
      const qs = catalogQueryString({ ...next, onSale: props.lockedOnSale ? false : next.onSale, isNew: props.lockedNew ? false : next.isNew });
      startTransition(() => router.push(`${pathname}${qs}`, { scroll: false }));
    },
    [props.filters, props.lockedNew, props.lockedOnSale, pathname, router],
  );
  return (
    <aside aria-label="فیلترها" className="hidden lg:block">
      <FilterPanel filters={props.filters} facets={props.facets} navigate={navigate} lockedOnSale={props.lockedOnSale} />
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5 first:pt-0">
      <legend className="mb-3 font-display text-lg text-burgundy">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterPanel({
  filters,
  facets,
  navigate,
  lockedOnSale,
}: {
  filters: CatalogFilters;
  facets: FacetOptions;
  navigate: (o: Partial<CatalogFilters>) => void;
  lockedOnSale?: boolean;
}) {
  const [min, setMin] = React.useState(filters.minPrice ?? "");
  const [max, setMax] = React.useState(filters.maxPrice ?? "");
  // همگام‌سازی ورودی‌ها با فیلتر نشانی (مثلاً پس از «پاک کردن فیلترها») در همان رندر
  const [prevRange, setPrevRange] = React.useState({ min: filters.minPrice, max: filters.maxPrice });
  if (prevRange.min !== filters.minPrice || prevRange.max !== filters.maxPrice) {
    setPrevRange({ min: filters.minPrice, max: filters.maxPrice });
    setMin(filters.minPrice ?? "");
    setMax(filters.maxPrice ?? "");
  }

  return (
    <div>
      {facets.colors.length ? (
        <FilterGroup title="رنگ">
          <ul className="grid grid-cols-2 gap-1">
            {facets.colors.map((c) => {
              const checked = filters.colors.includes(c.slug);
              return (
                <li key={c.slug}>
                  <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-burgundy/[0.04]", checked && "bg-burgundy/[0.06]")}>
                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => navigate({ colors: toggle(filters.colors, c.slug) })} />
                    <span
                      className="size-5 shrink-0 rounded-full border border-ink/15 ring-burgundy ring-offset-2 ring-offset-ivory peer-checked:ring-2 peer-focus-visible:ring-2"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    />
                    <span className="flex-1">{c.name}</span>
                    <span className="tabular text-xs text-ink-soft">{toPersianDigits(c.count)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {facets.sizes.length ? (
        <FilterGroup title="سایز">
          <ul className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const checked = filters.sizes.includes(s.label);
              return (
                <li key={s.id}>
                  <label className="cursor-pointer">
                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => navigate({ sizes: toggle(filters.sizes, s.label) })} />
                    <span className="tabular grid h-10 min-w-12 place-items-center rounded-full border border-line-strong/70 px-3 text-sm transition-colors peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy hover:border-burgundy/50">
                      {toPersianDigits(s.label)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {facets.lengths.length ? (
        <FilterGroup title="قد لباس">
          <ul className="flex flex-wrap gap-2">
            {facets.lengths.map((l) => {
              const checked = filters.lengths.includes(l.value);
              return (
                <li key={l.value}>
                  <label className="cursor-pointer">
                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => navigate({ lengths: toggle<DressLength>(filters.lengths, l.value) })} />
                    <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong/70 px-4 text-sm transition-colors peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy hover:border-burgundy/50">
                      {DRESS_LENGTH_LABELS[l.value]}
                      <span className="tabular text-xs opacity-70">{toPersianDigits(l.count)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title="محدودهٔ قیمت">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = (v: string) => toEnglishDigits(v).replace(/[^\d]/g, "") || undefined;
            navigate({ minPrice: clean(min), maxPrice: clean(max) });
          }}
        >
          {facets.priceRange ? (
            <p className="text-xs text-ink-muted">
              از {formatMoney(facets.priceRange.min, facets.currency)} تا {formatMoney(facets.priceRange.max, facets.currency)}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              از
              <input
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-line-strong/70 bg-surface-raised px-3 text-sm text-ink outline-none focus:border-burgundy"
                placeholder="۰"
              />
            </label>
            <label className="text-xs text-ink-muted">
              تا
              <input
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-line-strong/70 bg-surface-raised px-3 text-sm text-ink outline-none focus:border-burgundy"
                placeholder="بدون سقف"
              />
            </label>
          </div>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            اعمال قیمت
          </Button>
        </form>
      </FilterGroup>

      <FilterGroup title="وضعیت">
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            فقط لباس‌های موجود
            <input type="checkbox" checked={filters.inStock} onChange={(e) => navigate({ inStock: e.target.checked })} className="size-5 accent-burgundy" />
          </label>
          {!lockedOnSale ? (
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              فقط تخفیف‌دار
              <input type="checkbox" checked={filters.onSale} onChange={(e) => navigate({ onSale: e.target.checked })} className="size-5 accent-burgundy" />
            </label>
          ) : null}
        </div>
      </FilterGroup>
    </div>
  );
}
