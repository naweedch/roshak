/**
 * مدیریت مشتریان و کارکنان. رمز عبور و هش‌ها هرگز انتخاب یا بازگردانده نمی‌شوند.
 * تغییر نقش فقط توسط مدیر ارشد و تعلیق حساب با ابطال همهٔ نشست‌ها همراه است.
 */
import "server-only";
import type { Prisma, Role, UserStatus } from "@/generated/prisma/client";
import { db } from "../../db";
import { errors } from "../../errors";
import { writeAudit } from "../audit";
import type { Actor } from "./products";

export async function listCustomersAdmin(params: { page: number; pageSize: number; q?: string; staffOnly?: boolean }) {
  const where: Prisma.UserWhereInput = {
    ...(params.staffOnly ? { role: { not: "CUSTOMER" } } : {}),
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q.toLowerCase() } },
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return {
    total,
    items: items.map((u) => ({
      id: u.id,
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      phone: u.phone,
      role: u.role,
      status: u.status,
      orderCount: u._count.orders,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  };
}

export async function getCustomerAdmin(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      marketingOptIn: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
      addresses: { select: { id: true, province: true, city: true, addressLine: true, postalCode: true, isDefault: true } },
      orders: { orderBy: { placedAt: "desc" }, take: 50, select: { id: true, orderNumber: true, status: true, paymentStatus: true, grandTotal: true, currency: true, placedAt: true } },
      notesAboutMe: { orderBy: { createdAt: "desc" }, select: { id: true, body: true, createdAt: true, author: { select: { email: true } } } },
    },
  });
  if (!user) throw errors.notFound("کاربر یافت نشد");
  const paid = await db.order.aggregate({ where: { userId: id, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, _sum: { grandTotal: true }, _count: true });
  return {
    ...user,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    orders: user.orders.map((o) => ({ ...o, grandTotal: o.grandTotal.toString(), placedAt: o.placedAt.toISOString() })),
    notes: user.notesAboutMe.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), authorEmail: n.author?.email ?? null })),
    lifetime: { paidOrders: paid._count, paidTotal: paid._sum.grandTotal?.toString() ?? "0" },
  };
}

export async function updateCustomerAdmin(id: string, input: { status?: UserStatus; role?: Role }, actor: Actor & { role: Role }) {
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true } });
  if (!user) throw errors.notFound("کاربر یافت نشد");
  if (id === actor.id) throw errors.forbidden("نمی‌توانید نقش یا وضعیت حساب خودتان را تغییر دهید");
  if (input.role !== undefined && actor.role !== "SUPER_ADMIN") throw errors.forbidden("فقط مدیر ارشد می‌تواند نقش کاربران را تغییر دهد");
  if (user.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw errors.forbidden("حساب مدیر ارشد را فقط مدیر ارشد دیگری می‌تواند تغییر دهد");
  if (user.role === "SUPER_ADMIN" && (input.role && input.role !== "SUPER_ADMIN" || input.status === "SUSPENDED")) {
    const supers = await db.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (supers <= 1) throw errors.conflict("حداقل یک مدیر ارشد فعال باید باقی بماند");
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { ...(input.status ? { status: input.status } : {}), ...(input.role ? { role: input.role } : {}) } });
    // تعلیق یا تغییر نقش، نشست‌های فعلی را باطل می‌کند تا دسترسی قدیمی باقی نماند
    if (input.status === "SUSPENDED" || (input.role && input.role !== user.role)) {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    await writeAudit(tx, actor, {
      action: input.role ? "user.role_change" : "user.status_change",
      entityType: "User",
      entityId: id,
      summary: `تغییر حساب ${user.email}`,
      changes: {
        ...(input.role ? { role: { from: user.role, to: input.role } } : {}),
        ...(input.status ? { status: { from: user.status, to: input.status } } : {}),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  });
}

export async function addCustomerNote(customerId: string, body: string, actor: Actor) {
  const exists = await db.user.count({ where: { id: customerId } });
  if (!exists) throw errors.notFound("کاربر یافت نشد");
  await db.$transaction(async (tx) => {
    await tx.customerNote.create({ data: { customerId, authorId: actor.id, body } });
    await writeAudit(tx, actor, { action: "user.note", entityType: "User", entityId: customerId, summary: "افزودن یادداشت داخلی", ipAddress: actor.ipAddress, userAgent: actor.userAgent });
  });
}
