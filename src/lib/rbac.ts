/**
 * ماتریس نقش‌ها و مجوزها.
 * مجوزها در کد تعریف شده‌اند (نه در دیتابیس) تا هر تغییر در دسترسی‌ها بازبینی کد شود
 * و هیچ ویرایش داده‌ای نتواند سطح دسترسی را بی‌صدا افزایش دهد.
 * این فایل هم در سرور (اعمال واقعی) و هم در پنل (پنهان کردن دکمه‌ها) استفاده می‌شود.
 */
import type { Role } from "@/generated/prisma/enums";

export const PERMISSIONS = [
  "dashboard:view",
  "analytics:revenue",
  "product:read",
  "product:write",
  "product:delete",
  "inventory:read",
  "inventory:write",
  "catalog:taxonomy",
  "order:read",
  "order:write",
  "order:refund",
  "order:export",
  "customer:read",
  "customer:write",
  "discount:read",
  "discount:write",
  "review:moderate",
  "content:write",
  "media:upload",
  "settings:read",
  "settings:write",
  "audit:read",
  "staff:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "CONTENT_MANAGER"] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "staff:manage"),
  PRODUCT_MANAGER: [
    "dashboard:view",
    "product:read",
    "product:write",
    "product:delete",
    "inventory:read",
    "inventory:write",
    "catalog:taxonomy",
    "discount:read",
    "review:moderate",
    "media:upload",
  ],
  ORDER_MANAGER: [
    "dashboard:view",
    "analytics:revenue",
    "order:read",
    "order:write",
    "order:refund",
    "order:export",
    "customer:read",
    "product:read",
    "inventory:read",
    "discount:read",
  ],
  CONTENT_MANAGER: ["dashboard:view", "content:write", "media:upload", "review:moderate", "product:read"],
  CUSTOMER: [],
};

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "مدیر ارشد",
  ADMIN: "مدیر",
  PRODUCT_MANAGER: "مدیر محصولات",
  ORDER_MANAGER: "مدیر سفارش‌ها",
  CONTENT_MANAGER: "مدیر محتوا",
  CUSTOMER: "مشتری",
};
