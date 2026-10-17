import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-silk)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-burgundy text-ivory hover:bg-burgundy-deep shadow-[0_10px_30px_-14px_rgb(100_30_50/0.7)]",
        secondary: "border border-burgundy/35 bg-transparent text-burgundy hover:border-burgundy hover:bg-burgundy/[0.04]",
        ghost: "bg-transparent text-ink hover:bg-ink/[0.05]",
        light: "bg-ivory text-burgundy-deep hover:bg-white",
        outlineLight: "border border-ivory/40 bg-transparent text-ivory hover:border-ivory hover:bg-ivory/10",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "h-auto rounded-none px-0 text-burgundy underline-offset-[6px] hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-[0.95rem]",
        lg: "h-14 px-8 text-base",
        icon: "size-11",
        iconSm: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <span className="absolute inset-0 grid place-items-center" aria-hidden>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </span>
          ) : null}
          <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
}
