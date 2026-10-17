import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader, AdminPager, AdminSearch, AdminTable } from "@/components/admin/admin-ui";
import { StockAdjustButton } from "@/components/admin/stock-adjust";
import { Badge } from "@/components/ui/misc";
import { formatPersianDateTime } from "@/lib/dates";
import { INVENTORY_REASON_LABELS } from "@/lib/labels";
import { toPersianDigits } from "@/lib/persian";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/current";
import { listInventory, listInventoryMovements } from "@/server/services/admin/catalog-admin";
import { loadStoreSettings } from "@/server/services/settings";

export const metadata = { title: "انبار" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 30;

export default function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Inventory searchParams={searchParams} />
    </Suspense>
  );
}

async function Inventory({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { session, allowed } = await requireStaff("inventory:read");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const view = sp.view === "movements" ? "movements" : "stock";
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1));
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 100) : undefined;
  const lowOnly = sp.low === "1";
  const canWrite = hasPermission(session.user.role, "inventory:write");

  const tabs = (
    <nav aria-label="نمای انبار" className="mb-6 flex gap-2">
      {[
        { key: "stock", label: "موجودی" },
        { key: "movements", label: "تاریخچهٔ حرکات" },
      ].map((t) => (
        <Link
          key={t.key}
          href={`/admin/inventory?view=${t.key}`}
          aria-current={view === t.key ? "page" : undefined}
          className={cn("rounded-full border px-4 py-1.5 text-sm", view === t.key ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (view === "movements") {
    const { items, total } = await listInventoryMovements({ page, pageSize: PAGE_SIZE });
    return (
      <>
        <AdminPageHeader title="انبار" description="هر تغییر موجودی (فروش، لغو، مرجوعی، اصلاح دستی) با علت و عامل ثبت می‌شود." />
        {tabs}
        <AdminTable
          caption="تاریخچهٔ حرکات انبار"
          rows={items}
          rowKey={(m) => m.id}
          empty="هنوز حرکتی ثبت نشده است."
          columns={[
            { header: "زمان", cell: (m) => <span className="text-xs text-ink-muted">{formatPersianDateTime(m.createdAt)}</span> },
            {
              header: "کالا",
              cell: (m) => (
                <span>
                  {m.productName}
                  <span dir="ltr" className="block font-mono text-xs text-ink-muted">
                    {m.sku}
                  </span>
                </span>
              ),
            },
            { header: "تغییر", cell: (m) => <span className={cn("tabular font-medium", m.delta > 0 ? "text-success" : "text-danger")} dir="ltr">{m.delta > 0 ? `+${m.delta}` : m.delta}</span> },
            { header: "موجودی پس از", cell: (m) => toPersianDigits(m.stockAfter) },
            { header: "علت", cell: (m) => INVENTORY_REASON_LABELS[m.reason] },
            {
              header: "مرجع",
              cell: (m) =>
                m.order ? (
                  <Link href={`/admin/orders/${m.order.id}`} dir="ltr" className="font-mono text-xs text-burgundy hover:underline">
                    {m.order.orderNumber}
                  </Link>
                ) : (
                  <span className="text-xs text-ink-muted">{m.actorEmail ?? "سیستم"}</span>
                ),
            },
            { header: "توضیح", cell: (m) => <span className="text-xs">{m.note ?? ""}</span> },
          ]}
        />
        <AdminPager page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/admin/inventory?view=movements&page=${p}`} />
      </>
    );
  }

  const settings = await loadStoreSettings();
  const { items, total } = await listInventory({ page, pageSize: PAGE_SIZE, q, lowOnly, threshold: settings.lowStockThreshold });
  const qs = (p: number) => new URLSearchParams({ ...(q ? { q } : {}), ...(lowOnly ? { low: "1" } : {}), page: String(p) }).toString();

  return (
    <>
      <AdminPageHeader title="انبار" description={`آستانهٔ پیش‌فرض موجودی کم: ${toPersianDigits(settings.lowStockThreshold)} عدد (قابل تغییر در تنظیمات یا برای هر تنوع).`} />
      {tabs}
      <AdminSearch placeholder="کد کالا یا نام محصول" defaultValue={q}>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="low" value="1" defaultChecked={lowOnly} className="size-4 accent-burgundy" /> فقط موجودی کم
        </label>
      </AdminSearch>
      <AdminTable
        caption="موجودی تنوع‌ها"
        rows={items}
        rowKey={(v) => v.id}
        empty={lowOnly ? "هیچ تنوع فعالی زیر آستانهٔ موجودی نیست." : "تنوعی یافت نشد."}
        columns={[
          {
            header: "محصول",
            cell: (v) => (
              <Link href={`/admin/products/${v.productId}`} className="text-burgundy hover:underline">
                {v.productName}
              </Link>
            ),
          },
          { header: "کد کالا", cell: (v) => <span dir="ltr" className="font-mono text-xs">{v.sku}</span> },
          {
            header: "رنگ / سایز",
            cell: (v) => (
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-3.5 rounded-full border border-line" style={{ backgroundColor: v.colorHex }} />
                {v.colorName} — {v.sizeLabel}
              </span>
            ),
          },
          {
            header: "موجودی",
            cell: (v) => (
              <Badge tone={v.stock === 0 ? "danger" : v.stock <= v.threshold ? "warning" : "success"}>
                {v.stock === 0 ? "ناموجود" : `${toPersianDigits(v.stock)} عدد`}
              </Badge>
            ),
          },
          { header: "وضعیت", cell: (v) => (v.isActive ? (v.productStatus === "ACTIVE" ? "در فروش" : "محصول منتشر نشده") : "تنوع غیرفعال") },
          ...(canWrite ? [{ header: "اصلاح", cell: (v: (typeof items)[number]) => <StockAdjustButton variantId={v.id} sku={v.sku} stock={v.stock} /> }] : []),
        ]}
      />
      <AdminPager page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/admin/inventory?${qs(p)}`} />
    </>
  );
}
