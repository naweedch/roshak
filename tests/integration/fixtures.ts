/**
 * داده‌های پایهٔ تست‌های یکپارچه: تنظیمات فروشگاه، محصول فعال با تنوع، روش ارسال، کاربر.
 * همه‌چیز مستقیماً در پایگاه دادهٔ تست ساخته می‌شود؛ هیچ دادهٔ توسعه یا عملیاتی لمس نمی‌شود.
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { addToCart } from "@/server/services/cart";
import { checkoutSchema, type CheckoutData } from "@/lib/validation/checkout";
import type { Role, UserStatus } from "@/generated/prisma/enums";

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function seedStore(overrides: { freeShippingThreshold?: string | null; reservationMinutes?: number } = {}) {
  await db.storeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      storeName: "روشاک",
      storeNameEn: "ROSHAK",
      currency: "IRT",
      enabledPaymentProviders: [],
      seoDefaultTitle: "روشاک — لباس مجلسی",
      seoDefaultDescription: "فروشگاه آزمایشی برای تست‌های یکپارچه",
      taxRate: "0",
      pricesIncludeTax: true,
      freeShippingThreshold: overrides.freeShippingThreshold ?? null,
      reservationMinutes: overrides.reservationMinutes ?? 30,
    },
    update: {},
  });
  const category = await db.category.create({ data: { slug: `cat-${uniq()}`, name: "لباس شب" } });
  const color = await db.color.create({ data: { slug: `red-${uniq()}`, name: "قرمز", hex: "#8B1E2D", family: "RED" } });
  const size = await db.size.create({ data: { label: `S-${uniq()}` } });
  const shipping = await db.shippingMethod.create({
    data: { code: `post-${uniq()}`, name: "پست پیشتاز", currency: "IRT", price: "150000", isActive: true, freeShippingEligible: true },
  });
  return { category, color, size, shipping };
}

export type Store = Awaited<ReturnType<typeof seedStore>>;

export async function createProduct(store: Store, options: { stock: number; price?: string; salePrice?: string | null; status?: "ACTIVE" | "DRAFT" }) {
  const id = uniq();
  const product = await db.product.create({
    data: {
      slug: `gown-${id}`,
      name: `لباس آزمایشی ${id}`,
      description: "توضیحات لباس آزمایشی برای تست",
      categoryId: store.category.id,
      currency: "IRT",
      price: options.price ?? "1000000",
      salePrice: options.salePrice ?? null,
      status: options.status ?? "ACTIVE",
      publishedAt: new Date(Date.now() - 60_000),
    },
  });
  const variant = await db.productVariant.create({
    data: { productId: product.id, sku: `T-${id}`.toUpperCase(), colorId: store.color.id, sizeId: store.size.id, stock: options.stock, isActive: true },
  });
  return { product, variant };
}

/** سبد مهمان جدید با یک کالا؛ توکن خام کوکی را برمی‌گرداند */
export async function guestCartWith(variantId: string, quantity: number): Promise<string> {
  const { newGuestToken } = await addToCart({}, variantId, quantity);
  if (!newGuestToken) throw new Error("انتظار سبد مهمان جدید می‌رفت");
  return newGuestToken;
}

export function checkoutInput(shippingMethodId: string, overrides: { email?: string; idempotencyKey?: string } = {}): CheckoutData {
  return checkoutSchema.parse({
    idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
    contact: { firstName: "نگار", lastName: "آزمایشی", email: overrides.email ?? `guest-${uniq()}@example.com`, phone: "09123456789" },
    shippingAddress: {
      recipientName: "نگار آزمایشی",
      phone: "09123456789",
      province: "تهران",
      city: "تهران",
      addressLine: "خیابان آزمایش، کوچهٔ تست، پلاک ۱۲",
      postalCode: "1345678901",
    },
    shippingMethodId,
    paymentProvider: "TEST",
    acceptTerms: true,
  });
}

export async function createUser(options: { role?: Role; status?: UserStatus; password?: string; email?: string } = {}) {
  return db.user.create({
    data: {
      email: options.email ?? `user-${uniq()}@example.com`,
      passwordHash: await hashPassword(options.password ?? "Shab-e-Yalda-1405"),
      firstName: "کاربر",
      lastName: "آزمایشی",
      role: options.role ?? "CUSTOMER",
      status: options.status ?? "ACTIVE",
    },
  });
}

export async function stockOf(variantId: string): Promise<number> {
  const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  return v.stock;
}
