import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/auth-forms";
import { privateMetadata } from "@/server/seo";

export const metadata = privateMetadata("ورود به حساب");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="ورود به حساب" description="با ایمیل و رمز عبور وارد شوید." footer={<>حساب ندارید؟ <AuthLink href="/account/register">ساخت حساب جدید</AuthLink></>}>
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
  return <LoginForm next={value("next")} />;
}
