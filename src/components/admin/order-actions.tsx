"use client";

/** اقدامات کارمند روی سفارش: تغییر وضعیت (طبق ماشین حالت)، ثبت بازپرداخت، یادداشت داخلی */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrderStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { CANCEL_REASON_LABELS, ORDER_STATUS_LABELS } from "@/lib/commerce/order-status";
import { formatMoney } from "@/lib/money";
import { AdminCard } from "./admin-ui";

function errorText(e: unknown) {
  return e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : "عملیات ناموفق بود";
}

export function OrderActionsPanel({
  orderId,
  currency,
  transitions,
  canRefund,
  refundable,
  canNote,
}: {
  orderId: string;
  currency: string;
  transitions: OrderStatus[];
  canRefund: boolean;
  refundable: string;
  canNote: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<OrderStatus | "">(transitions[0] ?? "");
  const [carrier, setCarrier] = React.useState("پست");
  const [tracking, setTracking] = React.useState("");
  const [note, setNote] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [restock, setRestock] = React.useState(true);
  const [cancelReason, setCancelReason] = React.useState<keyof typeof CANCEL_REASON_LABELS>("ADMIN_DECISION");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [refundAmount, setRefundAmount] = React.useState("");
  const [refundReason, setRefundReason] = React.useState("");
  const [refundMethod, setRefundMethod] = React.useState("واریز به کارت مشتری");
  const [refundRef, setRefundRef] = React.useState("");
  const [refundKey, setRefundKey] = React.useState(() => crypto.randomUUID());
  const [internalNote, setInternalNote] = React.useState("");

  async function run(name: string, action: () => Promise<unknown>, success: string) {
    setBusy(name);
    setError(null);
    try {
      await action();
      toast.success(success);
      router.refresh();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <FormMessage>{error}</FormMessage> : null}
      {transitions.length ? (
        <AdminCard title="تغییر وضعیت">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!status) return;
              if (status === "CANCELLED" && !window.confirm("سفارش لغو شود؟ اگر پرداخت شده باشد، بازپرداخت را جداگانه ثبت کنید.")) return;
              void run(
                "status",
                () =>
                  api(`/api/v1/admin/orders/${orderId}/status`, {
                    body: {
                      status,
                      carrier: status === "SHIPPED" ? carrier : undefined,
                      trackingNumber: status === "SHIPPED" ? tracking : undefined,
                      note: note || undefined,
                      notifyCustomer: notify,
                      restockReturned: status === "RETURNED" ? restock : false,
                      cancelReason: status === "CANCELLED" ? cancelReason : undefined,
                    },
                  }),
                "وضعیت سفارش به‌روز شد",
              );
            }}
          >
            <Field label="وضعیت جدید" htmlFor="o-status">
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {transitions.map((t) => (
                  <option key={t} value={t}>
                    {ORDER_STATUS_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {status === "SHIPPED" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="شرکت حمل" htmlFor="o-carrier" required>
                  <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </Field>
                <Field label="کد رهگیری" htmlFor="o-tracking">
                  <Input dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </Field>
              </div>
            ) : null}
            {status === "CANCELLED" ? (
              <Field label="علت لغو" htmlFor="o-cancel">
                <NativeSelect value={cancelReason} onChange={(e) => setCancelReason(e.target.value as typeof cancelReason)}>
                  {Object.entries(CANCEL_REASON_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            {status === "RETURNED" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} /> کالاهای مرجوعی به انبار برگردند
              </label>
            ) : null}
            <Field label="یادداشت داخلی (اختیاری)" htmlFor="o-note">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} /> اطلاع‌رسانی ایمیلی به مشتری
            </label>
            <Button type="submit" loading={busy === "status"} variant={status === "CANCELLED" ? "danger" : "primary"}>
              ثبت وضعیت
            </Button>
          </form>
        </AdminCard>
      ) : null}

      {canRefund ? (
        <AdminCard title="ثبت بازپرداخت">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(
                "refund",
                () => api(`/api/v1/admin/orders/${orderId}/refunds`, { body: { amount: refundAmount, reason: refundReason, method: refundMethod, reference: refundRef, idempotencyKey: refundKey } }),
                "بازپرداخت ثبت شد",
              );
              if (ok) {
                setRefundAmount("");
                setRefundReason("");
                setRefundRef("");
                setRefundKey(crypto.randomUUID());
              }
            }}
          >
            <p className="text-xs text-ink-muted">ابتدا مبلغ را از طریق بانک یا پنل درگاه بازگردانید، سپس این‌جا ثبت کنید. حداکثر قابل بازپرداخت: {formatMoney(refundable, currency)}</p>
            <Field label="مبلغ" htmlFor="r-amount" required>
              <Input dir="ltr" inputMode="numeric" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </Field>
            <Field label="علت" htmlFor="r-reason" required>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="روش" htmlFor="r-method">
                <Input value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} />
              </Field>
              <Field label="شمارهٔ پیگیری" htmlFor="r-ref">
                <Input dir="ltr" value={refundRef} onChange={(e) => setRefundRef(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" variant="secondary" loading={busy === "refund"}>
              ثبت بازپرداخت
            </Button>
          </form>
        </AdminCard>
      ) : null}

      {canNote ? (
        <AdminCard title="یادداشت داخلی">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run("note", () => api(`/api/v1/admin/orders/${orderId}/notes`, { body: { note: internalNote } }), "یادداشت ثبت شد");
              if (ok) setInternalNote("");
            }}
          >
            <Textarea rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} aria-label="متن یادداشت" />
            <Button type="submit" size="sm" variant="ghost" loading={busy === "note"} disabled={internalNote.trim().length < 2}>
              افزودن یادداشت
            </Button>
          </form>
        </AdminCard>
      ) : null}
    </div>
  );
}
