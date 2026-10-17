/** بخش‌های ایستای صفحهٔ اصلی: داستان برند، مجله، گفته‌های مشتریان و اینستاگرام */
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/misc";
import { Reveal } from "@/components/motion/reveal";
import { RoshakEmblem } from "@/components/brand/logo";
import { formatPersianDate } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import type { ArticleCardDTO, BannerDTO } from "@/server/services/content";

export function BrandStory({ banner }: { banner: BannerDTO }) {
  return (
    <section aria-labelledby="story-title" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 lg:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Reveal className="relative mx-auto w-full max-w-md">
          <div className="arch-3-4 relative aspect-[3/4] overflow-hidden bg-ivory-deep">
            {banner.imageUrl ? <Image src={banner.imageUrl} alt={banner.imageAlt ?? ""} fill sizes="(min-width: 1024px) 34vw, 90vw" className="object-cover" /> : null}
          </div>
          <RoshakEmblem className="absolute -bottom-8 -start-6 h-24 text-champagne-deep" />
        </Reveal>
        <div className="max-w-xl">
          {banner.eyebrow ? <p className="mb-4 text-sm font-medium text-burgundy">{banner.eyebrow}</p> : null}
          <h2 id="story-title" className="font-display text-4xl text-burgundy sm:text-5xl">
            {banner.title}
          </h2>
          {banner.subtitle ? <p className="mt-6 text-lg leading-9 text-ink-muted">{banner.subtitle}</p> : null}
          {banner.ctaHref ? (
            <Button asChild variant="secondary" size="lg" className="mt-9">
              <Link href={banner.ctaHref}>{banner.ctaLabel ?? "بیشتر بخوانید"}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function JournalTeaser({ articles }: { articles: ArticleCardDTO[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="journal-title" className="border-t border-line bg-ivory-deep/60">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="journal-title" className="font-display text-4xl text-burgundy sm:text-5xl">
              مجلهٔ روشاک
            </h2>
            <p className="mt-3 max-w-lg text-ink-muted">راهنمای انتخاب، ترکیب رنگ و نگهداری از لباس‌های مجلسی.</p>
          </div>
          <Link href="/journal" className="text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
            همهٔ نوشته‌ها
          </Link>
        </div>
        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {articles.slice(0, 3).map((a, i) => (
            <Reveal as="li" key={a.slug} delay={i * 0.1}>
              <Link href={`/journal/${a.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-[999px] bg-ivory">
                  {a.coverImageUrl ? (
                    <Image src={a.coverImageUrl} alt={a.coverImageAlt ?? ""} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                  ) : null}
                </div>
                <p className="mt-4 text-xs text-ink-muted">
                  <time dateTime={a.publishedAt}>{formatPersianDate(a.publishedAt)}</time>
                  {a.readingMinutes ? `، خواندن در ${toPersianDigits(a.readingMinutes)} دقیقه` : ""}
                </p>
                <h3 className="mt-1 font-display text-2xl leading-snug text-ink transition-colors group-hover:text-burgundy">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{a.excerpt}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface TestimonialDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  product: { name: string; slug: string };
}

/** فقط نظرات واقعی که مدیر تأیید و منتخب کرده؛ اگر نظری نباشد این بخش نمایش داده نمی‌شود */
export function Testimonials({ items }: { items: TestimonialDTO[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-title" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8">
      <h2 id="testimonials-title" className="font-display text-4xl text-burgundy sm:text-5xl">
        گفته‌های مشتریان
      </h2>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {items.slice(0, 3).map((t) => (
          <li key={t.id} className="flex flex-col rounded-[var(--radius-panel)] border border-line bg-surface-raised p-7">
            <RatingStars value={t.rating} />
            {t.title ? <p className="mt-4 font-display text-xl text-ink">{t.title}</p> : null}
            <blockquote className="mt-2 flex-1 text-ink-muted">«{t.body}»</blockquote>
            <p className="mt-6 text-sm text-ink">
              {t.authorName}
              {t.isVerifiedPurchase ? <span className="ms-2 text-xs text-success">خرید تأییدشده</span> : null}
            </p>
            <Link href={`/products/${t.product.slug}`} className="mt-1 text-xs text-burgundy underline-offset-4 hover:underline">
              {t.product.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string | null;
}

/** گالری اینستاگرام: فقط اگر توکن تنظیم شده باشد پست‌ها نمایش داده می‌شوند؛ وگرنه فقط پیوند صفحه (اگر تنظیم شده) */
export function InstagramGallery({ posts, profileUrl }: { posts: InstagramPost[]; profileUrl: string | null }) {
  if (posts.length === 0 && !profileUrl) return null;
  return (
    <section aria-labelledby="instagram-title" className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="instagram-title" className="font-display text-3xl text-burgundy sm:text-4xl">
          روشاک در اینستاگرام
        </h2>
        {profileUrl ? (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
            دنبال کردن صفحه
          </a>
        ) : null}
      </div>
      {posts.length > 0 ? (
        <ul className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {posts.slice(0, 6).map((p) => (
            <li key={p.id}>
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden rounded-xl bg-ivory-deep">
                {/* تصاویر اینستاگرام از CDN خارجی می‌آیند و از بهینه‌ساز Next عبور نمی‌کنند */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.caption?.slice(0, 120) ?? "پست اینستاگرام روشاک"} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
