import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader, AdminPager, AdminSearch, AdminTable } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/misc";
import { formatPersianDate } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import { ROLE_LABELS } from "@/lib/rbac";
import { listQuerySchema } from "@/lib/validation/admin";
import { requireStaff } from "@/server/auth/current";
import { listCustomersAdmin } from "@/server/services/admin/customers";

export const metadata = { title: "مشتریان" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 25;

export default function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { allowed } = await requireStaff("customer:read");
  if (!allowed) return <AccessDenied />;
  const raw = await searchParams;
  const parsed = listQuerySchema.safeParse({ q: typeof raw.q === "string" && raw.q ? raw.q : undefined, page: raw.page });
  const query = parsed.success ? parsed.data : listQuerySchema.parse({});
  const staffOnly = raw.staff === "1";
  const { items, total } = await listCustomersAdmin({ page: query.page, pageSize: PAGE_SIZE, q: query.q, staffOnly });
  const qs = (page: number) => new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(staffOnly ? { staff: "1" } : {}), page: String(page) }).toString();

  return (
    <>
      <AdminPageHeader title="مشتریان و کارکنان" description="فهرست حساب‌های کاربری. رمز عبور هیچ کاربری قابل مشاهده نیست." />
      <AdminSearch placeholder="ایمیل، نام یا موبایل" defaultValue={query.q}>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="staff" value="1" defaultChecked={staffOnly} className="size-4 accent-burgundy" /> فقط کارکنان
        </label>
      </AdminSearch>
      <AdminTable
        caption="فهرست کاربران"
        rows={items}
        rowKey={(u) => u.id}
        columns={[
          {
            header: "نام",
            cell: (u) => (
              <Link href={`/admin/customers/${u.id}`} className="text-burgundy hover:underline">
                {u.name}
              </Link>
            ),
          },
          { header: "ایمیل", cell: (u) => <span dir="ltr" className="text-xs">{u.email}</span> },
          { header: "نقش", cell: (u) => <Badge tone={u.role === "CUSTOMER" ? "neutral" : "midnight"}>{ROLE_LABELS[u.role]}</Badge> },
          { header: "وضعیت", cell: (u) => <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status === "ACTIVE" ? "فعال" : "معلق"}</Badge> },
          { header: "سفارش‌ها", cell: (u) => toPersianDigits(u.orderCount) },
          { header: "عضویت", cell: (u) => <span className="text-xs text-ink-muted">{formatPersianDate(u.createdAt)}</span> },
          { header: "آخرین ورود", cell: (u) => <span className="text-xs text-ink-muted">{u.lastLoginAt ? formatPersianDate(u.lastLoginAt) : "—"}</span> },
        ]}
      />
      <AdminPager page={query.page} total={total} pageSize={PAGE_SIZE} href={(p) => `/admin/customers?${qs(p)}`} />
    </>
  );
}
