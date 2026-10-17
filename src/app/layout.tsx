import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn/wght.css";
import "@fontsource-variable/markazi-text/wght.css";
import "@fontsource-variable/playfair-display/wght.css";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

/**
 * چیدمان ریشه: زبان فارسی و راست‌به‌چپ. فونت‌ها به‌صورت محلی (بدون وابستگی به سرویس خارجی) بارگذاری می‌شوند.
 * متادیتای پیش‌فرض ایستاست؛ صفحات، عنوان و توضیحات را از تنظیمات قابل ویرایش فروشگاه می‌سازند.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "روشاک | لباس مجلسی و لباس شب زنانه", template: "%s | روشاک" },
  description: "فروشگاه اینترنتی روشاک؛ لباس شب، پیراهن مجلسی، لباس نامزدی و جامپسوت رسمی زنانه با دوخت دقیق و پارچه‌های مرغوب.",
  applicationName: "روشاک",
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#641E32",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
