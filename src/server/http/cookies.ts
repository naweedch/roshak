/** کوکی‌های کاربردی ویترین (سبد مهمان و دسترسی مهمان به آخرین سفارش) */
import "server-only";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "../services/cart";
import type { ApiContext } from "./handler";

export const ORDER_ACCESS_COOKIE = "rsk_order_access";
const ORDER_ACCESS_MAX_AGE = 30 * 24 * 60 * 60;

export function setGuestCartCookie(ctx: Pick<ApiContext<never>, "cookies">, token: string) {
  ctx.cookies.set(CART_COOKIE, token, { maxAge: CART_COOKIE_MAX_AGE, httpOnly: true, sameSite: "lax" });
}

export function clearGuestCartCookie(ctx: Pick<ApiContext<never>, "cookies">) {
  ctx.cookies.set(CART_COOKIE, "", { maxAge: 0, httpOnly: true, sameSite: "lax" });
}

export function setOrderAccessCookie(ctx: Pick<ApiContext<never>, "cookies">, orderNumber: string, token: string) {
  ctx.cookies.set(ORDER_ACCESS_COOKIE, `${orderNumber}.${token}`, { maxAge: ORDER_ACCESS_MAX_AGE, httpOnly: true, sameSite: "lax" });
}

/** توکن دسترسی مهمان برای یک سفارش مشخص، از کوکی */
export function orderAccessFromCookie(value: string | undefined, orderNumber: string): string | null {
  if (!value) return null;
  const index = value.indexOf(".");
  if (index < 0) return null;
  return value.slice(0, index) === orderNumber ? value.slice(index + 1) : null;
}
