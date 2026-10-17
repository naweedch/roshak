"use client";

/**
 * نظرات تأییدشدهٔ مشتریان + فرم ثبت نظر (برای کاربران واردشده؛ انتشار پس از بررسی).
 */
import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { formatPersianDate } from "@/lib/dates";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { RatingStars } from "@/components/ui/misc";
import { useStore } from "@/components/store/store-provider";

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewsResponse {
  total: number;
  distribution: Record<number, number>;
  items: ReviewItem[];
}

export function ProductReviews({ slug, ratingAverage, reviewCount }: { slug: string; ratingAverage: string | null; reviewCount: number }) {
  const { user } = useStore();
  const [data, setData] = React.useState<ReviewsResponse | null>(null);
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    api<ReviewsResponse>(`/api/v1/products/${encodeURIComponent(slug)}/reviews?page=${page}`)
      .then((r) => {
        if (!cancelled) setData((prev) => (page === 1 || !prev ? r : { ...r, items: [...prev.items, ...r.items] }));
      })
      .catch(() => {
        if (!cancelled) setData({ total: 0, distribution: {}, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28">
      <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="reviews-title" className="font-display text-3xl text-burgundy">
            نظرات مشتریان
          </h2>
          {reviewCount > 0 && ratingAverage ? (
            <div className="mt-4">
              <p className="tabular font-display text-5xl text-ink">{toPersianDigits(Number(ratingAverage).toFixed(1))}</p>
              <RatingStars value={Number(ratingAverage)} count={reviewCount} size="md" />
              {data ? (
                <ul className="mt-5 space-y-1.5" aria-label="توزیع امتیازها">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = data.distribution[star] ?? 0;
                    const percent = data.total ? (count / data.total) * 100 : 0;
                    return (
                      <li key={star} className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="w-10">{toPersianDigits(star)} ستاره</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                          <span className="block h-full rounded-full bg-champagne-deep" style={{ width: `${percent}%` }} />
                        </span>
                        <span className="tabular w-6 text-end">{toPersianDigits(count)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">هنوز نظری برای این طرح ثبت نشده است.</p>
          )}
          <div className="mt-6">
            {user ? (
              <Button variant="secondary" onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
                {formOpen ? "بستن فرم" : "نوشتن نظر"}
              </Button>
            ) : (
              <p className="text-sm text-ink-muted">
                برای ثبت نظر{" "}
                <Link href={`/account/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`} className="text-burgundy underline underline-offset-4">
                  وارد شوید
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <div>
          {formOpen ? <ReviewForm slug={slug} onDone={() => setFormOpen(false)} /> : null}
          {data === null ? (
            <div className="space-y-4" aria-busy>
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))}
            </div>
          ) : data.items.length === 0 ? null : (
            <ul className="divide-y divide-line">
              {data.items.map((r) => (
                <li key={r.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <RatingStars value={r.rating} />
                    {r.title ? <p className="font-medium text-ink">{r.title}</p> : null}
                  </div>
                  <p className="mt-2 leading-8 text-ink">{r.body}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {r.authorName}، <time dateTime={r.createdAt}>{formatPersianDate(r.createdAt)}</time>
                    {r.isVerifiedPurchase ? <span className="ms-2 text-success">خرید تأییدشده</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data && data.items.length < data.total ? (
            <Button variant="ghost" onClick={() => setPage((p) => p + 1)} className="mt-4">
              نظرات بیشتر
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [message, setMessage] = React.useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await api<{ message: string }>(`/api/v1/products/${encodeURIComponent(slug)}/reviews`, { body: { rating, title, body } });
      setMessage({ tone: "success", text: result.message });
      setTitle("");
      setBody("");
      setRating(0);
      window.setTimeout(onDone, 2500);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setMessage({ tone: "error", text: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-10 space-y-4 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6" noValidate>
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">امتیاز شما</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="امتیاز">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${toPersianDigits(star)} ستاره`}
              onClick={() => setRating(star)}
              className={cn("grid size-10 place-items-center rounded-full text-2xl transition-colors", star <= rating ? "text-champagne-deep" : "text-line-strong hover:text-champagne")}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating ? (
          <p role="alert" className="mt-1 text-xs text-danger">
            {errors.rating}
          </p>
        ) : null}
      </fieldset>
      <Field label="عنوان (اختیاری)" htmlFor="review-title" error={errors.title}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label="متن نظر" htmlFor="review-body" error={errors.body} required hint="تجربهٔ خود از جنس، دوخت و اندازهٔ لباس را بنویسید.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={5} />
      </Field>
      <Button type="submit" loading={busy}>
        ثبت نظر
      </Button>
    </form>
  );
}
