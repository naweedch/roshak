/** اجزای مشترک صفحات پنل مدیریت (سرور و کلاینت) */
import * as React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface-raised p-5", className)}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-display text-xl text-ink">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; tone?: "default" | "warning" | "danger" }) {
  return (
    <div className={cn("rounded-2xl border bg-surface-raised p-5", tone === "warning" ? "border-warning/30" : tone === "danger" ? "border-danger/30" : "border-line")}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="tabular mt-2 font-display text-3xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <ShieldAlert className="mx-auto size-10 text-danger" />
      <h1 className="mt-4 font-display text-3xl">دسترسی ندارید</h1>
      <p className="mt-2 text-ink-muted">نقش شما مجوز مشاهدهٔ این بخش را ندارد. اگر به آن نیاز دارید با مدیر ارشد تماس بگیرید.</p>
      <Link href="/admin" className="mt-6 inline-block text-sm text-burgundy underline underline-offset-4">
        بازگشت به پیشخوان
      </Link>
    </div>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function AdminTable<T>({ columns, rows, rowKey, empty = "موردی یافت نشد", caption }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: string; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface-raised">
      <table className="w-full min-w-[640px] text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="border-b border-line bg-ivory-deep/60 text-start text-xs text-ink-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn("px-4 py-3 text-start font-medium", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-burgundy/[0.02]">
                {columns.map((c) => (
                  <td key={c.header} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPager({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-4 text-xs text-ink-muted">{toPersianDigits(total)} مورد</p>;
  return (
    <nav aria-label="صفحه‌بندی" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-xs text-ink-muted">
        {toPersianDigits(total)} مورد — صفحهٔ {toPersianDigits(page)} از {toPersianDigits(pages)}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-burgundy/40">
            قبلی
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-burgundy/40">
            بعدی
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function AdminSearch({ placeholder, defaultValue, children }: { placeholder: string; defaultValue?: string; children?: React.ReactNode }) {
  return (
    <form className="mb-5 flex flex-wrap items-center gap-2" role="search">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 min-w-56 flex-1 rounded-full border border-line-strong/70 bg-surface-raised px-4 text-sm outline-none focus:border-burgundy"
      />
      {children}
      <button type="submit" className="h-10 rounded-full bg-burgundy px-5 text-sm text-ivory">
        جست‌وجو
      </button>
    </form>
  );
}
