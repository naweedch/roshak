"use client";

/**
 * ریل افقی محصولات با scroll-snap؛ روی موبایل با لمس و روی دسکتاپ با دکمه‌های قبلی/بعدی.
 * کارت‌ها به‌صورت Server Component رندر و به‌عنوان children پاس داده می‌شوند.
 */
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductRail({ children, label }: { children: React.ReactNode; label: string }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const el = track.current;
    if (!el) return;
    // در RTL مقدار scrollLeft منفی است
    const scrolled = Math.abs(el.scrollLeft);
    setEdges({ start: scrolled < 8, end: scrolled + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  React.useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function scrollBy(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    // direction=1 یعنی جلو (در RTL به سمت چپ)
    el.scrollBy({ left: -direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={track}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 sm:-mx-8 sm:gap-8 sm:px-8"
      >
        {React.Children.map(children, (child) => (
          <div className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-6rem)/4)]">{child}</div>
        ))}
      </div>
      <div className="mt-4 hidden justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          disabled={edges.start}
          className={cn("grid size-11 place-items-center rounded-full border border-burgundy/30 text-burgundy transition-colors hover:bg-burgundy hover:text-ivory disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-burgundy")}
          aria-label="موارد قبلی"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          disabled={edges.end}
          className="grid size-11 place-items-center rounded-full border border-burgundy/30 text-burgundy transition-colors hover:bg-burgundy hover:text-ivory disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-burgundy"
          aria-label="موارد بعدی"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>
    </div>
  );
}
