/**
 * تست یکپارچهٔ سبد و ثبت سفارش روی پایگاه دادهٔ واقعی:
 * قیمت سمت سرور، کسر اتمی موجودی، idempotency، رقابت هم‌زمان روی آخرین عدد و سقف کد تخفیف.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { isAppError } from "@/server/errors";
import { addToCart, applyCartDiscount, getCartView } from "@/server/services/cart";
import { placeOrder } from "@/server/services/checkout";
import { checkoutInput, createProduct, guestCartWith, seedStore, stockOf, type Store } from "./fixtures";

let store: Store;

beforeAll(async () => {
  store = await seedStore();
});

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, `انتظار خطای ${code}`).not.toBeNull();
  expect(isAppError(error) ? error.code : error).toBe(code);
}

describe("سبد خرید", () => {
  it("قیمت از دیتابیس محاسبه می‌شود (قیمت ویژه اعمال می‌شود)", async () => {
    const { variant } = await createProduct(store, { stock: 5, price: "2000000", salePrice: "1500000" });
    const token = await guestCartWith(variant.id, 2);
    const view = await getCartView({ guestToken: token });
    expect(view.items).toHaveLength(1);
    expect(Number(view.subtotal)).toBe(3_000_000);
  });

  it("بیش از موجودی و بیش از سقف هر سطر قابل افزودن نیست", async () => {
    const low = await createProduct(store, { stock: 2 });
    await expectAppError(addToCart({}, low.variant.id, 3), "OUT_OF_STOCK");

    const many = await createProduct(store, { stock: 50 });
    await expectAppError(addToCart({}, many.variant.id, 11), "OUT_OF_STOCK");
  });

  it("محصول پیش‌نویس قابل خرید نیست", async () => {
    const draft = await createProduct(store, { stock: 5, status: "DRAFT" });
    await expectAppError(addToCart({}, draft.variant.id, 1), "OUT_OF_STOCK");
  });
});

describe("ثبت سفارش", () => {
  it("موجودی کسر، سفارش با مبالغ سرور ثبت و پرداخت آزمایشی آغاز می‌شود", async () => {
    const { variant } = await createProduct(store, { stock: 3, price: "1200000" });
    const token = await guestCartWith(variant.id, 2);
    const result = await placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: token });

    expect(result.duplicate).toBe(false);
    expect(result.paid).toBe(false);
    expect(result.redirectUrl).toMatch(/\/payment\/test-gateway\/test_/);
    expect(result.accessToken).toBeTruthy();
    expect(await stockOf(variant.id)).toBe(1);

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: result.orderNumber }, include: { items: true, payments: true } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.subtotal.toString()).toBe("2400000");
    expect(order.shippingTotal.toString()).toBe("150000");
    expect(order.grandTotal.toString()).toBe("2550000");
    expect(order.items[0].unitPrice.toString()).toBe("1200000");
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0].providerReference).toMatch(/^test_/);
    expect(order.reservationExpiresAt).not.toBeNull();

    const movements = await db.inventoryMovement.findMany({ where: { variantId: variant.id, reason: "SALE" } });
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(-2);

    // سبد پس از ثبت سفارش خالی می‌شود
    const view = await getCartView({ guestToken: token });
    expect(view.items).toHaveLength(0);
  });

  it("ارسال دوباره با همان کلید idempotency سفارش یا کسر موجودی تکراری نمی‌سازد", async () => {
    const { variant } = await createProduct(store, { stock: 5 });
    const token = await guestCartWith(variant.id, 1);
    const input = checkoutInput(store.shipping.id);
    const first = await placeOrder(input, { userId: null, guestCartToken: token });
    const second = await placeOrder(input, { userId: null, guestCartToken: token });

    expect(second.duplicate).toBe(true);
    expect(second.orderNumber).toBe(first.orderNumber);
    expect(second.accessToken).toBeNull();
    expect(await stockOf(variant.id)).toBe(4);
    expect(await db.order.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
  });

  it("کلید idempotency سفارش دیگری را با ایمیل متفاوت برنمی‌گرداند", async () => {
    const { variant } = await createProduct(store, { stock: 5 });
    const token = await guestCartWith(variant.id, 1);
    const input = checkoutInput(store.shipping.id);
    await placeOrder(input, { userId: null, guestCartToken: token });
    const other = { ...input, contact: { ...input.contact, email: "attacker@example.com" } };
    await expectAppError(placeOrder(other, { userId: null, guestCartToken: token }), "CONFLICT");
  });

  it("اگر موجودی پیش از ثبت تمام شود، سفارش ثبت نمی‌شود و سبد دست نمی‌خورد", async () => {
    const { variant } = await createProduct(store, { stock: 1 });
    const token = await guestCartWith(variant.id, 1);
    await db.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });

    await expectAppError(placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: token }), "OUT_OF_STOCK");
    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(0);
    expect((await getCartView({ guestToken: token })).items).toHaveLength(1);
  });

  it("دو سفارش هم‌زمان روی آخرین عدد: فقط یکی موفق می‌شود و موجودی منفی نمی‌شود", async () => {
    const { variant } = await createProduct(store, { stock: 1 });
    const tokenA = await guestCartWith(variant.id, 1);
    const tokenB = await guestCartWith(variant.id, 1);

    const results = await Promise.allSettled([
      placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: tokenA }),
      placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: tokenB }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(isAppError(rejected[0].reason) && rejected[0].reason.code).toBe("OUT_OF_STOCK");
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("کد تخفیف با سقف یک‌بار، در دو سفارش هم‌زمان فقط یک‌بار مصرف می‌شود", async () => {
    const discount = await db.discount.create({ data: { code: "ONCE10", type: "PERCENTAGE", scope: "ALL", value: "10", usageLimit: 1, isActive: true } });
    const a = await createProduct(store, { stock: 5 });
    const b = await createProduct(store, { stock: 5 });
    const tokenA = await guestCartWith(a.variant.id, 1);
    const tokenB = await guestCartWith(b.variant.id, 1);
    await applyCartDiscount({ guestToken: tokenA }, "once10");
    await applyCartDiscount({ guestToken: tokenB }, "ONCE10");

    const results = await Promise.allSettled([
      placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: tokenA }),
      placeOrder(checkoutInput(store.shipping.id), { userId: null, guestCartToken: tokenB }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const after = await db.discount.findUniqueOrThrow({ where: { id: discount.id } });
    expect(after.usageCount).toBe(1);
    expect(await db.discountRedemption.count({ where: { discountId: discount.id } })).toBe(1);

    // سفارش موفق دقیقاً ۱۰٪ تخفیف دارد
    const order = await db.order.findFirstOrThrow({ where: { discountCode: "ONCE10" } });
    expect(order.discountTotal.toString()).toBe("100000");
    // موجودی سفارش ناموفق برگشت خورده (تراکنش کامل لغو شده است)
    expect((await stockOf(a.variant.id)) + (await stockOf(b.variant.id))).toBe(9);
  });
});
