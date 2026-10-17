/**
 * چرخهٔ عمر سفارش پس از ثبت: تسویهٔ پرداخت، انقضای رزرو، لغو، ارسال، تحویل، مرجوعی و بازپرداخت.
 * همهٔ تغییر وضعیت‌ها با UPDATE شرطی (بر اساس وضعیت فعلی) انجام می‌شوند تا تکرار
 * (callback دوباره، وب‌هوک هم‌زمان، دوبار کلیک) اثر دوباره نداشته باشد.
 */
import "server-only";
import type { CancelReason, InventoryReason, OrderStatus, Prisma } from "@/generated/prisma/client";
import { canStaffTransition, cancellationRestocks, ORDER_STATUS_LABELS } from "@/lib/commerce/order-status";
import { formatMoney, moneyString, toDecimal } from "@/lib/money";
import type { OrderSummaryView, OrderView } from "@/lib/types/order";
import { db, type Tx } from "../db";
import { appUrl } from "../env";
import { errors } from "../errors";
import { logger } from "../logger";
import { hashToken, safeEqual } from "../auth/tokens";
import { invalidate, TAGS } from "../cache";
import { enqueueEmail, flushOutboxAfterResponse } from "../email/outbox";
import { getPaymentProvider } from "../payments";
import type { VerifyPaymentResult } from "../payments/types";
import { initiatePayment } from "./payment-flow";
import { restockOrder } from "./inventory";
import { writeAudit, type AuditActor } from "./audit";
import { loadStoreSettings } from "./settings";

// ─────────────── دسترسی ───────────────

export interface OrderAccess {
  userId?: string | null;
  accessToken?: string | null;
}

function canAccess(order: { userId: string | null; accessTokenHash: string }, access: OrderAccess): boolean {
  if (access.userId && order.userId === access.userId) return true;
  if (access.accessToken && access.accessToken.length >= 20 && access.accessToken.length <= 200) {
    return safeEqual(hashToken(access.accessToken), order.accessTokenHash);
  }
  return false;
}

export function orderUrl(orderNumber: string, accessToken?: string | null): string {
  const base = `${appUrl()}/orders/${orderNumber}`;
  return accessToken ? `${base}?key=${encodeURIComponent(accessToken)}` : base;
}

// ─────────────── تبدیل به DTO ───────────────

const orderInclude = {
  items: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { email: true } } } },
  shipments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderView(order: OrderWithRelations, options: { includePrivateEvents?: boolean } = {}): OrderView {
  const now = Date.now();
  const reservationActive = order.reservationExpiresAt !== null && order.reservationExpiresAt.getTime() > now;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: order.subtotal.toString(),
    discountTotal: order.discountTotal.toString(),
    shippingTotal: order.shippingTotal.toString(),
    taxTotal: order.taxTotal.toString(),
    taxRate: order.taxRate.toString(),
    pricesIncludeTax: order.pricesIncludeTax,
    grandTotal: order.grandTotal.toString(),
    refundedTotal: order.refundedTotal.toString(),
    discountCode: order.discountCode,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    shippingMethodName: order.shippingMethodName,
    shippingAddress: {
      recipientName: order.shipRecipientName,
      phone: order.shipPhone,
      province: order.shipProvince,
      city: order.shipCity,
      addressLine: order.shipAddressLine,
      postalCode: order.shipPostalCode,
    },
    customerNote: order.customerNote,
    placedAt: order.placedAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      productSlug: i.productSlug,
      productName: i.productName,
      sku: i.sku,
      colorName: i.colorName,
      sizeLabel: i.sizeLabel,
      imageUrl: i.imageUrl,
      unitPrice: i.unitPrice.toString(),
      quantity: i.quantity,
      lineTotal: i.lineTotal.toString(),
      discountAmount: i.discountAmount.toString(),
    })),
    events: order.events
      .filter((e) => options.includePrivateEvents || e.isPublic)
      .map((e) => ({
        id: e.id,
        type: e.type,
        toStatus: e.toStatus,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
        actorEmail: options.includePrivateEvents ? (e.actor?.email ?? null) : undefined,
        isPublic: e.isPublic,
      })),
    shipments: order.shipments.map((s) => ({
      id: s.id,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      trackingUrl: s.trackingUrl,
      status: s.status,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
    })),
    canRetryPayment: order.status === "PENDING_PAYMENT" && reservationActive,
    canCancel: order.status === "PENDING_PAYMENT",
  };
}

// ─────────────── خواندن برای مشتری ───────────────

export async function getOrderForCustomer(orderNumber: string, access: OrderAccess): Promise<OrderView | null> {
  const order = await db.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order || !canAccess(order, access)) return null;
  return toOrderView(order);
}

export async function lookupGuestOrder(orderNumber: string, email: string): Promise<OrderView | null> {
  const order = await db.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order || order.email !== email) return null;
  return toOrderView(order);
}

export async function listCustomerOrders(userId: string, page = 1, pageSize = 10): Promise<{ items: OrderSummaryView[]; total: number }> {
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { select: { quantity: true, imageUrl: true }, orderBy: { createdAt: "asc" } } },
    }),
    db.order.count({ where: { userId } }),
  ]);
  return {
    total,
    items: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      currency: o.currency,
      grandTotal: o.grandTotal.toString(),
      itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      placedAt: o.placedAt.toISOString(),
      firstItemImage: o.items[0]?.imageUrl ?? null,
    })),
  };
}

// ─────────────── پرداخت ───────────────

async function notifyOrderPaid(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await enqueueEmail(tx, order.email, {
    template: "order-confirmation",
    payload: {
      name: order.customerName,
      orderNumber: order.orderNumber,
      total: formatMoney(order.grandTotal.toString(), order.currency),
      url: orderUrl(order.orderNumber),
      items: order.items.map((i) => ({ name: i.productName, detail: `${i.colorName} / سایز ${i.sizeLabel} × ${i.quantity}` })),
    },
  });

  // هشدار کمبود موجودی برای تنوع‌های این سفارش
  const settings = await loadStoreSettings(tx);
  const variantIds = order.items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
  const lowStock = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { sku: true, stock: true, lowStockThreshold: true, product: { select: { name: true } } },
  });
  const alerts = lowStock.filter((v) => v.stock <= (v.lowStockThreshold ?? settings.lowStockThreshold));
  const storeEmail = process.env.STORE_NOTIFICATION_EMAIL || settings.contactEmail;
  if (alerts.length && storeEmail) {
    await enqueueEmail(tx, storeEmail, {
      template: "low-stock",
      payload: { items: alerts.map((a) => ({ sku: a.sku, name: a.product.name, stock: a.stock })) },
    });
  }
}

/**
 * تأیید سفارش پس از پرداخت موفق (یا سفارش با مبلغ صفر).
 * اگر سفارش پیش‌تر لغو شده باشد (پرداخت دیرهنگام)، پرداخت ثبت می‌شود و برای پیگیری/بازپرداخت
 * یک رویداد داخلی ایجاد می‌شود؛ سفارش لغوشده خودکار دوباره فعال نمی‌شود.
 */
export async function confirmPaidOrder(orderId: string, paymentId: string | null, tx?: Tx): Promise<"CONFIRMED" | "ALREADY" | "LATE_PAYMENT"> {
  const run = async (t: Tx) => {
    const now = new Date();
    const updated = await t.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paymentStatus: "PAID", paidAt: now, reservationExpiresAt: null },
    });
    if (updated.count === 0) {
      const order = await t.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true, paymentStatus: true } });
      if (order.status === "CANCELLED" && paymentId) {
        await t.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID", paidAt: now } });
        await t.orderEvent.create({
          data: {
            orderId,
            type: "PAYMENT_SUCCEEDED",
            isPublic: false,
            message: "پرداخت پس از لغو سفارش (پایان مهلت) تأیید شد؛ موجودی دوباره رزرو نشده است. بازپرداخت یا تأمین کالا را پیگیری کنید.",
          },
        });
        return "LATE_PAYMENT" as const;
      }
      return "ALREADY" as const;
    }
    const items = await t.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true } });
    for (const item of items) {
      if (item.productId) await t.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
    }
    await t.orderEvent.createMany({
      data: [
        { orderId, type: "PAYMENT_SUCCEEDED", message: "پرداخت با موفقیت تأیید شد" },
        { orderId, type: "STATUS_CHANGED", fromStatus: "PENDING_PAYMENT", toStatus: "CONFIRMED", message: "سفارش تأیید شد" },
      ],
    });
    await notifyOrderPaid(t, orderId);
    return "CONFIRMED" as const;
  };
  const result = tx ? await run(tx) : await db.$transaction(run);
  if (result === "LATE_PAYMENT") logger.warn("late_payment_after_cancellation", { orderId, paymentId });
  await flushOutboxAfterResponse();
  return result;
}

export interface SettlementOutcome {
  orderNumber: string;
  outcome: "PAID" | "FAILED" | "PENDING";
  message: string | null;
}

/** اعمال نتیجهٔ تأییدشدهٔ درگاه روی پرداخت و سفارش (idempotent) */
export async function settlePayment(paymentId: string, result: VerifyPaymentResult): Promise<SettlementOutcome> {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: { select: { id: true, orderNumber: true } } } });
  if (!payment) throw errors.notFound("پرداخت یافت نشد");

  if (result.status === "PENDING") {
    return { orderNumber: payment.order.orderNumber, outcome: "PENDING", message: "نتیجهٔ پرداخت هنوز از درگاه دریافت نشده است" };
  }

  if (result.status === "SUCCEEDED") {
    const outcome = await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: { not: "SUCCEEDED" } },
        data: {
          status: "SUCCEEDED",
          verifiedAt: new Date(),
          providerTransactionId: result.transactionId,
          cardPanMasked: result.cardPanMasked ?? null,
          failureReason: null,
        },
      });
      if (updated.count === 0) return "ALREADY" as const;
      return confirmPaidOrder(payment.order.id, paymentId, tx);
    });
    logger.info("payment_settled", { paymentId, outcome });
    return { orderNumber: payment.order.orderNumber, outcome: "PAID", message: null };
  }

  await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "FAILED", failureReason: result.reason.slice(0, 300) },
    });
    if (updated.count === 1) {
      await tx.orderEvent.create({ data: { orderId: payment.order.id, type: "PAYMENT_FAILED", message: "پرداخت ناموفق بود؛ تا پایان مهلت رزرو می‌توانید دوباره پرداخت کنید" } });
    }
  });
  return { orderNumber: payment.order.orderNumber, outcome: "FAILED", message: result.reason };
}

/** پردازش بازگشت کاربر از درگاه؛ وضعیت فقط با تأیید سمت سرور از درگاه تعیین می‌شود */
export async function handlePaymentCallback(paymentId: string, params: URLSearchParams): Promise<SettlementOutcome> {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: { select: { orderNumber: true } } } });
  if (!payment) throw errors.notFound("پرداخت یافت نشد");
  if (payment.status === "SUCCEEDED") return { orderNumber: payment.order.orderNumber, outcome: "PAID", message: null };
  if (!payment.providerReference) {
    return { orderNumber: payment.order.orderNumber, outcome: "FAILED", message: "تراکنش در درگاه ایجاد نشده بود" };
  }
  // اگر درگاه شناسهٔ تراکنش را در بازگشت می‌فرستد، باید با رکورد ما یکی باشد
  const authority = params.get("Authority") ?? params.get("reference");
  if (authority && authority !== payment.providerReference) {
    logger.warn("payment_callback_reference_mismatch", { paymentId });
    return { orderNumber: payment.order.orderNumber, outcome: "FAILED", message: "اطلاعات بازگشتی درگاه با سفارش مطابقت ندارد" };
  }
  const provider = getPaymentProvider(payment.provider);
  const result = await provider.verifyPayment({
    reference: payment.providerReference,
    amount: payment.amount.toString(),
    currency: payment.currency,
    callbackParams: params,
  });
  return settlePayment(payment.id, result);
}

/** تلاش دوباره برای پرداخت سفارشی که هنوز در مهلت رزرو است */
export async function retryOrderPayment(orderNumber: string, access: OrderAccess) {
  const order = await db.order.findUnique({ where: { orderNumber }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order || !canAccess(order, access)) throw errors.notFound("سفارش یافت نشد");
  if (order.status !== "PENDING_PAYMENT") throw errors.conflict("این سفارش در انتظار پرداخت نیست");
  if (!order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) {
    throw errors.conflict("مهلت پرداخت این سفارش به پایان رسیده است");
  }
  const last = order.payments[0];
  const provider = last?.provider ?? "TEST";
  if (!getPaymentProvider(provider).isConfigured()) throw errors.unavailable("درگاه پرداخت در دسترس نیست");

  const payment = await db.$transaction(async (tx) => {
    await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED", failureReason: "جایگزین با تلاش جدید" } });
    return tx.payment.create({
      data: { orderId: order.id, provider, amount: order.grandTotal, currency: order.currency, expiresAt: order.reservationExpiresAt! },
    });
  });
  const init = await initiatePayment(payment.id);
  if (!init.redirectUrl) throw errors.unavailable(init.error ?? "اتصال به درگاه برقرار نشد");
  return { redirectUrl: init.redirectUrl };
}

// ─────────────── لغو و انقضا ───────────────

async function cancelInTx(
  tx: Tx,
  orderId: string,
  input: { reason: CancelReason; note?: string; inventoryReason: InventoryReason; actorId?: string | null; publicMessage: string },
): Promise<{ cancelled: boolean; from: OrderStatus | null }> {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) throw errors.notFound("سفارش یافت نشد");
  if (order.status === "CANCELLED") return { cancelled: false, from: order.status };
  if (!["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status)) {
    throw errors.conflict(`سفارش در وضعیت «${ORDER_STATUS_LABELS[order.status]}» قابل لغو نیست`);
  }
  const updated = await tx.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: input.reason, cancelNote: input.note, reservationExpiresAt: null },
  });
  if (updated.count === 0) return { cancelled: false, from: order.status };

  if (cancellationRestocks(order.status)) {
    await restockOrder(tx, orderId, input.inventoryReason, input.actorId, input.note);
  }

  // آزاد کردن سهمیهٔ کد تخفیف برای سفارش‌هایی که پرداخت نشده‌اند
  if (order.status === "PENDING_PAYMENT") {
    const redemption = await tx.discountRedemption.findUnique({ where: { orderId } });
    if (redemption) {
      await tx.discountRedemption.delete({ where: { id: redemption.id } });
      await tx.$executeRaw`UPDATE "Discount" SET "usageCount" = GREATEST("usageCount" - 1, 0) WHERE "id" = ${redemption.discountId}::uuid`;
    }
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
  }

  await tx.orderEvent.create({
    data: { orderId, type: "STATUS_CHANGED", fromStatus: order.status, toStatus: "CANCELLED", message: input.publicMessage, actorId: input.actorId ?? null },
  });
  return { cancelled: true, from: order.status };
}

async function orderProductTags(orderId: string): Promise<string[]> {
  const items = await db.orderItem.findMany({ where: { orderId }, select: { productSlug: true } });
  return [TAGS.catalog, ...items.map((i) => TAGS.product(i.productSlug))];
}

export async function cancelUnpaidOrderByCustomer(orderNumber: string, access: OrderAccess) {
  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order || !canAccess(order, access)) throw errors.notFound("سفارش یافت نشد");
  if (order.status !== "PENDING_PAYMENT") throw errors.conflict("فقط سفارش پرداخت‌نشده را می‌توانید لغو کنید؛ برای سایر موارد با پشتیبانی تماس بگیرید");
  await db.$transaction((tx) =>
    cancelInTx(tx, order.id, {
      reason: "CUSTOMER_REQUEST",
      inventoryReason: "ORDER_CANCELLED",
      publicMessage: "سفارش به درخواست شما لغو شد",
    }),
  );
  invalidate(...(await orderProductTags(order.id)));
}

/**
 * لغو سفارش‌های پرداخت‌نشده‌ای که مهلت رزروشان تمام شده و بازگرداندن موجودی.
 * پیش از لغو، وضعیت پرداخت‌های در انتظار از درگاه استعلام می‌شود تا پرداختی که
 * callback آن به ما نرسیده از دست نرود.
 */
export async function expireStaleOrders(limit = 50): Promise<{ expired: number; recovered: number }> {
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", reservationExpiresAt: { lt: new Date() } },
    take: limit,
    include: { payments: { where: { status: { in: ["PENDING", "FAILED"] } }, orderBy: { createdAt: "desc" } } },
  });
  let expired = 0;
  let recovered = 0;
  for (const order of stale) {
    let paid = false;
    for (const payment of order.payments.filter((p) => p.status === "PENDING" && p.providerReference)) {
      try {
        const provider = getPaymentProvider(payment.provider);
        if (!provider.isConfigured()) continue;
        const result = await provider.verifyPayment({ reference: payment.providerReference!, amount: payment.amount.toString(), currency: payment.currency });
        if (result.status === "SUCCEEDED") {
          await settlePayment(payment.id, result);
          paid = true;
          recovered += 1;
          break;
        }
      } catch (error) {
        logger.warn("expire_verify_failed", { orderId: order.id, error });
      }
    }
    if (paid) continue;
    const lastFailed = order.payments.some((p) => p.status === "FAILED");
    const result = await db.$transaction(async (tx) => {
      await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      return cancelInTx(tx, order.id, {
        reason: lastFailed ? "PAYMENT_FAILED" : "PAYMENT_EXPIRED",
        inventoryReason: lastFailed ? "PAYMENT_FAILED" : "RESERVATION_EXPIRED",
        publicMessage: "مهلت پرداخت به پایان رسید و سفارش لغو شد",
      });
    });
    if (result.cancelled) {
      expired += 1;
      invalidate(...(await orderProductTags(order.id)));
    }
  }
  return { expired, recovered };
}

// ─────────────── عملیات کارکنان ───────────────

export interface StaffActor extends AuditActor {
  ipAddress?: string;
  userAgent?: string;
}

export interface FulfillmentInput {
  status: OrderStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
  notifyCustomer: boolean;
  restockReturned?: boolean;
  cancelReason?: CancelReason;
}

export async function updateOrderStatusByStaff(orderId: string, input: FulfillmentInput, actor: StaffActor) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw errors.notFound("سفارش یافت نشد");
  const from = order.status;
  const to = input.status;
  if (!canStaffTransition(from, to)) {
    throw errors.conflict(`تغییر وضعیت از «${ORDER_STATUS_LABELS[from]}» به «${ORDER_STATUS_LABELS[to]}» مجاز نیست`);
  }
  if (to === "SHIPPED" && !input.carrier) throw errors.validation({ carrier: "نام شرکت حمل را وارد کنید" });

  await db.$transaction(async (tx) => {
    if (to === "CANCELLED") {
      const result = await cancelInTx(tx, orderId, {
        reason: input.cancelReason ?? "ADMIN_DECISION",
        note: input.note,
        inventoryReason: "ORDER_CANCELLED",
        actorId: actor.id,
        publicMessage: "سفارش لغو شد",
      });
      if (!result.cancelled) throw errors.conflict("وضعیت سفارش هم‌زمان تغییر کرده است؛ صفحه را تازه کنید");
    } else {
      const now = new Date();
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: from },
        data: {
          status: to,
          ...(to === "SHIPPED" ? { shippedAt: now } : {}),
          ...(to === "DELIVERED" ? { deliveredAt: now } : {}),
        },
      });
      if (updated.count === 0) throw errors.conflict("وضعیت سفارش هم‌زمان تغییر کرده است؛ صفحه را تازه کنید");

      if (to === "SHIPPED") {
        await tx.shipment.create({
          data: {
            orderId,
            carrier: input.carrier!,
            trackingNumber: input.trackingNumber,
            trackingUrl: input.trackingUrl,
            status: "SHIPPED",
            shippedAt: now,
            createdById: actor.id,
          },
        });
      }
      if (to === "DELIVERED") {
        await tx.shipment.updateMany({ where: { orderId, status: "SHIPPED" }, data: { status: "DELIVERED", deliveredAt: now } });
      }
      if (to === "RETURNED") {
        await tx.shipment.updateMany({ where: { orderId }, data: { status: "RETURNED" } });
        if (input.restockReturned) await restockOrder(tx, orderId, "RETURN", actor.id, input.note);
      }
      await tx.orderEvent.create({
        data: { orderId, type: "STATUS_CHANGED", fromStatus: from, toStatus: to, message: ORDER_STATUS_LABELS[to], actorId: actor.id },
      });
    }
    if (input.note) {
      await tx.orderEvent.create({ data: { orderId, type: "NOTE", message: input.note, isPublic: false, actorId: actor.id } });
    }
    await writeAudit(tx, actor, {
      action: "order.status_change",
      entityType: "Order",
      entityId: orderId,
      summary: `${order.orderNumber}: ${ORDER_STATUS_LABELS[from]} → ${ORDER_STATUS_LABELS[to]}`,
      changes: { status: { from, to }, trackingNumber: input.trackingNumber ?? null, carrier: input.carrier ?? null },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    if (input.notifyCustomer) {
      await enqueueEmail(tx, order.email, {
        template: "order-status",
        payload: {
          name: order.customerName,
          orderNumber: order.orderNumber,
          status: ORDER_STATUS_LABELS[to],
          url: orderUrl(order.orderNumber),
          trackingNumber: input.trackingNumber,
        },
      });
    }
  });

  if (to === "CANCELLED" || (to === "RETURNED" && input.restockReturned)) invalidate(...(await orderProductTags(orderId)));
  await flushOutboxAfterResponse();
}

export interface RefundInput {
  amount: string;
  reason: string;
  method?: string;
  reference?: string;
  idempotencyKey: string;
}

/**
 * ثبت بازپرداخت انجام‌شده (مثلاً واریز به کارت مشتری یا بازپرداخت از پنل درگاه).
 * مجموع بازپرداخت‌ها از مبلغ پرداختی بیشتر نمی‌شود (هم در سرویس و هم با CHECK دیتابیس).
 */
export async function recordRefund(orderId: string, input: RefundInput, actor: StaffActor) {
  const existing = await db.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: "SUCCEEDED" }, take: 1 } } });
    if (!order) throw errors.notFound("سفارش یافت نشد");
    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
      throw errors.conflict("برای سفارش پرداخت‌نشده یا کاملاً بازپرداخت‌شده نمی‌توان بازپرداخت ثبت کرد");
    }
    const amount = toDecimal(input.amount);
    if (amount.lte(0)) throw errors.validation({ amount: "مبلغ بازپرداخت باید بیشتر از صفر باشد" });
    const remaining = toDecimal(order.grandTotal).minus(toDecimal(order.refundedTotal));
    if (amount.gt(remaining)) {
      throw errors.validation({ amount: `حداکثر مبلغ قابل بازپرداخت ${formatMoney(remaining, order.currency)} است` });
    }
    const refund = await tx.refund.create({
      data: {
        orderId,
        paymentId: order.payments[0]?.id ?? null,
        currency: order.currency,
        amount: moneyString(amount),
        reason: input.reason,
        method: input.method,
        reference: input.reference,
        status: "COMPLETED",
        completedAt: new Date(),
        idempotencyKey: input.idempotencyKey,
        createdById: actor.id,
      },
    });
    const newRefunded = toDecimal(order.refundedTotal).plus(amount);
    const fullyRefunded = newRefunded.gte(toDecimal(order.grandTotal));
    await tx.order.update({
      where: { id: orderId },
      data: { refundedTotal: moneyString(newRefunded), paymentStatus: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: "REFUND_RECORDED",
        message: `بازپرداخت ${formatMoney(amount, order.currency)} ثبت شد`,
        actorId: actor.id,
      },
    });
    await writeAudit(tx, actor, {
      action: "order.refund",
      entityType: "Order",
      entityId: orderId,
      summary: `بازپرداخت ${moneyString(amount)} ${order.currency} برای ${order.orderNumber}`,
      changes: { amount: moneyString(amount), reason: input.reason, method: input.method ?? null, reference: input.reference ?? null },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return refund;
  });
}

export async function addOrderNote(orderId: string, note: string, actor: StaffActor) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
  if (!order) throw errors.notFound("سفارش یافت نشد");
  await db.$transaction(async (tx) => {
    await tx.orderEvent.create({ data: { orderId, type: "NOTE", message: note, isPublic: false, actorId: actor.id } });
    await writeAudit(tx, actor, { action: "order.note", entityType: "Order", entityId: orderId, summary: `یادداشت برای ${order.orderNumber}` });
  });
}
