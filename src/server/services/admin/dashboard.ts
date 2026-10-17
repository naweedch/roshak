/**
 * شاخص‌های پیشخوان مدیریت — همه مستقیماً از دیتابیس و بدون عدد ساختگی.
 *
 * تعریف‌ها:
 *  - بازهٔ زمانی: N روز اخیر تا همین لحظه (پیش‌فرض ۳۰ روز)، بر اساس زمان ثبت سفارش (placedAt).
 *  - «سفارش‌ها»: همهٔ سفارش‌های ثبت‌شده در بازه (هر وضعیتی).
 *  - «درآمد»: جمع grandTotal منهای بازپرداخت‌ها برای سفارش‌های پرداخت‌شده در بازه.
 *  - «میانگین ارزش سفارش»: درآمد ÷ تعداد سفارش‌های پرداخت‌شده در بازه.
 *  - «مشتریان»: تعداد کل حساب‌های مشتری (و حساب‌های جدید در بازه).
 *  - «موجودی کم»: تنوع‌های فعال محصولات منتشرشده که موجودی ≤ آستانهٔ هشدار دارند.
 */
import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../../db";
import { loadStoreSettings } from "../settings";

export interface DashboardMetrics {
  rangeDays: number;
  currency: string;
  orders: number;
  paidOrders: number;
  revenue: string;
  averageOrderValue: string;
  customers: number;
  newCustomers: number;
  pendingPaymentOrders: number;
  toFulfillOrders: number;
  lowStock: Array<{ variantId: string; productId: string; productName: string; sku: string; stock: number; threshold: number }>;
  recentOrders: Array<{ id: string; orderNumber: string; customerName: string; status: string; paymentStatus: string; grandTotal: string; placedAt: string }>;
  salesByDay: Array<{ day: string; revenue: string; orders: number }>;
  bestSellers: Array<{ productId: string | null; name: string; quantity: number; revenue: string }>;
  topSearches: Array<{ term: string; count: number; zeroResults: number }>;
}

export async function getDashboardMetrics(rangeDays = 30): Promise<DashboardMetrics> {
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const settings = await loadStoreSettings();
  const paidWhere = { placedAt: { gte: since }, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] as const } };

  const [orders, paidAgg, customers, newCustomers, pendingPaymentOrders, toFulfillOrders, lowStockRows, recent, daily, best, searches] = await Promise.all([
    db.order.count({ where: { placedAt: { gte: since } } }),
    db.order.aggregate({ where: { ...paidWhere, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, _sum: { grandTotal: true, refundedTotal: true }, _count: true }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    db.$queryRaw<Array<{ variantId: string; productId: string; productName: string; sku: string; stock: number; threshold: number }>>`
      SELECT v."id" AS "variantId", p."id" AS "productId", p."name" AS "productName", v."sku", v."stock",
             COALESCE(v."lowStockThreshold", ${settings.lowStockThreshold})::int AS "threshold"
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE v."isActive" AND p."status" = 'ACTIVE' AND v."stock" <= COALESCE(v."lowStockThreshold", ${settings.lowStockThreshold})
      ORDER BY v."stock" ASC, p."name" ASC LIMIT 20`,
    db.order.findMany({ orderBy: { placedAt: "desc" }, take: 8, select: { id: true, orderNumber: true, customerName: true, status: true, paymentStatus: true, grandTotal: true, placedAt: true } }),
    db.$queryRaw<Array<{ day: Date; revenue: Prisma.Decimal | null; orders: number }>>`
      SELECT date_trunc('day', "placedAt" AT TIME ZONE 'Asia/Tehran') AS "day",
             SUM("grandTotal" - "refundedTotal") AS "revenue", COUNT(*)::int AS "orders"
      FROM "Order"
      WHERE "placedAt" >= ${since} AND "paymentStatus" IN ('PAID', 'PARTIALLY_REFUNDED')
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<Array<{ productId: string | null; name: string; quantity: number; revenue: Prisma.Decimal }>>`
      SELECT oi."productId", MAX(oi."productName") AS "name", SUM(oi."quantity")::int AS "quantity", SUM(oi."lineTotal" - oi."discountAmount") AS "revenue"
      FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
      WHERE o."placedAt" >= ${since} AND o."paymentStatus" IN ('PAID', 'PARTIALLY_REFUNDED')
      GROUP BY oi."productId" ORDER BY "quantity" DESC LIMIT 5`,
    db.$queryRaw<Array<{ term: string; count: number; zeroResults: number }>>`
      SELECT "term", COUNT(*)::int AS "count", COUNT(*) FILTER (WHERE "resultCount" = 0)::int AS "zeroResults"
      FROM "SearchQueryLog" WHERE "createdAt" >= ${since}
      GROUP BY "term" ORDER BY "count" DESC LIMIT 8`,
  ]);

  const revenue = new Prisma.Decimal(paidAgg._sum.grandTotal ?? 0).minus(new Prisma.Decimal(paidAgg._sum.refundedTotal ?? 0));
  const paidCount = paidAgg._count;

  // پر کردن روزهای بدون فروش با صفر برای نمودار پیوسته
  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
  const salesByDay: DashboardMetrics["salesByDay"] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = byDay.get(day);
    salesByDay.push({ day, revenue: row?.revenue?.toString() ?? "0", orders: row?.orders ?? 0 });
  }

  return {
    rangeDays,
    currency: settings.currency,
    orders,
    paidOrders: paidCount,
    revenue: revenue.toFixed(2),
    averageOrderValue: paidCount ? revenue.div(paidCount).toFixed(2) : "0",
    customers,
    newCustomers,
    pendingPaymentOrders,
    toFulfillOrders,
    lowStock: lowStockRows,
    recentOrders: recent.map((o) => ({ ...o, grandTotal: o.grandTotal.toString(), placedAt: o.placedAt.toISOString() })),
    salesByDay,
    bestSellers: best.map((b) => ({ productId: b.productId, name: b.name, quantity: b.quantity, revenue: b.revenue.toString() })),
    topSearches: searches,
  };
}
