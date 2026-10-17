import { route } from "@/server/http/handler";
import { getSettings, getShippingMethods } from "@/server/queries/public";

/** روش‌های ارسال فعال و آستانهٔ ارسال رایگان */
export const GET = route({ cache: "public-short" }, async () => {
  const [methods, settings] = await Promise.all([getShippingMethods(), getSettings()]);
  return { methods, freeShippingThreshold: settings.freeShippingThreshold, currency: settings.currency };
});
