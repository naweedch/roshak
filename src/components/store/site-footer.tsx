import Link from "next/link";
import { RoshakLogo } from "@/components/brand/logo";
import type { StoreSettingsDTO } from "@/server/services/settings";
import type { CollectionDTO } from "@/lib/types/catalog";
import { NewsletterForm } from "./newsletter-form";

const CUSTOMER_LINKS = [
  { href: "/orders/track", label: "پیگیری سفارش" },
  { href: "/pages/shipping", label: "شرایط ارسال" },
  { href: "/pages/returns", label: "بازگشت و تعویض" },
  { href: "/size-guide", label: "راهنمای سایز" },
  { href: "/faq", label: "پرسش‌های پرتکرار" },
  { href: "/contact", label: "تماس با ما" },
];

const BRAND_LINKS = [
  { href: "/pages/our-story", label: "داستان روشاک" },
  { href: "/journal", label: "مجلهٔ روشاک" },
  { href: "/pages/privacy", label: "حریم خصوصی" },
  { href: "/pages/terms", label: "قوانین و شرایط" },
];

/** پاورقی سایت؛ اطلاعات تماس و شبکه‌های اجتماعی فقط در صورت تنظیم در پنل نمایش داده می‌شوند */
export function SiteFooter({ settings, collections }: { settings: StoreSettingsDTO; collections: CollectionDTO[] }) {
  const socials = [
    { href: settings.instagramUrl, label: "اینستاگرام" },
    { href: settings.telegramUrl, label: "تلگرام" },
    { href: settings.whatsappUrl, label: "واتس‌اپ" },
    { href: settings.pinterestUrl, label: "پینترست" },
  ].filter((s): s is { href: string; label: string } => Boolean(s.href));
  // این کامپوننت در زمان درخواست رندر می‌شود (پس از connection) پس تاریخ جاری مجاز است
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());

  return (
    <footer className="on-dark relative overflow-hidden bg-midnight-deep text-ivory" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        پاورقی سایت
      </h2>
      <svg aria-hidden viewBox="0 0 1200 400" preserveAspectRatio="none" className="pointer-events-none absolute -top-px left-0 h-40 w-full text-champagne/15">
        <path d="M0 400V180C0 80 270 0 600 0s600 80 600 180v220" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <div className="relative mx-auto max-w-[1440px] px-4 pb-10 pt-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="inline-block text-ivory" aria-label="روشاک، صفحهٔ اصلی">
              <RoshakLogo />
            </Link>
            {settings.tagline ? <p className="mt-5 max-w-sm text-ivory/70">{settings.tagline}</p> : null}
            <div className="mt-8">
              <p className="mb-3 font-display text-2xl">خبرنامهٔ روشاک</p>
              {settings.newsletterEnabled ? (
                <NewsletterForm source="footer" />
              ) : (
                <p className="text-sm text-ivory/60">عضویت در خبرنامه به‌زودی فعال می‌شود.</p>
              )}
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <nav aria-label="مجموعه‌ها">
              <p className="mb-4 font-display text-xl text-champagne">مجموعه‌ها</p>
              <ul className="space-y-2.5 text-sm text-ivory/75">
                {collections.slice(0, 7).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/collections/${c.slug}`} className="transition-colors hover:text-ivory">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="خدمات مشتریان">
              <p className="mb-4 font-display text-xl text-champagne">خدمات مشتریان</p>
              <ul className="space-y-2.5 text-sm text-ivory/75">
                {CUSTOMER_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="mb-4 font-display text-xl text-champagne">روشاک</p>
              <ul className="space-y-2.5 text-sm text-ivory/75">
                {BRAND_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {(settings.contactPhone || settings.contactEmail || settings.contactAddress) && (
                <address className="mt-6 space-y-1.5 text-sm not-italic text-ivory/75">
                  {settings.contactPhone ? (
                    <p>
                      تلفن:{" "}
                      <a href={`tel:${settings.contactPhone}`} dir="ltr" className="hover:text-ivory">
                        {settings.contactPhone}
                      </a>
                    </p>
                  ) : null}
                  {settings.contactEmail ? (
                    <p>
                      ایمیل:{" "}
                      <a href={`mailto:${settings.contactEmail}`} dir="ltr" className="hover:text-ivory">
                        {settings.contactEmail}
                      </a>
                    </p>
                  ) : null}
                  {settings.contactAddress ? <p>{settings.contactAddress}</p> : null}
                  {settings.workingHours ? <p className="text-ivory/55">{settings.workingHours}</p> : null}
                </address>
              )}
              {socials.length ? (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="شبکه‌های اجتماعی">
                  {socials.map((s) => (
                    <li key={s.label}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-ivory/20 px-3 py-1 text-xs text-ivory/80 transition-colors hover:border-champagne hover:text-champagne">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-ivory/10 pt-6 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.storeName}. همهٔ حقوق محفوظ است.
          </p>
          <p className="font-latin tracking-[0.3em]" dir="ltr">
            {settings.storeNameEn}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterShell() {
  return <footer className="h-[28rem] bg-midnight-deep" aria-hidden />;
}
