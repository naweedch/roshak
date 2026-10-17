import { Suspense } from "react";
import { connection } from "next/server";
import { ProductForm } from "@/components/admin/product-form";
import { AccessDenied, AdminPageHeader } from "@/components/admin/admin-ui";
import { requireStaff } from "@/server/auth/current";
import { productFormOptions } from "@/server/services/admin/products";

export const metadata = { title: "محصول جدید" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  await connection();
  const { allowed } = await requireStaff("product:write");
  if (!allowed) return <AccessDenied />;
  const options = await productFormOptions();
  return (
    <>
      <AdminPageHeader title="محصول جدید" description="پس از ذخیره، تنوع‌های رنگ و سایز و تصاویر را اضافه کنید." />
      <ProductForm options={options} />
    </>
  );
}
