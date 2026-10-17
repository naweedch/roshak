/** خواندن سفارش‌ها برای پنل مدیریت (فهرست، جزئیات، خروجی CSV) */
import "server-only";
import type { OrderPaymentStatus, OrderStatus, Prisma } from "@/generated/prisma/client";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status";
import type { AdminPaymentView, AdminRefundView, OrderView } from "@/lib/types/order";
import { db } from "../../db";
import { errors } from "../../errors";
import { toOrderView } from "../orders";

export interface OrderListParams {
  page: number;
  pageSize: number;
  q?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  from?: Date;
  to?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function orderWhere(params: Omit<OrderListParams, "page" | "pageSize">): Prisma.OrderWhereInput {
  // «تا تاریخ» شامل همان روز است؛ پس مرز بالا یک روز بعد از تاریخ انتخاب‌شده است
  const toExclusive = params.to ? new Date(params.to.getTime() + DAY_MS) : undefined;
  return {
    ...(params.status ? { status: params.status } : {}),
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(params.from || toExclusive ? { placedAt: { ...(params.from ? { gte: params.from } : {}), ...(toExclusive ? { lt: toExclusive } : {}) } } : {}),
    ...(params.q
      ? {
          OR: [
            { orderNumber: { contains: params.q.toUpperCase() } },
            { email: { contains: params.q.toLowerCase() } },
            { customerName: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q } },
          ],
        }
      : {}),
  };
}

export async function listOrdersAdmin(params: OrderListParams) {
  const where = orderWhere(params);
  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        email: true,
        status: true,
        paymentStatus: true,
        currency: true,
        grandTotal: true,
        placedAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);
  return {
    total,
    items: items.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      email: o.email,
      status: o.status,
      paymentStatus: o.paymentStatus,
      currency: o.currency,
      grandTotal: o.grandTotal.toString(),
      placedAt: o.placedAt.toISOString(),
      itemCount: o._count.items,
    })),
  };
}

export interface AdminOrderDetail {
  order: OrderView;
  userId: string | null;
  payments: AdminPaymentView[];
  refunds: AdminRefundView[];
}

export async function getOrderAdmin(id: string, options: { includePayments: boolean }): Promise<AdminOrderDetail> {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { email: true } } } },
      shipments: { orderBy: { createdAt: "asc" } },
      payments: options.includePayments ? { orderBy: { createdAt: "asc" } } : false,
      refunds: { orderBy: { createdAt: "asc" }, include: { createdBy: { select: { email: true } } } },
    },
  });
  if (!order) throw errors.notFound("سفارش یافت نشد");
  return {
    order: toOrderView(order, { includePrivateEvents: true }),
    userId: order.userId,
    payments: (order.payments ?? []).map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: p.amount.toString(),
      currency: p.currency,
      providerReference: p.providerReference,
      providerTransactionId: p.providerTransactionId,
      cardPanMasked: p.cardPanMasked,
      failureReason: p.failureReason,
      verifiedAt: p.verifiedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    refunds: order.refunds.map((r) => ({
      id: r.id,
      amount: r.amount.toString(),
      currency: r.currency,
      reason: r.reason,
      method: r.method,
      reference: r.reference,
      status: r.status,
      restocked: r.restocked,
      createdByEmail: r.createdBy?.email ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // جلوگیری از تزریق فرمول در اکسل
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** خروجی CSV سفارش‌ها (با BOM برای نمایش درست فارسی در اکسل) */
export async function exportOrdersCsv(params: Omit<OrderListParams, "page" | "pageSize">): Promise<string> {
  const orders = await db.order.findMany({
    where: orderWhere(params),
    orderBy: { placedAt: "desc" },
    take: 10_000,
    include: { items: { select: { sku: true, quantity: true } } },
  });
  const header = ["شماره سفارش", "تاریخ ثبت (UTC)", "وضعیت", "وضعیت پرداخت", "نام مشتری", "ایمیل", "تلفن", "استان", "شهر", "ارز", "جمع کالا", "تخفیف", "ارسال", "مالیات", "مبلغ کل", "بازپرداخت", "کد تخفیف", "اقلام"];
  const lines = orders.map((o) =>
    [
      o.orderNumber,
      o.placedAt.toISOString(),
      ORDER_STATUS_LABELS[o.status],
      PAYMENT_STATUS_LABELS[o.paymentStatus],
      o.customerName,
      o.email,
      o.phone,
      o.shipProvince,
      o.shipCity,
      o.currency,
      o.subtotal.toString(),
      o.discountTotal.toString(),
      o.shippingTotal.toString(),
      o.taxTotal.toString(),
      o.grandTotal.toString(),
      o.refundedTotal.toString(),
      o.discountCode ?? "",
      o.items.map((i) => `${i.sku}×${i.quantity}`).join(" "),
    ]
      .map(csvCell)
      .join(","),
  );
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}`;
}
