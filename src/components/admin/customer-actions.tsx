"use client";

/** اقدامات کارمند روی حساب کاربر: تعلیق/فعال‌سازی، تغییر نقش (فقط مدیر ارشد) و یادداشت داخلی */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role, UserStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { FormMessage, NativeSelect, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/rbac";
import { AdminCard } from "./admin-ui";

const ROLES: Role[] = ["CUSTOMER", "CONTENT_MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "ADMIN", "SUPER_ADMIN"];

export function CustomerActions({ userId, status, role, canChangeRole, canChangeSuper }: { userId: string; status: UserStatus; role: Role; canChangeRole: boolean; canChangeSuper: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [nextRole, setNextRole] = React.useState<Role>(role);
  const [note, setNote] = React.useState("");
  const locked = role === "SUPER_ADMIN" && !canChangeSuper;

  async function run(name: string, action: () => Promise<unknown>, success: string) {
    setBusy(name);
    setError(null);
    try {
      await action();
      toast.success(success);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "عملیات ناموفق بود");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AdminCard title="مدیریت حساب">
        <div className="space-y-5">
          {error ? <FormMessage>{error}</FormMessage> : null}
          {locked ? (
            <p className="text-sm text-ink-muted">حساب مدیر ارشد را فقط مدیر ارشد دیگری می‌تواند تغییر دهد.</p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm text-ink-muted">
                  {status === "ACTIVE" ? "تعلیق حساب، همهٔ نشست‌های فعال کاربر را باطل می‌کند و ورود را مسدود می‌کند." : "این حساب معلق است و کاربر نمی‌تواند وارد شود."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={status === "ACTIVE" ? "danger" : "secondary"}
                  loading={busy === "status"}
                  onClick={() => {
                    if (status === "ACTIVE" && !window.confirm("حساب این کاربر معلق شود؟")) return;
                    void run(
                      "status",
                      () => api(`/api/v1/admin/customers/${userId}`, { method: "PATCH", body: { status: status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } }),
                      status === "ACTIVE" ? "حساب معلق شد" : "حساب فعال شد",
                    );
                  }}
                >
                  {status === "ACTIVE" ? "تعلیق حساب" : "فعال‌سازی دوباره"}
                </Button>
              </div>
              {canChangeRole ? (
                <form
                  className="space-y-3 border-t border-line pt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (nextRole === role) return;
                    if (!window.confirm(`نقش به «${ROLE_LABELS[nextRole]}» تغییر کند؟ نشست‌های فعلی کاربر باطل می‌شود.`)) return;
                    void run("role", () => api(`/api/v1/admin/customers/${userId}`, { method: "PATCH", body: { role: nextRole } }), "نقش تغییر کرد");
                  }}
                >
                  <label htmlFor="c-role" className="text-sm font-medium">
                    نقش
                  </label>
                  <NativeSelect id="c-role" value={nextRole} onChange={(e) => setNextRole(e.target.value as Role)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button type="submit" size="sm" variant="secondary" loading={busy === "role"} disabled={nextRole === role}>
                    ذخیرهٔ نقش
                  </Button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </AdminCard>
      <AdminCard title="افزودن یادداشت">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run("note", () => api(`/api/v1/admin/customers/${userId}/notes`, { body: { note } }), "یادداشت ثبت شد");
            if (ok) setNote("");
          }}
        >
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label="متن یادداشت داخلی" placeholder="فقط کارکنان این یادداشت را می‌بینند" />
          <Button type="submit" size="sm" variant="ghost" loading={busy === "note"} disabled={note.trim().length < 2}>
            ثبت یادداشت
          </Button>
        </form>
      </AdminCard>
    </>
  );
}
