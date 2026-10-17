"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/commerce/order-status";
import { formatPersianDateTime } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import type { OrderView } from "@/lib/types/order";
import { orderLookupSchema } from "@/lib/validation/checkout";
import type { z } from "zod";
import { OrderTracker } from "@/components/store/order-details";

export function TrackOrderForm() {
  const [order, setOrder] = React.useState<OrderView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof orderLookupSchema>>({ resolver: zodResolver(orderLookupSchema) });

  return (
    <div className="mt-8 space-y-8">
      <form
        noValidate
        className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          setOrder(null);
          try {
            setOrder(await api<OrderView>("/api/v1/orders/lookup", { body: values }));
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "پیگیری ممکن نشد");
          }
        })}
      >
        <Field label="شمارهٔ سفارش" htmlFor="orderNumber" error={formState.errors.orderNumber?.message} required>
          <Input dir="ltr" placeholder="RSK-261016-7K4QZ" {...register("orderNumber")} />
        </Field>
        <Field label="ایمیل" htmlFor="track-email" error={formState.errors.email?.message} required>
          <Input type="email" dir="ltr" {...register("email")} />
        </Field>
        <Button type="submit" loading={formState.isSubmitting}>
          پیگیری
        </Button>
      </form>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {order ? (
        <section aria-live="polite" className="space-y-6 rounded-[var(--radius-panel)] border border-line p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">
              سفارش <span dir="ltr">{order.orderNumber}</span>
            </h2>
            <p className="text-sm text-ink-muted">ثبت: {formatPersianDateTime(order.placedAt)}</p>
          </div>
          <p>
            وضعیت: <strong className="text-burgundy">{ORDER_STATUS_LABELS[order.status]}</strong> — مبلغ {formatMoney(order.grandTotal, order.currency)} — {toPersianDigits(order.items.length)} قلم
          </p>
          <OrderTracker order={order} />
          {order.shipments
            .filter((s) => s.trackingNumber)
            .map((s) => (
              <p key={s.id} className="text-sm">
                {s.carrier} — کد رهگیری: <span dir="ltr" className="font-mono">{s.trackingNumber}</span>
              </p>
            ))}
        </section>
      ) : null}
    </div>
  );
}
