import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { appUrl } from "@/server/env";

/** بخش‌های خصوصی و صفحات بدون ارزش جست‌وجو از خزش مستثنا هستند */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const base = appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/cart", "/checkout", "/orders", "/payment", "/api/", "/search", "/newsletter"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
