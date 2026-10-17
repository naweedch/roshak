import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CampaignSection } from "@/components/home/campaign";
import { ColorDiscovery } from "@/components/home/color-discovery";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { HomeHero, type HeroBenefit } from "@/components/home/hero";
import { BrandStory, InstagramGallery, JournalTeaser, Testimonials } from "@/components/home/sections";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard, ProductCardSkeleton } from "@/components/store/product-card";
import { ProductRail } from "@/components/store/product-rail";
import { SectionHeading } from "@/components/ui/misc";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { parseCatalogParams } from "@/lib/validation/catalog";
import {
  getArticles,
  getBanners,
  getCatalogPage,
  getFeaturedCollections,
  getInstagramPosts,
  getSalesSignal,
  getSettings,
  getShippingMethods,
  getShopColors,
  getTestimonials,
} from "@/server/queries/public";
import { availablePaymentProviders } from "@/server/payments";
import { organizationJsonLd, pageMetadata, websiteJsonLd } from "@/server/seo";

export async function generateMetadata() {
  await connection();
  return pageMetadata({ path: "/" });
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  await connection();
  const [banners, collections, newArrivals, salesSignal, colors, articles, testimonials, settings, instagram, shippingMethods] = await Promise.all([
    getBanners(),
    getFeaturedCollections(),
    getCatalogPage(parseCatalogParams({}, { sort: "newest" }), 8),
    getSalesSignal(),
    getShopColors(),
    getArticles(3),
    getTestimonials(),
    getSettings(),
    getInstagramPosts(),
    getShippingMethods(),
  ]);

  // «پرفروش‌ها» فقط وقتی معنا دارد که فروش واقعی ثبت شده باشد؛ در غیر این صورت منتخب روشاک نمایش داده می‌شود
  const showBestSellers = salesSignal >= 4;
  const highlight = await getCatalogPage(parseCatalogParams({}, { sort: showBestSellers ? "popular" : "featured" }), 4);

  const heroSlides = banners.filter((b) => b.placement === "HOME_HERO");
  const campaign = banners.find((b) => b.placement === "HOME_CAMPAIGN") ?? null;
  const story = banners.find((b) => b.placement === "HOME_STORY") ?? null;

  return (
    <>
      <JsonLd data={[await organizationJsonLd(), websiteJsonLd(settings.storeName)]} />
      <HomeHero slides={heroSlides} benefits={heroBenefits(settings, shippingMethods)} />
      <FeaturedCollections collections={collections} />

      {newArrivals.items.length > 0 ? (
        <section aria-labelledby="new-arrivals-title" className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-8">
          <SectionHeading
            id="new-arrivals-title"
            title="تازه‌های روشاک"
            description="آخرین طرح‌هایی که به ویترین اضافه شده‌اند."
            action={
              <Link href="/shop/new" className="text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
                همهٔ تازه‌ها
              </Link>
            }
          />
          <div className="mt-10">
            <ProductRail label="ریل لباس‌های تازه">
              {newArrivals.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ProductRail>
          </div>
        </section>
      ) : null}

      {campaign ? <CampaignSection banner={campaign} /> : null}

      <ColorDiscovery colors={colors.filter((c) => c.count > 0).map((c) => ({ slug: c.slug, name: c.name, hex: c.hex, count: c.count, image: c.image }))} />

      {highlight.items.length > 0 ? (
        <section aria-labelledby="highlight-title" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8">
          <SectionHeading
            id="highlight-title"
            title={showBestSellers ? "پرفروش‌ترین‌ها" : "منتخب روشاک"}
            description={showBestSellers ? "طرح‌هایی که بیشترین سفارش را داشته‌اند." : "طرح‌هایی که تیم روشاک برای این فصل برگزیده است."}
            action={
              <Link href={showBestSellers ? "/shop/best-sellers" : "/shop"} className="text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
                مشاهدهٔ بیشتر
              </Link>
            }
          />
          <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
            {highlight.items.map((p, i) => (
              <Reveal as="li" key={p.id} delay={Math.min(i, 4) * 0.08}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {story ? <BrandStory banner={story} /> : null}
      <Testimonials items={testimonials} />
      <JournalTeaser articles={articles.items} />
      <div className="pt-24">
        <InstagramGallery posts={instagram} profileUrl={settings.instagramUrl} />
      </div>
    </>
  );
}

type Settings = Awaited<ReturnType<typeof getSettings>>;
type ShippingMethods = Awaited<ReturnType<typeof getShippingMethods>>;

/**
 * ردیف خدمات بخش آغازین فقط از داده‌های واقعی تنظیمات ساخته می‌شود؛
 * خدمتی که فعال نیست (مثلاً درگاه پرداخت یا مهلت مرجوعی) نمایش داده نمی‌شود.
 */
function heroBenefits(settings: Settings, shipping: ShippingMethods): HeroBenefit[] {
  const list: HeroBenefit[] = [];
  if (availablePaymentProviders(settings.enabledPaymentProviders).length > 0) {
    list.push({ kind: "payment", title: "پرداخت امن", detail: "اطلاعات کارت نزد ما ذخیره نمی‌شود" });
  }
  const timed = shipping.filter((m) => m.maxDays !== null);
  const fastest = timed.sort((a, b) => (a.maxDays ?? 99) - (b.maxDays ?? 99))[0];
  if (fastest && (fastest.maxDays ?? 99) <= 2) {
    const days = fastest.minDays !== null && fastest.minDays !== fastest.maxDays ? `${toPersianDigits(fastest.minDays)} تا ${toPersianDigits(fastest.maxDays!)}` : toPersianDigits(fastest.maxDays!);
    list.push({ kind: "shipping", title: "ارسال سریع", detail: `${fastest.name}، ${days} روز کاری`, href: "/pages/shipping" });
  } else if (settings.freeShippingThreshold) {
    list.push({ kind: "shipping", title: "ارسال رایگان", detail: `خرید بالای ${formatMoney(settings.freeShippingThreshold, settings.currency)}`, href: "/pages/shipping" });
  }
  if (settings.returnWindowDays > 0) {
    list.push({ kind: "returns", title: "ضمانت بازگشت", detail: `${toPersianDigits(settings.returnWindowDays)} روز مهلت مرجوعی` });
  }
  list.push({ kind: "support", title: "پشتیبانی", detail: settings.contactPhone ? settings.contactPhone : "پاسخ‌گویی از طریق فرم تماس", href: "/contact" });
  return list;
}

function HomeSkeleton() {
  return (
    <div aria-busy aria-label="در حال بارگذاری">
      <div className="min-h-[max(40rem,100svh)] bg-[radial-gradient(70%_80%_at_24%_48%,#6e0d22_0%,#3a0613_38%,#16060b_72%,#0b0306_100%)]" />
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-4 py-24 sm:px-8 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
