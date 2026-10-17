"use client";

/** فرم ایجاد/ویرایش محصول با اعتبارسنجی Zod مشترک با سرور */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { DRESS_LENGTH_LABELS } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import { productSchema, type ProductData, type ProductInput } from "@/lib/validation/admin";
import { AdminCard } from "./admin-ui";

interface Options {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  sizeGuides: Array<{ id: string; name: string }>;
}

interface ExistingProduct {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string;
  fabric: string | null;
  careInstructions: string | null;
  modelInfo: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string;
  sizeGuideId: string | null;
  length: ProductInput["length"];
  price: string;
  salePrice: string | null;
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  model3dUrl: string | null;
  collectionIds: string[];
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function ProductForm({ options, product, readOnly = false, canDelete = false }: { options: Options; product?: ExistingProduct; readOnly?: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(product));
  const { register, handleSubmit, setValue, setError, watch, formState } = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          ...product,
          subtitle: product.subtitle ?? "",
          fabric: product.fabric ?? "",
          careInstructions: product.careInstructions ?? "",
          modelInfo: product.modelInfo ?? "",
          salePrice: product.salePrice ?? "",
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          model3dUrl: product.model3dUrl ?? "",
          publishedAt: toLocalInput(product.publishedAt),
        }
      : { status: "DRAFT", isFeatured: false, sortOrder: 0, collectionIds: [], categoryId: options.categories[0]?.id, length: "FLOOR" },
  });
  const errs = formState.errors;
  const name = watch("name");
  const collectionIds = watch("collectionIds") ?? [];

  React.useEffect(() => {
    if (!slugTouched && name) setValue("slug", slugify(name), { shouldValidate: false });
  }, [name, slugTouched, setValue]);

  async function onSubmit(values: ProductData) {
    setMessage(null);
    try {
      const body = { ...values, publishedAt: values.publishedAt ? values.publishedAt.toISOString() : null };
      if (product) {
        await api(`/api/v1/admin/products/${product.id}`, { method: "PATCH", body });
        toast.success("محصول ذخیره شد");
        router.refresh();
      } else {
        const created = await api<{ id: string }>("/api/v1/admin/products", { body });
        toast.success("محصول ایجاد شد؛ اکنون تنوع‌ها و تصاویر را اضافه کنید");
        router.push(`/admin/products/${created.id}`);
      }
    } catch (e) {
      if (e instanceof ApiError) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof ProductInput, { message: m });
      setMessage(e instanceof ApiError ? e.message : "ذخیره ناموفق بود");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {message ? <FormMessage>{message}</FormMessage> : null}
      <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <AdminCard title="اطلاعات اصلی">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="نام محصول" htmlFor="p-name" error={errs.name?.message} required>
                <Input {...register("name")} />
              </Field>
              <Field label="نامک (URL)" htmlFor="p-slug" error={errs.slug?.message} required hint="تغییر نامک، نشانی قبلی را با ریدایرکت ۳۰۱ حفظ می‌کند.">
                <Input dir="ltr" {...register("slug", { onChange: () => setSlugTouched(true) })} />
              </Field>
              <Field label="زیرعنوان" htmlFor="p-subtitle" error={errs.subtitle?.message} className="sm:col-span-2">
                <Input {...register("subtitle")} />
              </Field>
              <Field label="توضیحات" htmlFor="p-description" error={errs.description?.message} required className="sm:col-span-2" hint="پاراگراف‌ها را با یک خط خالی جدا کنید.">
                <Textarea rows={7} {...register("description")} />
              </Field>
              <Field label="پارچه و جنس" htmlFor="p-fabric" error={errs.fabric?.message}>
                <Input {...register("fabric")} />
              </Field>
              <Field label="اندازهٔ مدل" htmlFor="p-model" error={errs.modelInfo?.message}>
                <Input {...register("modelInfo")} />
              </Field>
              <Field label="دستور نگهداری" htmlFor="p-care" error={errs.careInstructions?.message} className="sm:col-span-2">
                <Textarea rows={2} {...register("careInstructions")} />
              </Field>
            </div>
          </AdminCard>
          <AdminCard title="سئو">
            <div className="grid gap-5">
              <Field label="عنوان سئو" htmlFor="p-seo-title" error={errs.seoTitle?.message} hint="خالی = نام محصول">
                <Input {...register("seoTitle")} />
              </Field>
              <Field label="توضیح سئو" htmlFor="p-seo-desc" error={errs.seoDescription?.message} hint="حداکثر ۱۷۰ کاراکتر؛ خالی = ابتدای توضیحات">
                <Textarea rows={2} {...register("seoDescription")} />
              </Field>
              <Field label="نشانی مدل سه‌بعدی (GLB)" htmlFor="p-model3d" error={errs.model3dUrl?.message} hint="فقط اگر مدل واقعی همین لباس موجود است.">
                <Input dir="ltr" placeholder="/media/models/dress.glb" {...register("model3dUrl")} />
              </Field>
            </div>
          </AdminCard>
        </div>
        <div className="space-y-6">
          <AdminCard title="انتشار">
            <div className="grid gap-5">
              <Field label="وضعیت" htmlFor="p-status" error={errs.status?.message} required>
                <NativeSelect {...register("status")}>
                  <option value="DRAFT">پیش‌نویس (پنهان)</option>
                  <option value="ACTIVE">منتشر شده</option>
                  <option value="ARCHIVED">بایگانی</option>
                </NativeSelect>
              </Field>
              <Field label="زمان انتشار" htmlFor="p-published" error={errs.publishedAt?.message} hint="خالی = همین حالا (هنگام انتشار)">
                <Input type="datetime-local" dir="ltr" {...register("publishedAt")} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox {...register("isFeatured")} /> محصول ویژه (اولویت در فهرست)
              </label>
              <Field label="ترتیب نمایش" htmlFor="p-sort" error={errs.sortOrder?.message} hint="عدد کمتر = بالاتر">
                <Input type="number" dir="ltr" min={0} {...register("sortOrder")} />
              </Field>
            </div>
          </AdminCard>
          <AdminCard title="قیمت">
            <div className="grid gap-5">
              <Field label="قیمت" htmlFor="p-price" error={errs.price?.message} required>
                <Input dir="ltr" inputMode="numeric" {...register("price")} />
              </Field>
              <Field label="قیمت ویژه (اختیاری)" htmlFor="p-sale" error={errs.salePrice?.message} hint="باید کمتر از قیمت اصلی باشد">
                <Input dir="ltr" inputMode="numeric" {...register("salePrice")} />
              </Field>
            </div>
          </AdminCard>
          <AdminCard title="دسته‌بندی">
            <div className="grid gap-5">
              <Field label="دسته" htmlFor="p-category" error={errs.categoryId?.message} required>
                <NativeSelect {...register("categoryId")}>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="قد لباس" htmlFor="p-length" error={errs.length?.message}>
                <NativeSelect {...register("length")}>
                  {Object.entries(DRESS_LENGTH_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="راهنمای سایز" htmlFor="p-guide" error={errs.sizeGuideId?.message}>
                <NativeSelect {...register("sizeGuideId", { setValueAs: (v) => (v ? v : null) })}>
                  <option value="">بدون راهنما</option>
                  {options.sizeGuides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">مجموعه‌ها</legend>
                <div className="flex flex-wrap gap-2">
                  {options.collections.map((c) => {
                    const checked = collectionIds.includes(c.id);
                    return (
                      <label key={c.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${checked ? "border-burgundy bg-burgundy text-ivory" : "border-line"}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => setValue("collectionIds", checked ? collectionIds.filter((x) => x !== c.id) : [...collectionIds, c.id], { shouldDirty: true })}
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </AdminCard>
        </div>
      </fieldset>
      {!readOnly ? (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <Button type="submit" loading={formState.isSubmitting}>
            {product ? "ذخیرهٔ تغییرات" : "ایجاد محصول"}
          </Button>
          {product && canDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                if (!window.confirm("این محصول حذف شود؟ اگر سابقهٔ سفارش داشته باشد، به‌جای حذف بایگانی می‌شود.")) return;
                try {
                  const r = await api<{ result: "deleted" | "archived" }>(`/api/v1/admin/products/${product.id}`, { method: "DELETE" });
                  toast.success(r.result === "deleted" ? "محصول حذف شد" : "محصول سابقه داشت و بایگانی شد");
                  router.push("/admin/products");
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : "حذف ناموفق بود");
                }
              }}
            >
              <Trash2 /> حذف / بایگانی
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
