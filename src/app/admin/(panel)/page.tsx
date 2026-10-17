import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied, AdminCard, AdminPageHeader, AdminTable, StatCard } from "@/components/admin/admin-ui";
import { SalesChart } from "@/components/admin/sales-chart";
import { OrderStatusBadge } from "@/components/store/order-details";
import { formatPersianDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/current";
import { getDashboardMetrics } from "@/server/services/admin/dashboard";

export const metadata = { title: "پیشخوان" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const RANGES = [7, 30, 90, 365];

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-[40rem] rounded-2xl" />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { session, allowed } = await requireStaff("dashboard:view");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const m = await getDashboardMetrics(days);
  const canSeeRevenue = hasPermission(session.user.role, "analytics:revenue");

  return (
    <>
      <AdminPageHeader
        title={`سلام ${session.user.firstName}`}
        description={`شاخص‌های ${toPersianDigits(days)} روز اخیر بر اساس زمان ثبت سفارش. درآمد = مبلغ سفارش‌های پرداخت‌شده منهای بازپرداخت‌ها.`}
        actions={
          <nav aria-label="بازهٔ زمانی" className="flex gap-1 rounded-full border border-line bg-surface-raised p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?days=${r}`}
                aria-current={r === days ? "true" : undefined}
                className={cn("rounded-full px-3 py-1 text-xs", r === days ? "bg-burgundy text-ivory" : "text-ink-muted hover:text-ink")}
              >
                {toPersianDigits(r)} روز
              </Link>
            ))}
          </nav>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="سفارش‌های ثبت‌شده" value={toPersianDigits(m.orders)} hint={`${toPersianDigits(m.paidOrders)} سفارش پرداخت‌شده`} />
        {canSeeRevenue ? <StatCard label="درآمد خالص" value={formatMoney(m.revenue, m.currency)} /> : null}
        {canSeeRevenue ? <StatCard label="میانگین ارزش سفارش" value={formatMoney(m.averageOrderValue, m.currency)} hint="درآمد ÷ سفارش‌های پرداخت‌شده" /> : null}
        <StatCard label="مشتریان" value={toPersianDigits(m.customers)} hint={`${toPersianDigits(m.newCustomers)} ثبت‌نام در این بازه`} />
        <StatCard label="در انتظار پرداخت" value={toPersianDigits(m.pendingPaymentOrders)} hint="رزرو موجودی تا پایان مهلت پرداخت" tone={m.pendingPaymentOrders ? "warning" : "default"} />
        <StatCard label="آمادهٔ ارسال" value={toPersianDigits(m.toFulfillOrders)} hint="تأییدشده یا در حال آماده‌سازی" tone={m.toFulfillOrders ? "warning" : "default"} />
        <StatCard label="موجودی کم" value={toPersianDigits(m.lowStock.length)} hint="تنوع فعال با موجودی ≤ آستانه" tone={m.lowStock.length ? "danger" : "default"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard title={canSeeRevenue ? "روند فروش روزانه" : "تعداد سفارش پرداخت‌شدهٔ روزانه"}>
          <SalesChart data={canSeeRevenue ? m.salesByDay : m.salesByDay.map((d) => ({ ...d, revenue: null }))} currency={m.currency} />
        </AdminCard>
        <AdminCard title="پرفروش‌ترین‌ها">
          {m.bestSellers.length === 0 ? (
            <p className="text-sm text-ink-muted">هنوز فروشی ثبت نشده است.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {m.bestSellers.map((b) => (
                <li key={b.productId ?? b.name} className="flex items-center justify-between gap-3">
                  <span>{b.productId ? <Link href={`/admin/products/${b.productId}`} className="hover:text-burgundy">{b.name}</Link> : b.name}</span>
                  <span className="tabular text-ink-muted">
                    {toPersianDigits(b.quantity)} عدد{canSeeRevenue ? ` — ${formatMoney(b.revenue, m.currency)}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard title="آخرین سفارش‌ها" actions={<Link href="/admin/orders" className="text-xs text-burgundy">همه</Link>}>
          <AdminTable
            rows={m.recentOrders}
            rowKey={(o) => o.id}
            empty="هنوز سفارشی ثبت نشده است"
            columns={[
              { header: "شماره", cell: (o) => <Link href={`/admin/orders/${o.id}`} dir="ltr" className="font-mono text-xs text-burgundy">{o.orderNumber}</Link> },
              { header: "مشتری", cell: (o) => o.customerName },
              { header: "وضعیت", cell: (o) => <OrderStatusBadge status={o.status as never} /> },
              { header: "مبلغ", cell: (o) => <span className="tabular">{formatMoney(o.grandTotal, m.currency)}</span> },
              { header: "زمان", cell: (o) => <span className="text-xs text-ink-muted">{formatPersianDateTime(o.placedAt)}</span> },
            ]}
          />
        </AdminCard>
        <AdminCard title="هشدار موجودی" actions={<Link href="/admin/inventory?low=1" className="text-xs text-burgundy">همه</Link>}>
          <AdminTable
            rows={m.lowStock}
            rowKey={(v) => v.variantId}
            empty="همهٔ تنوع‌ها موجودی کافی دارند"
            columns={[
              { header: "محصول", cell: (v) => <Link href={`/admin/products/${v.productId}`} className="hover:text-burgundy">{v.productName}</Link> },
              { header: "کد کالا", cell: (v) => <span dir="ltr" className="font-mono text-xs">{v.sku}</span> },
              { header: "موجودی", cell: (v) => <span className={cn("tabular font-semibold", v.stock === 0 ? "text-danger" : "text-warning")}>{toPersianDigits(v.stock)}</span> },
            ]}
          />
        </AdminCard>
      </div>

      {m.topSearches.length ? (
        <AdminCard title="پرتکرارترین جست‌وجوها" className="mt-6">
          <ul className="flex flex-wrap gap-2 text-sm">
            {m.topSearches.map((s) => (
              <li key={s.term} className="rounded-full border border-line px-3 py-1">
                {s.term} <span className="text-xs text-ink-muted">({toPersianDigits(s.count)}{s.zeroResults ? `، ${toPersianDigits(s.zeroResults)} بی‌نتیجه` : ""})</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}
    </>
  );
}
