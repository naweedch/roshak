import { discountPercent, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";

/** نمایش قیمت با قیمت ویژه، قیمت خط‌خورده و درصد تخفیف (نه فقط با رنگ) */
export function Price({
  price,
  salePrice,
  currency,
  size = "md",
  className,
  tone = "light",
}: {
  price: string;
  salePrice?: string | null;
  currency: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: "light" | "dark";
}) {
  const onSale = Boolean(salePrice) && discountPercent(price, salePrice!) > 0;
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];
  return (
    <span className={cn("tabular inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {onSale ? (
        <>
          <span className={cn(textSize, "font-semibold", tone === "dark" ? "text-champagne" : "text-ruby")}>
            <span className="sr-only">قیمت ویژه: </span>
            {formatMoney(salePrice!, currency)}
          </span>
          <del className={cn("text-xs", tone === "dark" ? "text-ivory/70" : "text-ink-muted")}>
            <span className="sr-only">قیمت قبلی: </span>
            {formatMoney(price, currency)}
          </del>
          <span className={cn("rounded-full px-2 text-[0.7rem] font-semibold leading-5", tone === "dark" ? "bg-champagne/20 text-champagne" : "bg-ruby/10 text-ruby")}>
            {toPersianDigits(discountPercent(price, salePrice!))}٪ تخفیف
          </span>
        </>
      ) : (
        <span className={cn(textSize, "font-semibold", tone === "dark" ? "text-ivory" : "text-ink")}>{formatMoney(price, currency)}</span>
      )}
    </span>
  );
}
