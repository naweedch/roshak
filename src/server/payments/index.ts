import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { testPaymentProvider } from "./test-provider";
import type { PaymentProviderAdapter } from "./types";
import { zarinpalProvider } from "./zarinpal";

const PROVIDERS: Record<PaymentProvider, PaymentProviderAdapter> = {
  TEST: testPaymentProvider,
  ZARINPAL: zarinpalProvider,
};

export function getPaymentProvider(id: PaymentProvider): PaymentProviderAdapter {
  return PROVIDERS[id];
}

/**
 * درگاه‌های قابل استفاده برای مشتری: درگاه باید هم در تنظیمات فروشگاه فعال باشد
 * و هم پیکربندی (کلیدها) داشته باشد. درگاه آزمایشی فقط با PAYMENT_TEST_MODE فعال می‌شود.
 */
export function availablePaymentProviders(enabled: readonly PaymentProvider[]): PaymentProviderAdapter[] {
  const list: PaymentProviderAdapter[] = [];
  for (const id of enabled) {
    if (id === "TEST") continue;
    const provider = PROVIDERS[id];
    if (provider.isConfigured()) list.push(provider);
  }
  if (testPaymentProvider.isConfigured()) list.push(testPaymentProvider);
  return list;
}

export type { PaymentProviderAdapter } from "./types";
