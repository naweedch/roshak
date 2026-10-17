"use client";

import Link from "next/link";
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface AnnouncementItem {
  id: string;
  message: string;
  href: string | null;
  linkLabel: string | null;
}

/** نوار اطلاعیه با چرخش آرام پیام‌ها (هنگام هاور/فوکوس متوقف می‌شود؛ ارتفاع ثابت برای جلوگیری از جابه‌جایی صفحه) */
export function AnnouncementBar({ items }: { items: AnnouncementItem[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (items.length < 2 || paused || reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reduce]);

  if (items.length === 0) return <AnnouncementBarShell />;
  const item = items[index % items.length];

  return (
    <div
      className="on-dark relative z-50 h-9 overflow-hidden bg-burgundy-deep text-ivory"
      role="region"
      aria-label="اطلاعیه‌های فروشگاه"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={item.id}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-9 items-center justify-center gap-3 px-4 text-center text-[0.8rem]"
        >
          <span className="truncate">{item.message}</span>
          {item.href ? (
            <Link href={item.href} className="shrink-0 text-champagne underline underline-offset-4 hover:text-champagne-soft">
              {item.linkLabel ?? "بیشتر"}
            </Link>
          ) : null}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function AnnouncementBarShell() {
  return <div className="h-9 bg-burgundy-deep" aria-hidden />;
}
