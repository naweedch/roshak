import { Suspense } from "react";
import { privateMetadata } from "@/server/seo";
import { NewsletterConfirm } from "./confirm";

export const metadata = privateMetadata("خبرنامه");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function NewsletterConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-8">
      <h1 className="font-display text-4xl text-burgundy">خبرنامهٔ روشاک</h1>
      <Suspense fallback={<div className="skeleton mt-8 h-16 rounded-2xl" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;
  const action = sp.action === "unsubscribe" ? "unsubscribe" : "confirm";
  return <NewsletterConfirm token={token} action={action} />;
}
