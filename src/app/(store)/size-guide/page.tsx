import { Suspense } from "react";
import { connection } from "next/server";
import { SizeGuideTable } from "@/components/product/size-guide";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import type { SizeGuideRow } from "@/lib/types/catalog";
import { db } from "@/server/db";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  await connection();
  return pageMetadata({ title: "راهنمای سایز", description: "جدول اندازه‌های روشاک و روش درست اندازه‌گیری دور سینه، کمر و باسن.", path: "/size-guide" });
}

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8">
      <Breadcrumbs items={[{ name: "راهنمای سایز", path: "/size-guide" }]} />
      <h1 className="mt-6 font-display text-5xl text-burgundy">راهنمای سایز</h1>
      <p className="mt-4 text-ink-muted">اندازه‌ها به سانتی‌متر و بر اساس اندازهٔ بدن است. اگر بین دو سایز هستید، سایز بزرگ‌تر را انتخاب کنید.</p>
      <Suspense fallback={<div className="skeleton mt-10 h-72 rounded-2xl" />}>
        <Guides />
      </Suspense>
      <section className="mt-12 rounded-[var(--radius-panel)] bg-ivory-deep p-6 leading-8">
        <h2 className="font-display text-2xl">چطور اندازه بگیریم؟</h2>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-ink-muted">
          <li>دور سینه: متر را از برجسته‌ترین قسمت سینه و موازی زمین دور بدن بچرخانید.</li>
          <li>دور کمر: باریک‌ترین قسمت کمر، حدود دو انگشت بالای ناف.</li>
          <li>دور باسن: برجسته‌ترین قسمت باسن، با پاهای جفت.</li>
        </ul>
      </section>
    </div>
  );
}

async function Guides() {
  await connection();
  const guides = await db.sizeGuide.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mt-10 space-y-10">
      {guides.map((g) => (
        <section key={g.id} aria-label={g.name}>
          <h2 className="mb-4 font-display text-2xl">{g.name}</h2>
          <SizeGuideTable guide={{ name: g.name, description: g.description, rows: g.rows as unknown as SizeGuideRow[] }} />
        </section>
      ))}
    </div>
  );
}
