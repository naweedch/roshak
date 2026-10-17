import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { VerifyEmail } from "@/components/account/auth-forms";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("تأیید ایمیل");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="تأیید ایمیل" description="" footer={null}>
      <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const value = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  void value;
  return <VerifyEmail token={value("token") ?? null} />;
}
