"use client";

/**
 * بخش کمپین فصل با اسکرول سینمایی: تصویر با سرعت کمتر از صفحه حرکت می‌کند (پارالاکس)
 * و قاب طاق هنگام ورود به دید باز می‌شود. با «کاهش حرکت» ایستا نمایش داده می‌شود.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Button } from "@/components/ui/button";
import type { BannerDTO } from "@/server/services/content";

export function CampaignSection({ banner, children }: { banner: BannerDTO; children?: React.ReactNode }) {
  const ref = React.useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  // «کاهش حرکت» به‌صورت مقدار حرکتی نگه داشته می‌شود: رندر سرور و اولین رندر کلاینت یکسان می‌ماند
  // (بدون hydration mismatch) و پس از mount، مقدارهای وابسته فوراً به حالت ایستا تغییر می‌کنند.
  const still = useMotionValue(0);
  React.useEffect(() => {
    still.set(prefersReduced ? 1 : 0);
  }, [prefersReduced, still]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const scrollScale = useTransform(scrollYProgress, [0.1, 0.45], [0.82, 1]);
  const scrollOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
  const imageY = useTransform(() => (still.get() ? "0%" : scrollY.get()));
  const archScale = useTransform(() => (still.get() ? 1 : scrollScale.get()));
  const archOpacity = useTransform(() => (still.get() ? 1 : scrollOpacity.get()));

  return (
    <section ref={ref} aria-labelledby="campaign-title" className="on-dark relative isolate overflow-hidden bg-midnight-deep text-ivory">
      {banner.imageUrl ? (
        <motion.div style={{ y: imageY }} className="absolute inset-[-14%_0] -z-10">
          <Image src={banner.imageUrl} alt={banner.imageAlt ?? ""} fill sizes="100vw" quality={60} className="object-cover opacity-80" />
        </motion.div>
      ) : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-midnight-deep/30 via-midnight-deep/50 to-midnight-deep/90" />

      <div className="mx-auto grid min-h-[90svh] max-w-[1440px] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <motion.div style={{ scale: archScale, opacity: archOpacity }} className="relative mx-auto aspect-[3/4] w-full max-w-sm">
          <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full text-champagne" aria-hidden>
            <path d="M4 400V150C4 69 69.4 4 150 4s146 65 146 146v250" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M22 400V156C22 85 79 28 150 28s128 57 128 128v244" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
          </svg>
          <div className="absolute inset-0 grid place-items-center p-10 text-center" aria-hidden>
            <p className="font-display text-[clamp(3rem,8vw,6rem)] leading-none text-ivory">{banner.title}</p>
          </div>
        </motion.div>

        <div className="max-w-xl">
          {banner.eyebrow ? <p className="mb-4 text-sm text-champagne">{banner.eyebrow}</p> : null}
          <h2 id="campaign-title" className="font-display text-4xl text-ivory sm:text-5xl">
            {banner.title}
          </h2>
          {banner.subtitle ? <p className="mt-5 text-lg leading-9 text-ivory/75">{banner.subtitle}</p> : null}
          {banner.ctaHref ? (
            <Button asChild variant="light" size="lg" className="mt-8">
              <Link href={banner.ctaHref}>{banner.ctaLabel ?? "مشاهده"}</Link>
            </Button>
          ) : null}
          {children ? <div className="mt-12">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
