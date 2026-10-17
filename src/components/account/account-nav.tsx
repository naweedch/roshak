"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, MapPin, Package, ShieldCheck } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "پیشخوان", icon: LayoutDashboard },
  { href: "/account/orders", label: "سفارش‌ها", icon: Package },
  { href: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
  { href: "/account/wishlist", label: "علاقه‌مندی‌ها", icon: Heart },
  { href: "/account/security", label: "امنیت حساب", icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();
  const { logout } = useStore();
  return (
    <nav aria-label="منوی حساب کاربری" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors", active ? "bg-burgundy text-ivory" : "hover:bg-burgundy/[0.06]")}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
      <button type="button" onClick={() => void logout()} className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm text-ink-muted hover:bg-danger-soft hover:text-danger">
        <LogOut className="size-4" aria-hidden />
        خروج
      </button>
    </nav>
  );
}
