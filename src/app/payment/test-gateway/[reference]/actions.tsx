"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";

export function TestGatewayActions({ reference, decided }: { reference: string; decided: boolean }) {
  const [busy, setBusy] = React.useState<"success" | "fail" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function decide(decision: "success" | "fail") {
    setBusy(decision);
    setError(null);
    try {
      const result = await api<{ redirectUrl: string }>(`/api/v1/payments/test-gateway/${encodeURIComponent(reference)}`, { body: { decision } });
      window.location.assign(result.redirectUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ثبت نتیجه");
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button className="w-full" size="lg" onClick={() => decide("success")} loading={busy === "success"} disabled={busy !== null}>
        {decided ? "بازگشت به فروشگاه" : "شبیه‌سازی پرداخت موفق"}
      </Button>
      {!decided ? (
        <Button className="w-full" variant="secondary" size="lg" onClick={() => decide("fail")} loading={busy === "fail"} disabled={busy !== null}>
          شبیه‌سازی انصراف / پرداخت ناموفق
        </Button>
      ) : null}
    </div>
  );
}
