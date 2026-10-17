/**
 * تست یکپارچهٔ پرداخت: سفارش فقط با تأیید سمت سرور از درگاه پرداخت‌شده می‌شود،
 * تسویه idempotent است و سفارش‌های منقضی لغو و موجودی برگشت داده می‌شود.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { placeOrder } from "@/server/services/checkout";
import { expireStaleOrders, handlePaymentCallback, settlePayment } from "@/server/services/orders";
import { checkoutInput, createProduct, guestCartWith, seedStore, stockOf, type Store } from "./fixtures";

let store: Store;

beforeAll(async () => {
  store = await seedStore();
});

async function newPendingOrder(stock = 3, quantity = 1) {
  const { product, variant } = await createProduct(store, { stock, price: "1000000" });
  const token = await guestCartWith(variant.id, quantity);
  const result = await placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: token });
  const order = await db.order.findUniqueOrThrow({ where: { orderNumber: result.orderNumber }, include: { payments: true } });
  const payment = order.payments[0];
  return { product, variant, order, payment, reference: payment.providerReference! };
}

const params = (reference: string) => new URLSearchParams({ reference });

describe("بازگشت از درگاه", () => {
  it("رسیدن به آدرس بازگشت به‌تنهایی سفارش را پرداخت‌شده نمی‌کند", async () => {
    const { order, payment, reference } = await newPendingOrder();
    const outcome = await handlePaymentCallback(payment.id, params(reference));
    expect(outcome.outcome).toBe("PENDING");
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PENDING_PAYMENT");
    expect(after.paymentStatus).toBe("UNPAID");
  });

  it("شناسهٔ تراکنش نامطابق در بازگشت رد می‌شود", async () => {
    const { order, payment, reference } = await newPendingOrder();
    await db.testGatewayTransaction.update({ where: { reference }, data: { status: "SUCCEEDED" } });
    const outcome = await handlePaymentCallback(payment.id, params("test_forged_reference"));
    expect(outcome.outcome).toBe("FAILED");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("UNPAID");
  });

  it("اگر مبلغ تراکنش درگاه با سفارش یکی نباشد، پرداخت پذیرفته نمی‌شود", async () => {
    const { order, payment, reference } = await newPendingOrder();
    await db.testGatewayTransaction.update({ where: { reference }, data: { status: "SUCCEEDED", amount: "1000" } });
    const outcome = await handlePaymentCallback(payment.id, params(reference));
    expect(outcome.outcome).toBe("FAILED");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("UNPAID");
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("FAILED");
  });

  it("پرداخت تأییدشده سفارش را تأیید می‌کند و تکرار بازگشت اثر دوباره ندارد", async () => {
    const { product, order, payment, reference } = await newPendingOrder(3, 2);
    await db.testGatewayTransaction.update({ where: { reference }, data: { status: "SUCCEEDED" } });

    const first = await handlePaymentCallback(payment.id, params(reference));
    expect(first.outcome).toBe("PAID");
    const second = await handlePaymentCallback(payment.id, params(reference));
    expect(second.outcome).toBe("PAID");
    // تسویهٔ مستقیم دوباره (مثلاً وب‌هوک دیرهنگام) هم چیزی را دو بار ثبت نمی‌کند
    await settlePayment(payment.id, { status: "SUCCEEDED", transactionId: "TEST-DUP" });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(after.reservationExpiresAt).toBeNull();
    expect(await db.orderEvent.count({ where: { orderId: order.id, type: "PAYMENT_SUCCEEDED" } })).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).salesCount).toBe(2);
    const saved = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(saved.status).toBe("SUCCEEDED");
    expect(saved.providerTransactionId).not.toBe("TEST-DUP");
    // ایمیل تأیید سفارش در صف خروجی ثبت شده است
    expect(await db.emailOutbox.count({ where: { to: order.email } })).toBeGreaterThanOrEqual(1);
  });
});

describe("انقضای رزرو", () => {
  it("سفارش پرداخت‌نشدهٔ منقضی لغو و موجودی آن برگردانده می‌شود", async () => {
    const { variant, order } = await newPendingOrder(3, 2);
    expect(await stockOf(variant.id)).toBe(1);
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 60_000) } });

    const result = await expireStaleOrders();
    expect(result.expired).toBeGreaterThanOrEqual(1);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("CANCELLED");
    expect(after.payments.every((p) => p.status !== "PENDING")).toBe(true);
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("اگر درگاه پرداخت را موفق بداند، به‌جای لغو تأیید می‌شود", async () => {
    const { variant, order, reference } = await newPendingOrder(3, 1);
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 60_000) } });
    await db.testGatewayTransaction.update({ where: { reference }, data: { status: "SUCCEEDED" } });

    const result = await expireStaleOrders();
    expect(result.recovered).toBeGreaterThanOrEqual(1);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("CONFIRMED");
    expect(await stockOf(variant.id)).toBe(2);
  });
});
