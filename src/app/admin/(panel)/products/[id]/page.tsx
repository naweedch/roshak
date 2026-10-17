import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImagesManager } from "@/components/admin/product-images";
import { VariantsManager } from "@/components/admin/variants-manager";
import { AccessDenied, AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { buttonVariants } from "@/components/ui/button";
import { hasPermission } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getProductAdmin, productFormOptions } from "@/server/services/admin/products";

export const metadata = { title: "ویرایش محصول" };

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { session, allowed } = await requireStaff("product:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const product = await getProductAdmin(id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const options = await productFormOptions();
  const role = session.user.role;
  const canWrite = hasPermission(role, "product:write");
  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`نامک: ${product.slug}`}
        actions={
          <Link href={`/products/${product.slug}${product.status === "ACTIVE" ? "" : "?preview=1"}`} target="_blank" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <ExternalLink /> {product.status === "ACTIVE" ? "مشاهده در فروشگاه" : "پیش‌نمایش"}
          </Link>
        }
      />
      <div className="space-y-6">
        <ProductForm options={options} product={product} readOnly={!canWrite} canDelete={hasPermission(role, "product:delete")} />
        <AdminCard title="تنوع‌ها و موجودی">
          <VariantsManager productId={product.id} variants={product.variants} colors={options.colors} sizes={options.sizes} canWrite={canWrite} canAdjustStock={hasPermission(role, "inventory:write")} />
        </AdminCard>
        <AdminCard title="تصاویر">
          <ProductImagesManager productId={product.id} images={product.images} colors={options.colors.filter((c) => product.variants.some((v) => v.color.id === c.id))} canWrite={canWrite && hasPermission(role, "media:upload")} />
        </AdminCard>
      </div>
    </>
  );
}
