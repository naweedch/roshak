/**
 * سبد خرید سمت سرور.
 * - مهمان: با توکن تصادفی در کوکی HttpOnly شناسایی می‌شود (در دیتابیس فقط هش آن).
 * - کاربر واردشده: سبد متصل به حساب؛ هنگام ورود، سبد مهمان در آن ادغام می‌شود.
 * قیمت و موجودی هرگز در سبد ذخیره نمی‌شوند و در هر بار نمایش از دیتابیس محاسبه می‌شوند.
 */
import "server-only";
import { computeTotals, DISCOUNT_REJECTION_MESSAGES, effectivePrice, type PricingLine } from "@/lib/commerce/pricing";
import { MAX_QUANTITY_PER_LINE, purchasableQuantity } from "@/lib/commerce/inventory";
import { Decimal, moneyString, toDecimal } from "@/lib/money";
import type { CartItemView, CartView } from "@/lib/types/cart";
import { db, type DbClient } from "../db";
import { errors } from "../errors";
import { generateToken, hashToken } from "../auth/tokens";
import { lookupDiscount, normalizeDiscountCode } from "./discounts";
import { loadStoreSettings } from "./settings";

export const CART_COOKIE = "rsk_cart";
export const CART_COOKIE_MAX_AGE = 60 * 24 * 60 * 60;

export interface CartOwner {
  userId?: string | null;
  email?: string | null;
  guestToken?: string | null;
}

async function findCart(owner: CartOwner, client: DbClient = db) {
  if (owner.userId) return client.cart.findUnique({ where: { userId: owner.userId } });
  if (owner.guestToken && owner.guestToken.length >= 20 && owner.guestToken.length <= 200) {
    return client.cart.findUnique({ where: { tokenHash: hashToken(owner.guestToken) } });
  }
  return null;
}

/** سبد موجود یا سبد جدید؛ برای مهمان جدید توکن تازه برمی‌گرداند تا در کوکی ذخیره شود */
export async function getOrCreateCart(owner: CartOwner): Promise<{ cartId: string; newGuestToken?: string }> {
  if (owner.userId) {
    const cart = await db.cart.upsert({ where: { userId: owner.userId }, create: { userId: owner.userId }, update: {} });
    return { cartId: cart.id };
  }
  const existing = await findCart(owner);
  if (existing) return { cartId: existing.id };
  const token = generateToken();
  const cart = await db.cart.create({ data: { tokenHash: hashToken(token) } });
  return { cartId: cart.id, newGuestToken: token };
}

async function loadPurchasableVariant(variantId: string, client: DbClient = db) {
  const variant = await client.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, publishedAt: true, name: true, currency: true } } },
  });
  if (!variant) throw errors.notFound("این تنوع محصول یافت نشد");
  const published = variant.product.publishedAt !== null && variant.product.publishedAt <= new Date();
  const max = published ? purchasableQuantity({ stock: variant.stock, isActive: variant.isActive, productStatus: variant.product.status }) : 0;
  return { variant, max };
}

export async function addToCart(owner: CartOwner, variantId: string, quantity: number) {
  const { variant, max } = await loadPurchasableVariant(variantId);
  if (max === 0) throw errors.outOfStock("این سایز و رنگ در حال حاضر موجود نیست");

  const settings = await loadStoreSettings();
  if (variant.product.currency !== settings.currency) throw errors.badRequest("این محصول در حال حاضر قابل فروش نیست");

  const { cartId, newGuestToken } = await getOrCreateCart(owner);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > max) {
    throw errors.outOfStock(
      max === MAX_QUANTITY_PER_LINE && desired > MAX_QUANTITY_PER_LINE
        ? `حداکثر ${MAX_QUANTITY_PER_LINE} عدد از هر کالا در یک سفارش قابل خرید است`
        : `فقط ${max} عدد از این کالا موجود است`,
      { available: max },
    );
  }
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity: desired },
    update: { quantity: desired },
  });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  return { newGuestToken };
}

async function requireOwnedItem(owner: CartOwner, itemId: string) {
  const cart = await findCart(owner);
  if (!cart) throw errors.notFound("سبد خرید یافت نشد");
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw errors.notFound("این کالا در سبد شما نیست");
  return { cart, item };
}

export async function updateCartItem(owner: CartOwner, itemId: string, quantity: number) {
  const { item } = await requireOwnedItem(owner, itemId);
  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const { max } = await loadPurchasableVariant(item.variantId);
  if (quantity > max) {
    throw errors.outOfStock(max === 0 ? "این کالا دیگر موجود نیست" : `فقط ${max} عدد از این کالا موجود است`, { available: max });
  }
  await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeCartItem(owner: CartOwner, itemId: string) {
  const { item } = await requireOwnedItem(owner, itemId);
  await db.cartItem.delete({ where: { id: item.id } });
}

export async function applyCartDiscount(owner: CartOwner, rawCode: string): Promise<CartView> {
  const cart = await findCart(owner);
  if (!cart) throw errors.badRequest("سبد خرید شما خالی است");
  const code = normalizeDiscountCode(rawCode);
  const lookup = await lookupDiscount(code, { userId: owner.userId, email: owner.email });
  if (!lookup.ok) throw errors.validation({ code: lookup.reason }, lookup.reason);

  const view = await buildCartView(cart.id, code, owner);
  if (view.discountMessage) throw errors.validation({ code: view.discountMessage }, view.discountMessage);
  await db.cart.update({ where: { id: cart.id }, data: { discountCode: code } });
  return view;
}

export async function removeCartDiscount(owner: CartOwner) {
  const cart = await findCart(owner);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { discountCode: null } });
}

export async function getCartView(owner: CartOwner): Promise<CartView> {
  const cart = await findCart(owner);
  if (!cart) return emptyCartView();
  return buildCartView(cart.id, cart.discountCode, owner);
}

export async function getCartCount(owner: CartOwner): Promise<number> {
  const cart = await findCart(owner);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}

async function emptyCartView(): Promise<CartView> {
  const settings = await loadStoreSettings();
  return {
    currency: settings.currency,
    items: [],
    itemCount: 0,
    subtotal: "0.00",
    discountCode: null,
    discountTotal: "0.00",
    discountMessage: null,
    freeShipping: false,
    freeShippingThreshold: settings.freeShippingThreshold,
    amountToFreeShipping: settings.freeShippingThreshold,
    taxRate: settings.taxRate,
    pricesIncludeTax: settings.pricesIncludeTax,
    taxTotal: "0.00",
    total: "0.00",
    hasIssues: false,
  };
}

/** بارگذاری اقلام سبد به همراه اطلاعات قیمت‌گذاری (مشترک با مرحلهٔ تسویه) */
export async function loadCartLines(cartId: string, client: DbClient = db) {
  return client.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          color: { select: { id: true, name: true, hex: true } },
          size: { select: { label: true } },
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              currency: true,
              price: true,
              salePrice: true,
              status: true,
              publishedAt: true,
              images: {
                where: { kind: "GALLERY" },
                orderBy: { sortOrder: "asc" },
                take: 8,
                select: { url: true, alt: true, width: true, height: true, colorId: true },
              },
              collections: { select: { collectionId: true } },
            },
          },
        },
      },
    },
  });
}

export type CartLine = Awaited<ReturnType<typeof loadCartLines>>[number];

export function lineAvailability(line: CartLine, storeCurrency: string): number {
  const p = line.variant.product;
  const published = p.publishedAt !== null && p.publishedAt <= new Date();
  if (!published || p.currency !== storeCurrency) return 0;
  return purchasableQuantity({ stock: line.variant.stock, isActive: line.variant.isActive, productStatus: p.status });
}

export function lineImage(line: CartLine) {
  const images = line.variant.product.images;
  const img = images.find((i) => i.colorId === line.variant.colorId) ?? images[0];
  return img ? { url: img.url, alt: img.alt, width: img.width, height: img.height } : null;
}

async function buildCartView(cartId: string, discountCode: string | null, owner: CartOwner): Promise<CartView> {
  const [lines, settings] = await Promise.all([loadCartLines(cartId), loadStoreSettings()]);

  const items: CartItemView[] = [];
  const pricingLines: PricingLine[] = [];
  for (const line of lines) {
    const p = line.variant.product;
    const max = lineAvailability(line, settings.currency);
    const unit = effectivePrice(p.price, p.salePrice);
    const issue = max === 0 ? "UNAVAILABLE" : line.quantity > max ? "INSUFFICIENT_STOCK" : null;
    items.push({
      id: line.id,
      variantId: line.variantId,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      image: lineImage(line),
      colorName: line.variant.color.name,
      colorHex: line.variant.color.hex,
      sizeLabel: line.variant.size.label,
      sku: line.variant.sku,
      unitPrice: moneyString(unit),
      compareAtPrice: p.salePrice && toDecimal(p.salePrice).lt(toDecimal(p.price)) ? moneyString(p.price) : null,
      quantity: line.quantity,
      lineTotal: moneyString(unit.times(line.quantity)),
      maxQuantity: max,
      issue,
    });
    if (issue !== "UNAVAILABLE") {
      pricingLines.push({
        key: line.id,
        productId: p.id,
        collectionIds: p.collections.map((c) => c.collectionId),
        unitPrice: unit,
        quantity: line.quantity,
      });
    }
  }

  let discountMessage: string | null = null;
  let pricingDiscount = null;
  if (discountCode && pricingLines.length > 0) {
    const lookup = await lookupDiscount(discountCode, { userId: owner.userId, email: owner.email });
    if (lookup.ok) pricingDiscount = lookup.discount;
    else discountMessage = lookup.reason;
  }

  const totals = computeTotals({
    currency: settings.currency,
    lines: pricingLines,
    discount: pricingDiscount,
    shipping: null,
    freeShippingThreshold: settings.freeShippingThreshold,
    tax: { rate: settings.taxRate, pricesIncludeTax: settings.pricesIncludeTax },
  });
  if (totals.discountRejection) discountMessage = DISCOUNT_REJECTION_MESSAGES[totals.discountRejection];

  const merchandise = totals.subtotal.minus(totals.discountTotal);
  const threshold = settings.freeShippingThreshold;
  const amountToFreeShipping = threshold ? Decimal.max(new Decimal(0), toDecimal(threshold).minus(merchandise)) : null;

  return {
    currency: settings.currency,
    items,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: moneyString(totals.subtotal),
    discountCode: discountCode,
    discountTotal: moneyString(totals.discountTotal),
    discountMessage,
    freeShipping: totals.freeShipping || (amountToFreeShipping !== null && amountToFreeShipping.lte(0)),
    freeShippingThreshold: threshold,
    amountToFreeShipping: amountToFreeShipping ? moneyString(amountToFreeShipping) : null,
    taxRate: settings.taxRate,
    pricesIncludeTax: settings.pricesIncludeTax,
    taxTotal: moneyString(totals.taxTotal),
    total: moneyString(totals.grandTotal),
    hasIssues: items.some((i) => i.issue !== null),
  };
}

/**
 * ادغام سبد مهمان در سبد حساب پس از ورود/ثبت‌نام.
 * تعداد هر قلم با سقف موجودی و سقف هر سفارش محدود می‌شود.
 */
export async function mergeGuestCart(guestToken: string | undefined | null, userId: string): Promise<void> {
  if (!guestToken) return;
  const guest = await db.cart.findUnique({ where: { tokenHash: hashToken(guestToken) }, include: { items: true } });
  if (!guest) return;
  await db.$transaction(async (tx) => {
    const userCart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {} });
    for (const item of guest.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, include: { product: { select: { status: true } } } });
      if (!variant) continue;
      const max = purchasableQuantity({ stock: variant.stock, isActive: variant.isActive, productStatus: variant.product.status });
      if (max === 0) continue;
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } } });
      const quantity = Math.min(max, (existing?.quantity ?? 0) + item.quantity);
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, quantity },
        update: { quantity },
      });
    }
    if (!userCart.discountCode && guest.discountCode) {
      await tx.cart.update({ where: { id: userCart.id }, data: { discountCode: guest.discountCode } });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

/** حذف سبدهای مهمان رهاشده (اجرای دوره‌ای) */
export async function purgeAbandonedGuestCarts(olderThanDays = 60): Promise<number> {
  const result = await db.cart.deleteMany({
    where: { userId: null, updatedAt: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) } },
  });
  return result.count;
}
