import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader } from "@/components/admin/admin-ui";
import { DiscountManager } from "@/components/admin/managers";
import { hasPermission } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { discountTargetOptions, listDiscountsAdmin } from "@/server/services/admin/catalog-admin";
import { loadStoreSettings } from "@/server/services/settings";

export const metadata = { title: "تخفیف‌ها" };

export default function DiscountsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Discounts />
    </Suspense>
  );
}

async function Discounts() {
  await connection();
  const { session, allowed } = await requireStaff("discount:read");
  if (!allowed) return <AccessDenied />;
  const [items, options, settings] = await Promise.all([listDiscountsAdmin(), discountTargetOptions(), loadStoreSettings()]);
  return (
    <>
      <AdminPageHeader
        title="کدهای تخفیف"
        description="تخفیف هنگام ثبت سفارش در سرور و در یک تراکنش دوباره بررسی می‌شود (اعتبار زمانی، سقف استفاده، حداقل سفارش و دامنه)."
      />
      <DiscountManager items={items} canWrite={hasPermission(session.user.role, "discount:write")} products={options.products} collections={options.collections} storeCurrency={settings.currency} />
    </>
  );
}
