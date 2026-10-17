import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { OrderDetails } from "@/components/store/order-details";
import { FormMessage } from "@/components/ui/form";
import { getCustomerSession } from "@/server/auth/current";
import { ORDER_ACCESS_COOKIE, orderAccessFromCookie } from "@/server/http/cookies";
import { getOrderForCustomer } from "@/server/services/orders";
import { privateMetadata } from "@/server/seo";
import { OrderActions } from "./order-actions";

export const metadata = { ...privateMetadata("جزئیات سفارش"), referrer: "no-referrer" as const };

type Params = Promise<{ orderNumber: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * صفحهٔ سفارش. دسترسی فقط برای صاحب حساب، یا مهمانی که توکن دسترسی (کوکی یا پیوند ایمیل) دارد.
 * برای هر کس دیگری ۴۰۴ برمی‌گردد تا وجود سفارش افشا نشود.
 */
export default function OrderPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-8">
      <Suspense fallback={<div className="skeleton h-[32rem] rounded-[var(--radius-panel)]" />}>
        <OrderContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { orderNumber: raw } = await params;
  const orderNumber = raw.toUpperCase().slice(0, 32);
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : null;
  const session = await getCustomerSession();
  const cookieStore = await cookies();
  const accessToken = key ?? orderAccessFromCookie(cookieStore.get(ORDER_ACCESS_COOKIE)?.value, orderNumber);
  const order = await getOrderForCustomer(orderNumber, { userId: session?.user.id, accessToken });
  if (!order) notFound();

  return (
    <>
      <Breadcrumbs items={session ? [{ name: "حساب من", path: "/account" }, { name: "سفارش‌ها", path: "/account/orders" }, { name: order.orderNumber, path: `/orders/${order.orderNumber}` }] : [{ name: "سفارش", path: `/orders/${order.orderNumber}` }]} />
      <h1 className="mt-6 font-display text-4xl text-burgundy">
        سفارش <span dir="ltr">{order.orderNumber}</span>
      </h1>
      {sp.payment === "error" ? <FormMessage className="mt-6">اتصال به درگاه پرداخت برقرار نشد. می‌توانید دوباره برای پرداخت اقدام کنید.</FormMessage> : null}
      <OrderActions orderNumber={order.orderNumber} accessKey={key} canRetryPayment={order.canRetryPayment} canCancel={order.canCancel} reservationExpiresAt={order.reservationExpiresAt} />
      <div className="mt-10">
        <OrderDetails order={order} />
      </div>
    </>
  );
}
