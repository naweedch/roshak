/**
 * نشان و لوگوتایپ روشاک.
 * نشان: طاق ایرانی که درونش دو چین پارچه به هم می‌رسند و شکل یک شعلهٔ شمع/جوانه می‌سازند
 * (درخشش و نور). با currentColor رنگ می‌گیرد تا روی زمینهٔ روشن و تیره کار کند.
 */
import { cn } from "@/lib/utils";

export function RoshakEmblem({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={cn("h-10 w-auto", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {title ? <title>{title}</title> : null}
      {/* طاق بیرونی */}
      <path d="M4 58V24C4 12.4 12.95 3 24 3s20 9.4 20 21v34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* طاق درونی ظریف */}
      <path d="M9.5 58V25.5C9.5 16.4 16 9.2 24 9.2s14.5 7.2 14.5 16.3V58" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
      {/* دو چین پارچه که به شکل شعله به هم می‌رسند */}
      <path
        d="M24 16c-6.5 7-9.6 13.3-9.3 19.3.4 7.4 5.5 12.6 9.3 14.7-2.3-3.6-3.6-8-3.2-13 .4-6.2 2.2-13.5 3.2-21Z"
        fill="currentColor"
      />
      <path
        d="M24 16c6.5 7 9.6 13.3 9.3 19.3-.4 7.4-5.5 12.6-9.3 14.7 2.3-3.6 3.6-8 3.2-13-.4-6.2-2.2-13.5-3.2-21Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path d="M17 58h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** لوگوی کامل: نشان + «روشاک» + ROSHAK (نام لاتین تکرار نام فارسی است و از صفحه‌خوان پنهان می‌شود) */
export function RoshakLogo({
  className,
  variant = "horizontal",
  showLatin = true,
}: {
  className?: string;
  variant?: "horizontal" | "stacked";
  showLatin?: boolean;
}) {
  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-2 leading-none", className)}>
        <RoshakEmblem className="h-14" />
        <span className="font-display text-4xl font-semibold leading-none">روشاک</span>
        {showLatin ? <span className="font-latin text-[0.7rem] tracking-[0.45em] opacity-80" dir="ltr" aria-hidden>ROSHAK</span> : null}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5 leading-none", className)}>
      <RoshakEmblem className="h-9" />
      <span className="flex flex-col items-start gap-1">
        <span className="font-display text-[1.75rem] font-semibold leading-none">روشاک</span>
        {showLatin ? (
          <span className="font-latin text-[0.6rem] leading-none tracking-[0.42em] opacity-75" dir="ltr" aria-hidden>
            ROSHAK
          </span>
        ) : null}
      </span>
    </span>
  );
}
