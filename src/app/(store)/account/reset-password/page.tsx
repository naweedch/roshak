import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/auth-forms";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("تعیین رمز جدید");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="تعیین رمز جدید" description="رمز عبور تازه‌ای برای حساب خود انتخاب کنید." footer={<AuthLink href="/account/forgot-password">درخواست پیوند جدید</AuthLink>}>
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
  return value("token") ? <ResetPasswordForm token={value("token")!} /> : <p className="text-danger">پیوند بازیابی ناقص است؛ دوباره درخواست دهید.</p>;
}
