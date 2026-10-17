import type { NextConfig } from "next";

/**
 * پیکربندی Next.js روشنک.
 * - Cache Components و Partial Prefetching (پیش‌فرض‌های Next 16)
 * - خروجی standalone برای Docker
 * - هدرهای امنیتی و CSP
 * - بهینه‌سازی تصاویر رسانهٔ محلی (/media) و ذخیره‌ساز S3 (در صورت تنظیم)
 */

const isDev = process.env.NODE_ENV !== "production";

function s3Pattern(): URL[] {
  const url = process.env.S3_PUBLIC_URL;
  if (!url) return [];
  try {
    const parsed = new URL(url);
    return [new URL(`${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}/**`)];
  } catch {
    return [];
  }
}

const s3Origin = (() => {
  try {
    return process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).origin : "";
  } catch {
    return "";
  }
})();

const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
const instagramEnabled = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

const csp = [
  "default-src 'self'",
  // Next.js برای اسکریپت‌های درون‌خطی hydration به 'unsafe-inline' نیاز دارد (بدون nonce)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${analyticsEnabled ? " https://www.googletagmanager.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${s3Origin ? ` ${s3Origin}` : ""}${analyticsEnabled ? " https://www.google-analytics.com" : ""}${instagramEnabled ? " https://*.cdninstagram.com https://*.fbcdn.net" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}${analyticsEnabled ? " https://www.google-analytics.com https://region1.google-analytics.com" : ""}${s3Origin ? ` ${s3Origin}` : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  serverExternalPackages: ["@node-rs/argon2", "sharp", "embedded-postgres"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [{ pathname: "/media/**", search: "" }, { pathname: "/images/**", search: "" }],
    remotePatterns: s3Pattern(),
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/(admin|account|checkout|cart)(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
