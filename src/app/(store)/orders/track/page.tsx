import { privateMetadata } from "@/server/seo";
import { TrackOrderForm } from "./track-form";

export const metadata = privateMetadata("پیگیری سفارش");

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-8">
      <h1 className="font-display text-5xl text-burgundy">پیگیری سفارش</h1>
      <p className="mt-3 text-ink-muted">شمارهٔ سفارش (در ایمیل تأیید) و ایمیلی را که هنگام خرید وارد کرده‌اید بنویسید.</p>
      <TrackOrderForm />
    </div>
  );
}
