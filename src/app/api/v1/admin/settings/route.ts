import { settingsSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { isTestPaymentEnabled, env } from "@/server/env";
import { updateSettings } from "@/server/services/admin/content-admin";
import { loadStoreSettings } from "@/server/services/settings";
import { getEmailProvider } from "@/server/email/provider";

/** تنظیمات قابل ویرایش + وضعیت فقط‌خواندنی یکپارچه‌سازی‌ها (بدون نمایش هیچ کلید یا رمزی) */
export const GET = route({ auth: "staff", permission: "settings:read" }, async () => {
  const e = env();
  return {
    settings: await loadStoreSettings(),
    integrations: {
      email: { provider: e.EMAIL_PROVIDER, delivers: getEmailProvider().delivers },
      storage: { driver: e.STORAGE_DRIVER },
      payments: { testMode: isTestPaymentEnabled(), zarinpalConfigured: Boolean(e.ZARINPAL_MERCHANT_ID), zarinpalSandbox: e.ZARINPAL_SANDBOX },
      redis: Boolean(e.REDIS_URL),
      instagram: Boolean(e.INSTAGRAM_ACCESS_TOKEN),
      cron: Boolean(e.CRON_SECRET),
    },
  };
});

export const PATCH = route({ auth: "staff", permission: "settings:write" }, async (ctx) => {
  await updateSettings(await ctx.body(settingsSchema), actorFrom(ctx));
  return { ok: true };
});
