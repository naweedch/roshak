import Link from "next/link";
import { RoshakEmblem } from "@/components/brand/logo";

/** قاب صفحات ورود و ثبت‌نام */
export function AuthShell({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <RoshakEmblem className="h-14 text-burgundy" />
        <h1 className="mt-6 font-display text-5xl text-burgundy">{title}</h1>
        {description ? <p className="mt-3 text-ink-muted">{description}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">{footer}</div> : null}
      </div>
      <div aria-hidden className="arch-3-4 relative hidden aspect-[3/4] overflow-hidden bg-[radial-gradient(120%_90%_at_30%_20%,#4a1424_0%,#1c0b14_55%,#0e1626_100%)] lg:block">
        <svg viewBox="0 0 300 400" className="absolute inset-10 text-champagne/60">
          <path d="M10 400V150C10 72 72 10 150 10s140 62 140 140v250" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <p className="absolute inset-x-0 bottom-16 text-center font-display text-3xl text-ivory/90">برای شب‌هایی که می‌درخشند</p>
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-burgundy underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
