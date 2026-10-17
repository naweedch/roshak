"use client";

/** اقلام سبد خرید و خلاصهٔ مبالغ؛ مشترک بین کشوی سبد و صفحهٔ سبد خرید */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItemView, CartView } from "@/lib/types/cart";
import { formatMoney, toDecimal } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { useStore } from "./store-provider";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-8" : "size-11";
  return (
    <div className="inline-flex items-center rounded-full border border-line-strong/70 bg-surface-raised" role="group" aria-label={label}>
      <button
        type="button"
        className={cn("grid place-items-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-40", dim)}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="کاهش تعداد"
      >
        <Minus className="size-4" />
      </button>
      <span className={cn("tabular min-w-8 text-center font-medium", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {toPersianDigits(value)}
      </span>
      <button
        type="button"
        className={cn("grid place-items-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-40", dim)}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="افزایش تعداد"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function CartLine({ item, currency, compact }: { item: CartItemView; currency: string; compact?: boolean }) {
  const { updateCartItem, removeCartItem } = useStore();
  const [busy, setBusy] = React.useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
      className={cn("flex gap-4 py-5", busy && "opacity-60")}
    >
      <Link href={`/products/${item.slug}`} className="arch-3-4 relative block h-32 w-24 shrink-0 overflow-hidden bg-ivory-deep">
        {item.image ? <Image src={item.image.url} alt={item.image.alt} fill sizes="96px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${item.slug}`} className="font-display text-lg leading-snug text-ink hover:text-burgundy">
              {item.name}
            </Link>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
              <span className="inline-block size-3 rounded-full border border-ink/15" style={{ backgroundColor: item.colorHex }} aria-hidden />
              {item.colorName}
              <span aria-hidden>/</span>
              سایز {toPersianDigits(item.sizeLabel)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => run(() => removeCartItem(item.id))}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label={`حذف ${item.name} از سبد`}
            disabled={busy}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {item.issue ? (
          <p role="alert" className="mt-2 rounded-xl bg-warning-soft px-3 py-1.5 text-xs text-warning">
            {item.issue === "UNAVAILABLE"
              ? "این کالا دیگر موجود نیست؛ برای ادامهٔ خرید آن را حذف کنید."
              : `فقط ${toPersianDigits(item.maxQuantity)} عدد موجود است؛ تعداد را کاهش دهید.`}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {item.issue === "UNAVAILABLE" ? (
            <span />
          ) : (
            <QuantityStepper
              size={compact ? "sm" : "md"}
              value={item.quantity}
              max={Math.max(item.maxQuantity, item.quantity)}
              disabled={busy}
              label={`تعداد ${item.name}`}
              onChange={(next) => run(() => updateCartItem(item.id, next))}
            />
          )}
          <div className="text-end">
            {item.compareAtPrice ? <del className="tabular block text-xs text-ink-soft">{formatMoney(toDecimal(item.compareAtPrice).times(item.quantity), currency)}</del> : null}
            <span className="tabular text-sm font-semibold text-ink">{formatMoney(item.lineTotal, currency)}</span>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export function CartLineList({ cart, compact }: { cart: CartView; compact?: boolean }) {
  return (
    <ul className="divide-y divide-line" aria-label="اقلام سبد خرید">
      <AnimatePresence initial={false}>
        {cart.items.map((item) => (
          <CartLine key={item.id} item={item} currency={cart.currency} compact={compact} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function FreeShippingProgress({ cart }: { cart: CartView }) {
  if (!cart.freeShippingThreshold) return null;
  const threshold = toDecimal(cart.freeShippingThreshold);
  const remaining = toDecimal(cart.amountToFreeShipping ?? 0);
  const progress = threshold.gt(0) ? Math.min(100, threshold.minus(remaining).div(threshold).times(100).toNumber()) : 100;
  const done = remaining.lte(0);
  return (
    <div className="rounded-2xl bg-ivory-deep px-4 py-3">
      <p className="text-sm text-ink">
        {done ? "ارسال این سفارش رایگان است." : `${formatMoney(remaining, cart.currency)} تا ارسال رایگان`}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="پیشرفت تا ارسال رایگان">
        <motion.div className="h-full rounded-full bg-gradient-to-l from-champagne to-burgundy" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

export function DiscountForm({ cart }: { cart: CartView }) {
  const { applyDiscount, removeDiscount } = useStore();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (cart.discountCode && !cart.discountMessage) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-success/25 bg-success-soft px-4 py-2.5 text-sm text-success">
        <span>
          کد <strong className="font-semibold" dir="ltr">{cart.discountCode}</strong> اعمال شد
        </span>
        <button type="button" onClick={() => void removeDiscount()} className="text-xs underline underline-offset-4">
          حذف کد
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy(true);
        const message = await applyDiscount(code.trim());
        setBusy(false);
        setError(message);
        if (!message) setCode("");
      }}
    >
      <label htmlFor="discount-code" className="text-sm text-ink-muted">
        کد تخفیف
      </label>
      <div className="flex gap-2">
        <input
          id="discount-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          dir="ltr"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "discount-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm uppercase tracking-wider outline-none focus:border-burgundy focus:ring-4 focus:ring-burgundy/10"
          placeholder="WELCOME10"
        />
        <button type="submit" disabled={busy} className="h-11 rounded-full border border-burgundy/40 px-5 text-sm font-medium text-burgundy transition-colors hover:bg-burgundy hover:text-ivory disabled:opacity-50">
          {busy ? "..." : "اعمال"}
        </button>
      </div>
      {error || cart.discountMessage ? (
        <p id="discount-error" role="alert" className="text-xs text-danger">
          {error ?? cart.discountMessage}
        </p>
      ) : null}
    </form>
  );
}

export function CartTotals({ cart }: { cart: CartView }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">جمع کالاها</dt>
        <dd className="tabular">{formatMoney(cart.subtotal, cart.currency)}</dd>
      </div>
      {toDecimal(cart.discountTotal).gt(0) ? (
        <div className="flex justify-between text-success">
          <dt>تخفیف</dt>
          <dd className="tabular">−{formatMoney(cart.discountTotal, cart.currency)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-ink-muted">هزینهٔ ارسال</dt>
        <dd>{cart.freeShipping ? "رایگان" : "در مرحلهٔ بعد محاسبه می‌شود"}</dd>
      </div>
      {toDecimal(cart.taxTotal).gt(0) && cart.pricesIncludeTax ? (
        <div className="flex justify-between text-xs text-ink-soft">
          <dt>مالیات بر ارزش افزوده (در قیمت‌ها لحاظ شده)</dt>
          <dd className="tabular">{formatMoney(cart.taxTotal, cart.currency)}</dd>
        </div>
      ) : null}
      {toDecimal(cart.taxTotal).gt(0) && !cart.pricesIncludeTax ? (
        <div className="flex justify-between">
          <dt className="text-ink-muted">مالیات</dt>
          <dd className="tabular">{formatMoney(cart.taxTotal, cart.currency)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
        <dt>مبلغ قابل پرداخت</dt>
        <dd className="tabular text-burgundy">{formatMoney(cart.total, cart.currency)}</dd>
      </div>
    </dl>
  );
}
