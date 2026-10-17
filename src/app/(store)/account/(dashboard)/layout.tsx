import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";

/** چیدمان پنل مشتری؛ احراز هویت در هر صفحه جداگانه بررسی می‌شود (نه فقط در چیدمان) */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[14rem_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <Suspense fallback={<div className="h-11" />}>
          <AccountNav />
        </Suspense>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
