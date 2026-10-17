import { Suspense } from "react";
import { connection } from "next/server";
import { ChangePasswordForm } from "@/components/account/account-forms";
import { formatPersianDateTime } from "@/lib/dates";
import { requireCustomer } from "@/server/auth/current";
import { listUserSessions } from "@/server/services/customer";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("امنیت حساب");

export default function SecurityPage() {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl text-burgundy">امنیت حساب</h1>
        <h2 className="mb-5 mt-8 font-display text-2xl">تغییر رمز عبور</h2>
        <ChangePasswordForm />
      </section>
      <Suspense fallback={<div className="skeleton h-40 rounded-2xl" />}>
        <Sessions />
      </Suspense>
    </div>
  );
}

async function Sessions() {
  await connection();
  const session = await requireCustomer("/account/security");
  const sessions = await listUserSessions(session.user.id);
  return (
    <section aria-labelledby="sessions-title">
      <h2 id="sessions-title" className="font-display text-2xl">
        دستگاه‌های واردشده
      </h2>
      <p className="mt-1 text-sm text-ink-muted">با تغییر رمز عبور، از همهٔ دستگاه‌های دیگر خارج می‌شوید.</p>
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span className="max-w-md truncate text-ink-muted" dir="ltr">
              {s.userAgent ?? "مرورگر نامشخص"}
            </span>
            <span>
              آخرین فعالیت: {formatPersianDateTime(s.lastSeenAt)}
              {s.id === session.sessionId ? <span className="ms-2 text-success">(همین دستگاه)</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
