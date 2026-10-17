import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader, AdminPager, AdminSearch, AdminTable } from "@/components/admin/admin-ui";
import { formatPersianDateTime } from "@/lib/dates";
import { requireStaff } from "@/server/auth/current";
import { listAuditLogs } from "@/server/services/admin/content-admin";

export const metadata = { title: "گزارش ممیزی" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 40;

const ENTITY_TYPES: Record<string, string> = {
  Product: "محصول",
  ProductVariant: "تنوع",
  Order: "سفارش",
  User: "کاربر",
  Discount: "تخفیف",
  Category: "دسته",
  Collection: "مجموعه",
  StoreSettings: "تنظیمات",
  ShippingMethod: "روش ارسال",
  Banner: "بنر",
  Announcement: "اطلاعیه",
  ContentPage: "صفحه",
  Article: "مقاله",
  FaqItem: "پرسش",
  Review: "نظر",
  MediaAsset: "رسانه",
};

function changesText(changes: unknown): string {
  if (!changes || typeof changes !== "object") return "";
  const text = JSON.stringify(changes);
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { allowed } = await requireStaff("audit:read");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1));
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 100) : undefined;
  const entityType = typeof sp.entityType === "string" && sp.entityType in ENTITY_TYPES ? sp.entityType : undefined;
  const { items, total } = await listAuditLogs({ page, pageSize: PAGE_SIZE, q, entityType });
  const qs = (p: number) => new URLSearchParams({ ...(q ? { q } : {}), ...(entityType ? { entityType } : {}), page: String(p) }).toString();

  return (
    <>
      <AdminPageHeader title="گزارش ممیزی" description="ثبت تغییرناپذیر اقدامات کارکنان: چه کسی، چه زمانی، از کجا و چه چیزی را تغییر داد." />
      <AdminSearch placeholder="ایمیل کارمند، اقدام یا شناسه" defaultValue={q}>
        <select name="entityType" defaultValue={entityType ?? ""} aria-label="نوع موجودیت" className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm">
          <option value="">همهٔ موجودیت‌ها</option>
          {Object.entries(ENTITY_TYPES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </AdminSearch>
      <AdminTable
        caption="رویدادهای ممیزی"
        rows={items}
        rowKey={(a) => a.id}
        empty="رویدادی ثبت نشده است."
        columns={[
          { header: "زمان", cell: (a) => <span className="whitespace-nowrap text-xs text-ink-muted">{formatPersianDateTime(a.createdAt)}</span> },
          { header: "کارمند", cell: (a) => <span dir="ltr" className="text-xs">{a.actorEmail ?? "سیستم"}</span> },
          {
            header: "اقدام",
            cell: (a) => (
              <span>
                {a.summary}
                <span dir="ltr" className="block font-mono text-[0.7rem] text-ink-soft">
                  {a.action}
                </span>
              </span>
            ),
          },
          { header: "موجودیت", cell: (a) => ENTITY_TYPES[a.entityType] ?? a.entityType },
          { header: "تغییرات", cell: (a) => <code dir="ltr" className="block max-w-xs break-all text-[0.7rem] text-ink-muted">{changesText(a.changes)}</code> },
          { header: "IP", cell: (a) => <span dir="ltr" className="text-xs text-ink-soft">{a.ipAddress ?? "—"}</span> },
        ]}
      />
      <AdminPager page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/admin/audit?${qs(p)}`} />
    </>
  );
}
