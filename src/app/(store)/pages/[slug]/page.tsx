import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { formatPersianDate } from "@/lib/dates";
import { getPage } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";

type Params = Promise<{ slug: string }>;

async function load(params: Params) {
  const { slug } = await params;
  const page = await getPage(decodeURIComponent(slug));
  if (!page) notFound();
  return page;
}

export async function generateMetadata({ params }: { params: Params }) {
  const page = await load(params);
  return pageMetadata({ title: page.seoTitle ?? page.title, description: page.seoDescription ?? page.summary, path: `/pages/${page.slug}` });
}

/** صفحات محتوایی قابل ویرایش در پنل (داستان برند، قوانین، ارسال، بازگشت، حریم خصوصی) */
export default function ContentPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8">
      <Suspense fallback={<div className="skeleton h-96 rounded-[var(--radius-panel)]" />}>
        <PageContent params={params} />
      </Suspense>
    </div>
  );
}

async function PageContent({ params }: { params: Params }) {
  const page = await load(params);
  return (
    <>
      <Breadcrumbs items={[{ name: page.title, path: `/pages/${page.slug}` }]} />
      <h1 className="mt-6 font-display text-5xl text-burgundy">{page.title}</h1>
      {page.summary ? <p className="mt-4 text-lg text-ink-muted">{page.summary}</p> : null}
      <div className="mt-10">
        <Markdown>{page.body}</Markdown>
      </div>
      <p className="mt-12 text-xs text-ink-soft">آخرین به‌روزرسانی: {formatPersianDate(page.updatedAt)}</p>
    </>
  );
}
