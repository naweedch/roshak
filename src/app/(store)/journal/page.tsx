import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Pagination } from "@/components/store/pagination";
import { EmptyState } from "@/components/ui/misc";
import { formatPersianDate } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import { getArticles } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 9;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  return pageMetadata({
    title: page > 1 ? `مجلهٔ روشاک — صفحهٔ ${toPersianDigits(page)}` : "مجلهٔ روشاک",
    description: "راهنمای انتخاب لباس مجلسی، ترکیب رنگ و نگهداری از پارچه‌های لطیف؛ نوشته‌های تحریریهٔ روشاک.",
    path: page > 1 ? `/journal?page=${page}` : "/journal",
  });
}

export default function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
      <Breadcrumbs items={[{ name: "مجله", path: "/journal" }]} />
      <h1 className="mt-6 font-display text-5xl text-burgundy sm:text-6xl">مجلهٔ روشاک</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">راهنمای انتخاب، ترکیب رنگ و نگهداری از لباس‌های مجلسی.</p>
      <Suspense fallback={<div className="skeleton mt-12 h-96 rounded-[var(--radius-panel)]" />}>
        <Articles searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Articles({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const { items, total } = await getArticles(PAGE_SIZE, page);
  if (items.length === 0) return <EmptyState title="هنوز نوشته‌ای منتشر نشده است" />;
  const [lead, ...rest] = items;
  return (
    <>
      {page === 1 ? (
        <Link href={`/journal/${lead.slug}`} className="group mt-12 grid items-center gap-8 lg:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-[999px] bg-ivory-deep">
            {lead.coverImageUrl ? <Image src={lead.coverImageUrl} alt={lead.coverImageAlt ?? ""} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" /> : null}
          </div>
          <div>
            <p className="text-sm text-ink-muted">
              <time dateTime={lead.publishedAt}>{formatPersianDate(lead.publishedAt)}</time>
            </p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink group-hover:text-burgundy">{lead.title}</h2>
            <p className="mt-4 text-lg text-ink-muted">{lead.excerpt}</p>
          </div>
        </Link>
      ) : null}
      <ul className="mt-16 grid gap-10 md:grid-cols-3">
        {(page === 1 ? rest : items).map((a) => (
          <li key={a.slug}>
            <Link href={`/journal/${a.slug}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden rounded-t-[999px] bg-ivory-deep">
                {a.coverImageUrl ? <Image src={a.coverImageUrl} alt={a.coverImageAlt ?? ""} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" /> : null}
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                <time dateTime={a.publishedAt}>{formatPersianDate(a.publishedAt)}</time>
                {a.readingMinutes ? `، ${toPersianDigits(a.readingMinutes)} دقیقه` : ""}
              </p>
              <h2 className="mt-1 font-display text-2xl text-ink group-hover:text-burgundy">{a.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{a.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(p) => (p === 1 ? "/journal" : `/journal?page=${p}`)} />
    </>
  );
}
