import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader } from "@/components/admin/admin-ui";
import { AnnouncementManager, BannerManager, FaqManager, PageManager } from "@/components/admin/managers";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/current";
import { listAnnouncements, listBanners, listFaqAdmin, listPagesAdmin } from "@/server/services/admin/content-admin";

export const metadata = { title: "محتوا" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { key: "banners", label: "بنرهای صفحهٔ اصلی" },
  { key: "announcements", label: "نوار اطلاعیه" },
  { key: "pages", label: "صفحات ثابت" },
  { key: "faq", label: "پرسش‌های پرتکرار" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { allowed } = await requireStaff("content:write");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "banners";

  return (
    <>
      <AdminPageHeader title="محتوا" description="تغییرات بلافاصله در فروشگاه منتشر می‌شوند (کش مربوط باطل می‌شود)." />
      <nav aria-label="بخش‌های محتوا" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", tab === t.key ? "border-burgundy bg-burgundy text-ivory" : "border-line hover:border-burgundy/40")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "banners" ? <BannerManager items={await listBanners()} /> : null}
      {tab === "announcements" ? <AnnouncementManager items={await listAnnouncements()} /> : null}
      {tab === "pages" ? <PageManager items={await listPagesAdmin()} /> : null}
      {tab === "faq" ? <FaqManager items={await listFaqAdmin()} /> : null}
    </>
  );
}
