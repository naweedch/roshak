"use client";

/**
 * مدیر عمومی موجودیت‌ها در پنل: جدول + دیالوگ ایجاد/ویرایش + حذف.
 * فرم از روی تعریف فیلدها ساخته می‌شود و اعتبارسنجی نهایی همیشه در سرور (همان طرح Zod) انجام می‌شود؛
 * خطاهای فیلدی سرور کنار همان فیلد نمایش داده می‌شوند.
 */
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox, Field, FormMessage, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { AdminTable, type Column } from "./admin-ui";

export type Values = Record<string, unknown>;

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "number" | "money" | "checkbox" | "select" | "datetime" | "image" | "multiselect";
  hint?: string;
  required?: boolean;
  ltr?: boolean;
  /** در چیدمان دوستونی، تمام عرض را بگیرد */
  wide?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** مقدار خالی به‌جای رشتهٔ خالی، null ارسال شود (برای select و number اختیاری) */
  nullable?: boolean;
  /** پوشهٔ بارگذاری برای فیلد تصویر */
  folder?: "content" | "collections" | "products";
  /** هنگام ایجاد، نامک از این فیلد ساخته شود */
  slugFrom?: string;
  rows?: number;
  visible?: (values: Values) => boolean;
}

function toLocalInput(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** مقدار ذخیره‌شده → مقدار قابل نمایش در فرم */
function toFormValues(fields: FieldDef[], source: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = source[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(v);
    else if (f.type === "multiselect") out[f.name] = Array.isArray(v) ? v : [];
    else if (f.type === "datetime") out[f.name] = toLocalInput(v);
    else out[f.name] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

/** مقدار فرم → بدنهٔ درخواست (تبدیل نوع‌ها؛ تبدیل نهایی و اعتبارسنجی در سرور) */
function toPayload(fields: FieldDef[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "checkbox" || f.type === "multiselect") out[f.name] = v;
    else if (f.type === "datetime") out[f.name] = typeof v === "string" && v ? new Date(v).toISOString() : null;
    else if (f.type === "number") out[f.name] = v === "" || v === undefined ? (f.nullable ? null : undefined) : Number(v);
    else if (f.type === "select" && f.nullable) out[f.name] = v === "" ? null : v;
    else out[f.name] = typeof v === "string" ? v : (v ?? "");
  }
  return out;
}

function ImageField({ id, value, onChange, folder }: { id: string; value: string; onChange: (url: string) => void; folder: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) return setError("حداکثر حجم تصویر ۸ مگابایت است");
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    try {
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: form, credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as { data?: { url: string }; error?: { message: string } } | null;
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "بارگذاری ناموفق بود");
      onChange(json.data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری ناموفق بود");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-ivory-deep">
            <Image src={value} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : null}
        <div className="flex-1 space-y-2">
          <Input id={id} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/media/... یا https://..." />
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => fileRef.current?.click()}>
              <Upload /> بارگذاری تصویر
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
                حذف
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function EntityForm({
  fields,
  initial,
  isNew,
  submitLabel,
  onSubmit,
  columns = 2,
}: {
  fields: FieldDef[];
  initial: Values;
  isNew: boolean;
  submitLabel: string;
  onSubmit: (payload: Values) => Promise<void>;
  columns?: 1 | 2;
}) {
  const [values, setValues] = React.useState<Values>(() => toFormValues(fields, initial));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(!isNew);

  function set(name: string, value: unknown) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (!slugTouched) {
        for (const f of fields) if (f.slugFrom === name && typeof value === "string") next[f.name] = slugify(value);
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await onSubmit(toPayload(fields, values));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(Object.keys(err.fields).length ? "لطفاً خطاهای مشخص‌شده را برطرف کنید" : err.message);
      } else setMessage("ذخیره ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {message ? <FormMessage>{message}</FormMessage> : null}
      {/* min-w-0: جلوگیری از سرریز افقی ورودی‌هایی با عرض ذاتی بزرگ (مانند تاریخ) در موبایل */}
      <div className={cn("grid gap-5 [&>*]:min-w-0", columns === 2 && "sm:grid-cols-2")}>
        {fields.map((f) => {
          if (f.visible && !f.visible(values)) return null;
          const id = `ef-${f.name}`;
          const v = values[f.name];
          const wide = f.wide || f.type === "textarea" || f.type === "markdown" || f.type === "multiselect" || f.type === "image";
          if (f.type === "checkbox") {
            return (
              <label key={f.name} className={cn("flex items-center gap-2 self-end text-sm", wide && "sm:col-span-2")}>
                <Checkbox checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}
                {errors[f.name] ? <span className="text-xs text-danger">{errors[f.name]}</span> : null}
              </label>
            );
          }
          if (f.type === "multiselect") {
            const selected = Array.isArray(v) ? (v as string[]) : [];
            return (
              <fieldset key={f.name} className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium">
                  {f.label}
                  {f.required ? <span className="ms-1 text-danger" aria-hidden>*</span> : null}
                </legend>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {(f.options ?? []).map((o) => {
                    const checked = selected.includes(o.value);
                    return (
                      <label key={o.value} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-burgundy/40", checked ? "border-burgundy bg-burgundy text-ivory" : "border-line")}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => set(f.name, checked ? selected.filter((x) => x !== o.value) : [...selected, o.value])} />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {f.hint && !errors[f.name] ? <p className="mt-1.5 text-xs text-ink-muted">{f.hint}</p> : null}
                {errors[f.name] ? <p className="mt-1.5 text-xs font-medium text-danger">{errors[f.name]}</p> : null}
              </fieldset>
            );
          }
          const str = typeof v === "string" ? v : "";
          let control: React.ReactElement<Record<string, unknown>>;
          switch (f.type) {
            case "textarea":
            case "markdown":
              control = <Textarea rows={f.rows ?? (f.type === "markdown" ? 12 : 3)} dir={f.ltr ? "ltr" : undefined} value={str} onChange={(e) => set(f.name, e.target.value)} className={f.type === "markdown" ? "font-mono text-sm" : undefined} />;
              break;
            case "select":
              control = (
                <NativeSelect value={str} onChange={(e) => set(f.name, e.target.value)}>
                  {f.nullable ? <option value="">—</option> : null}
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              );
              break;
            case "datetime":
              control = <Input type="datetime-local" dir="ltr" value={str} onChange={(e) => set(f.name, e.target.value)} />;
              break;
            case "number":
              control = <Input type="number" dir="ltr" inputMode="numeric" value={str} onChange={(e) => set(f.name, e.target.value)} />;
              break;
            case "money":
              control = <Input dir="ltr" inputMode="decimal" value={str} onChange={(e) => set(f.name, e.target.value)} />;
              break;
            case "image":
              control = <ImageField id={id} value={str} onChange={(url) => set(f.name, url)} folder={f.folder ?? "content"} />;
              break;
            default:
              control = (
                <Input
                  dir={f.ltr ? "ltr" : undefined}
                  value={str}
                  onChange={(e) => {
                    // ویرایش دستی نامک، ساخت خودکار آن از عنوان را متوقف می‌کند
                    if (f.slugFrom) setSlugTouched(true);
                    set(f.name, e.target.value);
                  }}
                />
              );
          }
          return (
            <Field key={f.name} label={f.label} htmlFor={id} required={f.required} hint={f.type === "markdown" ? (f.hint ?? "قالب Markdown: ## تیتر، **پررنگ**، - فهرست، [پیوند](نشانی)") : f.hint} error={errors[f.name]} className={wide ? "sm:col-span-2" : undefined}>
              {control}
            </Field>
          );
        })}
      </div>
      <Button type="submit" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function EntityManager<T extends { id: string }>({
  items,
  fields,
  columns,
  createUrl,
  itemUrl,
  canWrite,
  canDelete = canWrite,
  noun,
  defaults = {},
  toInitial,
  caption,
  empty,
  wide = false,
  deleteConfirm,
  deleteResultMessage,
}: {
  items: T[];
  fields: FieldDef[];
  columns: Column<T>[];
  createUrl: string;
  itemUrl: (id: string) => string;
  canWrite: boolean;
  canDelete?: boolean;
  /** نام موجودیت برای عنوان‌ها، مانند «کد تخفیف» */
  noun: string;
  defaults?: Values;
  /** تبدیل ردیف فهرست به مقدار اولیهٔ فرم (در صورت تفاوت ساختار) */
  toInitial?: (item: T) => Values;
  caption: string;
  empty?: string;
  wide?: boolean;
  deleteConfirm?: string;
  deleteResultMessage?: (result: unknown) => string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<T | "new" | null>(null);

  async function save(payload: Values) {
    if (editing === "new") await api(createUrl, { body: payload });
    else if (editing) await api(itemUrl(editing.id), { method: "PATCH", body: payload });
    toast.success(`${noun} ذخیره شد`);
    setEditing(null);
    router.refresh();
  }

  async function remove(item: T) {
    if (!window.confirm(deleteConfirm ?? `این ${noun} حذف شود؟`)) return;
    try {
      const result = await api<unknown>(itemUrl(item.id), { method: "DELETE" });
      toast.success(deleteResultMessage ? deleteResultMessage(result) : `${noun} حذف شد`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "حذف ناموفق بود");
    }
  }

  const actionColumn: Column<T> = {
    header: "عملیات",
    className: "w-28",
    cell: (row) => (
      <div className="flex gap-1">
        <Button type="button" size="iconSm" variant="ghost" onClick={() => setEditing(row)} aria-label={`ویرایش ${noun}`}>
          <Pencil />
        </Button>
        {canDelete ? (
          <Button type="button" size="iconSm" variant="ghost" className="text-danger" onClick={() => remove(row)} aria-label={`حذف ${noun}`}>
            <Trash2 />
          </Button>
        ) : null}
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            <Plus /> {noun} جدید
          </Button>
        </div>
      ) : null}
      <AdminTable caption={caption} rows={items} rowKey={(r) => r.id} columns={canWrite ? [...columns, actionColumn] : columns} empty={empty} />
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null ? (
          <DialogContent title={editing === "new" ? `${noun} جدید` : `ویرایش ${noun}`} className={wide ? "max-w-3xl" : "max-w-2xl"}>
            <EntityForm
              key={editing === "new" ? "new" : editing.id}
              fields={fields}
              initial={editing === "new" ? defaults : toInitial ? toInitial(editing) : (editing as unknown as Values)}
              isNew={editing === "new"}
              submitLabel={editing === "new" ? "ایجاد" : "ذخیرهٔ تغییرات"}
              onSubmit={save}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
