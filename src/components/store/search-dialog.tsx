"use client";

/**
 * جست‌وجوی سراسری با پیشنهاد زنده (تأخیر ۲۵۰ میلی‌ثانیه)، پیمایش با کیبورد (combobox/listbox)
 * و جست‌وجوهای اخیر ذخیره‌شده در مرورگر.
 */
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog as RDialog } from "radix-ui";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";

interface Suggestions {
  products: Array<{ slug: string; name: string; currency: string; price: string; salePrice: string | null; image: { url: string; alt: string } | null; categoryName: string }>;
  collections: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}

const RECENT_KEY = "rsk_recent_searches";

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ذخیره‌سازی محلی در دسترس نیست
  }
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  // نتیجه همراه با عبارتی که برایش گرفته شده نگه داشته می‌شود تا وضعیت «در حال جست‌وجو» از آن مشتق شود
  const [fetched, setFetched] = React.useState<{ term: string; data: Suggestions } | null>(null);
  const [active, setActive] = React.useState(-1);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [prevOpen, setPrevOpen] = React.useState(open);
  const listId = React.useId();

  // بازنشانی هنگام باز/بسته شدن، در همان رندر (بدون effect و رندر آبشاری)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setRecent(readRecent());
    else {
      setQuery("");
      setFetched(null);
      setActive(-1);
    }
  }

  const term = query.trim();
  const searchable = term.length >= 2;
  // تا رسیدن نتیجهٔ عبارت جدید، آخرین نتیجه نمایش داده می‌شود (بدون پرش صفحه)
  const results = searchable && fetched ? fetched.data : null;
  const loading = searchable && fetched?.term !== term;

  React.useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<Suggestions>(`/api/v1/search/suggestions?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        setFetched({ term, data });
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setFetched({ term, data: { products: [], collections: [], categories: [] } });
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, searchable]);

  const options = React.useMemo(() => {
    if (!results) return [] as Array<{ href: string; label: string }>;
    return [
      ...results.products.map((p) => ({ href: `/products/${p.slug}`, label: p.name })),
      ...results.collections.map((c) => ({ href: `/collections/${c.slug}`, label: c.name })),
      ...results.categories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name })),
    ];
  }, [results]);

  function go(href: string) {
    if (query.trim()) saveRecent(query.trim());
    onOpenChange(false);
    router.push(href);
  }

  function submit(term = query.trim()) {
    if (!term) return;
    saveRecent(term);
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && options[active]) go(options[active].href);
      else submit();
    }
  }

  const noResults = results && options.length === 0 && !loading;
  // شمارهٔ هر گزینه در فهرست صفحه‌کلید: محصولات اول، سپس مجموعه‌ها و دسته‌ها (هم‌ترتیب با options)
  const productCount = results?.products.length ?? 0;

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.3s_ease]" />
        <RDialog.Content className="fixed inset-x-0 top-0 z-50 max-h-[92dvh] overflow-y-auto rounded-b-[var(--radius-panel)] bg-ivory shadow-float outline-none data-[state=open]:animate-[rise-in_0.4s_var(--ease-silk)]">
          <RDialog.Title className="sr-only">جست‌وجو در روشاک</RDialog.Title>
          <RDialog.Description className="sr-only">نام لباس، رنگ، پارچه یا مجموعه را بنویسید</RDialog.Description>
          <div className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-8">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-center gap-3 border-b-2 border-burgundy/30 pb-3 focus-within:border-burgundy"
            >
              <Search className="size-6 shrink-0 text-burgundy" aria-hidden />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="جست‌وجوی لباس، رنگ، پارچه..."
                aria-label="عبارت جست‌وجو"
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
                className="h-14 w-full bg-transparent font-display text-2xl text-ink outline-none placeholder:text-ink-soft sm:text-3xl"
              />
              {loading ? <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-burgundy border-t-transparent" aria-label="در حال جست‌وجو" /> : null}
              <RDialog.Close className="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5" aria-label="بستن جست‌وجو">
                <X className="size-5" />
              </RDialog.Close>
            </form>

            <div id={listId} role="listbox" aria-label="پیشنهادها" className="mt-6">
              {!results && recent.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-ink-muted">جست‌وجوهای اخیر</p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <button key={term} type="button" onClick={() => submit(term)} className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-burgundy/40">
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {results && results.products.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-ink-muted">لباس‌ها</p>
                  <ul className="grid gap-1">
                    {results.products.map((p, i) => {
                      const index = i;
                      return (
                        <li key={p.slug} id={`${listId}-opt-${index}`} role="option" aria-selected={active === index}>
                          <button
                            type="button"
                            onClick={() => go(`/products/${p.slug}`)}
                            onMouseEnter={() => setActive(index)}
                            className={`flex w-full items-center gap-4 rounded-2xl p-2 text-start transition-colors ${active === index ? "bg-burgundy/[0.06]" : ""}`}
                          >
                            <span className="arch-3-4 relative block h-16 w-12 shrink-0 overflow-hidden bg-ivory-deep">
                              {p.image ? <Image src={p.image.url} alt="" fill sizes="48px" className="object-cover" /> : null}
                            </span>
                            <span className="flex-1">
                              <span className="block font-display text-lg leading-tight text-ink">{p.name}</span>
                              <span className="text-xs text-ink-muted">{p.categoryName}</span>
                            </span>
                            <span className="tabular text-sm text-ink">{formatMoney(p.salePrice ?? p.price, p.currency)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {results && (results.collections.length > 0 || results.categories.length > 0) ? (
                <div className="mt-5">
                  <p className="mb-2 text-sm text-ink-muted">مجموعه‌ها و دسته‌ها</p>
                  <ul className="flex flex-wrap gap-2">
                    {[...results.collections.map((c) => ({ ...c, href: `/collections/${c.slug}` })), ...results.categories.map((c) => ({ ...c, href: `/shop?category=${c.slug}` }))].map((c, i) => {
                      const index = productCount + i;
                      return (
                        <li key={c.href} id={`${listId}-opt-${index}`} role="option" aria-selected={active === index}>
                          <button
                            type="button"
                            onClick={() => go(c.href)}
                            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${active === index ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40"}`}
                          >
                            {c.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {noResults ? (
                <div className="py-6 text-center">
                  <p className="font-display text-2xl text-burgundy">نتیجه‌ای برای «{query.trim()}» پیدا نشد</p>
                  <p className="mt-2 text-sm text-ink-muted">نام رنگ (مثل زرشکی)، نوع پارچه (مثل مخمل) یا نوع لباس (مثل ماکسی) را امتحان کنید.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["مخمل", "ساتن", "زرشکی", "لباس شب", "پولکی"].map((term) => (
                      <button key={term} type="button" onClick={() => setQuery(term)} className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-burgundy/40">
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {results && options.length > 0 ? (
                <button type="button" onClick={() => submit()} className="mt-6 text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
                  همهٔ نتایج برای «{query.trim()}»
                </button>
              ) : null}
            </div>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
