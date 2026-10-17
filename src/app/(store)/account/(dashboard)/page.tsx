import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ProfileForm, ResendVerification } from "@/components/account/account-forms";
import { OrderStatusBadge } from "@/components/store/order-details";
import { FormMessage } from "@/components/ui/form";
import { formatPersianDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCustomer } from "@/server/auth/current";
import { getProfile } from "@/server/services/customer";
import { listCustomerOrders } from "@/server/services/orders";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("حساب کاربری");

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-[var(--radius-panel)]" />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  const session = await requireCustomer("/account");
  const [profile, orders] = await Promise.all([getProfile(session.user.id), listCustomerOrders(session.user.id, 1, 3)]);
  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-4xl text-burgundy">سلام {profile.firstName} عزیز</h1>
        <p className="mt-2 text-ink-muted">از این‌جا سفارش‌ها، آدرس‌ها و اطلاعات حساب خود را مدیریت کنید.</p>
      </header>
      {!profile.emailVerifiedAt ? (
        <FormMessage tone="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>ایمیل شما هنوز تأیید نشده است؛ پیوند تأیید به {profile.email} ارسال شده است.</span>
            <ResendVerification />
          </div>
        </FormMessage>
      ) : null}
      <section aria-labelledby="recent-orders">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="font-display text-2xl">
            آخرین سفارش‌ها
          </h2>
          <Link href="/account/orders" className="text-sm text-burgundy underline-offset-4 hover:underline">
            همهٔ سفارش‌ها
          </Link>
        </div>
        {orders.items.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            هنوز سفارشی ثبت نکرده‌اید.{" "}
            <Link href="/shop" className="text-burgundy underline underline-offset-4">
              مشاهدهٔ لباس‌ها
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {orders.items.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-burgundy/[0.03]">
                  <span dir="ltr" className="font-mono text-sm">
                    {o.orderNumber}
                  </span>
                  <span className="text-sm text-ink-muted">{formatPersianDate(o.placedAt)}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="tabular text-sm">{formatMoney(o.grandTotal, o.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-display text-2xl">
          اطلاعات حساب
        </h2>
        <p className="mb-5 mt-1 text-sm text-ink-muted" dir="ltr">
          {profile.email}
        </p>
        <ProfileForm initial={{ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone, marketingOptIn: profile.marketingOptIn }} />
      </section>
    </div>
  );
}
