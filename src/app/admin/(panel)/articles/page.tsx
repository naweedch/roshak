import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied, AdminPageHeader } from "@/components/admin/admin-ui";
import { ArticleManager } from "@/components/admin/managers";
import { requireStaff } from "@/server/auth/current";
import { listArticlesAdmin } from "@/server/services/admin/content-admin";

export const metadata = { title: "مجله" };

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Articles />
    </Suspense>
  );
}

async function Articles() {
  await connection();
  const { allowed } = await requireStaff("content:write");
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader title="مجلهٔ روشاک" description="مقاله‌های منتشرشده در /journal و نقشهٔ سایت نمایش داده می‌شوند." />
      <ArticleManager items={await listArticlesAdmin()} />
    </>
  );
}
