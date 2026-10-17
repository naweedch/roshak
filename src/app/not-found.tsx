import Link from "next/link";
import { RoshakEmblem } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "صفحه یافت نشد", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-20 text-center">
      <div className="max-w-md">
        <RoshakEmblem className="mx-auto h-16 text-champagne-deep" />
        <p className="mt-6 font-latin text-6xl text-burgundy" dir="ltr">
          404
        </p>
        <h1 className="mt-2 font-display text-4xl text-burgundy">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-ink-muted">ممکن است نشانی اشتباه باشد یا این لباس دیگر در فروشگاه نباشد.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={buttonVariants()}>
            مشاهدهٔ لباس‌ها
          </Link>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            صفحهٔ اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}
