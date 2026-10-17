"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

/** خطای پیش‌بینی‌نشده در رندر؛ جزئیات فنی به کاربر نشان داده نمی‌شود */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-20 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-4xl text-burgundy">مشکلی پیش آمد</h1>
        <p className="mt-3 text-ink-muted">بارگذاری این بخش ناموفق بود. دوباره تلاش کنید؛ اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.</p>
        {error.digest ? (
          <p className="mt-2 text-xs text-ink-soft">
            کد پیگیری: <span dir="ltr">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>تلاش دوباره</Button>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            صفحهٔ اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}
