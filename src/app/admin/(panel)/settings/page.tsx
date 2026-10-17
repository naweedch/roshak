import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied, AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { ShippingManager } from "@/components/admin/managers";
import { SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/misc";
import { hasPermission } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/current";
import { getEmailProvider } from "@/server/email/provider";
import { env, isTestPaymentEnabled } from "@/server/env";
import { listShippingMethodsAdmin } from "@/server/services/admin/catalog-admin";
import { loadStoreSettings } from "@/server/services/settings";

export const metadata = { title: "تنظیمات" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <Settings />
    </Suspense>
  );
}

function Status({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return <Badge tone={ok ? "success" : "neutral"}>{ok ? on : off}</Badge>;
}

async function Settings() {
  await connection();
  const { session, allowed } = await requireStaff("settings:read");
  if (!allowed) return <AccessDenied />;
  const canWrite = hasPermission(session.user.role, "settings:write");
  const [settings, shipping] = await Promise.all([loadStoreSettings(), listShippingMethodsAdmin()]);
  const e = env();
  const email = getEmailProvider();

  return (
    <>
      <AdminPageHeader title="تنظیمات فروشگاه" description="کلیدها و رمزهای سرویس‌ها هرگز این‌جا ذخیره یا نمایش داده نمی‌شوند؛ آن‌ها فقط در متغیرهای محیطی سرور هستند." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <AdminCard title="عمومی، سئو و ارتباط">
          {canWrite ? null : <p className="mb-4 text-sm text-ink-muted">نقش شما فقط اجازهٔ مشاهده دارد.</p>}
          <fieldset disabled={!canWrite}>
            <SettingsForm settings={{ ...settings }} />
          </fieldset>
        </AdminCard>
        <div className="space-y-6">
          <AdminCard title="وضعیت یکپارچه‌سازی‌ها">
            <dl className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 text-sm">
              <dt>ایمیل</dt>
              <dd>
                <Status ok={email.delivers} on={`ارسال واقعی (${e.EMAIL_PROVIDER})`} off="فقط ثبت در فایل (توسعه)" />
              </dd>
              <dt>ذخیره‌سازی تصاویر</dt>
              <dd>
                <Badge>{e.STORAGE_DRIVER === "s3" ? "S3" : "دیسک محلی"}</Badge>
              </dd>
              <dt>درگاه آزمایشی</dt>
              <dd>
                <Status ok={!isTestPaymentEnabled()} on="غیرفعال" off="فعال (فقط برای آزمایش)" />
              </dd>
              <dt>زرین‌پال</dt>
              <dd>
                <Status ok={Boolean(e.ZARINPAL_MERCHANT_ID)} on={e.ZARINPAL_SANDBOX ? "پیکربندی شده (sandbox)" : "پیکربندی شده"} off="پیکربندی نشده" />
              </dd>
              <dt>Redis (محدودیت نرخ)</dt>
              <dd>
                <Status ok={Boolean(e.REDIS_URL)} on="متصل" off="حافظهٔ محلی" />
              </dd>
              <dt>اینستاگرام</dt>
              <dd>
                <Status ok={Boolean(e.INSTAGRAM_ACCESS_TOKEN)} on="متصل" off="متصل نیست" />
              </dd>
              <dt>وظایف زمان‌بندی‌شده</dt>
              <dd>
                <Status ok={Boolean(e.CRON_SECRET)} on="کلید تنظیم شده" off="تنظیم نشده" />
              </dd>
            </dl>
            <p className="mt-4 text-xs leading-6 text-ink-muted">برای تغییر این موارد، متغیرهای محیطی سرور را مطابق مستندات (docs/environment.md) تنظیم و برنامه را دوباره راه‌اندازی کنید.</p>
          </AdminCard>
          <AdminCard title="روش‌های ارسال">
            <ShippingManager items={shipping} canWrite={canWrite} />
          </AdminCard>
        </div>
      </div>
    </>
  );
}
