import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/server/seo";
import { cn } from "@/lib/utils";

export interface Crumb {
  name: string;
  path: string;
}

/** مسیر راهنما با داده‌های ساختاریافتهٔ BreadcrumbList */
export function Breadcrumbs({ items, className, tone = "light" }: { items: Crumb[]; className?: string; tone?: "light" | "dark" }) {
  const all = [{ name: "خانه", path: "/" }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(all)} />
      <nav aria-label="مسیر صفحه" className={cn("text-sm", className)}>
        <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", tone === "dark" ? "text-ivory/60" : "text-ink-muted")}>
          {all.map((item, index) => {
            const last = index === all.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className={tone === "dark" ? "text-ivory" : "text-ink"}>
                    {item.name}
                  </span>
                ) : (
                  <>
                    <Link href={item.path} className="transition-colors hover:text-burgundy">
                      {item.name}
                    </Link>
                    <span aria-hidden className="text-line-strong">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
