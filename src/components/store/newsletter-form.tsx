"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** فرم عضویت خبرنامه با رضایت صریح و پیام وضعیت قابل‌خواندن */
export function NewsletterForm({ source = "footer", tone = "dark" }: { source?: string; tone?: "dark" | "light" }) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [state, setState] = React.useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });
  const id = React.useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "loading" });
    try {
      const result = await api<{ message: string }>("/api/v1/newsletter", { body: { email, source, consent } });
      setState({ kind: "success", message: result.message });
      setEmail("");
    } catch (error) {
      setState({ kind: "error", message: error instanceof ApiError ? (Object.values(error.fields)[0] ?? error.message) : "عضویت ناموفق بود" });
    }
  }

  const dark = tone === "dark";
  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-3" noValidate>
      <label htmlFor={`${id}-email`} className="sr-only">
        ایمیل
      </label>
      <div className={cn("flex items-center gap-2 rounded-full border p-1.5 transition-colors", dark ? "border-ivory/25 bg-ivory/5 focus-within:border-champagne" : "border-line-strong bg-white focus-within:border-burgundy")}>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          dir="ltr"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={cn("h-10 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none", dark ? "text-ivory placeholder:text-ivory/40" : "text-ink placeholder:text-ink-soft")}
        />
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className={cn("h-10 shrink-0 rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-60", dark ? "bg-champagne text-burgundy-deep hover:bg-champagne-soft" : "bg-burgundy text-ivory hover:bg-burgundy-deep")}
        >
          {state.kind === "loading" ? "در حال ثبت..." : "عضویت"}
        </button>
      </div>
      <label className={cn("flex cursor-pointer items-start gap-2 text-xs leading-6", dark ? "text-ivory/70" : "text-ink-muted")}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-champagne" />
        با دریافت ایمیل‌های خبرنامه (کالکشن‌های تازه و رویدادها) موافقم و هر زمان می‌توانم لغو کنم.
      </label>
      <p role="status" aria-live="polite" className={cn("min-h-6 text-sm", state.kind === "error" ? (dark ? "text-rose" : "text-danger") : dark ? "text-champagne" : "text-success")}>
        {state.kind === "success" || state.kind === "error" ? state.message : ""}
      </p>
    </form>
  );
}
