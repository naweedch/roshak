"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

const noopSubscribe = () => () => {};

/**
 * ترجیح «کاهش حرکت» کاربر که فقط پس از hydrate اعمال می‌شود.
 * useReducedMotion در سرور null و در اولین رندر کلاینت مقدار واقعی را برمی‌گرداند؛
 * اگر خروجی رندر به آن وابسته باشد، HTML سرور و کلاینت متفاوت می‌شود (hydration mismatch).
 * این هوک در رندر سرور و اولین رندر کلاینت false است و بلافاصله پس از hydrate مقدار واقعی را می‌دهد.
 */
export function useHydratedReducedMotion(): boolean {
  const hydrated = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const prefersReduced = useReducedMotion() ?? false;
  return hydrated && prefersReduced;
}
