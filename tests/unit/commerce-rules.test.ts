/** تست قواعد خالص موجودی، ماشین حالت سفارش و ماتریس مجوزها */
import { describe, expect, it } from "vitest";
import { applyStockDelta, canPurchase, MAX_QUANTITY_PER_LINE, purchasableQuantity, stockLevel } from "@/lib/commerce/inventory";
import { allowedStaffTransitions, canStaffTransition, canTransition, cancellationRestocks, isTerminal } from "@/lib/commerce/order-status";
import { hasPermission, isStaffRole, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/rbac";

describe("موجودی", () => {
  it("محصول یا تنوع غیرفعال قابل خرید نیست", () => {
    expect(purchasableQuantity({ stock: 5, isActive: true, productStatus: "DRAFT" })).toBe(0);
    expect(purchasableQuantity({ stock: 5, isActive: false, productStatus: "ACTIVE" })).toBe(0);
    expect(purchasableQuantity({ stock: 5, isActive: true, productStatus: "ACTIVE" })).toBe(5);
  });

  it("سقف خرید هر سطر رعایت می‌شود", () => {
    expect(purchasableQuantity({ stock: 50, isActive: true, productStatus: "ACTIVE" })).toBe(MAX_QUANTITY_PER_LINE);
    expect(canPurchase({ stock: 50, isActive: true, productStatus: "ACTIVE" }, MAX_QUANTITY_PER_LINE + 1)).toBe(false);
    expect(canPurchase({ stock: 2, isActive: true, productStatus: "ACTIVE" }, 0)).toBe(false);
    expect(canPurchase({ stock: 2, isActive: true, productStatus: "ACTIVE" }, 1.5)).toBe(false);
  });

  it("سطح موجودی", () => {
    expect(stockLevel(0, 2)).toBe("OUT_OF_STOCK");
    expect(stockLevel(2, 2)).toBe("LOW_STOCK");
    expect(stockLevel(3, 2)).toBe("IN_STOCK");
  });

  it("موجودی منفی یا تغییر صفر/اعشاری پذیرفته نمی‌شود", () => {
    expect(applyStockDelta(3, -4)).toBeNull();
    expect(applyStockDelta(3, 0)).toBeNull();
    expect(applyStockDelta(3, 1.5)).toBeNull();
    expect(applyStockDelta(3, -3)).toBe(0);
    expect(applyStockDelta(3, 5)).toBe(8);
  });
});

describe("ماشین حالت سفارش", () => {
  it("کارمند نمی‌تواند سفارش پرداخت‌نشده را دستی تأیید کند", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canStaffTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(false);
    expect(allowedStaffTransitions("PENDING_PAYMENT")).toEqual(["CANCELLED"]);
  });

  it("گذارهای نامعتبر رد می‌شوند", () => {
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("وضعیت‌های پایانی", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("RETURNED")).toBe(true);
    expect(isTerminal("SHIPPED")).toBe(false);
    expect(allowedStaffTransitions("CANCELLED")).toEqual([]);
  });

  it("فقط لغو پیش از ارسال، موجودی را برمی‌گرداند", () => {
    expect(cancellationRestocks("PENDING_PAYMENT")).toBe(true);
    expect(cancellationRestocks("PROCESSING")).toBe(true);
    expect(cancellationRestocks("SHIPPED")).toBe(false);
  });
});

describe("ماتریس نقش‌ها", () => {
  it("مشتری هیچ مجوز مدیریتی ندارد", () => {
    expect(ROLE_PERMISSIONS.CUSTOMER).toEqual([]);
    expect(isStaffRole("CUSTOMER")).toBe(false);
  });

  it("فقط مدیر ارشد کارکنان را مدیریت می‌کند", () => {
    expect(hasPermission("SUPER_ADMIN", "staff:manage")).toBe(true);
    expect(hasPermission("ADMIN", "staff:manage")).toBe(false);
    for (const p of PERMISSIONS) expect(hasPermission("SUPER_ADMIN", p)).toBe(true);
  });

  it("مدیر سفارش به تنظیمات، محتوا و ویرایش محصول دسترسی ندارد", () => {
    expect(hasPermission("ORDER_MANAGER", "order:refund")).toBe(true);
    expect(hasPermission("ORDER_MANAGER", "settings:read")).toBe(false);
    expect(hasPermission("ORDER_MANAGER", "product:write")).toBe(false);
    expect(hasPermission("ORDER_MANAGER", "audit:read")).toBe(false);
  });

  it("مدیر محتوا به سفارش‌ها و مشتریان دسترسی ندارد", () => {
    expect(hasPermission("CONTENT_MANAGER", "order:read")).toBe(false);
    expect(hasPermission("CONTENT_MANAGER", "customer:read")).toBe(false);
    expect(hasPermission("CONTENT_MANAGER", "content:write")).toBe(true);
  });

  it("مدیر محصول بازپرداخت و خروجی سفارش ندارد", () => {
    expect(hasPermission("PRODUCT_MANAGER", "order:refund")).toBe(false);
    expect(hasPermission("PRODUCT_MANAGER", "order:export")).toBe(false);
  });
});
