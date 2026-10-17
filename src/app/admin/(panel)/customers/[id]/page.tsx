import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccessDenied, AdminCard, AdminPageHeader, AdminTable, StatCard } from "@/components/admin/admin-ui";
import { CustomerActions } from "@/components/admin/customer-actions";
import { OrderStatusBadge } from "@/components/store/order-details";
import { Badge } from "@/components/ui/misc";
import { PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status";
import { formatPersianDate, formatPersianDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getSettings } from "@/server/queries/public";
import { getCustomerAdmin } from "@/server/services/admin/customers";

export const metadata = { title: "پروندهٔ مشتری" };

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Customer params={params} />
    </Suspense>
  );
}

async function Customer({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { session, allowed } = await requireStaff("customer:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [user, settings] = await Promise.all([
    getCustomerAdmin(id).catch((e) => {
      if (isAppError(e) && e.code === "NOT_FOUND") notFound();
      throw e;
    }),
    getSettings(),
  ]);
  const role = session.user.role;
  const isSelf = session.user.id === user.id;

  return (
    <>
      <AdminPageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        actions={
          <>
            <Badge tone={user.role === "CUSTOMER" ? "neutral" : "midnight"}>{ROLE_LABELS[user.role]}</Badge>
            <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{user.status === "ACTIVE" ? "فعال" : "معلق"}</Badge>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="سفارش‌های پرداخت‌شده" value={toPersianDigits(user.lifetime.paidOrders)} />
        <StatCard label="جمع خرید پرداخت‌شده" value={formatMoney(user.lifetime.paidTotal, settings.currency)} hint="بدون کسر بازپرداخت‌های جزئی" />
        <StatCard label="عضویت از" value={formatPersianDate(user.createdAt)} hint={user.lastLoginAt ? `آخرین ورود: ${formatPersianDateTime(user.lastLoginAt)}` : "هنوز وارد نشده"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <AdminCard title="سفارش‌ها">
            <AdminTable
              caption="سفارش‌های مشتری"
              rows={user.orders}
              rowKey={(o) => o.id}
              empty="این مشتری هنوز سفارشی ثبت نکرده است."
              columns={[
                {
                  header: "شماره",
                  cell: (o) =>
                    hasPermission(role, "order:read") ? (
                      <Link href={`/admin/orders/${o.id}`} dir="ltr" className="font-mono text-xs text-burgundy hover:underline">
                        {o.orderNumber}
                      </Link>
                    ) : (
                      <span dir="ltr" className="font-mono text-xs">
                        {o.orderNumber}
                      </span>
                    ),
                },
                { header: "وضعیت", cell: (o) => <OrderStatusBadge status={o.status} /> },
                { header: "پرداخت", cell: (o) => PAYMENT_STATUS_LABELS[o.paymentStatus] },
                { header: "مبلغ", cell: (o) => <span className="tabular">{formatMoney(o.grandTotal, o.currency)}</span> },
                { header: "تاریخ", cell: (o) => <span className="text-xs text-ink-muted">{formatPersianDate(o.placedAt)}</span> },
              ]}
            />
          </AdminCard>
          <AdminCard title="نشانی‌ها">
            {user.addresses.length === 0 ? (
              <p className="text-sm text-ink-muted">نشانی ذخیره‌شده‌ای ندارد.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {user.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3">
                    {a.province}، {a.city} — {a.addressLine}
                    <span className="ms-2 text-xs text-ink-muted">
                      کد پستی <span dir="ltr">{a.postalCode}</span>
                    </span>
                    {a.isDefault ? <Badge className="ms-2">پیش‌فرض</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
        <div className="space-y-6">
          <AdminCard title="اطلاعات تماس">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-muted">ایمیل</dt>
              <dd dir="ltr" className="text-end">
                {user.email}
              </dd>
              <dt className="text-ink-muted">تأیید ایمیل</dt>
              <dd>{user.emailVerifiedAt ? formatPersianDate(user.emailVerifiedAt) : "تأیید نشده"}</dd>
              <dt className="text-ink-muted">موبایل</dt>
              <dd dir="ltr" className="text-end">
                {user.phone ?? "—"}
              </dd>
              <dt className="text-ink-muted">خبرنامه</dt>
              <dd>{user.marketingOptIn ? "موافق دریافت" : "عدم دریافت"}</dd>
            </dl>
          </AdminCard>
          {hasPermission(role, "customer:write") && !isSelf ? (
            <CustomerActions
              userId={user.id}
              status={user.status}
              role={user.role}
              canChangeRole={hasPermission(role, "staff:manage")}
              canChangeSuper={role === "SUPER_ADMIN"}
            />
          ) : isSelf ? (
            <AdminCard title="حساب شما">
              <p className="text-sm text-ink-muted">برای جلوگیری از قفل‌شدن، نقش و وضعیت حساب خودتان از این‌جا قابل تغییر نیست.</p>
            </AdminCard>
          ) : null}
          <AdminCard title="یادداشت‌های داخلی">
            {user.notes.length === 0 ? (
              <p className="text-sm text-ink-muted">یادداشتی ثبت نشده است.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {user.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-ivory-deep/60 p-3">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {n.authorEmail ?? "—"} — {formatPersianDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
