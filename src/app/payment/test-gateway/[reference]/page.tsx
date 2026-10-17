import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RoshakLogo } from "@/components/brand/logo";
import { formatMoney } from "@/lib/money";
import { db } from "@/server/db";
import { isTestPaymentEnabled } from "@/server/env";
import { privateMetadata } from "@/server/seo";
import { TestGatewayActions } from "./actions";

export const metadata = privateMetadata("درگاه پرداخت آزمایشی");

/**
 * صفحهٔ «درگاه آزمایشی» که نقش صفحهٔ بانک را در محیط توسعه بازی می‌کند.
 * به‌صراحت اعلام می‌کند که پرداخت واقعی انجام نمی‌شود. در محیط عملیاتی (بدون اجازهٔ صریح) در دسترس نیست.
 */
export default function TestGatewayPage({ params }: { params: Promise<{ reference: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[repeating-linear-gradient(45deg,#fff8ef,#fff8ef_18px,#fbf1dc_18px,#fbf1dc_36px)] px-4 py-10">
      <Suspense fallback={<div className="skeleton h-96 w-full max-w-md rounded-[var(--radius-panel)]" />}>
        <Gateway params={params} />
      </Suspense>
    </main>
  );
}

async function Gateway({ params }: { params: Promise<{ reference: string }> }) {
  await connection();
  if (!isTestPaymentEnabled()) notFound();
  const { reference } = await params;
  const transaction = await db.testGatewayTransaction.findUnique({ where: { reference } });
  if (!transaction) notFound();
  const payment = await db.payment.findFirst({ where: { provider: "TEST", providerReference: reference }, include: { order: { select: { orderNumber: true } } } });

  return (
    <div className="w-full max-w-md rounded-[var(--radius-panel)] border-2 border-warning/40 bg-white p-8 shadow-float">
      <div className="mb-6 rounded-2xl bg-warning-soft p-4 text-center text-sm leading-7 text-warning" role="note">
        <strong className="block text-base">درگاه پرداخت آزمایشی</strong>
        این صفحه فقط برای توسعه و تست است. هیچ پولی جابه‌جا نمی‌شود و اطلاعات کارت دریافت نمی‌شود.
      </div>
      <div className="flex justify-center text-burgundy">
        <RoshakLogo />
      </div>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">شمارهٔ سفارش</dt>
          <dd dir="ltr" className="font-mono">
            {payment?.order.orderNumber ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">مبلغ</dt>
          <dd className="tabular font-semibold">{formatMoney(transaction.amount.toString(), transaction.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">وضعیت تراکنش</dt>
          <dd>{transaction.status === "PENDING" ? "در انتظار تصمیم" : transaction.status === "SUCCEEDED" ? "پرداخت‌شده" : "ناموفق"}</dd>
        </div>
      </dl>
      <TestGatewayActions reference={reference} decided={transaction.status !== "PENDING"} />
    </div>
  );
}
