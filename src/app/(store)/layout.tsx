import { Suspense } from "react";
import { connection } from "next/server";
import { AnnouncementBar, AnnouncementBarShell } from "@/components/store/announcement-bar";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SiteFooter, SiteFooterShell } from "@/components/store/site-footer";
import { SiteHeader, SiteHeaderShell } from "@/components/store/site-header";
import { StoreProvider } from "@/components/store/store-provider";
import { getAnnouncements, getCollections, getSettings } from "@/server/queries/public";

/**
 * چیدمان ویترین. پوستهٔ ایستا (سربرگ بدون داده، اسکلت پاورقی) فوراً ارسال می‌شود
 * و بخش‌های وابسته به دیتابیس در زمان درخواست جریان می‌یابند.
 */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <StoreProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-burgundy focus:px-5 focus:py-2 focus:text-ivory"
      >
        رفتن به محتوای اصلی
      </a>
      <Suspense fallback={<AnnouncementBarShell />}>
        <Announcements />
      </Suspense>
      <Suspense fallback={<SiteHeaderShell />}>
        <Header />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Suspense fallback={<SiteFooterShell />}>
        <Footer />
      </Suspense>
      <CartDrawer />
    </StoreProvider>
  );
}

async function Announcements() {
  await connection();
  return <AnnouncementBar items={await getAnnouncements()} />;
}

async function Header() {
  await connection();
  const collections = (await getCollections()).filter((c) => c.productCount > 0);
  return (
    <SiteHeader
      collections={collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        subtitle: c.subtitle,
        coverImage: c.coverImage ? { url: c.coverImage.url, alt: c.coverImage.alt } : null,
      }))}
    />
  );
}

async function Footer() {
  await connection();
  const [settings, collections] = await Promise.all([getSettings(), getCollections()]);
  return <SiteFooter settings={settings} collections={collections.filter((c) => c.productCount > 0)} />;
}
