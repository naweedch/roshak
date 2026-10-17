"use client";

/**
 * سربرگ سایت: روی بخش آغازین صفحهٔ اصلی شفاف و روشن، پس از اسکرول عاجی با پس‌زمینهٔ مات.
 * نشانگر متحرک زیر پیوند فعال، منوی مجموعه‌ها (قابل دسترسی با کیبورد)، منوی کشویی موبایل.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NavigationMenu } from "radix-ui";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { RoshakLogo } from "@/components/brand/logo";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/persian";
import { useStore } from "./store-provider";
import { SearchDialog } from "./search-dialog";

export interface NavCollection {
  slug: string;
  name: string;
  subtitle: string | null;
  coverImage: { url: string; alt: string } | null;
}

const NAV_LINKS = [
  { href: "/shop", label: "همهٔ لباس‌ها" },
  { href: "/shop/new", label: "تازه‌ها" },
  { href: "/shop/best-sellers", label: "پرفروش‌ها" },
  { href: "/shop/sale", label: "حراج" },
  { href: "/journal", label: "مجله" },
];

function isActive(pathname: string, href: string) {
  if (href === "/shop") return pathname === "/shop";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ collections }: { collections: NavCollection[] }) {
  const pathname = usePathname();
  const { cartCount, setCartOpen, user, wishlist } = useStore();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const overHero = pathname === "/" && !scrolled;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // بستن منوی موبایل پس از تغییر مسیر (تنظیم وضعیت هنگام رندر، بدون effect اضافه)
  const [menuPath, setMenuPath] = React.useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  // میان‌بر «/» برای باز کردن جست‌وجو
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "/" && !searchOpen && target && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const iconButton = cn(
    "relative grid size-11 place-items-center rounded-full transition-colors duration-300",
    overHero ? "text-ivory hover:bg-ivory/10" : "text-burgundy hover:bg-burgundy/[0.06]",
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color,color] duration-500 ease-[var(--ease-silk)]",
        pathname === "/" && "-mb-[76px]",
        overHero ? "on-dark border-b border-champagne/15 bg-transparent text-ivory" : "border-b border-line/80 bg-ivory/90 text-ink backdrop-blur-md",
      )}
    >
      <div className="mx-auto grid h-[76px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
        {/* لوگو (سمت راست در RTL) */}
        <Link href="/" className={cn("justify-self-start transition-colors", overHero ? "text-ivory" : "text-burgundy")}>
          <RoshakLogo className="[&_svg]:h-8 sm:[&_svg]:h-9" />
          <span className="sr-only">، صفحهٔ اصلی</span>
        </Link>

        {/* ناوبری اصلی (وسط) */}
        <div className="justify-self-center">
          <NavigationMenu.Root dir="rtl" className="relative hidden xl:block" aria-label="ناوبری اصلی">
            <NavigationMenu.List className="flex items-center gap-1">
              <NavigationMenu.Item>
                <NavigationMenu.Trigger
                  className={cn(
                    "group flex h-10 items-center gap-1 whitespace-nowrap rounded-full px-4 text-[0.95rem] font-medium transition-colors",
                    overHero ? "hover:bg-ivory/10" : "hover:bg-burgundy/[0.05]",
                  )}
                >
                  مجموعه‌ها
                  <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180">
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute start-0 top-full mt-3 w-[min(46rem,calc(100vw-4rem))] rounded-[var(--radius-panel)] border border-line bg-ivory p-6 text-ink shadow-float data-[state=open]:animate-[rise-in_0.35s_var(--ease-silk)]">
                  <CollectionsMenu collections={collections} />
                </NavigationMenu.Content>
              </NavigationMenu.Item>
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <NavigationMenu.Item key={link.href}>
                    <NavigationMenu.Link asChild active={active}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[0.95rem] font-medium transition-colors",
                          overHero ? "hover:bg-ivory/10" : "hover:bg-burgundy/[0.05]",
                          link.href === "/shop/sale" && !overHero && "text-ruby",
                        )}
                      >
                        {link.label}
                        {active ? (
                          <motion.span
                            layoutId="nav-indicator"
                            className={cn("absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full", overHero ? "bg-champagne" : "bg-burgundy")}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        ) : null}
                      </Link>
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>
          </NavigationMenu.Root>
        </div>

        {/* ابزارها و منوی موبایل (سمت چپ در RTL) */}
        <div className="flex items-center justify-self-end gap-0.5 sm:gap-1">
          <button type="button" className={iconButton} onClick={() => setSearchOpen(true)} aria-label="جست‌وجو (کلید /)">
            <Search className="size-5" />
          </button>
          <Link href={user ? "/account" : "/account/login"} className={cn(iconButton, "hidden sm:grid")} aria-label={user ? `حساب کاربری ${user.firstName}` : "ورود یا ثبت‌نام"}>
            <User className="size-5" />
          </Link>
          <Link href="/account/wishlist" className={cn(iconButton, "hidden sm:grid")} aria-label={`علاقه‌مندی‌ها${wishlist.size ? `، ${toPersianDigits(wishlist.size)} مورد` : ""}`}>
            <Heart className="size-5" />
            {wishlist.size > 0 ? <span className="absolute end-2 top-2 size-2 rounded-full bg-ruby" aria-hidden /> : null}
          </Link>
          <button type="button" className={iconButton} onClick={() => setCartOpen(true)} aria-label={`سبد خرید، ${toPersianDigits(cartCount)} کالا`}>
            <ShoppingBag className="size-5" />
            {cartCount > 0 ? (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="tabular absolute -end-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-champagne px-1 text-[0.7rem] font-bold leading-5 text-burgundy-deep"
                aria-hidden
              >
                {toPersianDigits(cartCount)}
              </motion.span>
            ) : null}
          </button>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <button type="button" onClick={() => setMenuOpen(true)} className={cn(iconButton, "xl:hidden")} aria-label="باز کردن منو" aria-expanded={menuOpen}>
              <Menu className="size-6" />
            </button>
            <SheetContent side="left" title="منو">
              <MobileMenu collections={collections} signedIn={Boolean(user)} />
            </SheetContent>
          </Dialog>
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

/**
 * پوستهٔ ایستای سربرگ برای پیش‌رندر (بدون هوک‌های وابسته به URL)؛ ابعاد آن با سربرگ اصلی یکی است
 * تا هنگام جایگزینی، صفحه جابه‌جا نشود.
 */
export function SiteHeaderShell() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 text-burgundy backdrop-blur-md">
      <div className="mx-auto grid h-[76px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
        <Link href="/" className="justify-self-start">
          <RoshakLogo className="[&_svg]:h-8 sm:[&_svg]:h-9" />
          <span className="sr-only">، صفحهٔ اصلی</span>
        </Link>
        <span />
        <span />
      </div>
    </header>
  );
}

function CollectionsMenu({ collections }: { collections: NavCollection[] }) {
  const feature = collections.find((c) => c.coverImage) ?? null;
  return (
    <div className="grid grid-cols-[1fr_14rem] gap-8">
      <div>
        <p className="mb-3 text-sm text-ink-muted">مجموعه‌های روشاک</p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
          {collections.map((c) => (
            <li key={c.slug}>
              <NavigationMenu.Link asChild>
                <Link href={`/collections/${c.slug}`} className="group/item block rounded-xl px-3 py-2 transition-colors hover:bg-burgundy/[0.05]">
                  <span className="block font-display text-lg text-burgundy">{c.name}</span>
                  {c.subtitle ? <span className="block text-xs text-ink-muted">{c.subtitle}</span> : null}
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
          {collections.length === 0 ? <li className="text-sm text-ink-muted">هنوز مجموعه‌ای منتشر نشده است.</li> : null}
        </ul>
        <NavigationMenu.Link asChild>
          <Link href="/collections" className="mt-4 inline-block text-sm font-medium text-burgundy underline-offset-[6px] hover:underline">
            مشاهدهٔ همهٔ مجموعه‌ها
          </Link>
        </NavigationMenu.Link>
      </div>
      {feature?.coverImage ? (
        <NavigationMenu.Link asChild>
          <Link href={`/collections/${feature.slug}`} className="group/feature relative block overflow-hidden arch-4-5 aspect-[4/5]">
            <Image src={feature.coverImage.url} alt={feature.coverImage.alt} fill sizes="224px" className="object-cover transition-transform duration-1000 group-hover/feature:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/80 to-transparent p-4 pt-10 font-display text-xl text-ivory">{feature.name}</span>
          </Link>
        </NavigationMenu.Link>
      ) : null}
    </div>
  );
}

function MobileMenu({ collections, signedIn }: { collections: NavCollection[]; signedIn: boolean }) {
  return (
    <nav aria-label="منوی موبایل" className="flex-1 overflow-y-auto px-6 py-6">
      <ul className="space-y-1">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block rounded-xl px-3 py-3 font-display text-2xl text-burgundy hover:bg-burgundy/[0.05]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-3 text-sm text-ink-muted">مجموعه‌ها</p>
        <ul className="grid grid-cols-2 gap-2">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="block rounded-xl border border-line px-3 py-2.5 text-sm hover:border-burgundy/40">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2 border-t border-line pt-6 text-sm">
        <Link href={signedIn ? "/account" : "/account/login"} className="rounded-xl bg-burgundy px-3 py-3 text-center text-ivory">
          {signedIn ? "حساب من" : "ورود / ثبت‌نام"}
        </Link>
        <Link href="/orders/track" className="rounded-xl border border-line px-3 py-3 text-center">
          پیگیری سفارش
        </Link>
      </div>
    </nav>
  );
}
