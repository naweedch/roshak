import { Suspense } from "react";
import { connection } from "next/server";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getFaq } from "@/server/queries/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  await connection();
  return pageMetadata({ title: "پرسش‌های پرتکرار", description: "پاسخ پرسش‌های رایج دربارهٔ سفارش، ارسال، انتخاب سایز، پرداخت و نگهداری لباس‌های روشاک.", path: "/faq" });
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8">
      <Breadcrumbs items={[{ name: "پرسش‌های پرتکرار", path: "/faq" }]} />
      <h1 className="mt-6 font-display text-5xl text-burgundy">پرسش‌های پرتکرار</h1>
      <Suspense fallback={<div className="skeleton mt-10 h-96 rounded-2xl" />}>
        <FaqList />
      </Suspense>
    </div>
  );
}

async function FaqList() {
  await connection();
  const items = await getFaq();
  const groups = [...new Set(items.map((i) => i.group ?? "عمومی"))];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
        }}
      />
      {groups.map((group) => (
        <section key={group} className="mt-10" aria-label={group}>
          <h2 className="mb-4 font-display text-2xl text-ink">{group}</h2>
          <div className="space-y-3">
            {items
              .filter((i) => (i.group ?? "عمومی") === group)
              .map((i) => (
                <details key={i.id} className="group rounded-2xl border border-line p-5 open:bg-surface-raised">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {i.question}
                    <span className="text-xl text-burgundy transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-8 text-ink-muted">{i.answer}</p>
                </details>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
