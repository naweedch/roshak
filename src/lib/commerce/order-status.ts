/**
 * ماشین حالت سفارش. همهٔ تغییر وضعیت‌ها (چه از پنل و چه از سیستم پرداخت)
 * باید از canTransition عبور کنند.
 */
import type { CancelReason, OrderPaymentStatus, OrderStatus } from "@/generated/prisma/enums";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

/** گذارهایی که فقط سیستم (پرداخت/انقضا) مجاز به انجام آن است، نه کارمند */
const SYSTEM_ONLY: ReadonlyArray<[OrderStatus, OrderStatus]> = [["PENDING_PAYMENT", "CONFIRMED"]];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canStaffTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (!canTransition(from, to)) return false;
  return !SYSTEM_ONLY.some(([f, t]) => f === from && t === to);
}

export function allowedStaffTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from].filter((to) => canStaffTransition(from, to));
}

/** آیا لغو این سفارش موجودی را به انبار برمی‌گرداند؟ (کالا هنوز ارسال نشده) */
export function cancellationRestocks(from: OrderStatus): boolean {
  return from === "PENDING_PAYMENT" || from === "CONFIRMED" || from === "PROCESSING";
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  CONFIRMED: "تأیید شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
  RETURNED: "مرجوع شده",
};

export const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  UNPAID: "پرداخت نشده",
  PAID: "پرداخت شده",
  PARTIALLY_REFUNDED: "بازپرداخت جزئی",
  REFUNDED: "بازپرداخت کامل",
};

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  CUSTOMER_REQUEST: "درخواست مشتری",
  PAYMENT_FAILED: "پرداخت ناموفق",
  PAYMENT_EXPIRED: "پایان مهلت پرداخت",
  OUT_OF_STOCK: "اتمام موجودی",
  FRAUD_SUSPECTED: "مشکوک به تقلب",
  ADMIN_DECISION: "تصمیم مدیریت",
};

/** مراحل نمایشی پیگیری سفارش برای مشتری */
export const TRACKING_STEPS: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
