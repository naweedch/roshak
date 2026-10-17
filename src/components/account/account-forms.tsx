"use client";

/** فرم‌های پنل مشتری: پروفایل، تغییر رمز، مدیریت آدرس‌ها، ارسال دوبارهٔ تأیید ایمیل */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import { IRAN_PROVINCES } from "@/lib/iran";
import { toPersianDigits } from "@/lib/persian";
import { changePasswordSchema, profileSchema } from "@/lib/validation/auth";
import { savedAddressSchema } from "@/lib/validation/checkout";

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "خطای غیرمنتظره‌ای رخ داد";
}

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string | null; marketingOptIn: boolean } }) {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<z.input<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ...initial, phone: initial.phone ?? "" },
  });
  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        try {
          await api("/api/v1/auth/profile", { method: "PATCH", body: values });
          toast.success("اطلاعات حساب ذخیره شد");
          router.refresh();
        } catch (e) {
          if (e instanceof ApiError) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof z.input<typeof profileSchema>, { message: m });
          toast.error(errorText(e));
        }
      })}
    >
      <Field label="نام" htmlFor="p-first" error={formState.errors.firstName?.message} required>
        <Input {...register("firstName")} />
      </Field>
      <Field label="نام خانوادگی" htmlFor="p-last" error={formState.errors.lastName?.message} required>
        <Input {...register("lastName")} />
      </Field>
      <Field label="شمارهٔ موبایل" htmlFor="p-phone" error={formState.errors.phone?.message}>
        <Input type="tel" dir="ltr" {...register("phone")} />
      </Field>
      <label className="flex items-center gap-3 self-end pb-3 text-sm">
        <Checkbox {...register("marketingOptIn")} />
        دریافت خبرنامهٔ ایمیلی
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" loading={formState.isSubmitting}>
          ذخیرهٔ تغییرات
        </Button>
      </div>
    </form>
  );
}

export function ResendVerification() {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ message: string }>("/api/v1/auth/resend-verification", { body: {} });
          toast.success(r.message);
        } catch (e) {
          toast.error(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      ارسال دوبارهٔ پیوند تأیید
    </Button>
  );
}

export function ChangePasswordForm() {
  const [message, setMessage] = React.useState<{ tone: "success" | "error"; text: string } | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<z.input<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema) });
  return (
    <form
      noValidate
      className="max-w-md space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          const r = await api<{ message: string }>("/api/v1/auth/change-password", { body: values });
          setMessage({ tone: "success", text: r.message });
          reset();
        } catch (e) {
          if (e instanceof ApiError) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof z.input<typeof changePasswordSchema>, { message: m });
          setMessage({ tone: "error", text: errorText(e) });
        }
      })}
    >
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
      <Field label="رمز فعلی" htmlFor="cp-current" error={formState.errors.currentPassword?.message} required>
        <Input type="password" dir="ltr" autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="رمز جدید" htmlFor="cp-new" error={formState.errors.newPassword?.message} required hint="با تغییر رمز، از همهٔ دستگاه‌های دیگر خارج می‌شوید.">
        <Input type="password" dir="ltr" autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Button type="submit" loading={formState.isSubmitting}>
        تغییر رمز عبور
      </Button>
    </form>
  );
}

export interface AddressItem {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

type AddressFormValues = z.input<typeof savedAddressSchema>;

function AddressEditor({ initial, onSaved, onCancel }: { initial?: AddressItem; onSaved: () => void; onCancel: () => void }) {
  const { register, handleSubmit, setError, formState } = useForm<AddressFormValues>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: initial
      ? { ...initial, label: initial.label ?? "", province: initial.province as AddressFormValues["province"] }
      : { label: "", recipientName: "", phone: "", province: "اصفهان", city: "", addressLine: "", postalCode: "", isDefault: false },
  });
  return (
    <form
      noValidate
      className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6 sm:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        try {
          await api(initial ? `/api/v1/addresses/${initial.id}` : "/api/v1/addresses", { method: initial ? "PATCH" : "POST", body: values });
          toast.success("آدرس ذخیره شد");
          onSaved();
        } catch (e) {
          if (e instanceof ApiError) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof AddressFormValues, { message: m });
          toast.error(errorText(e));
        }
      })}
    >
      <Field label="عنوان (مثلاً خانه)" htmlFor="a-label" error={formState.errors.label?.message}>
        <Input {...register("label")} />
      </Field>
      <Field label="نام تحویل‌گیرنده" htmlFor="a-name" error={formState.errors.recipientName?.message} required>
        <Input {...register("recipientName")} />
      </Field>
      <Field label="موبایل" htmlFor="a-phone" error={formState.errors.phone?.message} required>
        <Input type="tel" dir="ltr" {...register("phone")} />
      </Field>
      <Field label="استان" htmlFor="a-province" error={formState.errors.province?.message} required>
        <NativeSelect {...register("province")}>
          {IRAN_PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="شهر" htmlFor="a-city" error={formState.errors.city?.message} required>
        <Input {...register("city")} />
      </Field>
      <Field label="کد پستی" htmlFor="a-postal" error={formState.errors.postalCode?.message} required>
        <Input dir="ltr" inputMode="numeric" {...register("postalCode")} />
      </Field>
      <Field label="نشانی کامل" htmlFor="a-line" error={formState.errors.addressLine?.message} required className="sm:col-span-2">
        <Textarea rows={2} {...register("addressLine")} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox {...register("isDefault")} />
        آدرس پیش‌فرض
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={formState.isSubmitting}>
          ذخیره
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: AddressItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(addresses.length ? null : "new");
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <div className="space-y-6">
      {editing === "new" ? <AddressEditor onSaved={done} onCancel={() => setEditing(null)} /> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="md:col-span-2">
              <AddressEditor initial={a} onSaved={done} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={a.id} className="rounded-2xl border border-line p-5 text-sm leading-7">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{a.label ?? a.recipientName}</p>
                {a.isDefault ? <Badge tone="champagne">پیش‌فرض</Badge> : null}
              </div>
              <p className="text-ink-muted">
                {a.recipientName} — <span dir="ltr">{toPersianDigits(a.phone)}</span>
              </p>
              <p className="text-ink-muted">
                {a.province}، {a.city}، {a.addressLine}
              </p>
              <p className="text-ink-muted">کد پستی: {toPersianDigits(a.postalCode)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a.id)}>
                  <Pencil /> ویرایش
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={async () => {
                    if (!window.confirm("این آدرس حذف شود؟")) return;
                    try {
                      await api(`/api/v1/addresses/${a.id}`, { method: "DELETE" });
                      toast.success("آدرس حذف شد");
                      router.refresh();
                    } catch (e) {
                      toast.error(errorText(e));
                    }
                  }}
                >
                  <Trash2 /> حذف
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing !== "new" ? (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <Plus /> افزودن آدرس
        </Button>
      ) : null}
    </div>
  );
}
