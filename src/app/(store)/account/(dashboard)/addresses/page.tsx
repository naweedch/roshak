import { Suspense } from "react";
import { connection } from "next/server";
import { AddressManager } from "@/components/account/account-forms";
import { requireCustomer } from "@/server/auth/current";
import { listAddresses } from "@/server/services/customer";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("آدرس‌های من");

export default function AddressesPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-burgundy">آدرس‌های من</h1>
      <p className="mb-8 mt-2 text-ink-muted">آدرس پیش‌فرض در مرحلهٔ تسویه به‌طور خودکار انتخاب می‌شود.</p>
      <Suspense fallback={<div className="skeleton h-48 rounded-2xl" />}>
        <Addresses />
      </Suspense>
    </>
  );
}

async function Addresses() {
  await connection();
  const session = await requireCustomer("/account/addresses");
  const items = await listAddresses(session.user.id);
  return (
    <AddressManager
      addresses={items.map((a) => ({
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
    />
  );
}
