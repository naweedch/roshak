import { Suspense } from "react";
import { connection } from "next/server";
import { getCustomerSession } from "@/server/auth/current";
import { availablePaymentProviders } from "@/server/payments";
import { getSettings, getShippingMethods } from "@/server/queries/public";
import { listAddresses } from "@/server/services/customer";
import { privateMetadata } from "@/server/seo";
import { CheckoutForm } from "./checkout-form";

export const metadata = privateMetadata("تسویه حساب");

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-10 sm:px-8">
      <h1 className="font-display text-5xl text-burgundy">تکمیل خرید</h1>
      <Suspense fallback={<div className="skeleton mt-10 h-[40rem] rounded-[var(--radius-panel)]" aria-busy />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

async function CheckoutContent() {
  await connection();
  const [session, settings, methods] = await Promise.all([getCustomerSession(), getSettings(), getShippingMethods()]);
  const providers = availablePaymentProviders(settings.enabledPaymentProviders).map((p) => ({ id: p.id, label: p.label }));
  const addresses = session ? await listAddresses(session.user.id) : [];
  return (
    <CheckoutForm
      user={session ? { firstName: session.user.firstName, lastName: session.user.lastName, email: session.user.email, phone: session.user.phone } : null}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipientName: a.recipientName,
        phone: a.phone,
        province: a.province,
        city: a.city,
        addressLine: a.addressLine,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      }))}
      shippingMethods={methods}
      paymentProviders={providers}
      reservationMinutes={settings.reservationMinutes}
    />
  );
}
