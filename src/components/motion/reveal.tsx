"use client";

/**
 * نمایش تدریجی هنگام ورود به دید (یک‌بار).
 * محتوا در HTML سرور همیشه قابل مشاهده است (برای موتورهای جست‌وجو و مرورگر بدون جاوااسکریپت)؛
 * فقط عناصری که هنگام بارگذاری پایین‌تر از دید هستند، پس از hydrate پنهان و با ورود به دید ظاهر می‌شوند.
 * با «کاهش حرکت» هیچ انیمیشنی اجرا نمی‌شود.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type State = "static" | "pending" | "shown";

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [state, setState] = React.useState<State>("static");

  React.useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const rect = el.getBoundingClientRect();
    // عنصری که همین حالا در دید است پنهان نمی‌شود (بدون چشمک)
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={cn(state !== "static" && "transition-[opacity,transform] duration-[800ms] ease-[var(--ease-silk)]", className)}
      style={
        state === "pending"
          ? { opacity: 0, transform: `translateY(${y}px)` }
          : state === "shown"
            ? { opacity: 1, transform: "translateY(0)", transitionDelay: `${delay}s` }
            : undefined
      }
    >
      {children}
    </Tag>
  );
}
