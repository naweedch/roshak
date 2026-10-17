"use client";

/**
 * بخش اصلی صفحهٔ محصول: رسانه‌ها (گالری، ۳۶۰، سه‌بعدی) + پنل خرید.
 * انتخاب رنگ و سایز، تنوع واقعی و موجودی همان تنوع را تعیین می‌کند؛
 * تنوع ناموجود قابل افزودن به سبد نیست (و سرور نیز دوباره بررسی می‌کند).
 */
import * as React from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { Check, ShoppingBag } from "lucide-react";
import { Price } from "@/components/store/price";
import { QuantityStepper } from "@/components/store/cart-lines";
import { useStore } from "@/components/store/store-provider";
import { WishlistButton } from "@/components/store/wishlist-button";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/misc";
import type { ProductDetailDTO } from "@/lib/types/catalog";
import { DRESS_LENGTH_LABELS } from "@/lib/labels";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { ProductGallery } from "./product-gallery";
import { ShareButton } from "./share-button";
import { SizeGuideDialog } from "./size-guide";
import { Viewer360 } from "./viewer-360";

const ModelViewer = dynamic(() => import("@/components/three/model-viewer"), {
  ssr: false,
  loading: () => <div className="arch-3-4 skeleton aspect-[3/4]" />,
});

type MediaTab = "gallery" | "360" | "3d";

export function ProductExperience({ product }: { product: ProductDetailDTO }) {
  const { addToCart } = useStore();
  const reduce = useReducedMotion();

  const firstAvailableColor = product.colorOptions.find((c) => product.variants.some((v) => v.colorId === c.id && v.maxQuantity > 0)) ?? product.colorOptions[0];
  const [colorId, setColorId] = React.useState<string | null>(firstAvailableColor?.id ?? null);
  const [sizeId, setSizeId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const [sizeError, setSizeError] = React.useState(false);
  const [tab, setTab] = React.useState<MediaTab>("gallery");
  const sizeGroupRef = React.useRef<HTMLDivElement>(null);
  const purchaseRef = React.useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = React.useState(false);

  const selectedColor = product.colorOptions.find((c) => c.id === colorId) ?? null;
  const variantFor = (cId: string | null, sId: string | null) => product.variants.find((v) => v.colorId === cId && v.sizeId === sId) ?? null;
  const variant = variantFor(colorId, sizeId);
  const available = Boolean(variant && variant.maxQuantity > 0);
  const anyAvailable = product.variants.some((v) => v.maxQuantity > 0);

  // تعداد انتخاب‌شده هرگز از سقف قابل خرید همان تنوع بیشتر نمی‌شود
  const maxQuantity = variant ? Math.max(1, variant.maxQuantity) : 10;
  const effectiveQuantity = Math.min(quantity, maxQuantity);

  // نوار خرید چسبان موبایل وقتی پنل خرید از دید خارج شده است
  React.useEffect(() => {
    const el = purchaseRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function onAdd() {
    if (!sizeId || !variant) {
      setSizeError(true);
      sizeGroupRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      sizeGroupRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
      return;
    }
    if (!available) return;
    setAdding(true);
    const ok = await addToCart(variant.id, effectiveQuantity, product.name);
    setAdding(false);
    if (ok) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2200);
    }
  }

  const stockMessage = (() => {
    if (!anyAvailable) return "این طرح در حال حاضر در هیچ سایز و رنگی موجود نیست.";
    if (!sizeId) return null;
    if (!variant || variant.maxQuantity === 0) return `سایز ${toPersianDigits(product.sizeOptions.find((s) => s.id === sizeId)?.label ?? "")} در رنگ ${selectedColor?.name ?? ""} ناموجود است.`;
    if (variant.stockLevel === "LOW_STOCK") return `فقط ${toPersianDigits(variant.maxQuantity)} عدد باقی مانده است.`;
    return "موجود و آمادهٔ ارسال";
  })();

  const mediaTabs: Array<{ id: MediaTab; label: string }> = [
    { id: "gallery", label: "تصاویر" },
    // ۸ فریم یا بیشتر = چرخش کامل ۳۶۰؛ کمتر از آن = چرخش بین زاویه‌های واقعی عکاسی‌شده
    ...(product.view360.length >= 2 ? [{ id: "360" as const, label: product.view360.length >= 8 ? "نمای ۳۶۰ درجه" : "نمای چرخشی" }] : []),
    ...(product.model3dUrl ? [{ id: "3d" as const, label: "نمای سه‌بعدی" }] : []),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <div className="lg:sticky lg:top-28 lg:self-start">
        {mediaTabs.length > 1 ? (
          <div role="tablist" aria-label="نوع نمایش" className="mb-4 flex gap-2">
            {mediaTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("rounded-full px-4 py-1.5 text-sm transition-colors", tab === t.id ? "bg-burgundy text-ivory" : "border border-line hover:border-burgundy/40")}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
        {tab === "gallery" ? <ProductGallery images={product.images} productName={product.name} activeColorId={colorId} /> : null}
        {tab === "360" ? <Viewer360 frames={product.view360} productName={product.name} /> : null}
        {tab === "3d" && product.model3dUrl ? <ModelViewer url={product.model3dUrl} label={`مدل سه‌بعدی ${product.name}`} /> : null}
      </div>

      <div ref={purchaseRef} className="flex flex-col">
        <p className="text-sm text-ink-muted">{product.category.name}</p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-ink sm:text-5xl">{product.name}</h1>
        {product.subtitle ? <p className="mt-2 text-lg text-ink-muted">{product.subtitle}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Price price={product.price} salePrice={product.salePrice} currency={product.currency} size="lg" />
          {product.ratingAverage && product.reviewCount > 0 ? (
            <a href="#reviews" className="hover:opacity-80">
              <RatingStars value={Number(product.ratingAverage)} count={product.reviewCount} />
            </a>
          ) : null}
        </div>

        {/* انتخاب رنگ */}
        {product.colorOptions.length ? (
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm">
              رنگ: <span className="font-semibold text-burgundy">{selectedColor?.name ?? "انتخاب کنید"}</span>
            </legend>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="انتخاب رنگ">
              {product.colorOptions.map((c) => {
                const colorAvailable = product.variants.some((v) => v.colorId === c.id && v.maxQuantity > 0);
                const active = c.id === colorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${c.name}${colorAvailable ? "" : " (ناموجود)"}`}
                    onClick={() => setColorId(c.id)}
                    className={cn(
                      "relative grid size-12 place-items-center rounded-full ring-offset-2 ring-offset-ivory transition-shadow",
                      active ? "ring-2 ring-burgundy" : "ring-1 ring-line-strong hover:ring-burgundy/50",
                    )}
                  >
                    <span className="size-9 rounded-full border border-ink/10 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.15)]" style={{ backgroundColor: c.hex }} />
                    {!colorAvailable ? <span className="absolute h-px w-10 -rotate-45 bg-ink/50" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {/* انتخاب سایز */}
        <fieldset className="mt-7" aria-describedby={sizeError ? "size-error" : undefined}>
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm">
              سایز:{" "}
              <span className="font-semibold text-burgundy">
                {sizeId ? toPersianDigits(product.sizeOptions.find((s) => s.id === sizeId)?.label ?? "") : "انتخاب کنید"}
              </span>
            </legend>
            {product.sizeGuide ? <SizeGuideDialog guide={product.sizeGuide} /> : null}
          </div>
          <div ref={sizeGroupRef} className="flex flex-wrap gap-2" role="radiogroup" aria-label="انتخاب سایز" aria-invalid={sizeError || undefined}>
            {product.sizeOptions.map((s) => {
              const v = variantFor(colorId, s.id);
              const sizeAvailable = Boolean(v && v.maxQuantity > 0);
              const active = s.id === sizeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`سایز ${s.label}${sizeAvailable ? "" : "، ناموجود در این رنگ"}`}
                  onClick={() => {
                    setSizeId(s.id);
                    setSizeError(false);
                  }}
                  className={cn(
                    "tabular relative h-12 min-w-14 rounded-full border px-4 text-sm transition-colors",
                    active ? "border-burgundy bg-burgundy text-ivory" : "border-line-strong/70 hover:border-burgundy/60",
                    !sizeAvailable && !active && "text-ink-muted line-through decoration-ink/40",
                    !sizeAvailable && active && "bg-burgundy/70",
                  )}
                >
                  {toPersianDigits(s.label)}
                </button>
              );
            })}
          </div>
          {sizeError ? (
            <p id="size-error" role="alert" className="mt-2 text-sm text-danger">
              لطفاً سایز را انتخاب کنید.
            </p>
          ) : null}
        </fieldset>

        <p
          aria-live="polite"
          className={cn(
            "mt-4 min-h-6 text-sm",
            !anyAvailable || (sizeId && !available) ? "text-danger" : variant?.stockLevel === "LOW_STOCK" ? "text-warning" : "text-success",
          )}
        >
          {stockMessage}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <QuantityStepper value={effectiveQuantity} max={maxQuantity} onChange={setQuantity} disabled={!available} label="تعداد" />
          <Button size="lg" className="min-w-52 flex-1" onClick={onAdd} loading={adding} disabled={!anyAvailable || Boolean(sizeId && !available)}>
            {justAdded ? (
              <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2">
                <Check /> به سبد اضافه شد
              </motion.span>
            ) : (
              <>
                <ShoppingBag />
                {!anyAvailable ? "ناموجود" : sizeId && !available ? "این سایز ناموجود است" : "افزودن به سبد خرید"}
              </>
            )}
          </Button>
          <WishlistButton productId={product.id} productName={product.name} variant="inline" />
          <ShareButton title={product.name} url={`/products/${product.slug}`} />
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 rounded-[var(--radius-panel)] border border-line p-6 text-sm">
          {product.length ? (
            <div>
              <dt className="text-ink-muted">قد لباس</dt>
              <dd className="mt-0.5">{DRESS_LENGTH_LABELS[product.length]}</dd>
            </div>
          ) : null}
          {product.fabric ? (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-ink-muted">پارچه</dt>
              <dd className="mt-0.5">{product.fabric}</dd>
            </div>
          ) : null}
          {product.modelInfo ? (
            <div className="col-span-2">
              <dt className="text-ink-muted">اندازهٔ مدل</dt>
              <dd className="mt-0.5">{product.modelInfo}</dd>
            </div>
          ) : null}
          {variant ? (
            <div className="col-span-2">
              <dt className="text-ink-muted">کد کالا</dt>
              <dd className="mt-0.5 font-mono text-xs" dir="ltr">
                {variant.sku}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* نوار خرید چسبان موبایل */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur transition-transform duration-500 ease-[var(--ease-silk)] lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight">{product.name}</p>
          <Price price={product.price} salePrice={product.salePrice} currency={product.currency} size="sm" />
        </div>
        <Button onClick={onAdd} loading={adding} disabled={!anyAvailable} tabIndex={showSticky ? 0 : -1}>
          <ShoppingBag />
          افزودن
        </Button>
      </div>
    </div>
  );
}
