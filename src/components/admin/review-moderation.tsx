"use client";

/** دکمه‌های بررسی نظر: تأیید، رد، و منتخب‌کردن (فقط برای نظر تأییدشده) */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";

export function ReviewModeration({ id, status, isFeatured }: { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; isFeatured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function update(name: string, body: { status?: "APPROVED" | "REJECTED"; isFeatured?: boolean }, success: string) {
    setBusy(name);
    try {
      await api(`/api/v1/admin/reviews/${id}`, { method: "PATCH", body });
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : "عملیات ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "APPROVED" ? (
        <Button size="sm" loading={busy === "approve"} onClick={() => update("approve", { status: "APPROVED" }, "نظر تأیید و منتشر شد")}>
          تأیید
        </Button>
      ) : null}
      {status !== "REJECTED" ? (
        <Button size="sm" variant="ghost" className="text-danger" loading={busy === "reject"} onClick={() => update("reject", { status: "REJECTED" }, "نظر رد شد")}>
          رد
        </Button>
      ) : null}
      {status === "APPROVED" ? (
        <Button size="sm" variant="secondary" loading={busy === "feature"} onClick={() => update("feature", { isFeatured: !isFeatured }, isFeatured ? "از منتخب‌ها خارج شد" : "در صفحهٔ اصلی نمایش داده می‌شود")}>
          {isFeatured ? "حذف از منتخب" : "منتخب صفحهٔ اصلی"}
        </Button>
      ) : null}
    </div>
  );
}
