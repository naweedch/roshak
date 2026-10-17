import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccessDenied, AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { OrderActionsPanel } from "@/components/admin/order-actions";
import { OrderDetails } from "@/components/store/order-details";
import { Badge } from "@/components/ui/misc";
import { allowedStaffTransitions } from "@/lib/commerce/order-status";
import { formatPersianDateTime } from "@/lib/dates";
import { PAYMENT_ATTEMPT_LABELS, PAYMENT_PROVIDER_LABELS } from "@/lib/labels";
import { formatMoney, toDecimal } from "@/lib/money";
import { hasPermission } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getOrderAdmin } from "@/server/services/admin/orders";

export const metadata = { title: "جزئیات سفارش" };

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { session, allowed } = await requireStaff("order:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const role = session.user.role;
  const detail = await getOrderAdmin(id, { includePayments: hasPermission(role, "order:refund") }).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const { order } = detail;
  const remaining = toDecimal(order.grandTotal).minus(toDecimal(order.refundedTotal));
  const internalEvents = order.events.filter((e) => !e.isPublic);

  return (
    <>
      <AdminPageHeader title={`سفارش ${order.orderNumber}`} description={`${order.customerName} — ${order.email} — ${order.phone}`} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AdminCard>
          <OrderDetails order={order} />
        </AdminCard>
        <div className="space-y-6">
          {hasPermission(role, "order:write") || hasPermission(role, "order:refund") ? (
            <OrderActionsPanel
              orderId={order.id}
              currency={order.currency}
              transitions={hasPermission(role, "order:write") ? allowedStaffTransitions(order.status) : []}
              canRefund={hasPermission(role, "order:refund") && (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED")}
              refundable={remaining.toFixed(2)}
              canNote={hasPermission(role, "order:write")}
            />
          ) : null}
          {detail.userId && hasPermission(role, "customer:read") ? (
            <AdminCard title="مشتری">
              <Link href={`/admin/customers/${detail.userId}`} className="text-sm text-burgundy underline underline-offset-4">
                مشاهدهٔ پروندهٔ مشتری
              </Link>
            </AdminCard>
          ) : (
            <AdminCard title="مشتری">
              <p className="text-sm text-ink-muted">{detail.userId ? "پرونده در دسترس نقش شما نیست." : "خرید مهمان (بدون حساب کاربری)"}</p>
            </AdminCard>
          )}
          {detail.payments.length ? (
            <AdminCard title="پرداخت‌ها">
              <ul className="space-y-3 text-sm">
                {detail.payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between">
                      <span>{PAYMENT_PROVIDER_LABELS[p.provider]}</span>
                      <Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "PENDING" ? "warning" : "danger"}>{PAYMENT_ATTEMPT_LABELS[p.status]}</Badge>
                    </div>
                    <p className="tabular mt-1">{formatMoney(p.amount, p.currency)}</p>
                    {p.providerTransactionId ? (
                      <p className="text-xs text-ink-muted">
                        شمارهٔ پیگیری: <span dir="ltr">{p.providerTransactionId}</span>
                      </p>
                    ) : null}
                    {p.cardPanMasked ? (
                      <p className="text-xs text-ink-muted">
                        کارت: <span dir="ltr">{p.cardPanMasked}</span>
                      </p>
                    ) : null}
                    {p.failureReason ? <p className="text-xs text-danger">{p.failureReason}</p> : null}
                    <p className="text-xs text-ink-soft">{formatPersianDateTime(p.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
          {detail.refunds.length ? (
            <AdminCard title="بازپرداخت‌ها">
              <ul className="space-y-2 text-sm">
                {detail.refunds.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-3">
                    <p className="tabular font-medium">{formatMoney(r.amount, r.currency)}</p>
                    <p className="text-xs text-ink-muted">{r.reason}</p>
                    <p className="text-xs text-ink-soft">
                      {r.createdByEmail} — {formatPersianDateTime(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
          {internalEvents.length ? (
            <AdminCard title="یادداشت‌ها و رویدادهای داخلی">
              <ul className="space-y-2 text-sm">
                {internalEvents.map((e) => (
                  <li key={e.id} className="rounded-xl bg-ivory-deep/60 p-3">
                    <p>{e.message}</p>
                    <p className="text-xs text-ink-soft">
                      {e.actorEmail ?? "سیستم"} — {formatPersianDateTime(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
        </div>
      </div>
    </>
  );
}
