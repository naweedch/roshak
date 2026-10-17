import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { getCustomerSession } from "@/server/auth/current";
import { ORDER_ACCESS_COOKIE, orderAccessFromCookie } from "@/server/http/cookies";
import { getOrderForCustomer } from "@/server/services/orders";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("نتیجهٔ پرداخت");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * صفحهٔ نتیجه پس از بازگشت از درگاه. وضعیت نمایش‌داده‌شده از دیتابیس خوانده می‌شود
 * (پارامتر status فقط برای پیام اولیه است و هرگز وضعیت سفارش را تعیین نمی‌کند).
 */
export default function CheckoutResultPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <Suspense fallback={<div className="skeleton h-80 rounded-[var(--radius-panel)]" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order.toUpperCase().slice(0, 32) : null;
  const session = await getCustomerSession();
  const cookieStore = await cookies();
  const order = orderNumber
    ? await getOrderForCustomer(orderNumber, {
        userId: session?.user.id,
        accessToken: orderAccessFromCookie(cookieStore.get(ORDER_ACCESS_COOKIE)?.value, orderNumber),
      })
    : null;

  if (!order) {
    return (
      <Panel icon={<XCircle className="size-10 text-danger" />} title="اطلاعات پرداخت یافت نشد">
        <p>اگر مبلغی از حساب شما کسر شده است، طی ۷۲ ساعت توسط بانک بازگردانده می‌شود. برای پیگیری با پشتیبانی تماس بگیرید.</p>
        <Button asChild className="mt-6">
          <Link href="/orders/track">پیگیری سفارش</Link>
        </Button>
      </Panel>
    );
  }

  if (order.paymentStatus === "PAID") {
    return (
      <Panel icon={<CheckCircle2 className="size-10 text-success" />} title="سفارش شما ثبت شد">
        <p>
          پرداخت سفارش <strong dir="ltr">{order.orderNumber}</strong> به مبلغ {formatMoney(order.grandTotal, order.currency)} تأیید شد. رسید به {order.email} ارسال می‌شود.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/orders/${order.orderNumber}`}>مشاهدهٔ سفارش</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/shop">ادامهٔ خرید</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  if (order.status === "PENDING_PAYMENT") {
    const failed = sp.status === "failed";
    return (
      <Panel icon={failed ? <XCircle className="size-10 text-danger" /> : <Clock className="size-10 text-warning" />} title={failed ? "پرداخت انجام نشد" : "در انتظار تأیید پرداخت"}>
        <p>
          {failed
            ? "پرداخت سفارش ناموفق بود یا لغو شد. کالاها هنوز برای شما رزرو هستند و می‌توانید دوباره پرداخت کنید."
            : "نتیجهٔ پرداخت هنوز از بانک دریافت نشده است. چند لحظه بعد صفحهٔ سفارش را بررسی کنید."}
        </p>
        {order.reservationExpiresAt ? (
          <p className="mt-2 text-sm text-ink-muted">
            مهلت پرداخت: تا ساعت {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(order.reservationExpiresAt))}
          </p>
        ) : null}
        <Button asChild className="mt-6">
          <Link href={`/orders/${order.orderNumber}`}>رفتن به صفحهٔ سفارش و پرداخت دوباره</Link>
        </Button>
      </Panel>
    );
  }

  return (
    <Panel icon={<XCircle className="size-10 text-danger" />} title="سفارش لغو شده است">
      <p>مهلت پرداخت سفارش {toPersianDigits(order.orderNumber)} به پایان رسیده و سفارش لغو شده است.</p>
      <Button asChild className="mt-6">
        <Link href="/shop">بازگشت به فروشگاه</Link>
      </Button>
    </Panel>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-surface-raised p-10 text-center">
      <div className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-ivory-deep">{icon}</div>
      <h1 className="font-display text-4xl text-burgundy">{title}</h1>
      <div className="mt-4 leading-8 text-ink-muted">{children}</div>
    </div>
  );
}
