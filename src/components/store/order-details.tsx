/** نمایش جزئیات سفارش برای مشتری: وضعیت، پیگیری، اقلام و مبالغ (مشترک بین صفحهٔ سفارش و پیگیری مهمان) */
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { CANCEL_REASON_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, TRACKING_STEPS } from "@/lib/commerce/order-status";
import { formatPersianDate, formatPersianDateTime } from "@/lib/dates";
import { SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, toDecimal } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import type { OrderView } from "@/lib/types/order";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status }: { status: OrderView["status"] }) {
  const tone = status === "CANCELLED" || status === "RETURNED" ? "danger" : status === "DELIVERED" ? "success" : status === "PENDING_PAYMENT" ? "warning" : "burgundy";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function OrderTracker({ order }: { order: OrderView }) {
  if (order.status === "CANCELLED" || order.status === "PENDING_PAYMENT" || order.status === "RETURNED") return null;
  const currentIndex = TRACKING_STEPS.indexOf(order.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="مراحل سفارش">
      {TRACKING_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step} className="flex flex-col items-center gap-2 text-center" aria-current={i === currentIndex ? "step" : undefined}>
            <span className={cn("grid size-9 place-items-center rounded-full border-2 text-sm", done ? "border-burgundy bg-burgundy text-ivory" : "border-line-strong text-ink-soft")}>
              {done ? <Check className="size-4" /> : toPersianDigits(i + 1)}
            </span>
            <span className={cn("text-xs", done ? "text-ink" : "text-ink-soft")}>{ORDER_STATUS_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetails({ order }: { order: OrderView }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <Badge tone={order.paymentStatus === "PAID" ? "success" : "neutral"}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
        <span className="text-sm text-ink-muted">ثبت در {formatPersianDateTime(order.placedAt)}</span>
      </div>

      {order.status === "CANCELLED" && order.cancelReason ? (
        <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">علت لغو: {CANCEL_REASON_LABELS[order.cancelReason]}</p>
      ) : null}

      <OrderTracker order={order} />

      {order.shipments.length ? (
        <section aria-labelledby="shipment-title" className="rounded-2xl border border-line p-5">
          <h2 id="shipment-title" className="font-display text-xl">
            ارسال مرسوله
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.shipments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{s.carrier}</span>
                <span className="text-ink-muted">{SHIPMENT_STATUS_LABELS[s.status]}</span>
                {s.trackingNumber ? (
                  <span>
                    کد رهگیری:{" "}
                    {s.trackingUrl ? (
                      <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-mono text-burgundy underline">
                        {s.trackingNumber}
                      </a>
                    ) : (
                      <span dir="ltr" className="font-mono">
                        {s.trackingNumber}
                      </span>
                    )}
                  </span>
                ) : null}
                {s.shippedAt ? <span className="text-ink-muted">ارسال: {formatPersianDate(s.shippedAt)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="items-title">
        <h2 id="items-title" className="font-display text-2xl">
          اقلام سفارش
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <span className="arch-3-4 relative block h-24 w-[4.5rem] shrink-0 overflow-hidden bg-ivory-deep">
                {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="72px" className="object-cover" /> : null}
              </span>
              <div className="flex-1 text-sm">
                <Link href={`/products/${item.productSlug}`} className="font-display text-lg text-ink hover:text-burgundy">
                  {item.productName}
                </Link>
                <p className="text-ink-muted">
                  {item.colorName} / سایز {toPersianDigits(item.sizeLabel)} × {toPersianDigits(item.quantity)}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-soft" dir="ltr">
                  {item.sku}
                </p>
              </div>
              <span className="tabular text-sm">{formatMoney(item.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="address-title" className="rounded-2xl border border-line p-5 text-sm leading-7">
          <h2 id="address-title" className="font-display text-xl">
            نشانی تحویل
          </h2>
          <p className="mt-2">{order.shippingAddress.recipientName}</p>
          <p className="text-ink-muted">
            {order.shippingAddress.province}، {order.shippingAddress.city}، {order.shippingAddress.addressLine}
          </p>
          <p className="text-ink-muted">
            کد پستی: <span dir="ltr">{toPersianDigits(order.shippingAddress.postalCode)}</span> | تلفن: <span dir="ltr">{toPersianDigits(order.shippingAddress.phone)}</span>
          </p>
          <p className="mt-2 text-ink-muted">روش ارسال: {order.shippingMethodName}</p>
        </section>
        <section aria-labelledby="totals-title" className="rounded-2xl border border-line p-5 text-sm">
          <h2 id="totals-title" className="font-display text-xl">
            مبالغ
          </h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt className="text-ink-muted">جمع کالاها</dt>
              <dd className="tabular">{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            {toDecimal(order.discountTotal).gt(0) ? (
              <div className="flex justify-between text-success">
                <dt>تخفیف {order.discountCode ? `(${order.discountCode})` : ""}</dt>
                <dd className="tabular">−{formatMoney(order.discountTotal, order.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-muted">ارسال</dt>
              <dd className="tabular">{toDecimal(order.shippingTotal).gt(0) ? formatMoney(order.shippingTotal, order.currency) : "رایگان"}</dd>
            </div>
            {toDecimal(order.taxTotal).gt(0) ? (
              <div className="flex justify-between text-xs text-ink-soft">
                <dt>مالیات بر ارزش افزوده{order.pricesIncludeTax ? " (لحاظ‌شده)" : ""}</dt>
                <dd className="tabular">{formatMoney(order.taxTotal, order.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <dt>مبلغ کل</dt>
              <dd className="tabular text-burgundy">{formatMoney(order.grandTotal, order.currency)}</dd>
            </div>
            {toDecimal(order.refundedTotal).gt(0) ? (
              <div className="flex justify-between text-ink-muted">
                <dt>بازپرداخت‌شده</dt>
                <dd className="tabular">{formatMoney(order.refundedTotal, order.currency)}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {order.events.length ? (
        <section aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="font-display text-xl">
            تاریخچه
          </h2>
          <ol className="mt-4 space-y-3 border-s border-line ps-5">
            {order.events.map((e) => (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -start-[1.6rem] top-2 size-2.5 rounded-full bg-champagne-deep" aria-hidden />
                <p>{e.message ?? (e.toStatus ? ORDER_STATUS_LABELS[e.toStatus] : "")}</p>
                <p className="text-xs text-ink-muted">{formatPersianDateTime(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
