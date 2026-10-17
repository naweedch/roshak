/**
 * عملیات موجودی انبار. همهٔ تغییرات موجودی:
 *  - با UPDATE شرطی اتمی انجام می‌شوند (موجودی هرگز منفی نمی‌شود، فروش بیش از موجودی ممکن نیست)؛
 *  - یک ردیف InventoryMovement با موجودی پس از تغییر ثبت می‌کنند.
 */
import "server-only";
import type { InventoryReason } from "@/generated/prisma/enums";
import type { Tx } from "../db";
import { errors } from "../errors";

export async function reserveStock(tx: Tx, variantId: string, quantity: number, orderId: string, label: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ stock: number }>>`
    UPDATE "ProductVariant" SET "stock" = "stock" - ${quantity}, "updatedAt" = now()
    WHERE "id" = ${variantId}::uuid AND "isActive" AND "stock" >= ${quantity}
    RETURNING "stock"`;
  if (rows.length === 0) {
    throw errors.outOfStock(`موجودی «${label}» برای این سفارش کافی نیست؛ سبد خود را بازبینی کنید`, { variantId });
  }
  const stockAfter = rows[0].stock;
  await tx.inventoryMovement.create({
    data: { variantId, delta: -quantity, stockAfter, reason: "SALE", orderId },
  });
  return stockAfter;
}

/** بازگرداندن اقلام یک سفارش به انبار (لغو، پرداخت ناموفق، انقضای رزرو، مرجوعی) */
export async function restockOrder(tx: Tx, orderId: string, reason: InventoryReason, actorId?: string | null, note?: string): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } }, select: { variantId: true, quantity: true } });
  for (const item of items) {
    if (!item.variantId) continue;
    const rows = await tx.$queryRaw<Array<{ stock: number }>>`
      UPDATE "ProductVariant" SET "stock" = "stock" + ${item.quantity}, "updatedAt" = now()
      WHERE "id" = ${item.variantId}::uuid RETURNING "stock"`;
    if (rows.length === 0) continue;
    await tx.inventoryMovement.create({
      data: { variantId: item.variantId, delta: item.quantity, stockAfter: rows[0].stock, reason, orderId, actorId: actorId ?? null, note },
    });
  }
}

/** تغییر دستی موجودی توسط کارمند؛ delta مثبت (ورود کالا) یا منفی (خروج/اصلاح) */
export async function adjustStock(
  tx: Tx,
  input: { variantId: string; delta: number; reason: InventoryReason; actorId: string; note?: string },
): Promise<{ stockBefore: number; stockAfter: number }> {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw errors.validation({ delta: "مقدار تغییر باید عدد صحیح غیرصفر باشد" });
  const rows = await tx.$queryRaw<Array<{ stock: number }>>`
    UPDATE "ProductVariant" SET "stock" = "stock" + ${input.delta}, "updatedAt" = now()
    WHERE "id" = ${input.variantId}::uuid AND "stock" + ${input.delta} >= 0
    RETURNING "stock"`;
  if (rows.length === 0) {
    const exists = await tx.productVariant.findUnique({ where: { id: input.variantId }, select: { stock: true } });
    if (!exists) throw errors.notFound("تنوع محصول یافت نشد");
    throw errors.validation({ delta: `موجودی فعلی ${exists.stock} است؛ موجودی نمی‌تواند منفی شود` });
  }
  const stockAfter = rows[0].stock;
  await tx.inventoryMovement.create({
    data: { variantId: input.variantId, delta: input.delta, stockAfter, reason: input.reason, actorId: input.actorId, note: input.note },
  });
  return { stockBefore: stockAfter - input.delta, stockAfter };
}
