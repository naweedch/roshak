"use client";

/**
 * کشف لباس بر اساس رنگ: انتخاب یک نمونه‌پارچه، محصولات همان رنگ را (از API و داده‌های واقعی) نمایش می‌دهد.
 * گروه دکمه‌ها با الگوی radiogroup و کلیدهای جهت‌نما قابل پیمایش است.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/api-client";
import type { ImageDTO, ProductCardDTO } from "@/lib/types/catalog";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

export interface DiscoveryColor {
  slug: string;
  name: string;
  hex: string;
  count: number;
  image: ImageDTO | null;
}

export function ColorDiscovery({ colors }: { colors: DiscoveryColor[] }) {
  const [selected, setSelected] = React.useState(colors[0]?.slug ?? null);
  const [products, setProducts] = React.useState<Record<string, ProductCardDTO[]>>({});
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  // تا وقتی محصولات رنگ انتخاب‌شده نرسیده، در حال بارگذاری است (مشتق از وضعیت، بدون state جداگانه)
  const loading = selected !== null && products[selected] === undefined;

  React.useEffect(() => {
    if (!selected || products[selected]) return;
    const controller = new AbortController();
    api<{ items: ProductCardDTO[] }>(`/api/v1/products?color=${encodeURIComponent(selected)}&sort=popular`, { signal: controller.signal })
      .then((data) => setProducts((prev) => ({ ...prev, [selected]: data.items.slice(0, 4) })))
      .catch(() => {
        if (!controller.signal.aborted) setProducts((prev) => ({ ...prev, [selected]: [] }));
      });
    return () => controller.abort();
  }, [selected, products]);

  if (colors.length === 0) return null;
  const current = colors.find((c) => c.slug === selected) ?? colors[0];
  const items = selected ? products[selected] : undefined;

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const keys: Record<string, number> = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (index + keys[e.key] + colors.length) % colors.length;
    setSelected(colors[next].slug);
    buttons.current[next]?.focus();
  }

  return (
    <section aria-labelledby="colors-title" className="relative overflow-hidden py-24 lg:py-32">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        animate={{ backgroundColor: `${current.hex}14` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 id="colors-title" className="font-display text-4xl text-burgundy sm:text-5xl">
              رنگ شب خود را انتخاب کنید
            </h2>
            <p className="mt-3 text-ink-muted">از زرشکی عمیق تا یاسی روشن؛ با انتخاب هر رنگ، لباس‌های همان رنگ را ببینید.</p>
          </div>
          <Link href={`/shop?color=${current.slug}`} className="text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
            همهٔ لباس‌های {current.name}
          </Link>
        </div>

        <div role="radiogroup" aria-label="انتخاب رنگ" className="no-scrollbar mt-10 flex gap-4 overflow-x-auto pb-2">
          {colors.map((c, i) => {
            const active = c.slug === current.slug;
            return (
              <button
                key={c.slug}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(c.slug)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "relative block size-16 rounded-full border border-ink/10 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.18),inset_0_6px_12px_rgba(255,255,255,0.25)] transition-transform duration-500 ease-[var(--ease-silk)] sm:size-20",
                    active ? "scale-110" : "group-hover:scale-105",
                  )}
                  style={{ backgroundColor: c.hex }}
                >
                  {active ? <motion.span layoutId="color-ring" className="absolute -inset-1.5 rounded-full border-2 border-burgundy" /> : null}
                </span>
                <span className={cn("text-sm", active ? "font-semibold text-burgundy" : "text-ink-muted")}>{c.name}</span>
                <span className="sr-only">{toPersianDigits(c.count)} طرح</span>
              </button>
            );
          })}
        </div>

        <div className="mt-12 min-h-[22rem]" aria-live="polite" aria-busy={loading}>
          <AnimatePresence mode="wait">
            <motion.ul
              key={current.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4"
            >
              {(items ?? Array.from({ length: 4 }, () => null)).map((p, i) =>
                p ? (
                  <li key={p.id}>
                    <Link href={`/products/${p.slug}`} className="group block">
                      <span className="arch-3-4 relative block aspect-[3/4] overflow-hidden bg-ivory-deep">
                        {p.image ? (
                          <Image src={p.image.url} alt={p.image.alt} fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                        ) : null}
                      </span>
                      <span className="mt-3 block font-display text-lg text-ink group-hover:text-burgundy">{p.name}</span>
                      <span className="tabular text-sm text-ink-muted">{formatMoney(p.salePrice ?? p.price, p.currency)}</span>
                    </Link>
                  </li>
                ) : (
                  <li key={i} aria-hidden>
                    <div className="arch-3-4 skeleton aspect-[3/4]" />
                    <div className="skeleton mt-3 h-5 w-2/3 rounded-full" />
                  </li>
                ),
              )}
              {items && items.length === 0 ? <li className="col-span-full py-10 text-center text-ink-muted">فعلاً لباسی با این رنگ موجود نیست.</li> : null}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
