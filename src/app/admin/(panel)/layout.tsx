import { Suspense } from "react";
import { connection } from "next/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/server/auth/current";

/**
 * چیدمان پنل. منو بر اساس نقش فیلتر می‌شود اما این فقط برای راحتی است؛
 * هر صفحه و هر API مجوز را جداگانه در سرور بررسی می‌کند.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 z-30 lg:h-dvh">
        <Suspense fallback={<div className="h-16 bg-midnight-deep lg:h-dvh" />}>
          <Sidebar />
        </Suspense>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}

async function Sidebar() {
  await connection();
  const { session } = await requireStaff();
  return <AdminNav role={session.user.role} email={session.user.email} />;
}
