"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";

/** تأیید عضویت یا لغو آن با کلیک کاربر (نه خودکار) تا پیش‌نمایش لینک توسط کلاینت ایمیل، عضویت را تغییر ندهد */
export function NewsletterConfirm({ token, action }: { token: string | null; action: "confirm" | "unsubscribe" }) {
  const [state, setState] = React.useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  if (!token) return <FormMessage className="mt-8">پیوند ناقص است.</FormMessage>;
  if (state) return <FormMessage className="mt-8" tone={state.tone}>{state.text}</FormMessage>;
  return (
    <div className="mt-8 space-y-4">
      <p className="text-ink-muted">{action === "confirm" ? "برای تکمیل عضویت در خبرنامه، دکمهٔ زیر را بزنید." : "برای لغو عضویت در خبرنامه، دکمهٔ زیر را بزنید."}</p>
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ message: string }>("/api/v1/newsletter/confirm", { body: { token, action } });
            setState({ tone: "success", text: r.message });
          } catch (e) {
            setState({ tone: "error", text: e instanceof ApiError ? e.message : "انجام نشد" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {action === "confirm" ? "تأیید عضویت" : "لغو عضویت"}
      </Button>
    </div>
  );
}
