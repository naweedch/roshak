"use client";

/** مدیریت تنوع‌های رنگ/سایز، فعال‌سازی و تغییر موجودی با ثبت حرکت انبار */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FormMessage, Input, NativeSelect } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import { toPersianDigits } from "@/lib/persian";

interface Variant {
  id: string;
  sku: string;
  stock: number;
  isActive: boolean;
  lowStockThreshold: number | null;
  color: { id: string; name: string; hex: string };
  size: { id: string; label: string };
}

export function VariantsManager({
  productId,
  variants,
  colors,
  sizes,
  canWrite,
  canAdjustStock,
}: {
  productId: string;
  variants: Variant[];
  colors: Array<{ id: string; name: string; hex: string; slug: string }>;
  sizes: Array<{ id: string; label: string }>;
  canWrite: boolean;
  canAdjustStock: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [stockFor, setStockFor] = React.useState<Variant | null>(null);

  async function toggle(v: Variant) {
    try {
      await api(`/api/v1/admin/variants/${v.id}`, { method: "PATCH", body: { isActive: !v.isActive } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "تغییر ناموفق بود");
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-xs text-ink-muted">
            <tr>
              <th className="py-2 text-start font-medium">رنگ</th>
              <th className="py-2 text-start font-medium">سایز</th>
              <th className="py-2 text-start font-medium">کد کالا</th>
              <th className="py-2 text-start font-medium">موجودی</th>
              <th className="py-2 text-start font-medium">وضعیت</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-muted">
                  هنوز تنوعی ثبت نشده است؛ بدون تنوع، محصول قابل خرید نیست.
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="size-4 rounded-full border border-ink/10" style={{ backgroundColor: v.color.hex }} aria-hidden />
                      {v.color.name}
                    </span>
                  </td>
                  <td className="tabular">{toPersianDigits(v.size.label)}</td>
                  <td dir="ltr" className="text-start font-mono text-xs">
                    {v.sku}
                  </td>
                  <td>
                    <span className={`tabular font-semibold ${v.stock === 0 ? "text-danger" : ""}`}>{toPersianDigits(v.stock)}</span>
                  </td>
                  <td>{v.isActive ? <Badge tone="success">فعال</Badge> : <Badge>غیرفعال</Badge>}</td>
                  <td className="text-end">
                    <div className="flex justify-end gap-1">
                      {canAdjustStock ? (
                        <Button size="sm" variant="ghost" onClick={() => setStockFor(v)}>
                          موجودی
                        </Button>
                      ) : null}
                      {canWrite ? (
                        <Button size="sm" variant="ghost" onClick={() => toggle(v)}>
                          {v.isActive ? "غیرفعال" : "فعال"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {canWrite ? (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Plus /> افزودن تنوع
        </Button>
      ) : null}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent title="افزودن تنوع">
          <AddVariantForm
            productId={productId}
            colors={colors}
            sizes={sizes}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={stockFor !== null} onOpenChange={(o) => !o && setStockFor(null)}>
        {stockFor ? (
          <DialogContent title={`تغییر موجودی ${stockFor.sku}`} description={`موجودی فعلی: ${toPersianDigits(stockFor.stock)}`}>
            <StockForm
              variant={stockFor}
              onDone={() => {
                setStockFor(null);
                router.refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function AddVariantForm({ productId, colors, sizes, onDone }: { productId: string; colors: Array<{ id: string; name: string; slug: string }>; sizes: Array<{ id: string; label: string }>; onDone: () => void }) {
  /** پیشنهاد کد کالا از رنگ و سایز انتخاب‌شده (قابل ویرایش دستی) */
  const suggestSku = (cId: string, sId: string) => {
    const color = colors.find((c) => c.id === cId);
    const size = sizes.find((s) => s.id === sId);
    return color && size ? `RSK-${productId.slice(-4).toUpperCase()}-${color.slug.slice(0, 3).toUpperCase()}-${size.label}` : "";
  };
  const [colorId, setColorId] = React.useState(colors[0]?.id ?? "");
  const [sizeId, setSizeId] = React.useState(sizes[0]?.id ?? "");
  const [sku, setSku] = React.useState(() => suggestSku(colors[0]?.id ?? "", sizes[0]?.id ?? ""));
  const [stock, setStock] = React.useState("0");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api(`/api/v1/admin/products/${productId}/variants`, { body: { colorId, sizeId, sku, initialStock: Number(stock) || 0 } });
          toast.success("تنوع اضافه شد");
          onDone();
        } catch (err) {
          setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : "ثبت ناموفق بود");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error ? <FormMessage>{error}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رنگ" htmlFor="v-color" required>
          <NativeSelect
            value={colorId}
            onChange={(e) => {
              setColorId(e.target.value);
              setSku(suggestSku(e.target.value, sizeId));
            }}
          >
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="سایز" htmlFor="v-size" required>
          <NativeSelect
            value={sizeId}
            onChange={(e) => {
              setSizeId(e.target.value);
              setSku(suggestSku(colorId, e.target.value));
            }}
          >
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="کد کالا (SKU)" htmlFor="v-sku" required>
          <Input dir="ltr" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
        </Field>
        <Field label="موجودی اولیه" htmlFor="v-stock">
          <Input dir="ltr" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" loading={busy}>
        افزودن
      </Button>
    </form>
  );
}

export function StockForm({ variant, onDone }: { variant: Pick<Variant, "id" | "stock">; onDone: () => void }) {
  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState<"RESTOCK" | "ADJUSTMENT" | "CORRECTION" | "RETURN">("RESTOCK");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const n = Number(delta);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<{ stockAfter: number }>(`/api/v1/admin/variants/${variant.id}/stock`, { body: { delta: n, reason, note } });
          toast.success(`موجودی جدید: ${toPersianDigits(r.stockAfter)}`);
          onDone();
        } catch (err) {
          setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : "ثبت ناموفق بود");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field label="مقدار تغییر" htmlFor="s-delta" required hint="عدد مثبت برای افزایش (مثلاً ۵)، منفی برای کاهش (مثلاً ‎-۲)">
        <Input dir="ltr" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
      </Field>
      <Field label="علت" htmlFor="s-reason" required>
        <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          <option value="RESTOCK">ورود کالا</option>
          <option value="ADJUSTMENT">اصلاح دستی</option>
          <option value="CORRECTION">تصحیح انبارگردانی</option>
          <option value="RETURN">مرجوعی</option>
        </NativeSelect>
      </Field>
      <Field label="توضیح" htmlFor="s-note">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {Number.isFinite(n) && n !== 0 ? <p className="text-sm text-ink-muted">موجودی پس از ثبت: {toPersianDigits(variant.stock + n)}</p> : null}
      <Button type="submit" loading={busy} disabled={!Number.isInteger(n) || n === 0}>
        ثبت تغییر موجودی
      </Button>
    </form>
  );
}
