"use client";

/** مدیریت تصاویر محصول: بارگذاری (با اعتبارسنجی سمت سرور)، رنگ مرتبط، متن جایگزین، ترتیب و حذف */
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, NativeSelect } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";

interface ImageItem {
  id: string;
  url: string;
  alt: string;
  colorId: string | null;
  kind: "GALLERY" | "VIEW360";
  sortOrder: number;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function ProductImagesManager({ productId, images, colors, canWrite }: { productId: string; images: ImageItem[]; colors: Array<{ id: string; name: string }>; canWrite: boolean }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [alt, setAlt] = React.useState("");
  const [colorId, setColorId] = React.useState("");
  const [kind, setKind] = React.useState<"GALLERY" | "VIEW360">("GALLERY");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const gallery = images.filter((i) => i.kind === "GALLERY");
  const frames = images.filter((i) => i.kind === "VIEW360");

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("فایلی انتخاب نشده است");
    if (file.size > MAX_BYTES) return setError("حداکثر حجم تصویر ۸ مگابایت است");
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("alt", alt);
    if (colorId) form.set("colorId", colorId);
    form.set("kind", kind);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/images`, { method: "POST", body: form, credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as { error?: { message: string; details?: { fields?: Record<string, string> } } } | null;
      if (!res.ok) throw new Error(json?.error?.details?.fields ? Object.values(json.error.details.fields)[0] : (json?.error?.message ?? "بارگذاری ناموفق بود"));
      toast.success("تصویر بارگذاری شد");
      setFile(null);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "بارگذاری ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function move(list: ImageItem[], index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api(`/api/v1/admin/products/${productId}/images`, { method: "PATCH", body: { imageIds: next.map((i) => i.id) } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "تغییر ترتیب ناموفق بود");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("این تصویر حذف شود؟")) return;
    try {
      await api(`/api/v1/admin/products/${productId}/images/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "حذف ناموفق بود");
    }
  }

  const grid = (list: ImageItem[], label: string) => (
    <div>
      <p className="mb-3 text-sm font-medium">{label}</p>
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">تصویری ثبت نشده است.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
          {list.map((img, i) => (
            <li key={img.id} className="space-y-1.5">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ivory-deep">
                <Image src={img.url} alt={img.alt} fill sizes="160px" className="object-cover" />
                {i === 0 && img.kind === "GALLERY" ? <Badge tone="burgundy" className="absolute start-2 top-2">اصلی</Badge> : null}
              </div>
              <p className="line-clamp-2 text-xs text-ink-muted">{img.alt}</p>
              {img.colorId ? <p className="text-xs">{colors.find((c) => c.id === img.colorId)?.name}</p> : null}
              {canWrite ? (
                <div className="flex gap-1">
                  <Button type="button" size="iconSm" variant="ghost" onClick={() => move(list, i, -1)} aria-label="انتقال به قبل" disabled={i === 0}>
                    <ArrowRight />
                  </Button>
                  <Button type="button" size="iconSm" variant="ghost" onClick={() => move(list, i, 1)} aria-label="انتقال به بعد" disabled={i === list.length - 1}>
                    <ArrowLeft />
                  </Button>
                  <Button type="button" size="iconSm" variant="ghost" className="text-danger" onClick={() => remove(img.id)} aria-label="حذف تصویر">
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {grid(gallery, "گالری")}
      {grid(frames, "فریم‌های نمای چرخشی (به ترتیب زاویه؛ ۸ فریم یا بیشتر = ۳۶۰ درجه)")}
      {canWrite ? (
        <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-dashed border-line-strong p-5 sm:grid-cols-2">
          {error ? (
            <FormMessage className="sm:col-span-2">{error}</FormMessage>
          ) : null}
          <Field label="فایل تصویر" htmlFor="img-file" required hint="JPEG، PNG، WebP یا AVIF تا ۸ مگابایت؛ به WebP تبدیل و متادیتا حذف می‌شود.">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-burgundy file:px-4 file:py-2 file:text-ivory"
            />
          </Field>
          <Field label="متن جایگزین (alt)" htmlFor="img-alt" required hint="توصیف تصویر برای نابینایان و موتورهای جست‌وجو">
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
          <Field label="رنگ مرتبط" htmlFor="img-color">
            <NativeSelect value={colorId} onChange={(e) => setColorId(e.target.value)}>
              <option value="">همهٔ رنگ‌ها</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="نوع" htmlFor="img-kind">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as "GALLERY" | "VIEW360")}>
              <option value="GALLERY">گالری</option>
              <option value="VIEW360">فریم نمای چرخشی</option>
            </NativeSelect>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy} disabled={!file || alt.trim().length < 3}>
              <Upload /> بارگذاری تصویر
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
