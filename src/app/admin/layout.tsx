import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "پنل مدیریت روشاک", template: "%s | مدیریت روشاک" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ivory-deep/40">{children}</div>;
}
