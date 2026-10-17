import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { OrderStatusBadge } from "@/components/store/order-details";
import { Pagination } from "@/components/store/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { formatPersianDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { requireCustomer } from "@/server/auth/current";
import { listCustomerOrders } from "@/server/services/orders";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("سفارش‌های من");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="font-display text-4xl text-burgundy">سفارش‌های من</h1>
      <Suspense fallback={<div className="skeleton mt-8 h-72 rounded-2xl" />}>
        <OrdersList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrdersList({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const session = await requireCustomer("/account/orders");
  const { items, total } = await listCustomerOrders(session.user.id, page, 10);
  if (total === 0) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="هنوز سفارشی ندارید"
        description="پس از اولین خرید، سفارش‌های شما این‌جا نمایش داده می‌شود."
        action={
          <Button asChild>
            <Link href="/shop">مشاهدهٔ لباس‌ها</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <ul className="mt-8 space-y-4">
        {items.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.orderNumber}`} className="flex items-center gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-burgundy/40">
              <span className="arch-3-4 relative block h-20 w-14 shrink-0 overflow-hidden bg-ivory-deep">
                {o.firstItemImage ? <Image src={o.firstItemImage} alt="" fill sizes="56px" className="object-cover" /> : null}
              </span>
              <span className="grid flex-1 gap-1 sm:grid-cols-4 sm:items-center">
                <span dir="ltr" className="font-mono text-sm sm:text-start">
                  {o.orderNumber}
                </span>
                <span className="text-sm text-ink-muted">{formatPersianDate(o.placedAt)}</span>
                <span>
                  <OrderStatusBadge status={o.status} />
                </span>
                <span className="tabular text-sm">
                  {formatMoney(o.grandTotal, o.currency)} · {toPersianDigits(o.itemCount)} کالا
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={Math.ceil(total / 10)} hrefFor={(p) => `/account/orders?page=${p}`} />
    </>
  );
}
