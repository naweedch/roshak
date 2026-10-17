/** کامپوننت‌های نمایشی کوچک: نشان، اسکلتون، حالت خالی، امتیاز ستاره‌ای */
import * as React from "react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "burgundy" | "champagne" | "success" | "danger" | "warning" | "midnight";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-ivory-deep text-ink-muted border-line",
    burgundy: "bg-burgundy text-ivory border-burgundy",
    champagne: "bg-champagne-soft/60 text-burgundy-deep border-champagne/60",
    success: "bg-success-soft text-success border-success/20",
    danger: "bg-danger-soft text-danger border-danger/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    midnight: "bg-midnight text-ivory border-midnight",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-6", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-2xl", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center", className)}>
      {icon ? <div className="mb-5 grid size-16 place-items-center rounded-full border border-champagne/60 text-burgundy">{icon}</div> : null}
      <h2 className="font-display text-3xl text-burgundy">{title}</h2>
      {description ? <div className="mt-3 text-ink-muted">{description}</div> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function RatingStars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const rounded = Math.round(value * 2) / 2;
  const label = `امتیاز ${toPersianDigits(value.toFixed(1))} از ۵${count !== undefined ? ` از ${toPersianDigits(count)} نظر` : ""}`;
  const dimension = size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={label}>
      <span className="flex items-center gap-0.5 text-champagne-deep" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} viewBox="0 0 20 20" className={dimension}>
            <defs>
              <linearGradient id={`half-${i}`} x1="1" x2="0">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7 4.9 17.5 6 11.8 1.7 7.8l5.8-.7z"
              fill={rounded >= i ? "currentColor" : rounded >= i - 0.5 ? `url(#half-${i})` : "transparent"}
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        ))}
      </span>
      {count !== undefined ? <span className="text-xs text-ink-muted">({toPersianDigits(count)})</span> : null}
    </span>
  );
}

/** عنوان بخش با خط طلایی ظریف (فقط جایی که بخش واقعاً عنوان دارد) */
export function SectionHeading({
  title,
  description,
  action,
  className,
  tone = "light",
  as: Tag = "h2",
  id,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <Tag id={id} className={cn("font-display text-3xl sm:text-4xl", tone === "dark" ? "text-ivory" : "text-burgundy")}>{title}</Tag>
        {description ? <p className={cn("mt-2 text-base", tone === "dark" ? "text-ivory/75" : "text-ink-muted")}>{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
