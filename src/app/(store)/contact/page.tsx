import { Suspense } from "react";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getSettings } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";
import { ContactForm } from "./contact-form";

export async function generateMetadata() {
  await connection();
  return pageMetadata({ title: "تماس با ما", description: "پرسش، پیشنهاد یا درخواست مشاورهٔ سایز خود را برای تیم روشاک بفرستید.", path: "/contact" });
}

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <Breadcrumbs items={[{ name: "تماس با ما", path: "/contact" }]} />
        <h1 className="mt-6 font-display text-5xl text-burgundy">تماس با ما</h1>
        <p className="mt-4 text-lg text-ink-muted">برای پرسش دربارهٔ سفارش، مشاورهٔ سایز یا همکاری، پیام بگذارید؛ در ساعات کاری پاسخ می‌دهیم.</p>
        <Suspense fallback={null}>
          <ContactDetails />
        </Suspense>
      </div>
      <ContactForm />
    </div>
  );
}

async function ContactDetails() {
  await connection();
  const s = await getSettings();
  if (!s.contactEmail && !s.contactPhone && !s.contactAddress) return null;
  return (
    <dl className="mt-10 space-y-4 text-sm">
      {s.contactPhone ? (
        <div>
          <dt className="text-ink-muted">تلفن</dt>
          <dd dir="ltr" className="text-end">
            <a href={`tel:${s.contactPhone}`}>{s.contactPhone}</a>
          </dd>
        </div>
      ) : null}
      {s.contactEmail ? (
        <div>
          <dt className="text-ink-muted">ایمیل</dt>
          <dd dir="ltr" className="text-end">
            <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
          </dd>
        </div>
      ) : null}
      {s.contactAddress ? (
        <div>
          <dt className="text-ink-muted">نشانی</dt>
          <dd>{s.contactAddress}</dd>
        </div>
      ) : null}
      {s.workingHours ? (
        <div>
          <dt className="text-ink-muted">ساعات پاسخ‌گویی</dt>
          <dd>{s.workingHours}</dd>
        </div>
      ) : null}
    </dl>
  );
}
