import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/auth-forms";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("بازیابی رمز عبور");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="بازیابی رمز عبور" description="پیوند تعیین رمز جدید به ایمیل شما ارسال می‌شود." footer={<AuthLink href="/account/login">بازگشت به ورود</AuthLink>}>
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
  return <ForgotPasswordForm />;
}
