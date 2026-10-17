"use client";

/**
 * بخش آغازین صفحهٔ اصلی: صحنهٔ سینمایی با مدل (سمت چپ)، نوارهای ساتن متحرک واقعی (Canvas)،
 * تیتر فارسی (سمت راست) و ردیف خدمات واقعی فروشگاه. اسلایدها خودکار می‌چرخند (توقف با نشانگر ماوس/فوکوس).
 *
 * هر اسلاید یک بنر «HOME_HERO» از پنل مدیریت است. اگر برای اسلاید ویدئو ثبت شده باشد،
 * ویدئوی فشرده با تصویر پوستر پخش می‌شود؛ در غیر این صورت عکس ثابت مدل نمایش داده می‌شود
 * (و هیچ‌جا ادعای ویدئو نمی‌شود). با «کاهش حرکت»، ویدئو و نوارها ثابت می‌مانند.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Headset, Pause, Play, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";
import { useHydratedReducedMotion } from "@/components/motion/use-hydrated-reduced-motion";
import { cn } from "@/lib/utils";
import type { BannerDTO } from "@/server/services/content";
import { BACK_RIBBONS, FRONT_RIBBONS, SilkRibbons } from "./silk-ribbons";

export type HeroSlide = Pick<
  BannerDTO,
  "id" | "eyebrow" | "title" | "subtitle" | "ctaLabel" | "ctaHref" | "secondaryCtaLabel" | "secondaryCtaHref" | "imageUrl" | "imageAlt" | "mobileImageUrl" | "videoUrl"
>;

export interface HeroBenefit {
  kind: "payment" | "shipping" | "returns" | "support";
  title: string;
  detail: string;
  href?: string;
}

const BENEFIT_ICONS = { payment: ShieldCheck, shipping: Truck, returns: RotateCcw, support: Headset } as const;
const ease = [0.22, 1, 0.36, 1] as const;
const SLIDE_MS = 9000;

/** نقاط برق ریز روی لباس (فقط تزئینی) */
const GLINTS = [
  { top: "38%", left: "47%", delay: "0s" },
  { top: "46%", left: "55%", delay: "1.4s" },
  { top: "58%", left: "44%", delay: "2.6s" },
  { top: "30%", left: "52%", delay: "3.3s" },
  { top: "66%", left: "58%", delay: "4.1s" },
  { top: "52%", left: "40%", delay: "5.2s" },
];

function SlideMedia({ slide, active, eager, reduce, index }: { slide: HeroSlide; active: boolean; eager: boolean; reduce: boolean; index: number }) {
  const [videoFailed, setVideoFailed] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const useVideo = Boolean(slide.videoUrl) && !reduce && !videoFailed;

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => undefined);
    else v.pause();
  }, [active, useVideo]);

  if (!slide.imageUrl && !useVideo) return null;

  if (useVideo) {
    return (
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover object-[50%_20%]"
        muted
        loop
        playsInline
        autoPlay={active}
        preload={eager ? "metadata" : "none"}
        poster={slide.imageUrl ?? undefined}
        onError={() => setVideoFailed(true)}
        aria-hidden
      >
        <source src={slide.videoUrl!} type={slide.videoUrl!.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4"} />
      </video>
    );
  }

  return (
    <div className="absolute inset-0 motion-safe:animate-[hero-drift_14s_ease-in-out_infinite_alternate]">
      {/* تصویر موبایل جداگانه (در صورت وجود) و تصویر اصلی؛ چهرهٔ مدل همیشه داخل قاب می‌ماند */}
      {slide.mobileImageUrl ? (
        <Image
          src={slide.mobileImageUrl}
          alt={slide.imageAlt ?? ""}
          fill
          priority={eager && index === 0}
          loading={eager ? undefined : "lazy"}
          sizes="100vw"
          quality={85}
          className="hero-model object-contain object-bottom lg:hidden"
        />
      ) : null}
      <Image
        src={slide.imageUrl!}
        alt={slide.imageAlt ?? ""}
        fill
        priority={eager && index === 0}
        loading={eager ? undefined : "lazy"}
        sizes="(min-width: 1024px) 46vw, 100vw"
        quality={85}
        className={cn("hero-model object-contain object-bottom", slide.mobileImageUrl && "hidden lg:block")}
      />
      {/* با «کاهش حرکت» این نقاط بی‌حرکت و نامرئی می‌مانند (کنترل با CSS تا نشانه‌گذاری سرور و کلاینت یکی باشد) */}
      {GLINTS.map((g, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute size-1.5 rounded-full bg-[#ffe7c7] opacity-0 shadow-[0_0_10px_3px_rgba(255,214,170,0.75)] motion-safe:animate-[glint_6s_ease-in-out_infinite]"
          style={{ top: g.top, left: g.left, animationDelay: g.delay }}
        />
      ))}
    </div>
  );
}

export function HomeHero({ slides, benefits }: { slides: HeroSlide[]; benefits: HeroBenefit[] }) {
  // ترجیح «کاهش حرکت» فقط پس از hydrate اعمال می‌شود تا خروجی سرور و اولین رندر کلاینت یکسان بماند
  const reduce = useHydratedReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  // اسلایدهای بعدی پس از بارگذاری کامل صفحه آماده می‌شوند (بارگذاری تنبل)
  const [warm, setWarm] = React.useState(false);
  const count = slides.length;
  const autoplay = count > 1 && playing && !hovered && !reduce;

  React.useEffect(() => {
    const start = () => setWarm(true);
    const id = window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 4000 }) : window.setTimeout(start, 2500);
    return () => {
      if (window.cancelIdleCallback && typeof id === "number") window.cancelIdleCallback(id);
      window.clearTimeout(id as number);
    };
  }, []);

  React.useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, count]);

  if (count === 0) return null;
  const slide = slides[index];
  const TitleTag = index === 0 ? "h1" : "h2";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="معرفی روشاک"
      className="on-dark relative isolate flex min-h-[max(40rem,100svh)] flex-col overflow-hidden bg-[#12050a] text-ivory lg:min-h-[max(44rem,calc(100svh-2.25rem))]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {/* نورپردازی صحنه: نور زرشکی پشت مدل، تاریکی لبه‌ها و درخشش گرم طلایی سمت متن */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(90%_45%_at_50%_26%,#6e0d22_0%,#3a0613_42%,#12050a_78%)] lg:bg-[radial-gradient(70%_80%_at_24%_48%,#6e0d22_0%,#3a0613_38%,#16060b_72%,#0b0306_100%)]" />
        <div className="absolute inset-y-0 end-0 w-1/2 bg-[radial-gradient(60%_50%_at_70%_40%,rgba(214,181,109,0.10),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b0306] to-transparent" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1440px] flex-1 grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:grid-rows-1">
        {/* ستون متن (سمت راست در RTL) */}
        <div className="relative z-20 order-2 flex flex-col justify-center px-5 pb-10 sm:px-10 lg:order-1 lg:pb-16 lg:pe-4 lg:ps-14 lg:pt-28 xl:ps-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(count)}`}
              initial={reduce ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.8, ease }}
              className="-mt-16 max-w-xl lg:mt-0"
            >
              {slide.eyebrow ? (
                <p className="mb-5 flex items-center gap-3 text-sm font-medium text-champagne lg:text-base">
                  <span aria-hidden className="h-px w-10 bg-gradient-to-l from-champagne to-transparent" />
                  {slide.eyebrow}
                </p>
              ) : null}
              <TitleTag className="font-display text-[clamp(2.5rem,6.4vw,6.4rem)] font-semibold leading-[1.02] text-ivory [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]">
                {slide.title}
              </TitleTag>
              {slide.subtitle ? <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-ivory/75 lg:mt-6 lg:text-lg lg:leading-9">{slide.subtitle}</p> : null}
              <div className="mt-7 flex flex-wrap gap-3 lg:mt-10">
                <Link
                  href={slide.ctaHref ?? "/shop"}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#e6c987] to-champagne px-7 text-[0.95rem] font-semibold text-[#2a0a12] shadow-[0_12px_32px_-14px_rgba(214,181,109,0.9)] transition-[filter,transform] duration-300 hover:brightness-105 active:scale-[0.98] lg:h-14 lg:px-9"
                >
                  {slide.ctaLabel ?? "مشاهده محصولات"}
                </Link>
                {slide.secondaryCtaHref ? (
                  <Link
                    href={slide.secondaryCtaHref}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-champagne/45 px-7 text-[0.95rem] font-medium text-ivory transition-colors duration-300 hover:border-champagne hover:bg-champagne/10 lg:h-14 lg:px-9"
                  >
                    {slide.secondaryCtaLabel ?? "بیشتر"}
                  </Link>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ستون تصویر (سمت چپ در RTL): نوار پشت، مدل، نوار جلو */}
        <div className="relative order-1 h-[clamp(24rem,57svh,36rem)] lg:order-2 lg:h-auto">
          <SilkRibbons ribbons={BACK_RIBBONS} opacity={0.64} className="hero-silk absolute inset-0 size-full" />
          <div aria-hidden className="absolute bottom-[4%] left-1/2 h-[14%] w-[62%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(165,29,58,0.55),transparent)] blur-xl" />
          <div className="absolute inset-x-0 bottom-0 top-[4.75rem] lg:top-[5.5rem]">
            {slides.map((s, i) => {
              const active = i === index;
              const mounted = i === 0 || active || warm;
              return (
                <div
                  key={s.id}
                  aria-hidden={!active}
                  className={cn("absolute inset-0 transition-[opacity,filter] duration-1000 ease-[var(--ease-silk)]", active ? "opacity-100" : "opacity-0 blur-[2px]")}
                >
                  {mounted ? <SlideMedia slide={s} active={active} eager={i === 0} reduce={reduce} index={i} /> : null}
                </div>
              );
            })}
          </div>
          <SilkRibbons ribbons={FRONT_RIBBONS} opacity={0.38} className="hero-silk pointer-events-none absolute inset-0 size-full" />
          {/* محو شدن پایین صحنه در ردیف خدمات */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#12050a] to-transparent lg:h-16" />
        </div>
      </div>

      {/* کنترل نمایش خودکار: نشانگر دیداری ندارد؛ فقط با Tab (صفحه‌کلید) ظاهر می‌شود تا چرخش خودکار قابل توقف بماند */}
      {count > 1 ? (
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="sr-only z-30 focus:not-sr-only focus:absolute focus:left-4 focus:top-24 focus:flex focus:items-center focus:gap-2 focus:rounded-full focus:bg-[#12050a]/80 focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
        >
          {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
          {playing ? "توقف نمایش خودکار اسلایدها" : "ادامهٔ نمایش خودکار اسلایدها"}
        </button>
      ) : null}

      {/* ردیف خدمات (فقط خدماتی که واقعاً در تنظیمات فروشگاه فعال است) */}
      {benefits.length ? (
        <div className="relative z-20 border-t border-champagne/20 bg-[#0d0407]/70 backdrop-blur-sm">
          <ul className="mx-auto grid max-w-[1440px] grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[b.kind];
              const body = (
                <>
                  <Icon aria-hidden className="size-5 shrink-0 text-champagne lg:size-6" strokeWidth={1.4} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ivory">{b.title}</span>
                    <span className="line-clamp-2 block text-xs leading-5 text-ivory/55">{b.detail}</span>
                  </span>
                </>
              );
              return (
                <li
                  key={b.kind}
                  className={cn(
                    "border-champagne/15 px-4 py-4 sm:px-8 lg:py-5",
                    // موبایل: دو ستونه با جداکنندهٔ میانی و خط زیر ردیف اول؛ دسکتاپ: یک ردیف با جداکنندهٔ عمودی
                    i % 2 === 0 && "border-e",
                    i < 2 && benefits.length > 2 && "border-b lg:border-b-0",
                    i === benefits.length - 1 ? "lg:border-e-0" : "lg:border-e",
                  )}
                >
                  {b.href ? (
                    <Link href={b.href} className="flex items-center gap-3 transition-opacity hover:opacity-80">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
