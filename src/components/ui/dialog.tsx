"use client";

/**
 * دیالوگ و کشوی کناری مبتنی بر Radix (مدیریت فوکوس، Escape، قفل اسکرول و aria کامل).
 */
import * as React from "react";
import { Dialog as RDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

function Overlay({ className }: { className?: string }) {
  return (
    <RDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-charcoal/45 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=open]:animate-[fade-in_0.35s_var(--ease-silk)]",
        className,
      )}
    />
  );
}

export function DialogContent({
  className,
  children,
  title,
  description,
  hideTitle = false,
  ...props
}: React.ComponentProps<typeof RDialog.Content> & { title: string; description?: string; hideTitle?: boolean }) {
  return (
    <RDialog.Portal>
      <Overlay />
      <RDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-panel)] bg-surface p-6 shadow-float outline-none data-[state=open]:animate-[dialog-in_0.4s_var(--ease-silk)] sm:p-8",
          className,
        )}
        {...props}
      >
        <RDialog.Title className={cn("font-display text-2xl text-burgundy", hideTitle && "sr-only")}>{title}</RDialog.Title>
        {description ? (
          <RDialog.Description className="mt-1 text-sm text-ink-muted">{description}</RDialog.Description>
        ) : (
          <RDialog.Description className="sr-only">{title}</RDialog.Description>
        )}
        <div className={cn(!hideTitle && "mt-5")}>{children}</div>
        <RDialog.Close className="absolute end-4 top-4 grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink" aria-label="بستن">
          <X className="size-5" />
        </RDialog.Close>
      </RDialog.Content>
    </RDialog.Portal>
  );
}

/** کشوی کناری (برای سبد خرید، منوی موبایل و فیلترها) */
export function SheetContent({
  side = "left",
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RDialog.Content> & { side?: "left" | "right" | "bottom"; title: string; description?: string }) {
  const position = {
    left: "inset-y-0 left-0 h-dvh w-full max-w-md data-[state=open]:animate-[sheet-in-left_0.5s_var(--ease-silk)]",
    right: "inset-y-0 right-0 h-dvh w-full max-w-md data-[state=open]:animate-[sheet-in-right_0.5s_var(--ease-silk)]",
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[var(--radius-panel)] data-[state=open]:animate-[sheet-in-bottom_0.45s_var(--ease-silk)]",
  }[side];
  return (
    <RDialog.Portal>
      <Overlay />
      <RDialog.Content className={cn("fixed z-50 flex flex-col bg-surface shadow-float outline-none", position, className)} {...props}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <RDialog.Title className="font-display text-2xl text-burgundy">{title}</RDialog.Title>
            {description ? <RDialog.Description className="text-xs text-ink-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
          </div>
          <RDialog.Close className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink" aria-label="بستن">
            <X className="size-5" />
          </RDialog.Close>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </RDialog.Content>
    </RDialog.Portal>
  );
}
