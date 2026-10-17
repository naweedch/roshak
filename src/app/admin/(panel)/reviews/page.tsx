import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader, AdminPager } from "@/components/admin/admin-ui";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { Badge, RatingStars } from "@/components/ui/misc";
import { formatPersianDateTime } from "@/lib/dates";
import { REVIEW_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/current";
import { listReviewsAdmin } from "@/server/services/admin/content-admin";

export const metadata = { title: "نظرات" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 20;
const FILTERS = [
  { key: "PENDING", label: "در انتظار بررسی" },
  { key: "APPROVED", label: "تأیید شده" },
  { key: "REJECTED", label: "رد شده" },
  { key: "ALL", label: "همه" },
] as const;

export default function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Reviews searchParams={searchParams} />
    </Suspense>
  );
}

async function Reviews({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { allowed } = await requireStaff("review:moderate");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "PENDING";
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1));
  const { items, total } = await listReviewsAdmin({ page, pageSize: PAGE_SIZE, status: filter === "ALL" ? undefined : filter });

  return (
    <>
      <AdminPageHeader title="نظرات مشتریان" description="فقط نظرات تأییدشده در فروشگاه نمایش داده می‌شوند. «منتخب» یعنی نمایش در بخش نظرات صفحهٔ اصلی." />
      <nav aria-label="فیلتر وضعیت" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/reviews?status=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm", filter === f.key ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface-raised px-4 py-10 text-center text-ink-muted">نظری در این وضعیت وجود ندارد.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars value={r.rating} />
                    <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{REVIEW_STATUS_LABELS[r.status]}</Badge>
                    {r.isVerifiedPurchase ? <Badge tone="champagne">خرید تأییدشده</Badge> : null}
                    {r.isFeatured ? <Badge tone="burgundy">منتخب</Badge> : null}
                  </div>
                  {r.title ? <p className="mt-2 font-medium">{r.title}</p> : null}
                  <p className="mt-1 whitespace-pre-line text-sm leading-7">{r.body}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {r.author} (<span dir="ltr">{r.authorEmail}</span>) — درباره{" "}
                    <Link href={`/products/${r.product.slug}`} target="_blank" className="text-burgundy hover:underline">
                      {r.product.name}
                    </Link>{" "}
                    — {formatPersianDateTime(r.createdAt)}
                  </p>
                </div>
                <ReviewModeration id={r.id} status={r.status} isFeatured={r.isFeatured} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <AdminPager page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/admin/reviews?status=${filter}&page=${p}`} />
    </>
  );
}
