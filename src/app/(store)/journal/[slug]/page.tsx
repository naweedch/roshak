import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { formatPersianDate } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import { getArticle, getSettings } from "@/server/queries/public";
import { articleJsonLd, pageMetadata } from "@/server/seo";

type Params = Promise<{ slug: string }>;

async function load(params: Params) {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));
  if (!article) notFound();
  return article;
}

export async function generateMetadata({ params }: { params: Params }) {
  const article = await load(params);
  return pageMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    path: `/journal/${article.slug}`,
    image: article.coverImageUrl,
    type: "article",
    publishedTime: article.publishedAt,
  });
}

export default function ArticlePage({ params }: { params: Params }) {
  return (
    <article className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-8">
      <Suspense fallback={<div className="skeleton h-[40rem] rounded-[var(--radius-panel)]" />}>
        <ArticleContent params={params} />
      </Suspense>
    </article>
  );
}

async function ArticleContent({ params }: { params: Params }) {
  const [article, settings] = await Promise.all([load(params), getSettings()]);
  return (
    <>
      <JsonLd data={articleJsonLd(article, settings.storeName)} />
      <Breadcrumbs items={[{ name: "مجله", path: "/journal" }, { name: article.title, path: `/journal/${article.slug}` }]} />
      <header className="mt-8 text-center">
        <p className="text-sm text-ink-muted">
          <time dateTime={article.publishedAt}>{formatPersianDate(article.publishedAt)}</time>
          {article.readingMinutes ? `، خواندن در ${toPersianDigits(article.readingMinutes)} دقیقه` : ""}
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight text-burgundy sm:text-5xl">{article.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">{article.excerpt}</p>
        <p className="mt-3 text-sm text-ink-soft">{article.authorName}</p>
      </header>
      {article.coverImageUrl ? (
        <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-t-[999px] bg-ivory-deep">
          <Image src={article.coverImageUrl} alt={article.coverImageAlt ?? ""} fill priority sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="mx-auto mt-12 max-w-[68ch]">
        <Markdown>{article.body}</Markdown>
      </div>
    </>
  );
}
