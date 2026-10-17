import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied, AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { CategoryManager, CollectionManager } from "@/components/admin/managers";
import { requireStaff } from "@/server/auth/current";
import { listCategoriesAdmin, listCollectionsAdmin } from "@/server/services/admin/catalog-admin";

export const metadata = { title: "دسته‌ها و مجموعه‌ها" };

export default function TaxonomyPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Taxonomy />
    </Suspense>
  );
}

async function Taxonomy() {
  await connection();
  const { allowed } = await requireStaff("catalog:taxonomy");
  if (!allowed) return <AccessDenied />;
  const [categories, collections] = await Promise.all([listCategoriesAdmin(), listCollectionsAdmin()]);
  return (
    <>
      <AdminPageHeader title="دسته‌ها و مجموعه‌ها" description="دسته نوع لباس است (هر محصول یک دسته)؛ مجموعه گروه‌بندی آزاد برای فصل، مناسبت یا کمپین است." />
      <div className="space-y-8">
        <AdminCard title="مجموعه‌ها">
          <CollectionManager items={collections} canWrite />
        </AdminCard>
        <AdminCard title="دسته‌ها">
          <CategoryManager items={categories} canWrite />
        </AdminCard>
      </div>
    </>
  );
}
