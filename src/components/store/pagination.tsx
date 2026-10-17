import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

function pageWindow(current: number, total: number): Array<number | "gap"> {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

/** صفحه‌بندی مبتنی بر URL (قابل اشتراک و قابل خزش برای موتورهای جست‌وجو) */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const item = "grid size-11 place-items-center rounded-full text-sm transition-colors";
  return (
    <nav aria-label="صفحه‌بندی" className="mt-16 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(item, "border border-line hover:border-burgundy/40")} aria-label="صفحهٔ قبل">
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-soft" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`صفحهٔ ${toPersianDigits(p)}`}
            className={cn(item, p === page ? "bg-burgundy text-ivory" : "hover:bg-burgundy/[0.06]")}
          >
            {toPersianDigits(p)}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(item, "border border-line hover:border-burgundy/40")} aria-label="صفحهٔ بعد">
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
