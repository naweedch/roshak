import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductExperience } from "@/components/product/product-experience";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ProductReviews } from "@/components/product/reviews";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductCard } from "@/components/store/product-card";
import { FormMessage } from "@/components/ui/form";
import { getStaffSession } from "@/server/auth/current";
import { getProduct, getProductRedirect, getRelated, getSettings } from "@/server/queries/public";
import { getProductDetail } from "@/server/services/catalog";
import { pageMetadata, productJsonLd } from "@/server/seo";
import { hasPermission } from "@/lib/rbac";
import type { ProductDetailDTO } from "@/lib/types/catalog";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * محصول منتشرشده از کش؛ پیش‌نمایش پیش‌نویس فقط برای کارکنان دارای مجوز (بدون کش و noindex).
 * نامک قدیمی با ریدایرکت دائمی به نامک جدید منتقل می‌شود.
 */
async function resolveProduct(params: Params, searchParams: SearchParams): Promise<{ product: ProductDetailDTO; preview: boolean }> {
  // داده‌ها فقط هنگام درخواست خوانده می‌شوند (build به پایگاه داده نیاز ندارد)
  await connection();
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const sp = await searchParams;
  if (sp.preview === "1") {
    const staff = await getStaffSession();
    if (staff && hasPermission(staff.user.role, "product:read")) {
      const draft = await getProductDetail(slug, { includeUnpublished: true });
      if (draft) return { product: draft, preview: true };
    }
  }
  const product = await getProduct(slug);
  if (product) return { product, preview: false };
  const target = await getProductRedirect(slug);
  if (target) permanentRedirect(`/products/${target}`);
  notFound();
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const { product, preview } = await resolveProduct(params, searchParams);
  return pageMetadata({
    title: product.seoTitle ?? `${product.name}${product.subtitle ? ` — ${product.subtitle}` : ""}`,
    description: product.seoDescription ?? product.description.slice(0, 160),
    path: `/products/${product.slug}`,
    image: product.images[0]?.url,
    noindex: preview,
  });
}

export default function ProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-8 sm:px-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  // داده‌ها فقط هنگام درخواست خوانده می‌شوند (build به پایگاه داده نیاز ندارد)
  await connection();
  const { product, preview } = await resolveProduct(params, searchParams);
  const [settings, related] = await Promise.all([getSettings(), getRelated(product.id)]);

  return (
    <>
      {!preview ? <JsonLd data={productJsonLd(product, settings.storeName)} /> : null}
      {preview ? (
        <FormMessage tone="info" className="mb-6">
          پیش‌نمایش کارکنان: این محصول در وضعیت «{product.status === "DRAFT" ? "پیش‌نویس" : product.status === "ARCHIVED" ? "بایگانی" : "زمان‌بندی‌شده"}» است و برای مشتریان نمایش داده نمی‌شود.
        </FormMessage>
      ) : null}
      <Breadcrumbs
        className="mb-8"
        items={[
          { name: "فروشگاه", path: "/shop" },
          { name: product.category.name, path: `/shop?category=${product.category.slug}` },
          { name: product.name, path: `/products/${product.slug}` },
        ]}
      />
      <ProductExperience product={product} />

      <section aria-labelledby="details-title" className="mt-24 grid gap-12 border-t border-line pt-16 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 id="details-title" className="font-display text-3xl text-burgundy">
            دربارهٔ این طرح
          </h2>
          <div className="prose-roshnak mt-5">
            {product.description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <details className="group rounded-2xl border border-line p-5 open:bg-surface-raised" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl text-ink">
              پارچه و نگهداری
              <span className="text-burgundy transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm leading-7 text-ink-muted">
              {product.fabric ? <p>جنس: {product.fabric}</p> : null}
              {product.careInstructions ? <p>{product.careInstructions}</p> : <p>دستور نگهداری برای این طرح ثبت نشده است.</p>}
            </div>
          </details>
          <details className="group rounded-2xl border border-line p-5 open:bg-surface-raised">
            <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl text-ink">
              ارسال و بازگشت
              <span className="text-burgundy transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm leading-7 text-ink-muted">
              <p>سفارش‌ها پس از تأیید پرداخت آماده و ارسال می‌شوند. هزینه و زمان ارسال در مرحلهٔ تسویه بر اساس روش انتخابی نمایش داده می‌شود.</p>
              <p>تا {settings.returnWindowDays.toLocaleString("fa-IR")} روز پس از تحویل، در صورت سالم بودن کالا و داشتن برچسب، امکان بازگشت یا تعویض وجود دارد.</p>
              <p>
                <Link href="/pages/shipping" className="text-burgundy underline underline-offset-4">
                  شرایط ارسال
                </Link>{" "}
                و{" "}
                <Link href="/pages/returns" className="text-burgundy underline underline-offset-4">
                  بازگشت کالا
                </Link>
              </p>
            </div>
          </details>
        </div>
      </section>

      <div className="mt-24 border-t border-line pt-16">
        <ProductReviews slug={product.slug} ratingAverage={product.ratingAverage} reviewCount={product.reviewCount} />
      </div>

      {related.length ? (
        <section aria-labelledby="related-title" className="mt-24">
          <h2 id="related-title" className="font-display text-3xl text-burgundy">
            شاید این‌ها را هم بپسندید
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecentlyViewed currentId={product.id} />
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16" aria-busy aria-label="در حال بارگذاری محصول">
      <div className="arch-3-4 skeleton aspect-[3/4]" />
      <div className="space-y-4 pt-4">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton h-12 w-3/4 rounded-full" />
        <div className="skeleton h-6 w-1/3 rounded-full" />
        <div className="skeleton mt-8 h-12 w-2/3 rounded-full" />
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
