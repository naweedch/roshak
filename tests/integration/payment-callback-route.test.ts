/**
 * تست مسیر HTTP بازگشت از درگاه (route handler واقعی، نه فقط سرویس):
 * پاسخ باید هدایت ۳۰۳ به صفحهٔ نتیجه باشد و وضعیت را فقط تأیید سمت سرور تعیین کند.
 * (خطای قبلی: تغییر سربرگ‌های تغییرناپذیر Response.redirect باعث پاسخ ۵۰۰ می‌شد.)
 */
import { beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/payments/callback/[provider]/route";
import { db } from "@/server/db";
import { placeOrder } from "@/server/services/checkout";
import { checkoutInput, createProduct, guestCartWith, seedStore, type Store } from "./fixtures";

let store: Store;

beforeAll(async () => {
  store = await seedStore();
});

async function callback(query: string) {
  const request = new Request(`http://localhost:3100/api/v1/payments/callback/test?${query}`);
  return GET(request, { params: Promise.resolve({ provider: "test" }) });
}

describe("GET /api/v1/payments/callback/[provider]", () => {
  it("پرداخت تأییدشده با ۳۰۳ به صفحهٔ نتیجه با وضعیت paid هدایت می‌شود", async () => {
    const { variant } = await createProduct(store, { stock: 2 });
    const token = await guestCartWith(variant.id, 1);
    const placed = await placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: token });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { orderNumber: placed.orderNumber } } });
    await db.testGatewayTransaction.update({ where: { reference: payment.providerReference! }, data: { status: "SUCCEEDED" } });

    const res = await callback(`pid=${payment.id}&reference=${payment.providerReference}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`http://localhost:3100/checkout/result?order=${placed.orderNumber}&status=paid`);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect((await db.order.findUniqueOrThrow({ where: { orderNumber: placed.orderNumber } })).paymentStatus).toBe("PAID");
  });

  it("پرداخت تأییدنشده سفارش را پرداخت‌شده نمی‌کند و وضعیت pending برمی‌گرداند", async () => {
    const { variant } = await createProduct(store, { stock: 2 });
    const token = await guestCartWith(variant.id, 1);
    const placed = await placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: token });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { orderNumber: placed.orderNumber } } });

    const res = await callback(`pid=${payment.id}&reference=${payment.providerReference}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("status=pending");
    expect((await db.order.findUniqueOrThrow({ where: { orderNumber: placed.orderNumber } })).paymentStatus).toBe("UNPAID");
  });

  it("شناسهٔ پرداخت نامعتبر به وضعیت invalid هدایت می‌شود", async () => {
    const res = await callback("pid=not-a-uuid");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3100/checkout/result?status=invalid");
  });
});
