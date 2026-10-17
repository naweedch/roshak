import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { AccessDenied, AdminPageHeader, AdminPager, AdminSearch, AdminTable } from "@/components/admin/admin-ui";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { PRODUCT_STATUS_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { hasPermission } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { listProductsAdmin } from "@/server/services/admin/products";

export const metadata = { title: "محصولات" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Products searchParams={searchParams} />
    </Suspense>
  );
}

async function Products({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { session, allowed } = await requireStaff("product:read");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = sp.status === "DRAFT" || sp.status === "ACTIVE" || sp.status === "ARCHIVED" ? sp.status : undefined;
  const { items, total } = await listProductsAdmin({ page, pageSize: 20, q, status });
  const qs = (p: number) => `/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      <AdminPageHeader
        title="محصولات"
        description="ایجاد و ویرایش محصول، تنوع‌های رنگ و سایز، موجودی و تصاویر."
        actions={
          hasPermission(session.user.role, "product:write") ? (
            <Link href="/admin/products/new" className={buttonVariants()}>
              <Plus /> محصول جدید
            </Link>
          ) : null
        }
      />
      <AdminSearch placeholder="جست‌وجوی نام، نامک یا کد کالا" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} aria-label="وضعیت" className="h-10 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm">
          <option value="">همهٔ وضعیت‌ها</option>
          <option value="ACTIVE">منتشر شده</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="ARCHIVED">بایگانی</option>
        </select>
      </AdminSearch>
      <AdminTable
        caption="فهرست محصولات"
        rows={items}
        rowKey={(p) => p.id}
        columns={[
          {
            header: "محصول",
            cell: (p) => (
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-burgundy">
                <span className="relative block h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-ivory-deep">{p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" /> : null}</span>
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-xs text-ink-muted">{p.categoryName}</span>
                </span>
              </Link>
            ),
          },
          { header: "وضعیت", cell: (p) => <Badge tone={p.status === "ACTIVE" ? "success" : p.status === "DRAFT" ? "warning" : "neutral"}>{PRODUCT_STATUS_LABELS[p.status]}</Badge> },
          { header: "قیمت", cell: (p) => <span className="tabular">{formatMoney(p.salePrice ?? p.price, p.currency)}</span> },
          { header: "تنوع / موجودی", cell: (p) => <span className="tabular">{toPersianDigits(p.variantCount)} / {toPersianDigits(p.totalStock)}</span> },
          { header: "فروش", cell: (p) => <span className="tabular">{toPersianDigits(p.salesCount)}</span> },
        ]}
      />
      <AdminPager page={page} total={total} pageSize={20} href={qs} />
    </>
  );
}
