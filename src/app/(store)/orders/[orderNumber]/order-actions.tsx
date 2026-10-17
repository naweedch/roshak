"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";

/** پرداخت دوباره یا لغو سفارش پرداخت‌نشده */
export function OrderActions({
  orderNumber,
  accessKey,
  canRetryPayment,
  canCancel,
  reservationExpiresAt,
}: {
  orderNumber: string;
  accessKey: string | null;
  canRetryPayment: boolean;
  canCancel: boolean;
  reservationExpiresAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"pay" | "cancel" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  if (!canRetryPayment && !canCancel) return null;

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const result = await api<{ redirectUrl: string }>(`/api/v1/orders/${orderNumber}/retry-payment`, { body: { key: accessKey ?? undefined } });
      window.location.assign(result.redirectUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "اتصال به درگاه ممکن نشد");
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      await api(`/api/v1/orders/${orderNumber}/cancel`, { body: { key: accessKey ?? undefined } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "لغو سفارش ممکن نشد");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-[var(--radius-panel)] border border-warning/30 bg-warning-soft/60 p-5">
      <p className="text-sm text-ink">
        این سفارش در انتظار پرداخت است.
        {reservationExpiresAt
          ? ` کالاها تا ساعت ${new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(reservationExpiresAt))} برای شما رزرو هستند.`
          : ""}
      </p>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <div className="flex flex-wrap gap-2">
        {canRetryPayment ? (
          <Button onClick={pay} loading={busy === "pay"} disabled={busy !== null}>
            پرداخت سفارش
          </Button>
        ) : null}
        {canCancel ? (
          confirmCancel ? (
            <>
              <Button variant="danger" onClick={cancel} loading={busy === "cancel"} disabled={busy !== null}>
                بله، سفارش لغو شود
              </Button>
              <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>
                انصراف
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>
              لغو سفارش
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
