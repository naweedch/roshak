/**
 * تست یکپارچهٔ دسترسی: جداسازی سفارش‌ها، ورود، و قواعد تغییر نقش/وضعیت حساب در پنل.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { isAppError } from "@/server/errors";
import { authenticate } from "@/server/services/auth";
import { updateCustomerAdmin } from "@/server/services/admin/customers";
import { placeOrder } from "@/server/services/checkout";
import { getOrderForCustomer, lookupGuestOrder } from "@/server/services/orders";
import { addToCart } from "@/server/services/cart";
import { checkoutInput, createProduct, createUser, guestCartWith, seedStore, type Store } from "./fixtures";

let store: Store;

beforeAll(async () => {
  store = await seedStore();
});

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  return isAppError(error) ? error.code : error;
}

describe("جداسازی سفارش‌ها", () => {
  it("سفارش مهمان فقط با توکن دسترسی همان سفارش یا ایمیل درست دیده می‌شود", async () => {
    const { variant } = await createProduct(store, { stock: 3 });
    const token = await guestCartWith(variant.id, 1);
    const input = checkoutInput(store.shipping.id);
    const result = await placeOrder(input, { userId: null, guestCartToken: token });

    expect(await getOrderForCustomer(result.orderNumber, { accessToken: result.accessToken })).not.toBeNull();
    expect(await getOrderForCustomer(result.orderNumber, { accessToken: "x".repeat(43) })).toBeNull();
    expect(await getOrderForCustomer(result.orderNumber, {})).toBeNull();
    expect(await lookupGuestOrder(result.orderNumber, input.contact.email)).not.toBeNull();
    expect(await lookupGuestOrder(result.orderNumber, "someone-else@example.com")).toBeNull();
  });

  it("سفارش مشتری برای مشتری دیگر قابل مشاهده نیست", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { variant } = await createProduct(store, { stock: 3 });
    await addToCart({ userId: owner.id }, variant.id, 1);
    const result = await placeOrder(checkoutInput(store.shipping.id, { email: owner.email }), { userId: owner.id, guestCartToken: null });

    expect(await getOrderForCustomer(result.orderNumber, { userId: owner.id })).not.toBeNull();
    expect(await getOrderForCustomer(result.orderNumber, { userId: stranger.id })).toBeNull();
  });
});

describe("ورود", () => {
  it("رمز اشتباه و ایمیل ناموجود پیام یکسان دارند", async () => {
    const user = await createUser({ password: "Correct-Horse-1405" });
    expect(await errorCode(authenticate(user.email, "Wrong-Password-1", "CUSTOMER"))).toBe("UNAUTHORIZED");
    expect(await errorCode(authenticate("nobody@example.com", "Correct-Horse-1405", "CUSTOMER"))).toBe("UNAUTHORIZED");
  });

  it("حساب معلق و ورود مشتری به پنل کارکنان رد می‌شود", async () => {
    const suspended = await createUser({ password: "Correct-Horse-1405", status: "SUSPENDED" });
    expect(await errorCode(authenticate(suspended.email, "Correct-Horse-1405", "CUSTOMER"))).toBe("FORBIDDEN");
    const customer = await createUser({ password: "Correct-Horse-1405" });
    expect(await errorCode(authenticate(customer.email, "Correct-Horse-1405", "STAFF"))).toBe("FORBIDDEN");
    const ok = await authenticate(customer.email, "Correct-Horse-1405", "CUSTOMER");
    expect(ok.id).toBe(customer.id);
  });
});

describe("مدیریت حساب‌ها در پنل", () => {
  it("مدیر عادی نقش تغییر نمی‌دهد و حساب مدیر ارشد را تغییر نمی‌دهد", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const customer = await createUser();
    const superAdmin = await createUser({ role: "SUPER_ADMIN" });
    const actor = { id: admin.id, email: admin.email, role: "ADMIN" as const };
    expect(await errorCode(updateCustomerAdmin(customer.id, { role: "ADMIN" }, actor))).toBe("FORBIDDEN");
    expect(await errorCode(updateCustomerAdmin(superAdmin.id, { status: "SUSPENDED" }, actor))).toBe("FORBIDDEN");
    expect(await errorCode(updateCustomerAdmin(admin.id, { status: "SUSPENDED" }, actor))).toBe("FORBIDDEN");
  });

  it("تعلیق حساب همهٔ نشست‌های آن را باطل می‌کند", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const customer = await createUser();
    await createSession(customer.id, "CUSTOMER");
    expect(await db.session.count({ where: { userId: customer.id } })).toBe(1);
    await updateCustomerAdmin(customer.id, { status: "SUSPENDED" }, { id: admin.id, email: admin.email, role: "ADMIN" });
    expect(await db.session.count({ where: { userId: customer.id } })).toBe(0);
    expect(await db.adminAuditLog.count({ where: { entityId: customer.id, action: "user.status_change" } })).toBe(1);
  });

  it("آخرین مدیر ارشد فعال قابل تنزل یا تعلیق نیست", async () => {
    // مدیر ارشد دیگری که حسابش معلق شده اما نشست قدیمی دارد، نباید بتواند آخرین مدیر ارشد فعال را حذف کند
    await db.user.updateMany({ where: { role: "SUPER_ADMIN" }, data: { status: "SUSPENDED" } });
    const lastActive = await createUser({ role: "SUPER_ADMIN" });
    const staleActor = await createUser({ role: "SUPER_ADMIN", status: "SUSPENDED" });
    const actor = { id: staleActor.id, email: staleActor.email, role: "SUPER_ADMIN" as const };
    expect(await errorCode(updateCustomerAdmin(lastActive.id, { role: "ADMIN" }, actor))).toBe("CONFLICT");
    expect(await errorCode(updateCustomerAdmin(lastActive.id, { status: "SUSPENDED" }, actor))).toBe("CONFLICT");
    expect((await db.user.findUniqueOrThrow({ where: { id: lastActive.id } })).role).toBe("SUPER_ADMIN");
  });
});
