"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Boxes,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Percent,
  ScrollText,
  Settings,
  Shirt,
  Store,
  Users,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { RoshakLogo } from "@/components/brand/logo";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { hasPermission, ROLE_LABELS, type Permission } from "@/lib/rbac";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission: Permission }> = [
  { href: "/admin", label: "پیشخوان", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ClipboardList, permission: "order:read" },
  { href: "/admin/products", label: "محصولات", icon: Shirt, permission: "product:read" },
  { href: "/admin/inventory", label: "انبار", icon: Boxes, permission: "inventory:read" },
  { href: "/admin/collections", label: "دسته‌ها و مجموعه‌ها", icon: FolderTree, permission: "catalog:taxonomy" },
  { href: "/admin/customers", label: "مشتریان", icon: Users, permission: "customer:read" },
  { href: "/admin/discounts", label: "تخفیف‌ها", icon: Percent, permission: "discount:read" },
  { href: "/admin/reviews", label: "نظرات", icon: MessageSquareText, permission: "review:moderate" },
  { href: "/admin/content", label: "محتوا", icon: Megaphone, permission: "content:write" },
  { href: "/admin/articles", label: "مجله", icon: FileText, permission: "content:write" },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings, permission: "settings:read" },
  { href: "/admin/audit", label: "گزارش ممیزی", icon: ScrollText, permission: "audit:read" },
];

function NavBody({ role, email, onNavigate }: { role: Role; email: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const visible = ITEMS.filter((i) => hasPermission(role, i.permission));
  return (
    <>
      <nav aria-label="منوی مدیریت" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {visible.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", active ? "bg-ivory/10 text-ivory" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory")}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-2 border-t border-ivory/10 p-4 text-xs">
        <p className="truncate text-ivory/80" dir="ltr">
          {email}
        </p>
        <p className="text-champagne">{ROLE_LABELS[role]}</p>
        <div className="flex gap-2 pt-1">
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ivory/70 hover:bg-ivory/5 hover:text-ivory">
            <Store className="size-3.5" /> فروشگاه
          </Link>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ivory/70 hover:bg-ivory/5 hover:text-ivory"
            onClick={async () => {
              await api("/api/v1/admin/auth/logout", { body: {} }).catch(() => undefined);
              router.replace("/admin/login");
              router.refresh();
            }}
          >
            <LogOut className="size-3.5" /> خروج
          </button>
        </div>
      </div>
    </>
  );
}

/** منوی پنل: نوار کناری ثابت در دسکتاپ، نوار بالا با کشوی کناری در موبایل و تبلت */
export function AdminNav({ role, email }: { role: Role; email: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="on-dark sticky top-0 z-30 flex h-16 items-center justify-between bg-midnight-deep px-4 text-ivory lg:hidden">
        <Link href="/admin" className="text-ivory">
          <RoshakLogo className="[&_svg]:h-6" />
          <span className="sr-only">، پیشخوان مدیریت</span>
        </Link>
        <Dialog open={open} onOpenChange={setOpen}>
          <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full text-ivory hover:bg-ivory/10" aria-label="باز کردن منوی مدیریت" aria-expanded={open}>
            <Menu className="size-5" />
          </button>
          <SheetContent side="right" title="منوی مدیریت" className="on-dark max-w-xs bg-midnight-deep text-ivory [&_h2]:text-ivory">
            <div className="flex min-h-0 flex-1 flex-col pt-3">
              <NavBody role={role} email={email} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Dialog>
      </div>
      <div className="on-dark hidden h-full flex-col bg-midnight-deep text-ivory lg:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="text-ivory">
            <RoshakLogo className="[&_svg]:h-7" />
            <span className="sr-only">، پیشخوان مدیریت</span>
          </Link>
          <span className="rounded-full bg-champagne/15 px-2 py-0.5 text-[0.65rem] text-champagne">مدیریت</span>
        </div>
        <NavBody role={role} email={email} />
      </div>
    </>
  );
}
