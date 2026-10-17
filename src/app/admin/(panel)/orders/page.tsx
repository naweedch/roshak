import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Download } from "lucide-react";
import { AccessDenied, AdminPageHeader, AdminPager, AdminSearch, AdminTable } from "@/components/admin/admin-ui";
import { OrderStatusBadge } from "@/components/store/order-details";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status";
import { formatPersianDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { hasPermission } from "@/lib/rbac";
import { orderFilterSchema } from "@/lib/validation/admin";
import { requireStaff } from "@/server/auth/current";
import { listOrdersAdmin } from "@/server/services/admin/orders";

export const metadata = { title: "سفارش‌ها" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { session, allowed } = await requireStaff("order:read");
  if (!allowed) return <AccessDenied />;
  const raw = await searchParams;
  const parsed = orderFilterSchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string" && v !== "")));
  const filters = parsed.success ? parsed.data : orderFilterSchema.parse({});
  const { items, total } = await listOrdersAdmin({ ...filters, pageSize: 25 });
  const base = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "" && e[0] !== "page"));
  const exportQs = new URLSearchParams(base);

  return (
    <>
      <AdminPageHeader
        title="سفارش‌ها"
        description="جست‌وجو بر اساس شماره، ایمیل، نام یا موبایل؛ فیلتر بر اساس وضعیت و تاریخ."
        actions={
          hasPermission(session.user.role, "order:export") ? (
            <a href={`/api/v1/admin/orders/export?${exportQs}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Download /> خروجی CSV
            </a>
          ) : null
        }
      />
      <AdminSearch placeholder="شماره سفارش، ایمیل، نام یا موبایل" defaultValue={filters.q}>
        <select name="status" defaultValue={filters.status ?? ""} aria-label="وضعیت سفارش" className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm">
          <option value="">همهٔ وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""} aria-label="وضعیت پرداخت" className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm">
          <option value="">همهٔ پرداخت‌ها</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-ink-muted">
          از
          <input type="date" name="from" defaultValue={raw.from as string | undefined} className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-3 text-sm" />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-muted">
          تا
          <input type="date" name="to" defaultValue={raw.to as string | undefined} className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-3 text-sm" />
        </label>
      </AdminSearch>
      <AdminTable
        caption="فهرست سفارش‌ها"
        rows={items}
        rowKey={(o) => o.id}
        columns={[
          { header: "شماره", cell: (o) => <Link href={`/admin/orders/${o.id}`} dir="ltr" className="font-mono text-xs text-burgundy hover:underline">{o.orderNumber}</Link> },
          {
            header: "مشتری",
            cell: (o) => (
              <span>
                {o.customerName}
                <span dir="ltr" className="block text-xs text-ink-muted">
                  {o.email}
                </span>
              </span>
            ),
          },
          { header: "وضعیت", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { header: "پرداخت", cell: (o) => <Badge tone={o.paymentStatus === "PAID" ? "success" : o.paymentStatus === "UNPAID" ? "neutral" : "warning"}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</Badge> },
          { header: "مبلغ", cell: (o) => <span className="tabular">{formatMoney(o.grandTotal, o.currency)}</span> },
          { header: "اقلام", cell: (o) => toPersianDigits(o.itemCount) },
          { header: "ثبت", cell: (o) => <span className="text-xs text-ink-muted">{formatPersianDateTime(o.placedAt)}</span> },
        ]}
      />
      <AdminPager page={filters.page} total={total} pageSize={25} href={(p) => `/admin/orders?${new URLSearchParams({ ...Object.fromEntries(base), page: String(p) })}`} />
    </>
  );
}
