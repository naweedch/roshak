/**
 * کنترل‌های فرم با برچسب، راهنما و پیام خطای قابل‌خواندن برای صفحه‌خوان
 * (aria-invalid و aria-describedby به پیام خطا متصل‌اند).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[var(--radius-field)] border border-line-strong/70 bg-surface-raised px-4 text-[0.95rem] text-ink placeholder:text-ink-soft transition-[border-color,box-shadow] duration-200 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:cursor-not-allowed disabled:bg-surface-sunken aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-28 py-3 leading-8", className)} {...props} />;
});

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, "h-12 appearance-none pe-10", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted">
        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; required?: boolean }>;
}

/** ترکیب برچسب + کنترل + راهنما/خطا با اتصال کامل aria */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ms-1 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {React.cloneElement(children, {
        id: htmlFor,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** پیام کلی فرم (موفق/خطا) که با aria-live اعلام می‌شود */
export function FormMessage({ tone = "error", children, className }: { tone?: "error" | "success" | "info"; children: React.ReactNode; className?: string }) {
  if (!children) return null;
  const styles = {
    error: "border-danger/25 bg-danger-soft text-danger",
    success: "border-success/25 bg-success-soft text-success",
    info: "border-champagne/50 bg-ivory-deep text-ink",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={cn("rounded-2xl border px-4 py-3 text-sm leading-7", styles[tone], className)}>
      {children}
    </div>
  );
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface-raised transition-colors checked:border-burgundy checked:bg-burgundy checked:bg-[url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 8.5 7 11.5 12.5 5' fill='none' stroke='%23FFF8EF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] checked:bg-center checked:bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}
